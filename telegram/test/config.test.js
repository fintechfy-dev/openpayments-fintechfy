import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig, ConfigError } from '../src/config.js';
import { ENV_DE_PRUEBA, TOKEN_DE_PRUEBA } from './helpers/bot-prueba.js';

function erroresDe(env) {
  try {
    loadConfig(env);
  } catch (error) {
    assert.ok(error instanceof ConfigError);
    return error.errores;
  }
  assert.fail('se esperaba un ConfigError');
}

test('una configuración válida queda tipada y congelada', () => {
  const config = loadConfig(ENV_DE_PRUEBA);

  assert.equal(config.botToken, TOKEN_DE_PRUEBA);
  assert.equal(config.teamChatId, '-999');
  assert.deepEqual({ ...config.cuota }, { min: 10000, max: 500000 });
  assert.equal(config.moraDiariaMaxPct, 2.5);
  assert.equal(config.dbPath, './data/bot.db');
  assert.equal(config.externo.url, undefined);
  assert.deepEqual([...config.secretos], [TOKEN_DE_PRUEBA]);
  assert.ok(Object.isFrozen(config));
  assert.ok(Object.isFrozen(config.cuota));
});

test('sin variables, reporta todas las obligatorias juntas', () => {
  const errores = erroresDe({});

  for (const nombre of ['BOT_TOKEN', 'TEAM_CHAT_ID', 'CUOTA_MIN', 'CUOTA_MAX', 'MORA_DIARIA_MAX_PCT']) {
    assert.ok(errores.includes(`Falta la variable ${nombre}.`), `falta el error de ${nombre}`);
  }
  assert.equal(errores.length, 5);
});

test('una variable con solo espacios cuenta como faltante', () => {
  assert.deepEqual(erroresDe({ ...ENV_DE_PRUEBA, BOT_TOKEN: '   ' }), ['Falta la variable BOT_TOKEN.']);
});

test('CUOTA_MIN debe ser menor que CUOTA_MAX', () => {
  assert.deepEqual(erroresDe({ ...ENV_DE_PRUEBA, CUOTA_MIN: '500000' }), [
    'CUOTA_MIN debe ser menor que CUOTA_MAX.',
  ]);
});

test('las cuotas deben ser números mayores que 0', () => {
  const errores = erroresDe({ ...ENV_DE_PRUEBA, CUOTA_MIN: '0', CUOTA_MAX: 'mucho' });
  assert.equal(errores.length, 2);
  assert.match(errores[0], /^CUOTA_MIN debe ser un número mayor que 0/);
  assert.match(errores[1], /^CUOTA_MAX debe ser un número mayor que 0/);
});

test('la mora diaria máxima puede ser 0 pero no negativa', () => {
  assert.equal(loadConfig({ ...ENV_DE_PRUEBA, MORA_DIARIA_MAX_PCT: '0' }).moraDiariaMaxPct, 0);
  assert.match(erroresDe({ ...ENV_DE_PRUEBA, MORA_DIARIA_MAX_PCT: '-1' })[0], /^MORA_DIARIA_MAX_PCT/);
});

test('TEAM_CHAT_ID debe ser un entero, también negativo', () => {
  assert.equal(loadConfig({ ...ENV_DE_PRUEBA, TEAM_CHAT_ID: '123' }).teamChatId, '123');
  assert.match(erroresDe({ ...ENV_DE_PRUEBA, TEAM_CHAT_ID: '12a' })[0], /^TEAM_CHAT_ID/);
});

test('las URL de los servicios son opcionales, pero si vienen deben ser http(s)', () => {
  const config = loadConfig({
    ...ENV_DE_PRUEBA,
    EXTERNO_URL: 'https://externo.example',
    PAGOS_URL: 'http://localhost:3001',
  });
  assert.equal(config.externo.url, 'https://externo.example');
  assert.equal(config.pagosUrl, 'http://localhost:3001');

  const errores = erroresDe({ ...ENV_DE_PRUEBA, EXTERNO_URL: 'ftp://x', PAGOS_URL: 'no es url' });
  assert.equal(errores.length, 2);
});

test('la llave del servicio externo entra a la lista de secretos', () => {
  const config = loadConfig({ ...ENV_DE_PRUEBA, EXTERNO_API_KEY: 'llave-xyz' });
  assert.deepEqual([...config.secretos], [TOKEN_DE_PRUEBA, 'llave-xyz']);
});

test('los mensajes de error nunca incluyen el valor de la variable', () => {
  const error = (() => {
    try {
      loadConfig({ ...ENV_DE_PRUEBA, TEAM_CHAT_ID: TOKEN_DE_PRUEBA, CUOTA_MIN: 'valor-raro' });
    } catch (e) {
      return e;
    }
  })();

  assert.ok(error instanceof ConfigError);
  assert.ok(!error.message.includes(TOKEN_DE_PRUEBA));
  assert.ok(!error.message.includes('valor-raro'));
});
