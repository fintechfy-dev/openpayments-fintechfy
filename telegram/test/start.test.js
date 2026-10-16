import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearBotDePrueba, mensaje } from './helpers/bot-prueba.js';
import { bienvenida, invitacionPronto } from '../src/bot/comandos/start.js';
import { MENSAJE_ERROR } from '../src/bot/index.js';

// Palabras que la guía de voz y tono prohíbe en los mensajes.
const PROHIBIDAS = /interledger|ilp|grant|wallet|token|blockchain|cripto|transacci|payment pointer|moroso|debes/i;

test('/start sin enlace responde la bienvenida con el nombre', async () => {
  const { bot, llamadas } = crearBotDePrueba();
  await bot.handleUpdate(mensaje('/start'));

  assert.equal(llamadas.length, 1);
  assert.equal(llamadas[0].method, 'sendMessage');
  assert.equal(llamadas[0].payload.chat_id, 100);
  assert.equal(llamadas[0].payload.text, bienvenida('Ana'));
  assert.match(llamadas[0].payload.text, /^👋 ¡Hola, Ana!/);
});

test('/start con payload de invitación avisa que aún no está disponible', async () => {
  const { bot, llamadas } = crearBotDePrueba();
  await bot.handleUpdate(mensaje('/start abc123'));

  assert.equal(llamadas[0].payload.text, invitacionPronto('Ana'));
});

test('los textos cumplen la guía de voz y tono', () => {
  const textos = [bienvenida('Ana'), bienvenida(undefined), invitacionPronto('Ana'), MENSAJE_ERROR];
  for (const texto of textos) {
    assert.ok(texto.split('\n').length <= 3, `más de 3 líneas: ${texto}`);
    assert.ok(!PROHIBIDAS.test(texto), `palabra prohibida en: ${texto}`);
  }
  assert.match(bienvenida('Ana'), /La plata la guarda Financiera Aliada/);
  assert.equal(bienvenida(undefined).split('\n')[0], '👋 ¡Hola! Aquí tu grupo ahorra junto para diciembre.');
  // Sin emoji en los errores.
  assert.ok(!/\p{Extended_Pictographic}/u.test(MENSAJE_ERROR));
});

test('un error en un manejador responde el mensaje genérico', async () => {
  const errores = [];
  // /start llama a log.info; si eso lanza, el error sale desde dentro del manejador.
  const log = {
    info() {
      throw new Error('explotó');
    },
    warn() {},
    error: (...p) => errores.push(p),
  };
  const { bot, llamadas } = crearBotDePrueba({ log });

  await bot.handleUpdate(mensaje('/start'));

  assert.equal(errores.length, 1);
  assert.equal(llamadas.at(-1).payload.text, MENSAJE_ERROR);
});
