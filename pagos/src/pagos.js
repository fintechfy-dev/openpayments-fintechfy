import { randomUUID } from "node:crypto";
import { cerrarCobro, paso, tokenSinInteraccion, traducir } from "./cotizaciones.js";
import { ErrorHttp } from "./errores.js";
import { aUnidades, MontoInvalido } from "./montos.js";

const CONSULTA_CADA_MS = 1000;
// La respuesta a staging sale a los ~20 s (ver servidor.js); después se sigue consultando por
// detrás, para que el reintento de staging reciba el resultado.
const CONSULTA_MAXIMA_MS = 3 * 60 * 1000;
const COBRO_VENCE_MS = 30 * 60 * 1000;

const esperarPorDefecto = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

// Un pago son entre 5 y 9 solicitudes encadenadas a Open Payments:
//   1. permiso sin interacción y cobro (incoming payment) en el servidor de quien recibe;
//   2. permiso sin interacción y cotización (quote) en el de quien paga, justo antes de pagar
//      (vence a los 5 minutos);
//   3. pago saliente (outgoing payment) con el token del permiso que aprobó quien paga;
//   4. consultar hasta que termine, porque Open Payments no avisa. La señal de «pagado» está del
//      lado de quien recibe: el pago saliente solo dice si falló.
// Cada etapa queda en el registro para el jurado: solicitud, autorización, ejecución y finalización.
//
// El monto llega siempre en la moneda de la billetera del grupo (pesos). Si quien paga o quien
// recibe está en otra moneda, la cotización hace la conversión; cómo se fija el monto depende de
// cuál de las dos billeteras está en pesos (ver fijarMonto).
export function crearPagos({ almacen, wallets, permisos, avisos, walletGrupo, ahora = () => Date.now(), esperar = esperarPorDefecto }) {
  const iso = () => new Date(ahora()).toISOString();
  const guardar = (pago) => almacen.guardar("pago", pago.id, pago);

  async function terminar(pago, estado, motivo = null) {
    pago.estado = estado;
    pago.etapas.finalizacion = { en: iso(), estado, motivo };
    await guardar(pago);
    const datos = { tipo: pago.tipo, referencia: pago.referencia, monto: pago.monto };
    if (pago.periodo !== null) datos.periodo = pago.periodo;
    if (pago.simulado) datos.simulado = true;
    if (motivo) datos.motivo = motivo;
    await avisos.agregar(estado === "completado" ? "PagoCompletado" : "PagoFallido", datos);
  }

  function nuevoPago({ operacion, tipo, referencia, monto, periodo, origen, destino, simulado }) {
    return {
      id: randomUUID(),
      operacion,
      tipo,
      referencia,
      monto,
      periodo: periodo ?? null,
      origen,
      destino,
      simulado,
      estado: "en-curso",
      creado: iso(),
      etapas: { solicitud: { en: iso() }, autorizacion: null, ejecucion: null, finalizacion: null },
    };
  }

  function unidades(monto, billetera) {
    try {
      return { value: aUnidades(monto, billetera.assetScale), assetCode: billetera.assetCode, assetScale: billetera.assetScale };
    } catch (error) {
      if (error instanceof MontoInvalido) throw new ErrorHttp(422, error.message);
      throw error;
    }
  }

  // Tres casos, según en qué moneda esté cada billetera:
  //   - quien recibe está en pesos (una cuota al grupo): el cobro pide el monto exacto y la cotización
  //     calcula cuánto se le debita a quien paga, en su moneda;
  //   - quien paga está en pesos (un premio desde el grupo): sale el monto exacto y llega lo convertido;
  //   - ninguna está en pesos (una compra entre billeteras en euros y dólares): el grupo cotiza, sin
  //     pagar, cuánto vale el monto en la moneda de quien recibe, y quien paga cubre eso.
  // En los dos últimos el cobro no tiene monto fijo, así que no se completa solo: se cierra a mano.
  async function fijarMonto(op, { monto, origen, destino, grupo, metadata }) {
    const tokenCobro = await tokenSinInteraccion(op, destino.authServer, "incoming-payment", "permiso del cobro");
    const crearCobro = (incomingAmount) =>
      paso("cobro", () =>
        op.incomingPayment.create(
          { url: destino.resourceServer, accessToken: tokenCobro },
          { walletAddress: destino.id, ...(incomingAmount ? { incomingAmount } : {}), expiresAt: new Date(ahora() + COBRO_VENCE_MS).toISOString(), metadata },
        ),
      );
    const cotizar = async (billetera, servidor, extra, nombre) => {
      const token = await tokenSinInteraccion(op, billetera.authServer, "quote", `permiso de la ${nombre}`);
      return paso(nombre, () => op.quote.create({ url: servidor, accessToken: token }, { walletAddress: billetera.id, receiver: cobro.id, method: "ilp", ...extra }));
    };

    let cobro;
    if (destino.assetCode === grupo.assetCode) {
      cobro = await crearCobro(unidades(monto, destino));
      const cotizacion = await cotizar(origen, origen.resourceServer, {}, "cotización");
      return { modo: "fijo-al-recibir", cobro, tokenCobro, cotizacion };
    }
    if (origen.assetCode === grupo.assetCode) {
      cobro = await crearCobro(null);
      const cotizacion = await cotizar(origen, origen.resourceServer, { debitAmount: unidades(monto, origen) }, "cotización");
      return { modo: "fijo-al-enviar", cobro, tokenCobro, cotizacion };
    }
    cobro = await crearCobro(null);
    const referencia = await cotizar(grupo, grupo.resourceServer, { debitAmount: unidades(monto, grupo) }, "cotización de referencia");
    const cotizacion = await cotizar(origen, origen.resourceServer, { receiveAmount: referencia.receiveAmount }, "cotización");
    return { modo: "convertido", cobro, tokenCobro, cotizacion, referencia };
  }

  async function consultarHastaTerminar(op, pago, { cobro, tokenCobro, esperado, saliente, tokenPermiso }) {
    // Por intentos y no por reloj: así el límite se cumple aunque el reloj de la demo esté detenido.
    for (let intento = 0; intento < CONSULTA_MAXIMA_MS / CONSULTA_CADA_MS; intento += 1) {
      await esperar(CONSULTA_CADA_MS);
      // Un error al consultar no dice que el pago falló: el dinero ya puede venir en camino. Darlo
      // por fallido haría que staging lo reintente y cobre dos veces, así que se sigue consultando.
      try {
        const actual = await op.incomingPayment.get({ url: cobro.id, accessToken: tokenCobro });
        if (actual.completed || BigInt(actual.receivedAmount.value) >= BigInt(esperado)) {
          pago.etapas.ejecucion.recibido = actual.receivedAmount;
          return { estado: "completado" };
        }
        const enviado = await op.outgoingPayment.get({ url: saliente.id, accessToken: tokenPermiso });
        if (enviado.failed) {
          return { estado: "fallido", error: new ErrorHttp(402, "La billetera de origen no completó el pago (sin fondos o tope del permiso)") };
        }
      } catch (error) {
        console.warn(`pago ${pago.id}: consulta fallida, se reintenta (${error?.description ?? error?.message})`);
      }
    }
    return { estado: "fallido", error: new ErrorHttp(502, "El pago no terminó en 3 minutos") };
  }

  return {
    // permiso: el que aprobó el dueño de la billetera de origen. destino: la billetera que recibe.
    async ejecutar({ operacion, tipo, referencia, monto, periodo, permiso, destino }, cuenta) {
      const { op } = cuenta;
      const pago = nuevoPago({ operacion, tipo, referencia, monto, periodo, origen: permiso.wallet, destino, simulado: false });
      await guardar(pago);
      try {
        const [billeteraOrigen, billeteraDestino, billeteraGrupo] = await Promise.all([
          wallets.obtener(permiso.wallet),
          wallets.obtener(destino),
          wallets.obtener(walletGrupo),
        ]);
        unidades(monto, billeteraGrupo);
        pago.etapas.autorizacion = { en: iso(), permisoId: permiso.id, tipoPermiso: permiso.tipo, aprobado: permiso.aprobado };
        await guardar(pago);

        const metadata = { natillera: { operacion, tipo, referencia } };
        const fijado = await fijarMonto(op, { monto, origen: billeteraOrigen, destino: billeteraDestino, grupo: billeteraGrupo, metadata });
        const { cobro, tokenCobro, cotizacion } = fijado;
        const tokenPermiso = await permisos.tokenVigente(permiso.id, cuenta);
        const saliente = await paso("pago saliente", () =>
          op.outgoingPayment.create(
            { url: billeteraOrigen.resourceServer, accessToken: tokenPermiso },
            { walletAddress: billeteraOrigen.id, quoteId: cotizacion.id, metadata },
          ),
        );
        pago.etapas.ejecucion = {
          en: iso(),
          modo: fijado.modo,
          cobroId: cobro.id,
          cotizacionId: cotizacion.id,
          ...(fijado.referencia ? { cotizacionDeReferenciaId: fijado.referencia.id } : {}),
          pagoSalienteId: saliente.id,
          debitado: cotizacion.debitAmount,
          recibido: null,
        };
        await guardar(pago);

        const esperado = cotizacion.receiveAmount.value;
        const final = await consultarHastaTerminar(op, pago, { cobro, tokenCobro, esperado, saliente, tokenPermiso });
        if (final.estado === "completado") {
          if (!cobro.incomingAmount) await cerrarCobro(op, cobro, tokenCobro);
          await terminar(pago, "completado");
          return pago;
        }
        throw final.error;
      } catch (error) {
        const http = error instanceof ErrorHttp ? error : traducir(error, "pago");
        await terminar(pago, "fallido", http.motivo);
        throw http;
      }
    },

    // Para lo que no se alcance a demostrar: responde como si hubiera pagado, pero queda marcado como
    // simulado en el registro y en el aviso. Nunca se presenta como un pago real.
    async simular({ operacion, tipo, referencia, monto, periodo, origen, destino }) {
      const pago = nuevoPago({ operacion, tipo, referencia, monto, periodo, origen, destino, simulado: true });
      pago.etapas.autorizacion = { en: iso(), simulado: true };
      pago.etapas.ejecucion = { en: iso(), simulado: true };
      await terminar(pago, "completado");
      return pago;
    },

    async rechazar({ operacion, tipo, referencia, monto, periodo, origen, destino }, motivo) {
      const pago = nuevoPago({ operacion, tipo, referencia, monto, periodo, origen, destino, simulado: false });
      await terminar(pago, "fallido", motivo);
      return pago;
    },

    async registro(limite = 200) {
      const pagos = await almacen.listar("pago");
      return pagos.sort((a, b) => (a.creado < b.creado ? 1 : -1)).slice(0, limite);
    },
  };
}
