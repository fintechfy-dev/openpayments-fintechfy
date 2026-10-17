import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Bot } from 'grammy';
import { crearBotDePrueba, crearFetchFalso, mensaje, textos, logSilencioso, BOT_INFO, CHAT_EQUIPO } from './helpers/bot-prueba.js';
import { crearRegistro } from '../src/registro.js';
import { abrirBaseDeDatos, EN_MEMORIA } from '../src/db.js';
import { AccionRechazadaError } from '../src/externo/cliente.js';
import { AYUDA, leerOrden, reloj, siguientePaso, textoResultado } from '../src/bot/comandos/reloj.js';
import { COMANDOS } from '../src/bot/index.js';

// /reloj: mover el tiempo de una natillera en staging desde el chat del equipo.

const natillera = (cambios = {}) => ({
  NombreNatillera: 'test2',
  EstadoNatillera: 0,
  FechaInicio: '2026-11-01',
  FechaFinal: '2026-12-31',
  FechaProximoCobro: null,
  FechaLimiteCupo: null,
  DiasEsperaCupo: 5,
  PeriodoActual: 0,
  NumeroCuotas: 2,
  ParticipantesValidados: 4,
  PagosPrimeraCuota: 0,
  CupoMinimo: 4,
  SaldoNatillera: 0,
  ...cambios,
});

test('leerOrden separa acción, nombre con espacios, fecha y segundos', () => {
  assert.deepEqual(leerOrden('iniciar los amigos 2026-11-01'), { accion: 'iniciar', nombre: 'los amigos', fecha: '2026-11-01', segundos: null });
  assert.deepEqual(leerOrden('Periodo test2'), { accion: 'periodo', nombre: 'test2', fecha: null, segundos: null });
  assert.deepEqual(leerOrden('auto test2 30'), { accion: 'auto', nombre: 'test2', fecha: null, segundos: 30 });
  assert.deepEqual(leerOrden('auto test2'), { accion: 'auto', nombre: 'test2', fecha: null, segundos: null });
  assert.deepEqual(leerOrden(''), { accion: '', nombre: '', fecha: null, segundos: null });
});

test('siguientePaso sigue la vida de la natillera hasta liquidar', () => {
  assert.deepEqual(siguientePaso(natillera()), { trigger: 'Iniciar', fecha: '2026-11-01' });
  assert.deepEqual(siguientePaso(natillera({ EstadoNatillera: 1 })), { trigger: 'VerificarCupo', fecha: '2026-11-06' });
  assert.deepEqual(siguientePaso(natillera({ EstadoNatillera: 1, FechaLimiteCupo: '2026-11-07' })), { trigger: 'VerificarCupo', fecha: '2026-11-07' });
  assert.deepEqual(siguientePaso(natillera({ EstadoNatillera: 2, PeriodoActual: 1, FechaProximoCobro: '2026-12-01' })), { trigger: 'AbrirPeriodo', fecha: '2026-12-01' });
  assert.deepEqual(siguientePaso(natillera({ EstadoNatillera: 2, PeriodoActual: 1 })), { trigger: 'AbrirPeriodo', fecha: '2026-12-01' }, 'sin fecha de staging, inicio + cuotas abiertas');
  assert.deepEqual(siguientePaso(natillera({ EstadoNatillera: 2, PeriodoActual: 2 })), { trigger: 'IniciarLiquidacion', fecha: '2026-12-31' });
  for (const e of [3, 4, 5, 6]) assert.equal(siguientePaso(natillera({ EstadoNatillera: e })), null);
});

test('textoResultado muestra lo que cambió en staging', () => {
  const respuesta = { results: [{ functionName: 'Iniciar', changes: [{ conceptName: 'EstadoNatillera', previousValue: '0', newValue: '1' }] }] };
  assert.equal(textoResultado('Iniciar', '2026-11-01', respuesta), '✓ Iniciar con fecha 2026-11-01: corrió.\nEstadoNatillera: 0 → 1');
  assert.match(textoResultado('Iniciar', '2026-11-01', { results: [] }), /Sin cambios/);
  const muchos = { results: [{ changes: Array.from({ length: 10 }, (_, i) => ({ conceptName: `C${i}`, previousValue: '0', newValue: '1' })) }] };
  assert.match(textoResultado('X', 'f', muchos, 8), /… y 2 cambios más$/);
});

function preparar({ estado = natillera(), rechaza = null } = {}) {
  const registro = crearRegistro(abrirBaseDeDatos(EN_MEMORIA));
  registro.guardarNatillera({ natilleraId: 'nat-1', contractId: 'c-nat', nombre: 'test2', adminTelegramId: 5, creadaEn: 'x' });
  registro.guardarParticipacion({ participacionId: 'p1', contractId: 'c-p1', natilleraId: 'nat-1', telegramId: 10, nombre: 'Ana' });
  registro.guardarParticipacion({ participacionId: 'p2', contractId: 'c-p2', natilleraId: 'nat-1', telegramId: 11, nombre: 'Beto' });
  const disparos = [];
  const servicio = {
    estado,
    async leerContrato() {
      return { currentStateRaw: Object.fromEntries(Object.entries(this.estado).map(([k, v]) => [k, { type: 'Text', value: v, assigned: true }])) };
    },
    async disparar(contractId, trigger, parameters) {
      disparos.push({ contractId, trigger, fecha: parameters.CurrentDate.value });
      if (rechaza?.(contractId, trigger)) throw new AccionRechazadaError(trigger, 'Estado no válido');
      return { results: [{ changes: [{ conceptName: 'X', previousValue: '0', newValue: '1' }] }] };
    },
  };
  const { bot, llamadas } = crearBotDePrueba({ servicio, registro, log: logSilencioso });
  return { bot, llamadas, servicio, disparos };
}

const enEquipo = (texto) => mensaje(texto, { chatId: CHAT_EQUIPO });

test('/reloj solo responde en el chat del equipo y no está en el menú', async () => {
  const { bot, llamadas, disparos } = preparar();
  await bot.handleUpdate(mensaje('/reloj iniciar test2', { chatId: 100 }));
  assert.deepEqual(textos(llamadas), []);
  assert.deepEqual(disparos, []);
  assert.ok(!COMANDOS.some((c) => c.command === 'reloj'));
});

test('/reloj iniciar usa la fecha de inicio o la que se le pase, con el nombre sin importar mayúsculas', async () => {
  const { bot, llamadas, disparos } = preparar();
  await bot.handleUpdate(enEquipo('/reloj iniciar TEST2'));
  await bot.handleUpdate(enEquipo('/reloj iniciar test2 2026-11-03'));
  assert.deepEqual(disparos, [
    { contractId: 'c-nat', trigger: 'Iniciar', fecha: '2026-11-01' },
    { contractId: 'c-nat', trigger: 'Iniciar', fecha: '2026-11-03' },
  ]);
  assert.equal(textos(llamadas).at(-1), '✓ Iniciar con fecha 2026-11-03: corrió.\nX: 0 → 1');
});

test('/reloj periodo, cupo y liquidar usan las fechas de la natillera', async () => {
  const { bot, disparos } = preparar({ estado: natillera({ EstadoNatillera: 2, PeriodoActual: 1, FechaProximoCobro: '2026-12-01' }) });
  await bot.handleUpdate(enEquipo('/reloj periodo test2'));
  await bot.handleUpdate(enEquipo('/reloj cupo test2'));
  await bot.handleUpdate(enEquipo('/reloj liquidar test2'));
  assert.deepEqual(disparos.map((d) => [d.trigger, d.fecha]), [
    ['AbrirPeriodo', '2026-12-01'],
    ['VerificarCupo', '2026-11-06'],
    ['IniciarLiquidacion', '2026-12-31'],
  ]);
});

test('/reloj mora causa la mora en cada participación y cuenta solo las que corrieron', async () => {
  const { bot, llamadas, disparos } = preparar({
    estado: natillera({ EstadoNatillera: 2, PeriodoActual: 1 }),
    rechaza: (contractId) => contractId === 'c-p1',
  });
  await bot.handleUpdate(enEquipo('/reloj mora test2'));
  assert.deepEqual(disparos.map((d) => [d.contractId, d.trigger, d.fecha]), [
    ['c-p1', 'CausarMoraDiaria', '2026-11-02'],
    ['c-p2', 'CausarMoraDiaria', '2026-11-02'],
  ]);
  assert.match(textos(llamadas).at(-1), /^Beto: ✓ CausarMoraDiaria/);
  assert.doesNotMatch(textos(llamadas).at(-1), /Ana/);
});

test('/reloj reintentar dispara ReintentarPagoLiquidacion en cada participación, el día después de la final', async () => {
  const { bot, llamadas, disparos } = preparar({
    estado: natillera({ EstadoNatillera: 3, PeriodoActual: 2 }),
    rechaza: (contractId) => contractId === 'c-p2',
  });
  await bot.handleUpdate(enEquipo('/reloj reintentar test2'));
  const final = natillera({}).FechaFinal;
  const siguiente = new Date(Date.parse(`${final}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
  assert.deepEqual(disparos.map((d) => [d.contractId, d.trigger, d.fecha]), [
    ['c-p1', 'ReintentarPagoLiquidacion', siguiente],
    ['c-p2', 'ReintentarPagoLiquidacion', siguiente],
  ]);
  assert.match(textos(llamadas).at(-1), /^Ana: ✓ ReintentarPagoLiquidacion/);
  assert.doesNotMatch(textos(llamadas).at(-1), /Beto/);

  await bot.handleUpdate(enEquipo('/reloj reintentar test2 2027-01-05'));
  assert.equal(disparos.at(-1).fecha, '2027-01-05');
});

test('una acción que staging rechaza se informa con su motivo', async () => {
  const { bot, llamadas } = preparar({ rechaza: () => true });
  await bot.handleUpdate(enEquipo('/reloj iniciar test2'));
  assert.equal(textos(llamadas).at(-1), '✗ Iniciar con fecha 2026-11-01: staging no la dejó correr. Estado no válido');
});

test('/reloj sin acción válida o con una natillera que no existe', async () => {
  const { bot, llamadas, disparos } = preparar();
  await bot.handleUpdate(enEquipo('/reloj'));
  await bot.handleUpdate(enEquipo('/reloj volar test2'));
  await bot.handleUpdate(enEquipo('/reloj iniciar otra'));
  assert.deepEqual(textos(llamadas), [AYUDA, AYUDA, 'No conozco la natillera «otra».']);
  assert.deepEqual(disparos, []);
});

test('/reloj auto da un paso ya y uno por cada tic, y se para solo al terminar', async () => {
  const registro = crearRegistro(abrirBaseDeDatos(EN_MEMORIA));
  registro.guardarNatillera({ natilleraId: 'nat-1', contractId: 'c-nat', nombre: 'test2', adminTelegramId: 5, creadaEn: 'x' });
  // Cada disparo hace avanzar el estado, como haría staging con los cobros en modo de prueba.
  const vida = [
    natillera(),
    natillera({ EstadoNatillera: 2, PeriodoActual: 1, FechaProximoCobro: '2026-12-01' }),
    natillera({ EstadoNatillera: 2, PeriodoActual: 2 }),
    natillera({ EstadoNatillera: 3, PeriodoActual: 2 }),
  ];
  let i = 0;
  const disparos = [];
  const servicio = {
    async leerContrato() {
      return { currentStateRaw: Object.fromEntries(Object.entries(vida[i]).map(([k, v]) => [k, { type: 'Text', value: v }])) };
    },
    async disparar(contractId, trigger, parameters) {
      disparos.push([trigger, parameters.CurrentDate.value]);
      i += 1;
      return { results: [] };
    },
  };
  // Un bot con solo /reloj y un temporizador falso: el tic se corre a mano.
  const llamadas = [];
  const bot = new Bot('123:abc', { botInfo: BOT_INFO, client: { fetch: crearFetchFalso(llamadas) } });
  let tic = null;
  let intervalo = null;
  let cancelados = 0;
  bot.use(reloj({
    config: { teamChatId: String(CHAT_EQUIPO) },
    registro,
    servicio,
    log: logSilencioso,
    programar: (fn, ms) => ((tic = fn), (intervalo = ms), 'timer'),
    cancelar: () => { cancelados += 1; },
  }));

  await bot.handleUpdate(enEquipo('/reloj auto test2 30'));
  assert.equal(intervalo, 30_000);
  assert.deepEqual(disparos, [['Iniciar', '2026-11-01']], 'el primer paso va de una');
  await tic();
  await tic();
  assert.deepEqual(disparos.slice(1), [['AbrirPeriodo', '2026-12-01'], ['IniciarLiquidacion', '2026-12-31']]);
  assert.equal(cancelados, 0);
  await tic();
  assert.equal(cancelados, 1, 'al terminar se cancela el temporizador');
  assert.match(textos(llamadas).at(-1), /test2 ya terminó \(LIQUIDANDO\)\. Paré el reloj\./);
  assert.equal(disparos.length, 3);
});

test('/reloj auto se para si staging rechaza un paso, y /reloj parar lo detiene', async () => {
  const registro = crearRegistro(abrirBaseDeDatos(EN_MEMORIA));
  registro.guardarNatillera({ natilleraId: 'nat-1', contractId: 'c-nat', nombre: 'test2', adminTelegramId: 5, creadaEn: 'x' });
  const servicio = {
    async leerContrato() {
      return { currentStateRaw: Object.fromEntries(Object.entries(natillera()).map(([k, v]) => [k, { type: 'Text', value: v }])) };
    },
    async disparar(contractId, trigger) {
      throw new AccionRechazadaError(trigger, 'Requiere rol admin');
    },
  };
  const llamadas = [];
  const bot = new Bot('123:abc', { botInfo: BOT_INFO, client: { fetch: crearFetchFalso(llamadas) } });
  let cancelados = 0;
  bot.use(reloj({ config: { teamChatId: String(CHAT_EQUIPO) }, registro, servicio, log: logSilencioso, programar: () => 'timer', cancelar: () => { cancelados += 1; } }));

  await bot.handleUpdate(enEquipo('/reloj auto test2'));
  assert.equal(cancelados, 1);
  assert.deepEqual(textos(llamadas).slice(-2), [
    '✗ Iniciar con fecha 2026-11-01: staging no la dejó correr. Requiere rol admin',
    'Paré el reloj automático. Revisa con /reloj estado y sigue a mano.',
  ]);
  await bot.handleUpdate(enEquipo('/reloj parar'));
  assert.equal(textos(llamadas).at(-1), 'No había relojes automáticos andando.');
});
