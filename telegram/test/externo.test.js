import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearClienteExterno, motivoDeRechazo, AccionRechazadaError, ServicioExternoError } from '../src/externo/cliente.js';
import { parametrosNatilleraCuenta, porcentaje } from '../src/externo/parametros.js';
import { crearNatilleraEnServicio } from '../src/externo/crear-natillera.js';
import { crearRegistro } from '../src/registro.js';
import { abrirBaseDeDatos, EN_MEMORIA } from '../src/db.js';
import { logSilencioso } from './helpers/bot-prueba.js';

const TOKEN = 'token-staging-xyz';
const REGLAS = Object.freeze({ diasEsperaCupo: 5, pagosParaPrestamo: 1, multiploPrestamo: 2 });
const DATOS = Object.freeze({
  nombre: 'Los Primos',
  cuota: 100000,
  periodicidad: 'mensual',
  inicio: '2026-11-01',
  final: '2026-12-20',
  cupo: 3,
  mora: 1,
});

// fetch falso de staging: guarda cada llamada y responde lo que diga `responder`.
function stagingFalso(responder = () => ({ estado: 201, cuerpo: { contractId: 'c-1', correlationId: 'k-1' } })) {
  const llamadas = [];
  const fetch = async (url, init) => {
    const llamada = { url: String(url), method: init.method, headers: init.headers, cuerpo: init.body && JSON.parse(init.body) };
    llamadas.push(llamada);
    const { estado = 200, cuerpo = {} } = responder(llamada);
    return new Response(JSON.stringify(cuerpo), { status: estado });
  };
  return { llamadas, fetch };
}

test('natillera-cuenta lleva los parámetros tipados del ejemplo de INTEGRACION.md', () => {
  assert.deepEqual(parametrosNatilleraCuenta('NAT-PRUEBA-01', { ...DATOS, nombre: 'Natillera de prueba' }, REGLAS), {
    NatilleraId: { type: 'Text', value: 'NAT-PRUEBA-01' },
    NombreNatillera: { type: 'Text', value: 'Natillera de prueba' },
    ValorCuota: { type: 'Currency', value: 100000 },
    FechaInicio: { type: 'Date', value: '2026-11-01' },
    FechaFinal: { type: 'Date', value: '2026-12-20' },
    PeriodicidadMeses: { type: 'Integer', value: 1 },
    CupoMinimo: { type: 'Integer', value: 3 },
    PorcentajeMoraDiaria: { type: 'Percentage', value: 0.01 },
    DiasEsperaCupo: { type: 'Integer', value: 5 },
    PagosParaPrestamo: { type: 'Integer', value: 1 },
    MultiploPrestamo: { type: 'Integer', value: 2 },
  });
});

test('el porcentaje va como fracción y sin ruido de coma flotante', () => {
  assert.equal(porcentaje(2.5).value, 0.025);
  assert.equal(porcentaje(0.5).value, 0.005);
  assert.equal(porcentaje(0).value, 0);
});

test('una periodicidad sin meses no se manda a staging', () => {
  assert.throws(() => parametrosNatilleraCuenta('n', { ...DATOS, periodicidad: 'quincenal' }, REGLAS), /quincenal/);
});

test('crearContrato llama con Bearer y devuelve el contractId', async () => {
  const { llamadas, fetch } = stagingFalso();
  const servicio = crearClienteExterno({ url: 'https://staging.example/', token: TOKEN, fetch });

  const respuesta = await servicio.crearContrato('natillera-cuenta', { A: { type: 'Text', value: 'x' } });

  assert.equal(respuesta.contractId, 'c-1');
  assert.equal(llamadas[0].url, 'https://staging.example/api/contracts');
  assert.equal(llamadas[0].method, 'POST');
  assert.equal(llamadas[0].headers.Authorization, `Bearer ${TOKEN}`);
  assert.deepEqual(llamadas[0].cuerpo, { templateName: 'natillera-cuenta', parameters: { A: { type: 'Text', value: 'x' } } });
});

test('un error de staging nombra la ruta y el estado, nunca el token', async () => {
  const { fetch } = stagingFalso(() => ({ estado: 400, cuerpo: { title: 'Bad Request', status: 400, detail: 'NombreNatillera duplicado' } }));
  const servicio = crearClienteExterno({ url: 'https://staging.example', token: TOKEN, fetch });

  const error = await servicio.crearContrato('natillera-cuenta', {}).catch((e) => e);
  assert.ok(error instanceof ServicioExternoError);
  assert.equal(error.estado, 400);
  assert.equal(error.message, 'El servicio externo respondió 400 en POST /api/contracts: NombreNatillera duplicado');
  assert.ok(!error.message.includes(TOKEN));
});

test('un 200 sin contractId no se da por creado', async () => {
  const { fetch } = stagingFalso(() => ({ estado: 201, cuerpo: {} }));
  const servicio = crearClienteExterno({ url: 'https://staging.example', token: TOKEN, fetch });
  await assert.rejects(servicio.crearContrato('natillera-cuenta', {}), ServicioExternoError);
});

test('una acción es rechazada solo si todas sus funciones fallaron la precondición', () => {
  assert.equal(motivoDeRechazo({ results: [] }), null);
  assert.equal(motivoDeRechazo({ results: [{ preconditionFailed: true }, { preconditionFailed: false, hasChanges: true }] }), null);
  assert.equal(motivoDeRechazo({ results: [{ preconditionFailed: true, summary: 'No está en mora' }] }), 'No está en mora');
  assert.equal(motivoDeRechazo({ results: [{ preconditionFailed: true }] }), 'precondición no cumplida');
});

test('un 400 en una acción (precondición bloqueante) es un rechazo con el detail del problema', async () => {
  const { fetch } = stagingFalso(() => ({ estado: 400, cuerpo: { title: 'Bad Request', status: 400, detail: 'La participación no está en mora' } }));
  const servicio = crearClienteExterno({ url: 'https://staging.example', token: TOKEN, fetch });

  const error = await servicio.disparar('c-1', 'PagarDeuda').catch((e) => e);
  assert.ok(error instanceof AccionRechazadaError);
  assert.equal(error.motivo, 'La participación no está en mora');
});

test('un 403 en una acción no es un rechazo de reglas: sube como error del servicio', async () => {
  const { fetch } = stagingFalso(() => ({ estado: 403 }));
  const servicio = crearClienteExterno({ url: 'https://staging.example', token: TOKEN, fetch });
  await assert.rejects(servicio.disparar('c-1', 'PagarDeuda'), ServicioExternoError);
});

test('disparar lanza AccionRechazadaError con el motivo aunque staging responda 200', async () => {
  const { llamadas, fetch } = stagingFalso(() => ({ estado: 200, cuerpo: { results: [{ preconditionFailed: true, summary: 'Sin deuda' }] } }));
  const servicio = crearClienteExterno({ url: 'https://staging.example', token: TOKEN, fetch });

  const error = await servicio.disparar('c/9', 'PagarDeuda').catch((e) => e);
  assert.ok(error instanceof AccionRechazadaError);
  assert.equal(error.motivo, 'Sin deuda');
  assert.equal(llamadas[0].url, 'https://staging.example/api/contracts/c%2F9/triggers');
  assert.deepEqual(llamadas[0].cuerpo, { trigger: 'PagarDeuda', parameters: {} });
});

test('crear la natillera: contrato en staging, registro y aviso a la web', async () => {
  const { llamadas, fetch } = stagingFalso();
  const servicio = crearClienteExterno({ url: 'https://staging.example', token: TOKEN, fetch });
  const db = abrirBaseDeDatos(EN_MEMORIA);
  const registro = crearRegistro(db);
  const avisosWeb = [];
  const web = { natillera: async (cuerpo) => (avisosWeb.push(cuerpo), true) };

  const crear = crearNatilleraEnServicio({
    servicio,
    registro,
    web,
    reglasServicio: REGLAS,
    log: logSilencioso,
    ahora: () => new Date('2026-10-16T20:00:00Z'),
    nuevoId: () => 'abc',
  });
  const ctx = { from: { id: 100, first_name: 'Ana', last_name: 'Pérez' } };
  const { natilleraId, contractId, avisoWeb } = await crear(DATOS, ctx);
  await avisoWeb;

  assert.equal(natilleraId, 'nat-abc');
  assert.equal(contractId, 'c-1');
  assert.equal(llamadas[0].cuerpo.parameters.NatilleraId.value, 'nat-abc');
  assert.deepEqual({ ...registro.natillera('nat-abc') }, {
    natillera_id: 'nat-abc',
    contract_id: 'c-1',
    nombre: 'Los Primos',
    admin_telegram_id: 100,
    creada_en: '2026-10-16T20:00:00.000Z',
  });
  assert.deepEqual(avisosWeb, [
    {
      natilleraId: 'nat-abc',
      contractId: 'c-1',
      nombre: 'Los Primos',
      administrador: { telegramId: 100, nombre: 'Ana Pérez' },
      creadaEn: '2026-10-16T20:00:00.000Z',
    },
  ]);
  db.close();
});

test('si staging falla, no se guarda nada ni se avisa a la web', async () => {
  const { fetch } = stagingFalso(() => ({ estado: 500 }));
  const servicio = crearClienteExterno({ url: 'https://staging.example', token: TOKEN, fetch });
  const db = abrirBaseDeDatos(EN_MEMORIA);
  const registro = crearRegistro(db);
  let avisos = 0;
  const crear = crearNatilleraEnServicio({
    servicio,
    registro,
    web: { natillera: async () => (avisos += 1) },
    reglasServicio: REGLAS,
    log: logSilencioso,
    nuevoId: () => 'abc',
  });

  await assert.rejects(crear(DATOS, { from: { id: 100, first_name: 'Ana' } }), ServicioExternoError);
  assert.equal(registro.natillera('nat-abc'), undefined);
  assert.equal(avisos, 0);
  db.close();
});
