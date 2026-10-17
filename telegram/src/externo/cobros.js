import { estadoDe } from './cliente.js';
import { PagosError } from './pagos.js';
import { escaparHTML, formatoCOP } from '../formato.js';

// El bot orquesta el cobro de las cuotas: staging registra cada cuota pagada (CuotasPagadas, con su
// cascada: aporte, saldo, préstamo) y el bot mueve la plata con la API de pagos, de la billetera del
// participante a la cuenta madre, con el permiso que aprobó (GrantId). Cada participación y periodo se
// cobra una sola vez: la tabla `cobros` guarda el último intento.

export const COBRO = Object.freeze({ COBRADO: 'cobrado', FALLIDO: 'fallido', EN_CURSO: 'en_curso' });

// La cascada de staging (Iniciar → cobrar primera cuota → CuotaPagada) puede tardar: si al leer no hay
// cuotas nuevas, se vuelve a leer después de estas esperas.
export const ESPERAS_MS = [3_000, 8_000];

const grantReal = (grant) => Boolean(grant) && !String(grant).startsWith('grant-prueba-');
const ahoraIso = () => new Date().toISOString();
const dormir = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

export const textoCuotaCobrada = (nombre, periodo, cuotas, monto) =>
  `💸 Se cobró tu cuota ${periodo} de ${cuotas} en <b>${escaparHTML(nombre)}</b>: ${formatoCOP(monto)} de tu billetera.`;
export const textoCuotaNoCobrada = (nombre, periodo) =>
  `No se pudo cobrar tu cuota ${periodo} en <b>${escaparHTML(nombre)}</b>. Revisa que tu billetera tenga saldo; se vuelve a intentar en el próximo cobro.`;

// Una línea por cobro para el chat del equipo.
export function textoCobros(nombreNatillera, resultados) {
  if (!resultados.length) return `Sin cuotas por cobrar en ${nombreNatillera}.`;
  const icono = { [COBRO.COBRADO]: '✓', [COBRO.FALLIDO]: '✗', [COBRO.EN_CURSO]: '…' };
  return [
    `Cobros en ${nombreNatillera} (API de pagos → cuenta madre):`,
    ...resultados.map((r) => `${icono[r.estado]} ${r.nombre} · cuota ${r.periodo} · ${formatoCOP(r.monto)}${r.motivo ? ` · ${r.motivo}` : ''}`),
  ].join('\n');
}

// `avisar(telegramId, textoHTML)` le escribe al participante; si falla, el cobro ya quedó.
export function crearCobros({ registro, servicio, pagos, log, avisar = async () => {}, esperar = dormir, ahora = ahoraIso }) {
  const leer = async (contractId) => estadoDe(await servicio.leerContrato(contractId));

  // Lo que falta cobrar de una participación: cada periodo que staging ya dio por pagado y el bot no.
  function pendientesDe(p, e, n) {
    const pagadas = Number(e.CuotasPagadas) || 0;
    const monto = Number(e.ValorCuota ?? n.ValorCuota);
    const pendientes = [];
    for (let periodo = 1; periodo <= pagadas; periodo++) {
      if (registro.cobro(p.participacion_id, periodo)?.estado !== COBRO.COBRADO) pendientes.push({ periodo, monto });
    }
    return pendientes;
  }

  async function cobrarUno(p, e, n, natillera, { periodo, monto }) {
    const nombre = p.nombre ?? p.participacion_id;
    let estado = COBRO.COBRADO;
    let motivo = null;
    try {
      await pagos.cobrarCuota({ grantId: String(e.GrantId), walletOrigen: e.WalletParticipante, monto, referencia: p.participacion_id, periodo });
    } catch (error) {
      // 503: el pago sigue en curso en la API; se reintenta con el mismo cuerpo y la API devuelve su resultado.
      const enCurso = !(error instanceof PagosError) || error.estado === 503;
      estado = enCurso ? COBRO.EN_CURSO : COBRO.FALLIDO;
      motivo = error instanceof PagosError ? `${error.estado}${error.detalle ? ` ${error.detalle}` : ''}` : error.message;
      log.warn(`Cobro de la cuota ${periodo} de ${p.participacion_id}: ${estado} (${motivo})`);
    }
    registro.guardarCobro({ participacionId: p.participacion_id, periodo, monto, estado, motivo, intentadoEn: ahora() });

    const texto =
      estado === COBRO.COBRADO
        ? textoCuotaCobrada(natillera.nombre, periodo, Number(n.NumeroCuotas), monto)
        : estado === COBRO.FALLIDO
          ? textoCuotaNoCobrada(natillera.nombre, periodo)
          : null;
    if (texto) await avisar(p.telegram_id, texto).catch((error) => log.warn(`No se pudo avisar el cobro a ${p.participacion_id}: ${error.message}`));
    return { nombre, periodo, monto, estado, motivo };
  }

  // Cobra todo lo pendiente de la natillera y devuelve un resultado por cobro.
  async function cobrarPendientes(natillera) {
    const n = await leer(natillera.contract_id);
    const resultados = [];
    for (const p of registro.participacionesEn(natillera.natillera_id)) {
      let e;
      try {
        e = await leer(p.contract_id);
      } catch (error) {
        log.warn(`No se pudo leer ${p.participacion_id} para cobrar: ${error.message}`);
        continue;
      }
      const pendientes = pendientesDe(p, e, n);
      if (!pendientes.length) continue;
      if (!grantReal(e.GrantId)) {
        // Autorizó con el permiso de prueba: no hay con qué cobrar de verdad.
        for (const { periodo, monto } of pendientes) {
          resultados.push({ nombre: p.nombre ?? p.participacion_id, periodo, monto, estado: COBRO.FALLIDO, motivo: 'sin permiso real' });
        }
        continue;
      }
      for (const pendiente of pendientes) resultados.push(await cobrarUno(p, e, n, natillera, pendiente));
    }
    return resultados;
  }

  // Después de Iniciar o AbrirPeriodo: espera la cascada de staging si todavía no registró la cuota.
  async function cobrarDespuesDe(natillera, esperas = ESPERAS_MS) {
    let resultados = await cobrarPendientes(natillera);
    for (const ms of esperas) {
      if (resultados.length) break;
      await esperar(ms);
      resultados = await cobrarPendientes(natillera);
    }
    return resultados;
  }

  return { cobrarPendientes, cobrarDespuesDe };
}
