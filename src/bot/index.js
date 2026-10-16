import { Bot, GrammyError, HttpError } from 'grammy';
import { start } from './comandos/start.js';

// Menú de comandos que se publica en Telegram. /diag no va aquí: no se anuncia.
export const COMANDOS = [
  { command: 'start', description: 'Empezar' },
];

export const MENSAJE_ERROR = 'Algo falló, intenta de nuevo.';

function manejadorDeErrores(log) {
  return async ({ ctx, error }) => {
    if (error instanceof GrammyError) {
      log.error(`Telegram rechazó ${error.method}: ${error.description}`);
    } else if (error instanceof HttpError) {
      log.error(`No se pudo contactar a Telegram: ${error.message}`);
    } else {
      log.error(`Error atendiendo la actualización ${ctx.update.update_id}:`, error);
    }

    try {
      await ctx.reply(MENSAJE_ERROR);
    } catch {
      // Si ni siquiera se puede responder, ya quedó en el log.
    }
  };
}

// Arma el bot sin arrancarlo, para poder probarlo sin conexión.
// `botInfo` es opcional: en las pruebas evita la llamada a getMe.
export function crearBot(config, { log, botInfo } = {}) {
  const bot = new Bot(config.botToken, botInfo ? { botInfo } : undefined);
  const manejarError = manejadorDeErrores(log);

  // bot.catch solo actúa con bot.start(); errorBoundary también cubre handleUpdate
  // (pruebas y un posible webhook). Todo el middleware de la app va dentro de `app`.
  bot.catch(manejarError);
  const app = bot.errorBoundary(manejarError);

  app.use(start({ log }));

  return bot;
}
