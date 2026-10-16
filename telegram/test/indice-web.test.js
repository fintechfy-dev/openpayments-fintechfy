import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearAvisoWeb } from '../src/web/indice.js';

function logQueGuarda() {
  const lineas = [];
  const guardar = (...partes) => lineas.push(partes.map(String).join(' '));
  return { lineas, info: guardar, warn: guardar, error: guardar };
}

function webFalsa(estados) {
  const llamadas = [];
  const fetch = async (url, init) => {
    llamadas.push({ url: String(url), headers: init.headers, cuerpo: JSON.parse(init.body) });
    const estado = estados[Math.min(llamadas.length - 1, estados.length - 1)];
    if (estado === 'red') throw new Error('ECONNREFUSED');
    return new Response(null, { status: estado });
  };
  return { llamadas, fetch };
}

const sinEspera = async () => {};

test('avisa la natillera con la X-Api-Key a la ruta del índice', async () => {
  const { llamadas, fetch } = webFalsa([201]);
  const web = crearAvisoWeb({ url: 'http://localhost:3000/', apiKey: 'llave-web', log: logQueGuarda(), fetch, esperar: sinEspera });

  assert.equal(await web.natillera({ natilleraId: 'nat-1' }), true);
  assert.equal(llamadas[0].url, 'http://localhost:3000/api/indice/natilleras');
  assert.equal(llamadas[0].headers['X-Api-Key'], 'llave-web');
  assert.deepEqual(llamadas[0].cuerpo, { natilleraId: 'nat-1' });
});

test('reintenta las caídas y los 5xx, y para al primer éxito', async () => {
  const { llamadas, fetch } = webFalsa(['red', 503, 200]);
  const web = crearAvisoWeb({ url: 'http://w', apiKey: 'k', log: logQueGuarda(), fetch, esperar: sinEspera });

  assert.equal(await web.natillera({ natilleraId: 'nat-1' }), true);
  assert.equal(llamadas.length, 3);
});

test('agotados los intentos, no lanza y deja el cuerpo en el log para cargarlo a mano', async () => {
  const log = logQueGuarda();
  const { llamadas, fetch } = webFalsa([500]);
  const web = crearAvisoWeb({ url: 'http://w', apiKey: 'k', log, fetch, esperar: sinEspera });

  assert.equal(await web.natillera({ natilleraId: 'nat-1' }), false);
  assert.equal(llamadas.length, 3);
  assert.match(log.lineas.at(-1), /cargarlo a mano/);
});

test('un 4xx no se reintenta', async () => {
  const { llamadas, fetch } = webFalsa([401]);
  const web = crearAvisoWeb({ url: 'http://w', apiKey: 'k', log: logQueGuarda(), fetch, esperar: sinEspera });

  assert.equal(await web.natillera({ natilleraId: 'nat-1' }), false);
  assert.equal(llamadas.length, 1);
});
