import { Bot, GrammyError, HttpError, session } from 'grammy';
import { contieneSecreto } from '../secretos.js';
import { start } from './comandos/start.js';
import { diag } from './comandos/diag.js';
import { cancelar } from './comandos/cancelar.js';
import { crearMotorDeFlujos } from './flujo.js';
import { almacenDeSesiones } from './sesion-storage.js';
import { eco, flujoEco } from './flujos/eco.js';

// Menú de comandos que se publica en Telegram. /diag y /eco no van aquí: no se anuncian.
export const COMANDOS = [
  { command: 'start', description: 'Empezar' },
  { command: 'cancelar', description: 'Cancelar lo que estás haciendo' },
];

// Sin emoji ni culpa (guía de voz y tono): el problema es nuestro, no de la persona.
export const MENSAJE_ERROR = 'Algo no salió bien de nuestro lado. Intenta de nuevo en un momento.';

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
// `config` sale de loadConfig(); sus `secretos` nunca se pueden enviar.
// `db` es la base de abrirBaseDeDatos(); sin ella, las sesiones quedan en memoria y se pierden al
// reiniciar. `botInfo`, `cliente`, `inicio` y `ahora` son opcionales: en las pruebas evitan getMe y
// la red y fijan el reloj.
export function crearBot(config, { log, db, botInfo, cliente, inicio, ahora } = {}) {
  const bot = new Bot(config.botToken, { botInfo, client: cliente });

  bot.api.config.use(guardiaDeSecretos(config.secretos, log));

  const manejarError = manejadorDeErrores(log);

  // bot.catch solo actúa con bot.start(); errorBoundary también cubre handleUpdate
  // (pruebas y un posible webhook). Todo el middleware de la app va dentro de `app`.
  bot.catch(manejarError);
  const app = bot.errorBoundary(manejarError);

  // La clave de sesión es el id del chat (chats privados). Si el bot se usa en grupos: chat + usuario.
  app.use(session({ initial: () => ({ flujo: null }), storage: db ? almacenDeSesiones(db) : undefined }));

  const motor = crearMotorDeFlujos();
  motor.registrar(flujoEco(config));

  app.use(start({ log }));
  app.use(cancelar());
  app.use(diag({ config, db, inicio, ahora }));
  app.use(eco({ motor }));
  app.use(motor.middleware());

  return bot;
}
