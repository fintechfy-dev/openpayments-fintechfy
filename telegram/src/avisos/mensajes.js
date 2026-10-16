import { InlineKeyboard } from 'grammy';
import { escaparHTML, formatoCOP } from '../formato.js';

// Qué le dice el bot a quién por cada aviso de staging (telegram/INTEGRACION.md, sección 2). Voz y tono
// del design system: primero el dato, máximo 3 líneas, sin culpa, sin emoji en mora ni en error, y lo
// de mora siempre por privado. Los motivos técnicos que trae staging van al log, no al participante.
//
// `a`: 'grupo' (administrador y participantes), 'participante' o 'admin'.

export const BOTON_PAGAR_DEUDA = 'Ya tengo la plata';
export const BOTON_PAGAR_OBLIGACION = 'Pagar mi parte';

export const datoBotonDeuda = (participacionId) => `av:deuda:${participacionId}`;
export const datoBotonObligacion = (actividadId) => `av:obl:${actividadId}`;

// Staging manda los campos en camelCase en los avisos y en PascalCase en los contratos; se aceptan los
// dos, y un valor tipado { type, value } se desenvuelve.
export function campo(datos, nombre) {
  const valor = datos?.[nombre] ?? datos?.[nombre[0].toUpperCase() + nombre.slice(1)];
  return valor !== null && typeof valor === 'object' && 'value' in valor ? valor.value : valor;
}

// Algunos montos llegan como texto (`total`, `montoMaximoPrestamo` en el OpenAPI): null si no es un número.
export function monto(datos, nombre) {
  const valor = campo(datos, nombre);
  const n = typeof valor === 'string' && valor.trim() === '' ? NaN : Number(valor);
  return Number.isFinite(n) ? n : null;
}
const plata = (datos, nombre) => formatoCOP(monto(datos, nombre) ?? 0);
// Si el total no se puede leer, se muestra la suma de sus partes en vez de un $0 que asusta.
const total = (datos, ...partes) => formatoCOP(monto(datos, 'total') ?? partes.reduce((s, p) => s + (monto(datos, p) ?? 0), 0));
const nombre = (c) => `<b>${escaparHTML(c.nombre)}</b>`;

const botonDeuda = (c) => c.participacionId && new InlineKeyboard().text(BOTON_PAGAR_DEUDA, datoBotonDeuda(c.participacionId));
const botonObligacion = (c) => {
  const actividadId = campo(c.datos, 'actividadId') ?? c.actividadId;
  return actividadId && new InlineKeyboard().text(BOTON_PAGAR_OBLIGACION, datoBotonObligacion(actividadId));
};

const PLATA_UBICADA = 'La plata la guarda Financiera Aliada, a nombre de la natillera.';
const REVISA_SALDO = 'Revisa que tu billetera tenga saldo y vuelve a tocar el botón.';
const LO_REVISAMOS = 'Ya lo estamos revisando; no tienes que hacer nada.';

export const AVISOS = Object.freeze({
  NatilleraActivada: { a: 'grupo', texto: (c) => `🐷 ${nombre(c)} arrancó: se completó el cupo.\n${PLATA_UBICADA}` },
  NatilleraCerradaSinCupo: {
    a: 'grupo',
    texto: (c) => `${nombre(c)} se cerró porque no se completó el cupo.\nSi alcanzaste a pagar una cuota, te la devolvemos a tu billetera.`,
  },
  CuotaPagada: {
    a: 'participante',
    texto: (c) => {
      const periodo = campo(c.datos, 'periodo');
      return `✅ Se cobró tu cuota${periodo ? ` ${periodo}` : ''} de ${nombre(c)}: ${plata(c.datos, 'monto')}.\n${PLATA_UBICADA}`;
    },
  },
  AutorizacionRechazada: {
    a: 'participante',
    texto: (c) => `No quedó autorizado el cobro de tus cuotas en ${nombre(c)}.\nPuedes intentarlo otra vez desde el enlace de invitación.`,
  },
  EntradaEnMora: {
    a: 'participante',
    texto: (c) => `Tu cuota de ${nombre(c)} quedó pendiente: ${plata(c.datos, 'deudaCuotas')}.\nCuando tengas la plata, toca el botón y la cobramos.`,
    botones: botonDeuda,
  },
  RecordatorioMora: {
    a: 'participante',
    texto: (c) =>
      `Sigue pendiente ${total(c.datos, 'deudaCuotas', 'moraAcumulada')} en ${nombre(c)}: ${plata(c.datos, 'deudaCuotas')} de cuota y ${plata(c.datos, 'moraAcumulada')} de mora.\nCuando tengas la plata, toca el botón y la cobramos.`,
    botones: botonDeuda,
  },
  SalidaDeMora: { a: 'participante', texto: (c) => `Ya quedaste al día en ${nombre(c)}.` },
  CobroDeudaFallo: {
    a: 'participante',
    texto: (c) => `No se pudo cobrar lo pendiente en ${nombre(c)}.\n${REVISA_SALDO}`,
    botones: botonDeuda,
  },
  RecordatorioObligacion: {
    a: 'participante',
    texto: (c) =>
      `Tienes pendiente ${total(c.datos, 'deudaObligacion', 'castigoAcumulado')} de una actividad de ${nombre(c)}: ${plata(c.datos, 'deudaObligacion')} de tu parte y ${plata(c.datos, 'castigoAcumulado')} de recargo.\nToca el botón para pagarla.`,
    botones: botonObligacion,
  },
  CobroObligacionFallo: {
    a: 'participante',
    texto: (c) => `No se pudo cobrar tu parte de la actividad de ${nombre(c)}.\n${REVISA_SALDO}`,
    botones: botonObligacion,
  },
  // PremioCompletado no se anuncia: llega en la misma cascada que este y el grupo recibiría dos veces
  // la misma noticia.
  PremioPagadoAlGanador: { a: 'grupo', texto: (c) => `🎉 Se pagó el premio de la actividad de ${nombre(c)}: ${plata(c.datos, 'monto')}.` },
  ActividadAcumulada: {
    a: 'grupo',
    texto: (c) => `La actividad de ${nombre(c)} cerró sin premio.\nLo recaudado, ${plata(c.datos, 'recaudado')}, se suma al ahorro del grupo.`,
  },
  PagoPremioFallo: { a: 'admin', texto: (c) => `No se pudo pagar el premio de la actividad de ${nombre(c)}.\n${LO_REVISAMOS}` },
  ElegibleParaPrestamo: {
    a: 'participante',
    texto: (c) => {
      const maximo = monto(c.datos, 'montoMaximoPrestamo');
      return `🐷 Ya puedes pedir un préstamo${maximo === null ? '' : ` de hasta ${formatoCOP(maximo)}`} en ${nombre(c)}.\nLo revisa y lo presta Financiera Aliada.`;
    },
  },
  PrestamoDesembolsado: { a: 'participante', texto: (c) => `✅ Te llegó tu préstamo de ${plata(c.datos, 'capital')} a tu billetera.` },
  DesembolsoFallo: { a: 'participante', texto: () => `No se pudo enviar tu préstamo a tu billetera.\n${LO_REVISAMOS}` },
  CreditoEnMora: { a: 'participante', texto: (c) => `Quedó pendiente ${plata(c.datos, 'saldoVencido')} de tu préstamo en ${nombre(c)}.` },
  ParticipacionLiquidada: {
    a: 'participante',
    texto: (c) => `✅ Te llegó tu plata de ${nombre(c)}: ${plata(c.datos, 'monto')}.\nYa está en tu billetera.`,
  },
  PagoLiquidacionFallo: { a: 'participante', texto: (c) => `No se pudo enviar tu plata de ${nombre(c)} a tu billetera.\n${LO_REVISAMOS}` },
  ReembolsoFallo: { a: 'participante', texto: (c) => `No se pudo devolverte la plata de ${nombre(c)}.\n${LO_REVISAMOS}` },
  ParticipacionReembolsada: { a: 'participante', texto: (c) => `Te devolvimos ${plata(c.datos, 'monto')} de ${nombre(c)} a tu billetera.` },
  NatilleraCerrada: { a: 'grupo', texto: (c) => `🐷 ${nombre(c)} terminó. Gracias por ahorrar en grupo.` },
});

export const EVENTOS = Object.freeze(Object.keys(AVISOS));
