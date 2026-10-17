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

const EXTERNO = Object.freeze({
  SERVICIO_EXTERNO_URL: 'https://externo.example',
  SERVICIO_EXTERNO_TOKEN: 'token-staging',
  DIAS_ESPERA_CUPO: '5',
  PAGOS_PARA_PRESTAMO: '1',
  MULTIPLO_PRESTAMO: '2',
});

const PAGOS = Object.freeze({
  PAGOS_API_KEY: 'llave-clientes',
  OP_WALLET_ADDRESS: 'https://ilp.interledger-test.dev/app',
  OP_KEY_ID: 'key-1',
  OP_PRIVATE_KEY: 'LS0tLS1CRUdJTiBQUklWQVRF',
});

test('las URL de los servicios son opcionales, pero si vienen deben ser http(s)', () => {
  const config = loadConfig({ ...ENV_DE_PRUEBA, ...EXTERNO, ...PAGOS, PAGOS_URL: 'http://localhost:3001' });
  assert.equal(config.externo.url, 'https://externo.example');
  assert.equal(config.pagosUrl, 'http://localhost:3001');

  const errores = erroresDe({ ...ENV_DE_PRUEBA, ...EXTERNO, ...PAGOS, SERVICIO_EXTERNO_URL: 'ftp://x', PAGOS_URL: 'no es url' });
  assert.equal(errores.length, 2);
});

test('con el servicio externo se exigen su token y las reglas del préstamo y del cupo', () => {
  const errores = erroresDe({ ...ENV_DE_PRUEBA, SERVICIO_EXTERNO_URL: 'https://externo.example' });
  for (const nombre of ['SERVICIO_EXTERNO_TOKEN', 'DIAS_ESPERA_CUPO', 'PAGOS_PARA_PRESTAMO', 'MULTIPLO_PRESTAMO']) {
    assert.ok(errores.includes(`Falta la variable ${nombre}.`), `falta el error de ${nombre}`);
  }

  const config = loadConfig({ ...ENV_DE_PRUEBA, ...EXTERNO });
  assert.deepEqual({ ...config.reglasServicio }, { diasEsperaCupo: 5, pagosParaPrestamo: 1, multiploPrestamo: 2 });
  assert.match(erroresDe({ ...ENV_DE_PRUEBA, ...EXTERNO, PAGOS_PARA_PRESTAMO: '0' })[0], /^PAGOS_PARA_PRESTAMO/);
  assert.match(erroresDe({ ...ENV_DE_PRUEBA, ...EXTERNO, MULTIPLO_PRESTAMO: '1.5' })[0], /^MULTIPLO_PRESTAMO/);
});

test('con la API de pagos se exigen su llave y las de Open Payments, y las dos secretas se tapan', () => {
  const errores = erroresDe({ ...ENV_DE_PRUEBA, PAGOS_URL: 'https://pagos.example' });
  assert.deepEqual(errores, ['PAGOS_API_KEY', 'OP_WALLET_ADDRESS', 'OP_KEY_ID', 'OP_PRIVATE_KEY'].map((n) => `Falta la variable ${n}.`));

  const config = loadConfig({ ...ENV_DE_PRUEBA, ...PAGOS, PAGOS_URL: 'https://pagos.example' });
  assert.deepEqual({ ...config.pagos.llaves }, { wallet: PAGOS.OP_WALLET_ADDRESS, keyId: 'key-1', privateKey: PAGOS.OP_PRIVATE_KEY });
  assert.ok(config.secretos.includes('llave-clientes'));
  assert.ok(config.secretos.includes(PAGOS.OP_PRIVATE_KEY));
  // Sin PAGOS_URL no se pide nada: el permiso es de prueba.
  assert.equal(loadConfig(ENV_DE_PRUEBA).pagos.url, undefined);
});

test('el bot no cobra cuotas salvo COBRAR_CUOTAS_BOT=si, y eso exige la API de pagos', () => {
  const conPagos = { ...ENV_DE_PRUEBA, ...PAGOS, PAGOS_URL: 'https://pagos.example' };
  assert.equal(loadConfig(conPagos).cobrarCuotasBot, false);
  assert.equal(loadConfig({ ...conPagos, COBRAR_CUOTAS_BOT: 'no' }).cobrarCuotasBot, false);
  assert.equal(loadConfig({ ...conPagos, COBRAR_CUOTAS_BOT: 'SI' }).cobrarCuotasBot, true);
  assert.deepEqual(erroresDe({ ...conPagos, COBRAR_CUOTAS_BOT: 'true' }), ['COBRAR_CUOTAS_BOT debe ser «si» o «no».']);
  assert.deepEqual(erroresDe({ ...ENV_DE_PRUEBA, COBRAR_CUOTAS_BOT: 'si' }), ['COBRAR_CUOTAS_BOT=si necesita PAGOS_URL.']);
});

test('el índice de la web pide su llave y el puerto de avisos debe ser válido', () => {
  assert.deepEqual(erroresDe({ ...ENV_DE_PRUEBA, WEB_INDICE_URL: 'http://localhost:3000' }), ['Falta la variable WEB_INDICE_API_KEY.']);
  assert.equal(loadConfig({ ...ENV_DE_PRUEBA, AVISOS_PUERTO: '8080' }).avisos.puerto, 8080);
  assert.match(erroresDe({ ...ENV_DE_PRUEBA, AVISOS_PUERTO: '99999' })[0], /^AVISOS_PUERTO/);
});

test('el token de staging y la llave de la web entran a la lista de secretos', () => {
  const config = loadConfig({ ...ENV_DE_PRUEBA, ...EXTERNO, WEB_INDICE_URL: 'http://localhost:3000', WEB_INDICE_API_KEY: 'llave-web' });
  assert.deepEqual([...config.secretos], [TOKEN_DE_PRUEBA, 'token-staging', 'llave-web']);
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
