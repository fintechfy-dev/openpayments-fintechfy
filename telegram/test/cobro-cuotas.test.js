import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearBotDePrueba, mensaje, textos, logSilencioso, CHAT_EQUIPO } from './helpers/bot-prueba.js';
import { crearRegistro } from '../src/registro.js';
import { abrirBaseDeDatos, EN_MEMORIA } from '../src/db.js';
import { PagosError } from '../src/externo/pagos.js';
import { SIN_COBRADOR } from '../src/bot/comandos/reloj.js';
import { COBRO, crearCobros, textoCobros, textoCuotaCobrada, textoCuotaNoCobrada } from '../src/externo/cobros.js';

// El bot orquesta el cobro de las cuotas: staging las registra y el bot mueve la plata con la API de
// pagos, de la billetera de cada participante a la cuenta madre.

const ANA = 'https://ilp.interledger-test.dev/ana';
const BETO = 'https://ilp.interledger-test.dev/beto';

function stagingFalso() {
  return {
    estados: {
      'c-nat': { NombreNatillera: 'test8', EstadoNatillera: 0, ValorCuota: 50000, NumeroCuotas: 2, FechaInicio: '2026-11-01', FechaFinal: '2026-12-31', PeriodoActual: 0 },
      'c-p1': { ParticipacionId: 'p1', CuotasPagadas: 0, GrantId: 'p1111111111111111', WalletParticipante: ANA, ValorCuota: 50000 },
      'c-p2': { ParticipacionId: 'p2', CuotasPagadas: 0, GrantId: 'p2222222222222222', WalletParticipante: BETO, ValorCuota: 50000 },
    },
    disparos: [],
    // Lo que hace la cascada de staging en la lectura número n después de un disparo.
    despuesDe: null,
    lecturas: 0,
    async leerContrato(id) {
      this.lecturas++;
      return { currentStateRaw: Object.fromEntries(Object.entries(this.estados[id]).map(([k, v]) => [k, { type: 'Text', value: v, assigned: true }])) };
    },
    async disparar(contractId, trigger, parameters) {
      this.disparos.push({ contractId, trigger, fecha: parameters.CurrentDate.value });
      this.despuesDe?.(this);
      return { results: [] };
    },
  };
}

function pagosFalso({ fallaCon = {} } = {}) {
  return {
    cobros: [],
    fallaCon,
    async cobrarCuota(cuerpo) {
      this.cobros.push(cuerpo);
      const estado = this.fallaCon[cuerpo.walletOrigen];
      if (estado) throw new PagosError('POST /api/open-payments/cobrar-cuota', estado, estado === 402 ? 'Fondos insuficientes' : 'sigue en curso');
      return { periodo: cuerpo.periodo, monto: cuerpo.monto };
    },
  };
}

function preparar(opciones) {
  const registro = crearRegistro(abrirBaseDeDatos(EN_MEMORIA));
  registro.guardarNatillera({ natilleraId: 'nat-1', contractId: 'c-nat', nombre: 'test8', adminTelegramId: 5, creadaEn: 'x' });
  registro.guardarParticipacion({ participacionId: 'p1', contractId: 'c-p1', natilleraId: 'nat-1', telegramId: 10, nombre: 'Ana' });
  registro.guardarParticipacion({ participacionId: 'p2', contractId: 'c-p2', natilleraId: 'nat-1', telegramId: 11, nombre: 'Beto' });
  const servicio = stagingFalso();
  const pagos = pagosFalso(opciones);
  const avisos = [];
  const esperas = [];
  const cobros = crearCobros({
    registro,
    servicio,
    pagos,
    log: logSilencioso,
    avisar: async (chatId, texto) => avisos.push({ chatId, texto }),
    esperar: async (ms) => esperas.push(ms),
    ahora: () => '2026-10-17T12:00:00.000Z',
  });
  const natillera = registro.natillera('nat-1');
  return { registro, servicio, pagos, avisos, esperas, cobros, natillera };
}

test('cobra con la API de pagos cada cuota que staging registró, una sola vez, y avisa a cada persona', async () => {
  const { registro, servicio, pagos, avisos, cobros, natillera } = preparar();
  servicio.estados['c-p1'].CuotasPagadas = 1;
  servicio.estados['c-p2'].CuotasPagadas = 1;

  const resultados = await cobros.cobrarPendientes(natillera);
  assert.deepEqual(pagos.cobros, [
    { grantId: 'p1111111111111111', walletOrigen: ANA, monto: 50000, referencia: 'p1', periodo: 1 },
    { grantId: 'p2222222222222222', walletOrigen: BETO, monto: 50000, referencia: 'p2', periodo: 1 },
  ]);
  assert.deepEqual(resultados.map((r) => [r.nombre, r.periodo, r.estado]), [['Ana', 1, COBRO.COBRADO], ['Beto', 1, COBRO.COBRADO]]);
  assert.deepEqual(avisos, [
    { chatId: 10, texto: textoCuotaCobrada('test8', 1, 2, 50000) },
    { chatId: 11, texto: textoCuotaCobrada('test8', 1, 2, 50000) },
  ]);
  assert.equal(registro.cobro('p1', 1).estado, COBRO.COBRADO);

  // Otra pasada no cobra lo ya cobrado; la cuota 2 sí.
  assert.deepEqual(await cobros.cobrarPendientes(natillera), []);
  servicio.estados['c-p1'].CuotasPagadas = 2;
  await cobros.cobrarPendientes(natillera);
  assert.deepEqual(pagos.cobros.slice(2).map((c) => [c.referencia, c.periodo]), [['p1', 2]]);
});

test('un cobro que falla queda fallido, se avisa y se reintenta en la siguiente pasada; un 503 queda en curso', async () => {
  const { registro, servicio, pagos, avisos, cobros, natillera } = preparar({ fallaCon: { [ANA]: 402, [BETO]: 503 } });
  servicio.estados['c-p1'].CuotasPagadas = 1;
  servicio.estados['c-p2'].CuotasPagadas = 1;

  const resultados = await cobros.cobrarPendientes(natillera);
  assert.deepEqual(resultados.map((r) => [r.nombre, r.estado, r.motivo]), [
    ['Ana', COBRO.FALLIDO, '402 Fondos insuficientes'],
    ['Beto', COBRO.EN_CURSO, '503 sigue en curso'],
  ]);
  assert.deepEqual(avisos, [{ chatId: 10, texto: textoCuotaNoCobrada('test8', 1) }], 'el que sigue en curso no recibe aviso todavía');

  pagos.fallaCon = {};
  await cobros.cobrarPendientes(natillera);
  assert.equal(pagos.cobros.length, 4);
  assert.equal(registro.cobro('p1', 1).estado, COBRO.COBRADO);
  assert.equal(registro.cobro('p2', 1).estado, COBRO.COBRADO);
});

test('quien autorizó con el permiso de prueba no se cobra: queda «sin permiso real»', async () => {
  const { servicio, pagos, cobros, natillera } = preparar();
  servicio.estados['c-p1'].CuotasPagadas = 1;
  servicio.estados['c-p1'].GrantId = 'grant-prueba-p1';
  const resultados = await cobros.cobrarPendientes(natillera);
  assert.equal(pagos.cobros.length, 0);
  assert.deepEqual(resultados.map((r) => [r.nombre, r.estado, r.motivo]), [['Ana', COBRO.FALLIDO, 'sin permiso real']]);
});

test('cobrarDespuesDe espera la cascada de staging si todavía no registró la cuota', async () => {
  const { servicio, pagos, esperas, cobros, natillera } = preparar();
  // La cuota aparece en staging después de la primera espera.
  let pasadas = 0;
  const leerOriginal = servicio.leerContrato.bind(servicio);
  servicio.leerContrato = async (id) => {
    if (id === 'c-nat' && ++pasadas === 2) {
      servicio.estados['c-p1'].CuotasPagadas = 1;
      servicio.estados['c-p2'].CuotasPagadas = 1;
    }
    return leerOriginal(id);
  };
  const resultados = await cobros.cobrarDespuesDe(natillera, [10, 20]);
  assert.deepEqual(esperas, [10]);
  assert.equal(resultados.length, 2);
  assert.equal(pagos.cobros.length, 2);
});

test('textoCobros resume los cobros para el chat del equipo', () => {
  assert.equal(textoCobros('test8', []), 'Sin cuotas por cobrar en test8.');
  assert.equal(
    textoCobros('test8', [
      { nombre: 'Ana', periodo: 1, monto: 50000, estado: COBRO.COBRADO, motivo: null },
      { nombre: 'Beto', periodo: 1, monto: 50000, estado: COBRO.FALLIDO, motivo: '402 Fondos insuficientes' },
    ]),
    'Cobros en test8 (API de pagos → cuenta madre):\n✓ Ana · cuota 1 · $50.000\n✗ Beto · cuota 1 · $50.000 · 402 Fondos insuficientes',
  );
});

// ---------- /reloj ----------

// La API de pagos configurada; el bot solo cobra si además se le pide con COBRAR_CUOTAS_BOT=si.
const ENV_PAGOS = { PAGOS_URL: 'https://pagos.example', PAGOS_API_KEY: 'llave', OP_WALLET_ADDRESS: 'https://ilp.interledger-test.dev/app', OP_KEY_ID: 'k', OP_PRIVATE_KEY: 'LS0t' };

function prepararBot({ conPagos = true, cobrarCuotas = 'si' } = {}) {
  const registro = crearRegistro(abrirBaseDeDatos(EN_MEMORIA));
  registro.guardarNatillera({ natilleraId: 'nat-1', contractId: 'c-nat', nombre: 'test8', adminTelegramId: 5, creadaEn: 'x' });
  registro.guardarParticipacion({ participacionId: 'p1', contractId: 'c-p1', natilleraId: 'nat-1', telegramId: 10, nombre: 'Ana' });
  registro.guardarParticipacion({ participacionId: 'p2', contractId: 'c-p2', natilleraId: 'nat-1', telegramId: 11, nombre: 'Beto' });
  const servicio = stagingFalso();
  const pagos = conPagos ? pagosFalso() : undefined;
  const env = conPagos ? { ...ENV_PAGOS, COBRAR_CUOTAS_BOT: cobrarCuotas } : {};
  const { bot, llamadas } = crearBotDePrueba({ env, servicio, registro, pagos, esperar: async () => {} });
  return { bot, llamadas, servicio, pagos };
}

const enEquipo = (texto) => mensaje(texto, { chatId: CHAT_EQUIPO });

test('/reloj iniciar: staging registra la primera cuota y el bot la cobra de cada billetera', async () => {
  const { bot, llamadas, servicio, pagos } = prepararBot();
  servicio.despuesDe = (s) => {
    s.estados['c-nat'].EstadoNatillera = 1;
    s.estados['c-p1'].CuotasPagadas = 1;
    s.estados['c-p2'].CuotasPagadas = 1;
  };
  await bot.handleUpdate(enEquipo('/reloj iniciar test8'));

  assert.deepEqual(servicio.disparos, [{ contractId: 'c-nat', trigger: 'Iniciar', fecha: '2026-11-01' }]);
  assert.deepEqual(pagos.cobros.map((c) => [c.walletOrigen, c.periodo, c.monto]), [[ANA, 1, 50000], [BETO, 1, 50000]]);
  const enviados = llamadas.filter((l) => l.method === 'sendMessage');
  assert.deepEqual(enviados.filter((l) => l.payload.chat_id === 10).map((l) => l.payload.text), [textoCuotaCobrada('test8', 1, 2, 50000)]);
  assert.match(textos(llamadas).at(-1), /^Cobros en test8 .*\n✓ Ana · cuota 1 · \$50\.000\n✓ Beto · cuota 1 · \$50\.000$/);

  // /reloj cobrar no repite lo ya cobrado.
  await bot.handleUpdate(enEquipo('/reloj cobrar test8'));
  assert.equal(pagos.cobros.length, 2);
  assert.equal(textos(llamadas).at(-1), 'Sin cuotas por cobrar en test8.');
});

test('/reloj cupo no cobra; sin PAGOS_URL, /reloj iniciar no cobra y /reloj cobrar lo dice', async () => {
  const conPagos = prepararBot();
  conPagos.servicio.estados['c-nat'].EstadoNatillera = 1;
  conPagos.servicio.estados['c-p1'].CuotasPagadas = 1;
  await conPagos.bot.handleUpdate(enEquipo('/reloj cupo test8'));
  assert.equal(conPagos.pagos.cobros.length, 0);

  const sinPagos = prepararBot({ conPagos: false });
  await sinPagos.bot.handleUpdate(enEquipo('/reloj iniciar test8'));
  assert.match(textos(sinPagos.llamadas).at(-1), /^✓ Iniciar/);
  await sinPagos.bot.handleUpdate(enEquipo('/reloj cobrar test8'));
  assert.equal(textos(sinPagos.llamadas).at(-1), SIN_COBRADOR);
});

test('con la API de pagos pero sin COBRAR_CUOTAS_BOT=si, el bot no cobra: staging ya cobra en modo real', async () => {
  const { bot, llamadas, servicio, pagos } = prepararBot({ cobrarCuotas: 'no' });
  servicio.despuesDe = (s) => {
    s.estados['c-nat'].EstadoNatillera = 1;
    s.estados['c-p1'].CuotasPagadas = 1;
  };
  await bot.handleUpdate(enEquipo('/reloj iniciar test8'));
  assert.equal(servicio.disparos.length, 1);
  assert.match(textos(llamadas).at(-1), /^✓ Iniciar/);
  await bot.handleUpdate(enEquipo('/reloj cobrar test8'));
  assert.equal(textos(llamadas).at(-1), SIN_COBRADOR);
  assert.equal(pagos.cobros.length, 0);
});
