import { randomUUID } from "node:crypto";
import { isFinalizedGrantWithAccessToken } from "@interledger/open-payments";
import { ErrorHttp } from "./errores.js";
import { aUnidades, MontoInvalido } from "./montos.js";

const CONSULTA_CADA_MS = 1000;
// La respuesta a staging sale a los ~20 s (ver servidor.js); después se sigue consultando por
// detrás, para que el reintento de staging reciba el resultado.
const CONSULTA_MAXIMA_MS = 3 * 60 * 1000;
const COBRO_VENCE_MS = 30 * 60 * 1000;

const esperarPorDefecto = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

// Un pago son entre 5 y 7 solicitudes encadenadas a Open Payments:
//   1. permiso sin interacción y cobro (incoming payment) en el servidor de quien recibe;
//   2. permiso sin interacción y cotización (quote) en el de quien paga, justo antes de pagar
//      (vence a los 5 minutos);
//   3. pago saliente (outgoing payment) con el token del permiso que aprobó quien paga;
//   4. consultar hasta que termine, porque Open Payments no avisa. La señal de «pagado» está del
//      lado de quien recibe: el pago saliente solo dice si falló.
// Cada etapa queda en el registro para el jurado: solicitud, autorización, ejecución y finalización.
export function crearPagos({ almacen, wallets, permisos, avisos, ahora = () => Date.now(), esperar = esperarPorDefecto }) {
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

  async function permisoSinInteraccion(op, servidorPermisos, tipo, paso) {
    let permiso;
    try {
      permiso = await op.grant.request(
        { url: servidorPermisos },
        { access_token: { access: [{ type: tipo, actions: tipo === "quote" ? ["create", "read"] : ["create", "read", "complete"] }] } },
      );
    } catch (error) {
      throw traducir(error, paso);
    }
    if (!isFinalizedGrantWithAccessToken(permiso)) throw new ErrorHttp(502, `La billetera pidió interacción para el ${paso}`);
    return permiso.access_token.value;
  }

  async function paso(nombre, llamada) {
    try {
      return await llamada();
    } catch (error) {
      throw traducir(error, nombre);
    }
  }

  async function consultarHastaTerminar(op, pago, { cobro, tokenCobro, saliente, tokenPermiso }) {
    // Por intentos y no por reloj: así el límite se cumple aunque el reloj de la demo esté detenido.
    for (let intento = 0; intento < CONSULTA_MAXIMA_MS / CONSULTA_CADA_MS; intento += 1) {
      await esperar(CONSULTA_CADA_MS);
      // Un error al consultar no dice que el pago falló: el dinero ya puede venir en camino. Darlo
      // por fallido haría que staging lo reintente y cobre dos veces, así que se sigue consultando.
      try {
        const actual = await op.incomingPayment.get({ url: cobro.id, accessToken: tokenCobro });
        if (actual.completed || BigInt(actual.receivedAmount.value) >= BigInt(cobro.incomingAmount.value)) {
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
        const [billeteraOrigen, billeteraDestino] = await Promise.all([wallets.obtener(permiso.wallet), wallets.obtener(destino)]);
        if (billeteraOrigen.assetCode !== billeteraDestino.assetCode) {
          throw new ErrorHttp(422, `Las billeteras están en monedas distintas (${billeteraOrigen.assetCode} y ${billeteraDestino.assetCode})`);
        }
        let valor;
        try {
          valor = aUnidades(monto, billeteraDestino.assetScale);
        } catch (error) {
          if (error instanceof MontoInvalido) throw new ErrorHttp(422, error.message);
          throw error;
        }
        pago.etapas.autorizacion = { en: iso(), permisoId: permiso.id, tipoPermiso: permiso.tipo, aprobado: permiso.aprobado };
        await guardar(pago);

        const tokenCobro = await permisoSinInteraccion(op, billeteraDestino.authServer, "incoming-payment", "permiso del cobro");
        const cobro = await paso("cobro", () =>
          op.incomingPayment.create(
            { url: billeteraDestino.resourceServer, accessToken: tokenCobro },
            {
              walletAddress: billeteraDestino.id,
              incomingAmount: { value: valor, assetCode: billeteraDestino.assetCode, assetScale: billeteraDestino.assetScale },
              expiresAt: new Date(ahora() + COBRO_VENCE_MS).toISOString(),
              metadata: { natillera: { operacion, tipo, referencia } },
            },
          ),
        );
        const tokenCotizacion = await permisoSinInteraccion(op, billeteraOrigen.authServer, "quote", "permiso de la cotización");
        const cotizacion = await paso("cotización", () =>
          op.quote.create(
            { url: billeteraOrigen.resourceServer, accessToken: tokenCotizacion },
            { walletAddress: billeteraOrigen.id, receiver: cobro.id, method: "ilp" },
          ),
        );
        const tokenPermiso = await permisos.tokenVigente(permiso.id, cuenta);
        const saliente = await paso("pago saliente", () =>
          op.outgoingPayment.create(
            { url: billeteraOrigen.resourceServer, accessToken: tokenPermiso },
            { walletAddress: billeteraOrigen.id, quoteId: cotizacion.id, metadata: { natillera: { operacion, tipo, referencia } } },
          ),
        );
        pago.etapas.ejecucion = {
          en: iso(),
          cobroId: cobro.id,
          cotizacionId: cotizacion.id,
          pagoSalienteId: saliente.id,
          debitado: cotizacion.debitAmount,
          recibido: null,
        };
        await guardar(pago);

        const final = await consultarHastaTerminar(op, pago, { cobro, tokenCobro, saliente, tokenPermiso });
        if (final.estado === "completado") {
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

function traducir(error, paso) {
  if (error instanceof ErrorHttp) return error;
  const estado = error?.status;
  const descripcion = error?.description ?? error?.message ?? "error desconocido";
  if (paso === "pago saliente" && (estado === 403 || /insufficient|limit|exceed/i.test(descripcion))) {
    return new ErrorHttp(402, `Sin fondos o tope del permiso superado: ${descripcion}`);
  }
  if (estado === 401 || estado === 403) return new ErrorHttp(403, `Open Payments negó el ${paso}: ${descripcion}`);
  if (estado >= 400 && estado < 500) return new ErrorHttp(422, `Open Payments rechazó el ${paso}: ${descripcion}`);
  return new ErrorHttp(502, `Open Payments falló en el ${paso}: ${descripcion}`);
}
