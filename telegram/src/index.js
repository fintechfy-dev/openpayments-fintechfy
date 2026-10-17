import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { crearLogger } from './log.js';
import { loadConfig, ConfigError } from './config.js';
import { crearBot, COMANDOS } from './bot/index.js';
import { abrirBaseDeDatos } from './db.js';
import { TEXTO_MENU, urlMiNatillera } from './bot/comandos/mi-natillera.js';
import { crearRegistro } from './registro.js';
import { crearClienteExterno } from './externo/cliente.js';
import { crearNatilleraEnServicio } from './externo/crear-natillera.js';
import { crearUnirse } from './externo/unirse.js';
import { crearAvisoWeb } from './web/indice.js';
import { crearDespachador } from './avisos/despachar.js';
import { archivoDeSecretos, iniciarWebhookDeAvisos, leerSecretosDeAvisos } from './avisos/webhook.js';
import { escucharFlujoDeAvisos } from './avisos/flujo-en-vivo.js';

// telegram/.env, se arranque desde donde se arranque. Si no existe, se usan las variables del sistema.
const ENV = fileURLToPath(new URL('../.env', import.meta.url));
if (existsSync(ENV)) process.loadEnvFile(ENV);

let config;
try {
  config = loadConfig(process.env);
} catch (error) {
  if (!(error instanceof ConfigError)) throw error;
  // Los errores de configuración nombran la variable, nunca su valor.
  crearLogger().error(`${error.message}\nRevisa telegram/.env (la lista está en .env.example).`);
  process.exit(1);
}

// Con webhook, sus secretos (uno por evento) se tapan igual que los del .env en el log y en Telegram.
const secretosDeAvisos = config.avisos.puerto ? leerSecretosDeAvisos(archivoDeSecretos(config.dbPath)) : {};
if (config.avisos.puerto && Object.keys(secretosDeAvisos).length === 0) {
  crearLogger().error('AVISOS_PUERTO está puesto pero no hay webhooks registrados. Corre: npm run registrar-avisos -- https://<túnel>/avisos');
  process.exit(1);
}
config = Object.freeze({ ...config, secretos: Object.freeze([...config.secretos, ...Object.values(secretosDeAvisos)]) });

const log = crearLogger({ secretos: config.secretos });
const db = abrirBaseDeDatos(config.dbPath);
log.info(`Sesiones en ${config.dbPath}.`);
const registro = crearRegistro(db);

// Staging (telegram/INTEGRACION.md). Sin SERVICIO_EXTERNO_URL el bot arranca igual: /crear termina en
// una vista previa y no hay avisos.
const servicio = config.externo.url ? crearClienteExterno(config.externo) : undefined;
const web = config.webIndice.url ? crearAvisoWeb({ ...config.webIndice, log }) : undefined;
if (servicio && !web) log.warn('Sin WEB_INDICE_URL: la web no se enterará de las natilleras que se creen.');
const crearNatillera = servicio
  ? crearNatilleraEnServicio({ servicio, registro, web, reglasServicio: config.reglasServicio, log })
  : undefined;
if (!servicio) log.warn('Sin SERVICIO_EXTERNO_URL: /crear termina en una vista previa y no llegan avisos.');

const unirse = servicio ? crearUnirse({ servicio, registro, web, log }) : undefined;

const bot = crearBot(config, { log, db, crearNatillera, servicio, registro, unirse, web });

// Avisos de staging (#6): por webhook si hay puerto, si no, por el flujo en vivo.
const avisos = new AbortController();
let servidorDeAvisos;
if (servicio) {
  const despachador = crearDespachador({ api: bot.api, registro, log });
  if (config.avisos.puerto) {
    servidorDeAvisos = iniciarWebhookDeAvisos({ puerto: config.avisos.puerto, secretos: secretosDeAvisos, aviso: despachador.aviso, log });
  } else {
    escucharFlujoDeAvisos({ servicio, procesar: despachador.cascada, log, signal: avisos.signal });
  }
}

let deteniendo = false;
async function detener(senal) {
  if (deteniendo) return;
  deteniendo = true;
  log.info(`${senal} recibido, apagando el bot...`);
  avisos.abort();
  servidorDeAvisos?.close();
  await bot.stop();
}
// `on` y no `once`: una señal que llega antes de que arranque el polling no debe dejar el proceso
// sin manejador. Si llega antes, el bot simplemente no arranca.
process.on('SIGINT', () => detener('SIGINT'));
process.on('SIGTERM', () => detener('SIGTERM'));

try {
  await bot.api.setMyCommands(COMANDOS);
} catch (error) {
  log.warn(`No se pudo publicar el menú de comandos: ${error.message}`);
}

// Botón «Mi natillera» junto al cuadro de texto, en todos los chats privados con el bot.
if (config.miniappUrl) {
  try {
    await bot.init();
    await bot.api.setChatMenuButton({
      menu_button: { type: 'web_app', text: TEXTO_MENU, web_app: { url: urlMiNatillera(config, bot.botInfo.username) } },
    });
  } catch (error) {
    log.warn(`No se pudo poner el botón «${TEXTO_MENU}»: ${error.message}`);
  }
}

// Long polling (decisión D-03). La promesa termina cuando se llama a bot.stop().
try {
  if (!deteniendo) {
    await bot.start({
      onStart: (info) => log.info(`Bot @${info.username} escuchando (long polling).`),
    });
  }
  log.info('Bot apagado.');
} catch (error) {
  // Sin red, grammY guarda en error.error el error de node-fetch, cuyo mensaje trae la URL de Telegram
  // con el token. Se registra con el logger, que tapa secretos; si se dejara escapar, Node lo imprimiría
  // completo.
  log.error('El bot no pudo arrancar:', error);
  process.exitCode = 1;
} finally {
  // Después de que bot.start() termina: así ninguna actualización en curso escribe en una base cerrada.
  // Los avisos se cortan también aquí: si el bot no arrancó, dejarían el proceso vivo y sin bot.
  avisos.abort();
  servidorDeAvisos?.close();
  db.close();
}
