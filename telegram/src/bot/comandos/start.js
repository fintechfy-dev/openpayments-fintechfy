import { Composer, InlineKeyboard } from 'grammy';

// Textos según la guía de voz y tono (design-system/docs/voz-y-tono.md): tuteo, el nombre al inicio,
// máximo 3 líneas, la plata siempre ubicada y a lo sumo un emoji (ninguno en errores).

export function bienvenida(nombre) {
  const saludo = nombre ? `👋 ¡Hola, ${nombre}!` : '👋 ¡Hola!';
  return [
    `${saludo} Aquí tu grupo ahorra junto para diciembre.`,
    'La plata la guarda Financiera Aliada, no una persona. Nadie del grupo la puede sacar, ni el administrador.',
  ].join('\n');
}

export function invitacionPronto(nombre) {
  return [
    nombre ? `Hola, ${nombre}. Recibí tu invitación.` : 'Hola. Recibí tu invitación.',
    'Todavía no puedes unirte desde aquí. Vuelve a abrir el enlace en un rato.',
  ].join('\n');
}

// Llega desde «Pedir préstamo» de la Mini App (t.me/<bot>?start=prestamo). Enganche de US-014 (#29).
export const PAYLOAD_PRESTAMO = 'prestamo';

export function prestamoPronto(nombre) {
  return [
    nombre ? `${nombre}, recibí que quieres pedir un préstamo.` : 'Recibí que quieres pedir un préstamo.',
    'Todavía no se puede pedir desde aquí. Te avisamos apenas Financiera Aliada lo abra.',
  ].join('\n');
}

// `abrirInvitacion(ctx, codigo)` llega con la integración con staging (flujos/unirse.js); sin ella, el
// enlace responde que todavía no se puede unir.
export function start({ log, abrirInvitacion }) {
  const comandos = new Composer();

  comandos.command('start', async (ctx) => {
    // Sirve para averiguar el TEAM_CHAT_ID: escribir /start desde el chat del equipo y mirar el log.
    log.info(`/start desde chat ${ctx.chat.id} (${ctx.chat.type})`);

    const nombre = ctx.from?.first_name;

    // El payload del enlace profundo (t.me/<bot>?start=<payload>) llega en ctx.match.
    if (ctx.match === PAYLOAD_PRESTAMO) {
      await ctx.reply(prestamoPronto(nombre));
      return;
    }
    if (ctx.match) {
      if (abrirInvitacion) await abrirInvitacion(ctx, ctx.match);
      else await ctx.reply(invitacionPronto(nombre));
      return;
    }

    // El botón lo atiende flujos/crear.js, igual que /crear.
    await ctx.reply(bienvenida(nombre), {
      reply_markup: new InlineKeyboard().text('Crear natillera', 'menu:crear'),
    });
  });

  return comandos;
}
