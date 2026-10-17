// Reglas del préstamo desde el ahorro (US-014, #29), con el estado de staging de la natillera (n) y de
// la participación (p). Funciones puras, sin dependencias de Node.
//
// La regla de staging (especificación funcional, «Préstamo»): tras PagosParaPrestamo cuotas pagadas, la
// persona puede pedir hasta MultiploPrestamo × ValorCuota; un préstamo a la vez por participación; se
// paga aparte y, si queda en mora al liquidar, se descuenta de su parte. La financiera (la web) decide.

import { formatoCOP } from '../formato.js';
import { formatoFecha, leerMonto } from './reglas.js';

export const NATILLERA_ACTIVA = 2;
export const PARTICIPACION_ACTIVA = 2;
export const PARTICIPACION_MORA = 3;
export const MONTO_MINIMO = 10_000;
export const PLAZO_MAXIMO = 12;

const plural = (n, una, varias) => `${n} ${Number(n) === 1 ? una : varias}`;

// Meses completos entre hoy y el final de la natillera ('2026-10-16' → '2026-12-31' = 2). El préstamo
// no debería ir más allá: lo que quede pendiente al liquidar se descuenta de la parte de la persona.
export function mesesHasta(hoy, final) {
  if (!hoy || !final) return 0;
  const [a1, m1, d1] = String(hoy).slice(0, 10).split('-').map(Number);
  const [a2, m2, d2] = String(final).slice(0, 10).split('-').map(Number);
  return Math.max(0, (a2 - a1) * 12 + (m2 - m1) - (d2 < d1 ? 1 : 0));
}

export const maximoPrestamo = (p) => Number(p.MultiploPrestamo) * Number(p.ValorCuota);

// { puede: true, maximo, plazoMaximo } o { puede: false, motivo, texto }. `solicitud` es la última
// que la persona pidió en esta natillera (del registro del bot), si hay.
export function elegibilidad(n, p, { hoy, solicitud = null } = {}) {
  const nombre = n.NombreNatillera;
  const requeridas = Number(p.PagosParaPrestamo);
  const no = (motivo, texto) => ({ puede: false, motivo, texto });

  if (Number(n.EstadoNatillera) < NATILLERA_ACTIVA) {
    return no('no_arranca', `${nombre} todavía no arranca. Puedes pedir un préstamo cuando pagues ${plural(requeridas, 'cuota', 'cuotas')}.`);
  }
  if (Number(n.EstadoNatillera) > NATILLERA_ACTIVA) return no('termino', `${nombre} ya está terminando, así que ya no presta.`);
  if (Number(p.EstadoParticipacion) === PARTICIPACION_MORA) {
    return no('cuota_pendiente', `Tienes una cuota pendiente en ${nombre}. Cuando quedes al día, puedes pedir el préstamo.`);
  }
  if (Number(p.EstadoParticipacion) !== PARTICIPACION_ACTIVA) return no('no_activa', `Tu participación en ${nombre} ya no recibe préstamos.`);
  if (Number(p.DeudaPrestamoEnMora) > 0) {
    return no('prestamo_pendiente', `Quedó pendiente ${formatoCOP(p.DeudaPrestamoEnMora)} de tu préstamo en ${nombre}. Cuando lo pagues, puedes pedir otro.`);
  }
  // Un préstamo a la vez. El bot no se entera si la financiera dice que no (lo marca solo la web).
  if (solicitud) {
    return no('ya_pediste', `Ya pediste un préstamo de ${formatoCOP(solicitud.monto)} en ${nombre} el ${formatoFecha(solicitud.creada_en.slice(0, 10))}. Financiera Aliada lo está revisando.`);
  }
  if (Number(p.CuotasPagadas) < requeridas) {
    return no('faltan_cuotas', `Puedes pedir un préstamo en ${nombre} cuando pagues ${plural(requeridas, 'cuota', 'cuotas')}. Llevas ${p.CuotasPagadas}.`);
  }
  const plazoMaximo = Math.min(PLAZO_MAXIMO, mesesHasta(hoy, n.FechaFinal));
  if (plazoMaximo < 1) return no('sin_plazo', `${nombre} termina este mes: ya no alcanza el tiempo para pagar un préstamo.`);
  const maximo = maximoPrestamo(p);
  if (!(maximo >= 1)) return no('sin_maximo', `Por ahora ${nombre} no tiene un monto para prestar.`);
  return { puede: true, maximo, plazoMaximo };
}

export function validarMontoPrestamo(texto, maximo) {
  const valor = leerMonto(texto);
  const minimo = Math.min(MONTO_MINIMO, maximo);
  if (!(valor >= minimo && valor <= maximo)) return { error: `Puedes pedir entre ${formatoCOP(minimo)} y ${formatoCOP(maximo)}.` };
  return { valor };
}

export function validarPlazo(texto, plazoMaximo) {
  const valor = Number(String(texto).trim().replace(/\s*mes(es)?$/i, ''));
  if (!(Number.isInteger(valor) && valor >= 1 && valor <= plazoMaximo)) {
    return { error: plazoMaximo === 1 ? 'Por el tiempo que le queda a la natillera, el plazo es de 1 mes.' : `El plazo va de 1 a ${plazoMaximo} meses.` };
  }
  return { valor };
}

// Botones: la mitad y el máximo, redondeados a miles.
export function sugerenciasMonto(maximo) {
  const mitad = Math.max(MONTO_MINIMO, Math.round(maximo / 2 / 1000) * 1000);
  return [...new Set([mitad, maximo])].filter((v) => v <= maximo);
}

export function sugerenciasPlazo(plazoMaximo) {
  return [...new Set([1, 2, 3, 6, plazoMaximo])].filter((m) => m <= plazoMaximo).sort((a, b) => a - b);
}

export const textoPlazo = (meses) => plural(meses, 'mes', 'meses');
