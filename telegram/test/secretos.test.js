import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearLogger } from '../src/log.js';
import { listaDeSecretos, taparSecretos, TAPADO } from '../src/secretos.js';
import { SecretoBloqueadoError } from '../src/bot/index.js';
import { crearBotDePrueba, TOKEN_DE_PRUEBA } from './helpers/bot-prueba.js';

// Captura lo que el logger manda a la consola durante `fn`.
function capturarConsola(fn) {
  const lineas = [];
  const originales = { log: console.log, warn: console.warn, error: console.error };
  for (const nombre of Object.keys(originales)) console[nombre] = (linea) => lineas.push(linea);
  try {
    fn();
  } finally {
    Object.assign(console, originales);
  }
  return lineas;
}

test('los secretos vacíos o ausentes no entran a la lista', () => {
  assert.deepEqual(listaDeSecretos('abc', '', '   ', undefined, null), ['abc']);
});

test('taparSecretos reemplaza todas las apariciones', () => {
  assert.equal(taparSecretos('a TOK b TOK', ['TOK']), `a ${TAPADO} b ${TAPADO}`);
});

test('el log tapa el token en textos, errores y objetos', () => {
  const log = crearLogger({ secretos: [TOKEN_DE_PRUEBA] });
  const lineas = capturarConsola(() => {
    log.info(`url https://api.telegram.org/bot${TOKEN_DE_PRUEBA}/getMe`);
    log.error('falló:', new Error(`token ${TOKEN_DE_PRUEBA} inválido`));
    log.warn({ cabecera: TOKEN_DE_PRUEBA });
  });

  assert.equal(lineas.length, 3);
  for (const linea of lineas) {
    assert.ok(!linea.includes(TOKEN_DE_PRUEBA), `quedó el token en: ${linea}`);
    assert.ok(linea.includes(TAPADO));
  }
});

test('el bot no envía un mensaje que contiene el token', async () => {
  const errores = [];
  const log = { info() {}, warn() {}, error: (...p) => errores.push(p.join(' ')) };
  const { bot, llamadas } = crearBotDePrueba({ log });

  await assert.rejects(
    bot.api.sendMessage(100, `tu token es ${TOKEN_DE_PRUEBA}`),
    SecretoBloqueadoError,
  );

  assert.equal(llamadas.length, 0, 'la llamada no debió llegar a Telegram');
  assert.equal(errores.length, 1);
  assert.ok(!errores[0].includes(TOKEN_DE_PRUEBA));
});

test('el bot no envía un mensaje que contiene otro secreto de la lista', async () => {
  const { bot, llamadas } = crearBotDePrueba({ env: { WEB_INDICE_URL: 'http://localhost:3000', WEB_INDICE_API_KEY: 'llave-externa-xyz' } });

  await assert.rejects(bot.api.sendMessage(100, 'llave: llave-externa-xyz'), SecretoBloqueadoError);
  assert.equal(llamadas.length, 0);
});

test('un mensaje normal sí sale', async () => {
  const { bot, llamadas } = crearBotDePrueba();

  await bot.api.sendMessage(100, 'Hola');

  assert.equal(llamadas.length, 1);
  assert.equal(llamadas[0].payload.text, 'Hola');
});
