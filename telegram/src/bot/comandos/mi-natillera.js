import { Composer, InlineKeyboard } from 'grammy';
import { escaparHTML, formatoCOP } from '../../formato.js';
import { formatoFecha } from '../../natillera/reglas.js';
import { estadoDe } from '../../externo/cliente.js';
import { BOTON_PAGAR_DEUDA, datoBotonDeuda } from '../../avisos/mensajes.js';
import { BOTON_AUTORIZAR, datoAutorizar } from '../flujos/unirse.js';

// «Mi natillera» (US-008, #26). Con staging, responde en el chat con lo que hay en sus contratos: un
// mensaje por natillera en la que está la persona (y por las que administra sin ahorrar en ellas), con
// el botón que le toca según el estado. Sin staging abre la Mini App (miniapp/natillera/), que todavía
// muestra datos de ejemplo.

export const BOTON_MI_NATILLERA = 'Ver mi natillera';
export const TEXTO_MENU = 'Mi natillera';

export function textoMiNatillera(nombre) {
  return [
    `🐷 ${nombre ? `${nombre}, aquí` : 'Aquí'} ves cuánto llevas, las reglas y tus cobros.`,
    'La plata la guarda Financiera Aliada, a nombre de la natillera.',
  ].join('\n');
}

export const MENSAJE_SIN_MINIAPP = 'Todavía no puedo mostrarte tu natillera desde aquí. Vuelve a intentarlo en un rato.';
export const TEXTO_SIN_NATILLERA = 'Todavía no estás en ninguna natillera. Pídele el enlace de invitación a quien la administra.';
export const TEXTO_NO_SE_PUDO_LEER = 'No pude traer tu natillera ahora. Vuelve a intentarlo en un rato.';

// La página vive junto al formulario de crear: <MINIAPP_URL>natillera/. Lleva el usuario del bot para
// que «Pedir préstamo» sepa a qué chat volver.
export function urlMiNatillera(config, usuarioBot) {
  const url = new URL('natillera/', config.miniappUrl.endsWith('/') ? config.miniappUrl : `${config.miniappUrl}/`);
  if (usuarioBot) url.searchParams.set('bot', usuarioBot);
  return url.href;
}

// ---------- Textos desde el estado de staging (web/INTEGRACION.md, «Los estados») ----------

const NATILLERA = { CREADA: 0, INICIADA: 1 };
const PARTICIPACION = {
  PENDIENTE_VALIDACION: 0,
  VALIDADA: 1,
  ACTIVA: 2,
  MORA: 3,
  EN_LIQUIDACION: 4,
  EN_REEMBOLSO: 5,
  LIQUIDADA: 6,
  REEMBOLSADA: 7,
};

const nombreHTML = (nombre) => `<b>${escaparHTML(nombre)}</b>`;
const plural = (n, una, varias) => `${n} ${Number(n) === 1 ? una : varias}`;
const LA_PLATA = 'La plata la guarda Financiera Aliada, no el administrador.';

// Antes de cobrar: cuánta gente hay y cuándo arranca. Lo comparten el participante y el administrador.
function lineaArranque(n) {
  if (Number(n.EstadoNatillera) === NATILLERA.INICIADA) {
    return `Ya se pidió la primera cuota: van ${n.PagosPrimeraCuota} de ${n.CupoMinimo} personas que pagaron para arrancar.`;
  }
  return `Arranca el ${formatoFecha(n.FechaInicio)}. Van ${n.ParticipantesValidados} de ${n.CupoMinimo} personas listas.`;
}

const lineaAhorro = (n, p) =>
  `Llevas ${formatoCOP(p.TotalAportado)} ahorrado: ${p.CuotasPagadas} de ${plural(n.NumeroCuotas, 'cuota', 'cuotas')}.`;

// Lo que ve un participante, según el estado de su participación: { texto, teclado? }. Máximo 3 líneas.
export function resumenParticipacion(n, p) {
  const nombre = nombreHTML(n.NombreNatillera);
  const pid = p.ParticipacionId;
  switch (Number(p.EstadoParticipacion)) {
    case PARTICIPACION.PENDIENTE_VALIDACION:
      return {
        texto: [
          `${nombre}: te inscribiste, pero te falta autorizar el cobro de tus cuotas.`,
          `${formatoCOP(n.ValorCuota)} cada mes, hasta el ${formatoFecha(n.FechaFinal, { anio: true })}. Por ahora es una autorización de prueba.`,
        ].join('\n'),
        teclado: new InlineKeyboard().text(BOTON_AUTORIZAR, datoAutorizar(pid)),
      };
    case PARTICIPACION.VALIDADA:
      return {
        texto: [
          `🐷 ${nombre}: tu cobro está autorizado, ${formatoCOP(n.ValorCuota)} cada mes.`,
          lineaArranque(n),
          LA_PLATA,
        ].join('\n'),
      };
    case PARTICIPACION.ACTIVA:
      return {
        texto: [
          `🐷 ${nombre}. ${lineaAhorro(n, p)}`,
          n.FechaProximoCobro
            ? `Tu próxima cuota: ${formatoCOP(n.ValorCuota)} el ${formatoFecha(n.FechaProximoCobro)}.`
            : 'No quedan cuotas por cobrar.',
          `La natillera tiene ${formatoCOP(n.SaldoNatillera)}. La guarda Financiera Aliada.`,
        ].join('\n'),
      };
    case PARTICIPACION.MORA: {
      // Sin emoji ni culpa (voz y tono, mora). Lo pendiente es la cuota más la mora que lleva.
      const pendiente = Number(p.DeudaCuotas) + Number(p.MoraAcumulada);
      return {
        texto: [
          `${nombre}: tienes ${plural(p.CuotasAdeudadas, 'cuota pendiente', 'cuotas pendientes')}, ${formatoCOP(pendiente)} con la mora.`,
          lineaAhorro(n, p),
          'Cuando tengas la plata en tu billetera, toca el botón y lo cobro.',
        ].join('\n'),
        teclado: new InlineKeyboard().text(BOTON_PAGAR_DEUDA, datoBotonDeuda(pid)),
      };
    }
    case PARTICIPACION.EN_LIQUIDACION:
      return {
        texto: [`${nombre} terminó y se está repartiendo la plata.`, lineaAhorro(n, p), 'Te aviso cuando te llegue tu parte.'].join('\n'),
      };
    case PARTICIPACION.LIQUIDADA:
      return { texto: `${nombre} terminó. Te llegó tu parte: ${formatoCOP(p.ParteFinal)}.` };
    case PARTICIPACION.EN_REEMBOLSO:
      return {
        texto: [`${nombre} no completó el cupo para arrancar y se está devolviendo lo aportado.`, 'Te aviso cuando te llegue.'].join('\n'),
      };
    case PARTICIPACION.REEMBOLSADA:
      return { texto: `${nombre} no completó el cupo para arrancar. Ya se te devolvió lo que aportaste.` };
    default:
      return { texto: `${nombre}. ${lineaAhorro(n, p)}` };
  }
}

// El administrador que no ahorra en su natillera: cómo va el arranque y, después, el saldo.
export function resumenAdministra(n) {
  const nombre = nombreHTML(n.NombreNatillera);
  const estado = Number(n.EstadoNatillera);
  if (estado === NATILLERA.CREADA || estado === NATILLERA.INICIADA) {
    return { texto: [`🐷 ${nombre}, la administras.`, lineaArranque(n), 'Para ver a cada persona y el enlace, usa /administrar.'].join('\n') };
  }
  return {
    texto: [`🐷 ${nombre}, la administras. Van ${n.PeriodoActual} de ${plural(n.NumeroCuotas, 'cuota', 'cuotas')}.`, `La natillera tiene ${formatoCOP(n.SaldoNatillera)}. ${LA_PLATA}`].join('\n'),
  };
}

// ---------- El comando ----------

// Para no llenar el chat ni pegarle de más a staging si alguien está en muchas natilleras.
export const MAXIMO_NATILLERAS = 5;

export function miNatillera({ config, registro, servicio, log }) {
  const comandos = new Composer();

  async function conStaging(ctx) {
    const telegramId = ctx.from.id;
    const participaciones = registro.participacionesDe(telegramId);
    const propias = new Set(participaciones.map((p) => p.natillera_id));
    const administradas = registro.natillerasDelAdmin(telegramId).filter((n) => !propias.has(n.natillera_id));

    const pedidos = [
      ...participaciones.map((p) => ({ natillera: registro.natillera(p.natillera_id)?.contract_id, participacion: p.contract_id })),
      ...administradas.map((n) => ({ natillera: n.contract_id })),
    ]
      .filter((pedido) => pedido.natillera)
      .slice(0, MAXIMO_NATILLERAS);
    if (!pedidos.length) {
      await ctx.reply(TEXTO_SIN_NATILLERA);
      return;
    }

    const leer = async (contractId) => estadoDe(await servicio.leerContrato(contractId));
    let resumenes;
    try {
      resumenes = await Promise.all(
        pedidos.map(async ({ natillera, participacion }) => {
          if (!participacion) return resumenAdministra(await leer(natillera));
          const [n, p] = await Promise.all([leer(natillera), leer(participacion)]);
          return resumenParticipacion(n, p);
        }),
      );
    } catch (error) {
      log.error(`/mi_natillera no pudo leer staging para el chat ${telegramId}:`, error);
      await ctx.reply(TEXTO_NO_SE_PUDO_LEER);
      return;
    }
    for (const { texto, teclado } of resumenes) {
      await ctx.reply(texto, { parse_mode: 'HTML', reply_markup: teclado });
    }
  }

  comandos.command('mi_natillera', async (ctx) => {
    if (registro && servicio) {
      await conStaging(ctx);
      return;
    }
    if (!config.miniappUrl) {
      await ctx.reply(MENSAJE_SIN_MINIAPP);
      return;
    }
    await ctx.reply(textoMiNatillera(ctx.from?.first_name), {
      reply_markup: new InlineKeyboard().webApp(BOTON_MI_NATILLERA, urlMiNatillera(config, ctx.me.username)),
    });
  });

  return comandos;
}
