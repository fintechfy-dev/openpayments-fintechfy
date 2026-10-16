import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearBotDePrueba, mensaje } from './helpers/bot-prueba.js';
import { BIENVENIDA, INVITACION_PRONTO } from '../src/bot/comandos/start.js';
import { MENSAJE_ERROR } from '../src/bot/index.js';

test('/start sin enlace responde la bienvenida', async () => {
  const { bot, llamadas } = crearBotDePrueba();
  await bot.handleUpdate(mensaje('/start'));

  assert.equal(llamadas.length, 1);
  assert.equal(llamadas[0].method, 'sendMessage');
  assert.equal(llamadas[0].payload.chat_id, 100);
  assert.equal(llamadas[0].payload.text, BIENVENIDA);
});

test('/start con payload de invitación avisa que aún no está disponible', async () => {
  const { bot, llamadas } = crearBotDePrueba();
  await bot.handleUpdate(mensaje('/start abc123'));

  assert.equal(llamadas[0].payload.text, INVITACION_PRONTO);
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
