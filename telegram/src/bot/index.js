import { Bot, GrammyError, HttpError, session } from 'grammy';
import { contieneSecreto } from '../secretos.js';
import { start } from './comandos/start.js';
import { diag } from './comandos/diag.js';
import { cancelar } from './comandos/cancelar.js';
import { crearMotorDeFlujos } from './flujo.js';
import { almacenDeSesiones } from './sesion-storage.js';
import { crear, flujoCrear } from './flujos/crear.js';
import { miNatillera } from './comandos/mi-natillera.js';
import { cobros } from './comandos/cobros.js';
import { invitar } from './comandos/invitar.js';
import { administrar } from './comandos/administrar.js';
import { reloj } from './comandos/reloj.js';
import { crearCobros } from '../externo/cobros.js';
import { crearUnirseBot, flujoUnirse } from './flujos/unirse.js';
import { crearPrestamoBot, flujoPrestamo } from './flujos/prestamo.js';

// Menú de comandos que se publica en Telegram. /diag no va aquí: no se anuncia.
export const COMANDOS = [
  { command: 'start', description: 'Empezar' },
  { command: 'mi_natillera', description: 'Ver mi ahorro, las reglas y mis cobros' },
  { command: 'prestamo', description: 'Pedir un préstamo a Financiera Aliada' },
  { command: 'crear', description: 'Crear una natillera' },
  { command: 'administrar', description: 'Ver y administrar tus natilleras' },
  { command: 'invitar', description: 'Compartir el enlace de tu natillera' },
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
// reiniciar. `crearNatillera(datos, ctx)` crea la natillera en staging; sin ella, /crear termina en una
// vista previa. `servicio` (cliente de staging) y `registro` activan los botones de cobro de los avisos;
// con `unirse` (src/externo/unirse.js) además el enlace de invitación, unirse y autorizar. Con `pagos`
// (cliente de la API de pagos), /reloj cobra de verdad las cuotas que staging registra (externo/cobros.js).
// `botInfo`, `cliente`, `inicio`, `ahora`, `hoy` y `esperar` son opcionales: en las pruebas evitan getMe
// y la red y fijan el reloj y la fecha.
export function crearBot(config, { log, db, crearNatillera, servicio, registro, unirse, web, pagos, botInfo, cliente, inicio, ahora, hoy, esperar } = {}) {
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
  motor.registrar(flujoCrear(config, { hoy, crearNatillera }));

  const conUnirse = Boolean(registro && unirse);
  let unirseBot;
  if (conUnirse) {
    motor.registrar(flujoUnirse({ registro, unirse, log }));
    unirseBot = crearUnirseBot({ registro, unirse, motor, log });
  }
  let prestamoBot;
  if (servicio && registro) {
    motor.registrar(flujoPrestamo({ registro, servicio, web, log, hoy, ahora }));
    prestamoBot = crearPrestamoBot({ registro, servicio, motor, log, hoy });
  }

  // Antes de start: atiende /start mi_natillera (el botón «Traer mis datos» de la Mini App).
  app.use(miNatillera({ config, registro, servicio, log, ahora, hoy }));
  app.use(
    start({
      log,
      abrirInvitacion: unirseBot?.abrirInvitacion,
      abrirPrestamo: prestamoBot?.abrirPrestamo,
      volverDePermiso: unirse?.conPagos ? unirseBot?.volverDePermiso : undefined,
    }),
  );
  app.use(cancelar({ motor }));
  app.use(diag({ config, db, inicio, ahora }));
  if (registro) app.use(invitar({ registro }));
  if (servicio && registro) {
    app.use(cobros({ servicio, registro, log }));
    app.use(administrar({ config, registro, servicio, log, ahora }));
    app.use(prestamoBot.comandos);
    const cobrador = pagos && config.cobrarCuotasBot
      ? crearCobros({ registro, servicio, pagos, log, esperar, avisar: (chatId, texto) => bot.api.sendMessage(chatId, texto, { parse_mode: 'HTML' }) })
      : undefined;
    app.use(reloj({ config, registro, servicio, log, cobrador }));
  }
  if (conUnirse) {
    app.use(unirseBot.comandos);
  }
  // Antes del motor: «Responder aquí» y el formulario de la Mini App no son respuestas de un flujo.
  app.use(crear({ config, motor, log, hoy }));
  app.use(motor.middleware());

  return bot;
}
