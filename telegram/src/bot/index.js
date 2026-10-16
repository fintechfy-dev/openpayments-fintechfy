import { Bot, GrammyError, HttpError } from 'grammy';
import { contieneSecreto } from '../secretos.js';
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

export class SecretoBloqueadoError extends Error {
  constructor(method) {
    super(`Se bloqueó ${method}: el contenido incluía un secreto.`);
    this.name = 'SecretoBloqueadoError';
  }
}

// Guardia de salida (US-002-SEC): ninguna llamada a Telegram puede llevar un secreto.
// Revisa el contenido de la llamada, no la URL, que siempre lleva el token.
function guardiaDeSecretos(secretos, log) {
  return (prev, method, payload, signal) => {
    if (payload && contieneSecreto(JSON.stringify(payload), secretos)) {
      log.error(`Se bloqueó ${method}: el contenido incluía un secreto.`);
      throw new SecretoBloqueadoError(method);
    }
    return prev(method, payload, signal);
  };
}

// Arma el bot sin arrancarlo, para poder probarlo sin conexión.
// `secretos`: valores que el bot nunca puede enviar (al menos el token).
// `botInfo` y `cliente` son opcionales: en las pruebas evitan la llamada a getMe y la red.
export function crearBot(config, { log, secretos = [config.botToken], botInfo, cliente } = {}) {
  const bot = new Bot(config.botToken, { botInfo, client: cliente });

  bot.api.config.use(guardiaDeSecretos(secretos, log));

  const manejarError = manejadorDeErrores(log);

  // bot.catch solo actúa con bot.start(); errorBoundary también cubre handleUpdate
  // (pruebas y un posible webhook). Todo el middleware de la app va dentro de `app`.
  bot.catch(manejarError);
  const app = bot.errorBoundary(manejarError);

  app.use(start({ log }));

  return bot;
}
