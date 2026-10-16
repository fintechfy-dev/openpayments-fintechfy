import { existsSync } from 'node:fs';
import { crearLogger } from './log.js';
import { listaDeSecretos } from './secretos.js';
import { crearBot, COMANDOS } from './bot/index.js';

// Si no hay .env, se usan las variables del sistema.
if (existsSync('.env')) process.loadEnvFile('.env');

// Lo que nunca puede salir en el log ni en un mensaje. En la tarea 3 sale de loadConfig().
const secretos = listaDeSecretos(process.env.BOT_TOKEN, process.env.EXTERNO_API_KEY);
const log = crearLogger({ secretos });

// Validación provisional: en la tarea 3 la reemplaza loadConfig().
const botToken = process.env.BOT_TOKEN;
if (!botToken) {
  log.error('Falta la variable BOT_TOKEN. Cópiala en .env (ver .env.example).');
  process.exit(1);
}

const bot = crearBot({ botToken }, { log, secretos });

// Enganche de la tarea 10: aquí se montará el servidor HTTP del retorno de Open Payments.

let deteniendo = false;
async function detener(senal) {
  if (deteniendo) return;
  deteniendo = true;
  log.info(`${senal} recibido, apagando el bot...`);
  await bot.stop();
  // Tarea 4: aquí se cierra la base de datos.
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
log.info('Bot apagado.');
