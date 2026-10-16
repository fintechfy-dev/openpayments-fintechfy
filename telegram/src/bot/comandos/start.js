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

export function start({ log }) {
  const comandos = new Composer();

  comandos.command('start', async (ctx) => {
    // Sirve para averiguar el TEAM_CHAT_ID: escribir /start desde el chat del equipo y mirar el log.
    log.info(`/start desde chat ${ctx.chat.id} (${ctx.chat.type})`);

    const nombre = ctx.from?.first_name;

    // El payload del enlace profundo (t.me/<bot>?start=<payload>) llega en ctx.match.
    // Enganche de #16: aquí se resolverá la natillera del enlace de invitación.
    if (ctx.match) {
      await ctx.reply(invitacionPronto(nombre));
      return;
    }

    // El botón lo atiende flujos/crear.js, igual que /crear.
    await ctx.reply(bienvenida(nombre), {
      reply_markup: new InlineKeyboard().text('Crear natillera', 'menu:crear'),
    });
  });

  return comandos;
}
