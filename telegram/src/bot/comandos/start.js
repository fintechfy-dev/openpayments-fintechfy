import { Composer } from 'grammy';

export const BIENVENIDA =
  'Hola, soy el bot de Natillera 2.0. Aquí tu grupo ahorra junto para diciembre, ' +
  'y el dinero lo guarda una financiera, no una persona: nadie del grupo puede moverlo ' +
  'por fuera de las reglas, ni siquiera el administrador.';

export const INVITACION_PRONTO =
  'Recibí tu enlace de invitación, pero unirse a una natillera todavía no está disponible. ' +
  'Vuelve a abrir el enlace en un rato.';

export function start({ log }) {
  const comandos = new Composer();

  comandos.command('start', async (ctx) => {
    // Sirve para averiguar el TEAM_CHAT_ID: escribir /start desde el chat del equipo y mirar el log.
    log.info(`/start desde chat ${ctx.chat.id} (${ctx.chat.type})`);

    // El payload del enlace profundo (t.me/<bot>?start=<payload>) llega en ctx.match.
    // Enganche de la tarea 7: aquí se resolverá la natillera del enlace de invitación.
    if (ctx.match) {
      await ctx.reply(INVITACION_PRONTO);
      return;
    }

    await ctx.reply(BIENVENIDA);
  });

  return comandos;
}
