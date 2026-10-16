import { existsSync } from 'node:fs';
import { crearLogger } from './log.js';
import { loadConfig, ConfigError } from './config.js';
import { crearBot, COMANDOS } from './bot/index.js';
import { abrirBaseDeDatos } from './db.js';

// Si no hay .env, se usan las variables del sistema.
if (existsSync('.env')) process.loadEnvFile('.env');

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
process.once('SIGINT', () => detener('SIGINT'));
process.once('SIGTERM', () => detener('SIGTERM'));

try {
  await bot.api.setMyCommands(COMANDOS);
} catch (error) {
  log.warn(`No se pudo publicar el menú de comandos: ${error.message}`);
}

// Long polling (decisión D-03). La promesa termina cuando se llama a bot.stop().
await bot.start({
  onStart: (info) => log.info(`Bot @${info.username} escuchando (long polling).`),
});
// Se cierra después de que bot.start() termina: así ninguna actualización en curso escribe en una
// base ya cerrada.
db.close();
log.info('Bot apagado.');
