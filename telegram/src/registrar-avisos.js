import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadConfig, ConfigError } from './config.js';
import { crearClienteExterno } from './externo/cliente.js';
import { EVENTOS } from './avisos/mensajes.js';
import { archivoDeSecretos, guardarSecretosDeAvisos, leerSecretosDeAvisos } from './avisos/webhook.js';

// Registra en staging un webhook por cada evento que el bot anuncia, en <url>/<Evento>: la entrega no
// trae el nombre del evento y la URL es la única forma de saberlo. Se corre una vez por URL:
//   npm run registrar-avisos -- https://<túnel>/avisos
// Staging devuelve el secreto de cada uno UNA sola vez; se guardan en telegram/data/ (fuera de git) y
// nunca se imprimen.

const ENV = fileURLToPath(new URL('../.env', import.meta.url));
if (existsSync(ENV)) process.loadEnvFile(ENV);

const base = process.argv[2]?.replace(/\/+$/, '');
if (!base?.startsWith('https://')) {
  console.error('Uso: npm run registrar-avisos -- https://<url pública del bot>/avisos');
  process.exit(1);
}

let config;
try {
  config = loadConfig(process.env);
} catch (error) {
  if (!(error instanceof ConfigError)) throw error;
  console.error(error.message);
  process.exit(1);
}
if (!config.externo.url) {
  console.error('Falta SERVICIO_EXTERNO_URL en telegram/.env.');
  process.exit(1);
}

const servicio = crearClienteExterno(config.externo);
const ruta = archivoDeSecretos(config.dbPath);
const secretos = leerSecretosDeAvisos(ruta);
const fallidos = [];

for (const evento of EVENTOS) {
  try {
    const { signingSecret } = await servicio.registrarWebhook(`${base}/${evento}`, [evento]);
    if (!signingSecret) throw new Error('la respuesta no trajo signingSecret');
    secretos[evento] = signingSecret;
    // Se guarda en cada vuelta: si el proceso se corta, los secretos ya entregados no se pierden.
    guardarSecretosDeAvisos(ruta, secretos);
  } catch (error) {
    fallidos.push(`${evento}: ${error.message}`);
  }
}

console.log(`Webhooks registrados: ${EVENTOS.length - fallidos.length} de ${EVENTOS.length}, en ${base}/<Evento>.`);
console.log(`Secretos guardados en ${ruta}.`);
if (fallidos.length > 0) {
  console.error(`No se registraron:\n- ${fallidos.join('\n- ')}`);
  process.exitCode = 1;
}
