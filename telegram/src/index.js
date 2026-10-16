import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { crearLogger } from './log.js';
import { loadConfig, ConfigError } from './config.js';
import { crearBot, COMANDOS } from './bot/index.js';
import { abrirBaseDeDatos } from './db.js';
import { TEXTO_MENU, urlMiNatillera } from './bot/comandos/mi-natillera.js';

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

const log = crearLogger({ secretos: config.secretos });
const db = abrirBaseDeDatos(config.dbPath);
log.info(`Sesiones en ${config.dbPath}.`);
const bot = crearBot(config, { log, db });

// Enganche de #6: si los avisos llegan por webhook, aquí se monta el servidor HTTP del bot.

let deteniendo = false;
async function detener(senal) {
  if (deteniendo) return;
  deteniendo = true;
  log.info(`${senal} recibido, apagando el bot...`);
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
  db.close();
}
