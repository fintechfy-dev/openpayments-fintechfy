import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearBotDePrueba, mensaje, boton, botones, textos, logSilencioso } from './helpers/bot-prueba.js';
import { crearRegistro } from '../src/registro.js';
import { abrirBaseDeDatos, EN_MEMORIA } from '../src/db.js';
import {
  elegibilidad,
  mesesHasta,
  sugerenciasMonto,
  sugerenciasPlazo,
  validarMontoPrestamo,
  validarPlazo,
} from '../src/natillera/prestamo.js';
import {
  PREGUNTA_CUAL,
  TEXTO_NO_ES_TUYO,
  TEXTO_NO_SE_PUDO_LEER,
  TEXTO_SIN_NATILLERA,
  datoPrestamo,
  preguntaMonto,
  textoCambio,
  textoResumen,
  textoSolicitado,
} from '../src/bot/flujos/prestamo.js';
import { AVISOS } from '../src/avisos/mensajes.js';
import { crearDespachador } from '../src/avisos/despachar.js';
import { resumenParticipacion } from '../src/bot/comandos/mi-natillera.js';
import { COMANDOS } from '../src/bot/index.js';

// Pedir un préstamo (US-014, #29).

const PROHIBIDAS = /interledger|ilp\b|grant|wallet|token|blockchain|cripto|transacci|payment pointer|moroso|debes|cr[eé]dito/i;
const HOY = '2026-11-16';
const ANA = 100;
const BETO = 200;

// Estado de staging como lo devuelve estadoDe(), con lo que cambie la prueba.
const natillera = (cambios = {}) => ({
  NombreNatillera: 'Los Amigos',
  EstadoNatillera: 2,
  ValorCuota: 50000,
  FechaFinal: '2027-04-30',
  ...cambios,
});
const participacion = (cambios = {}) => ({
  ParticipacionId: 'par-ana',
  EstadoParticipacion: 2,
  CuotasPagadas: 2,
  TotalAportado: 100000,
  PagosParaPrestamo: 2,
  MultiploPrestamo: 3,
  ValorCuota: 50000,
  DeudaPrestamoEnMora: 0,
  ...cambios,
});

// ---------- Las reglas ----------

test('mesesHasta cuenta meses completos hasta el final de la natillera', () => {
  assert.equal(mesesHasta('2026-10-16', '2026-12-31'), 2);
  assert.equal(mesesHasta('2026-10-16', '2026-12-15'), 1);
  assert.equal(mesesHasta('2026-12-16', '2026-12-31'), 0);
  assert.equal(mesesHasta('2026-11-16', '2027-04-30'), 5);
  assert.equal(mesesHasta('2027-01-05', '2026-12-31'), 0);
});

test('puede pedir: hasta MultiploPrestamo × cuota y con plazo hasta el final de la natillera', () => {
  assert.deepEqual(elegibilidad(natillera(), participacion(), { hoy: HOY }), { puede: true, maximo: 150000, plazoMaximo: 5 });
  assert.equal(elegibilidad(natillera({ FechaFinal: '2028-12-31' }), participacion(), { hoy: HOY }).plazoMaximo, 12);
});

test('no puede pedir: cada motivo con su texto, sin culpa', () => {
  const casos = [
    ['no_arranca', natillera({ EstadoNatillera: 0 }), participacion({ EstadoParticipacion: 1 }), {}],
    ['termino', natillera({ EstadoNatillera: 3 }), participacion(), {}],
    ['cuota_pendiente', natillera(), participacion({ EstadoParticipacion: 3 }), {}],
    ['prestamo_pendiente', natillera(), participacion({ DeudaPrestamoEnMora: 40000 }), {}],
    ['ya_pediste', natillera(), participacion(), { solicitud: { monto: 80000, creada_en: '2026-11-10T15:00:00.000Z' } }],
    ['faltan_cuotas', natillera(), participacion({ CuotasPagadas: 1 }), {}],
    ['sin_plazo', natillera({ FechaFinal: '2026-11-30' }), participacion(), {}],
  ];
  for (const [motivo, n, p, extra] of casos) {
    const r = elegibilidad(n, p, { hoy: HOY, ...extra });
    assert.equal(r.puede, false, motivo);
    assert.equal(r.motivo, motivo);
    assert.ok(!PROHIBIDAS.test(r.texto), `palabra prohibida en: ${r.texto}`);
    assert.doesNotMatch(r.texto, /\p{Extended_Pictographic}|undefined|NaN/u, r.texto);
  }
  assert.equal(
    elegibilidad(natillera(), participacion({ CuotasPagadas: 1 }), { hoy: HOY }).texto,
    'Puedes pedir un préstamo en Los Amigos cuando pagues 2 cuotas. Llevas 1.',
  );
  assert.equal(
    elegibilidad(natillera(), participacion(), { hoy: HOY, solicitud: { monto: 80000, creada_en: '2026-11-10T15:00:00.000Z' } }).texto,
    'Ya pediste un préstamo de $80.000 en Los Amigos el 10 de noviembre. Financiera Aliada lo está revisando.',
  );
  // Una cuota pendiente pesa más que tener las cuotas: no se presta a quien está atrasado.
  assert.equal(elegibilidad(natillera(), participacion({ EstadoParticipacion: 3, CuotasPagadas: 5 }), { hoy: HOY }).motivo, 'cuota_pendiente');
});

test('monto y plazo: límites, formatos y sugerencias', () => {
  assert.deepEqual(validarMontoPrestamo('$150.000', 150000), { valor: 150000 });
  assert.deepEqual(validarMontoPrestamo('10000', 150000), { valor: 10000 });
  assert.match(validarMontoPrestamo('150001', 150000).error, /entre \$10\.000 y \$150\.000/);
  assert.ok(validarMontoPrestamo('9999', 150000).error);
  assert.ok(validarMontoPrestamo('cien mil', 150000).error);
  assert.deepEqual(validarMontoPrestamo('5000', 5000), { valor: 5000 }, 'si el máximo es menor que el mínimo, vale el máximo');

  assert.deepEqual(validarPlazo('3', 5), { valor: 3 });
  assert.deepEqual(validarPlazo('2 meses', 5), { valor: 2 });
  assert.match(validarPlazo('6', 5).error, /de 1 a 5 meses/);
  assert.ok(validarPlazo('0', 5).error);
  assert.ok(validarPlazo('1.5', 5).error);
  assert.match(validarPlazo('2', 1).error, /es de 1 mes/);

  assert.deepEqual(sugerenciasMonto(150000), [75000, 150000]);
  assert.deepEqual(sugerenciasMonto(10000), [10000]);
  assert.deepEqual(sugerenciasPlazo(5), [1, 2, 3, 5]);
  assert.deepEqual(sugerenciasPlazo(12), [1, 2, 3, 6, 12]);
  assert.deepEqual(sugerenciasPlazo(1), [1]);
});

// ---------- El flujo en el bot ----------

function preparar({ estados = {}, falla = false } = {}) {
  const registro = crearRegistro(abrirBaseDeDatos(EN_MEMORIA));
  const contratos = {
    'c-nat-1': natillera(),
    'c-nat-2': natillera({ NombreNatillera: 'Primos' }),
    'c-ana': participacion(),
    'c-ana-2': participacion({ ParticipacionId: 'par-ana-2', CuotasPagadas: 0 }),
    ...estados,
  };
  const servicio = {
    contratos,
    async leerContrato(id) {
      if (falla) throw new Error('staging caído');
      return { currentStateRaw: Object.fromEntries(Object.entries(this.contratos[id]).map(([k, v]) => [k, { type: 'Text', value: v, assigned: true }])) };
    },
  };
  const avisosWeb = [];
  const web = { solicitud: async (c) => (avisosWeb.push(c), true) };
  registro.guardarNatillera({ natilleraId: 'nat-1', contractId: 'c-nat-1', nombre: 'Los Amigos', adminTelegramId: 999, creadaEn: '2026-10-16T10:00:00Z' });
  registro.guardarNatillera({ natilleraId: 'nat-2', contractId: 'c-nat-2', nombre: 'Primos', adminTelegramId: 999, creadaEn: '2026-10-16T11:00:00Z' });
  registro.guardarParticipacion({ participacionId: 'par-ana', contractId: 'c-ana', natilleraId: 'nat-1', telegramId: ANA, nombre: 'Ana' });
  const { bot, llamadas } = crearBotDePrueba({
    servicio,
    registro,
    web,
    log: logSilencioso,
    hoy: () => HOY,
    ahora: () => Date.parse('2026-11-16T15:00:00.000Z'),
  });
  // El id del último mensaje que mandó el bot: la tarjeta del flujo que se edita con los botones.
  const ultimoId = () => 1000 + llamadas.filter((l) => l.method === 'sendMessage').length - 1;
  return { bot, llamadas, registro, servicio, avisosWeb, ultimoId };
}

test('/prestamo de punta a punta: monto, plazo, resumen, solicitud guardada y aviso a la web', async () => {
  const { bot, llamadas, registro, avisosWeb, ultimoId } = preparar();
  await bot.handleUpdate(mensaje('/prestamo', { chatId: ANA }));

  const tarjeta = llamadas.at(-1);
  assert.match(tarjeta.payload.text, new RegExp(preguntaMonto({ natillera: 'Los Amigos', maximo: 150000 }).replace(/[$.?]/g, '\\$&')));
  assert.deepEqual(botones(tarjeta), ['f:p:0:75000', 'f:p:0:150000', 'f:x']);

  await bot.handleUpdate(boton('f:p:0:75000', { chatId: ANA, messageId: ultimoId() }));
  assert.deepEqual(botones(llamadas.at(-1)), ['f:p:1:1', 'f:p:1:2', 'f:p:1:3', 'f:p:1:5', 'f:x']);
  await bot.handleUpdate(boton('f:p:1:3', { chatId: ANA, messageId: ultimoId() }));

  const resumen = llamadas.at(-1);
  assert.equal(resumen.payload.text, textoResumen({ monto: 75000, plazo: 3, natillera: 'Los Amigos' }));
  assert.equal(
    textoResumen({ monto: 75000, plazo: 3, natillera: 'Los Amigos' }),
    [
      'Pides <b>$75.000</b> a 3 meses en <b>Los Amigos</b>.',
      'Financiera Aliada lo revisa y te dice la tasa y la cuota antes de prestarte.',
      'Se paga aparte de tus cuotas; si al final queda algo pendiente, se descuenta de tu parte.',
    ].join('\n'),
  );
  assert.equal(resumen.payload.reply_markup.inline_keyboard[0][0].text, 'Pedir el préstamo');
  assert.deepEqual(avisosWeb, [], 'nada sale antes de confirmar');

  await bot.handleUpdate(boton('f:ok', { chatId: ANA, messageId: ultimoId() }));

  assert.equal(textos(llamadas).at(-1), textoSolicitado(75000));
  assert.equal(avisosWeb.length, 1);
  const [aviso] = avisosWeb;
  assert.match(aviso.solicitudId, /^sol-[0-9a-f-]{36}$/);
  assert.deepEqual({ ...aviso, solicitudId: 'x' }, {
    solicitudId: 'x',
    natilleraId: 'nat-1',
    participacionId: 'par-ana',
    montoMaximo: 150000,
    montoSolicitado: 75000,
    plazoMeses: 3,
    fechaSolicitud: '2026-11-16T15:00:00.000Z',
  });
  assert.deepEqual({ ...registro.solicitudDe('par-ana') }, {
    solicitud_id: aviso.solicitudId,
    participacion_id: 'par-ana',
    monto: 75000,
    plazo_meses: 3,
    creada_en: '2026-11-16T15:00:00.000Z',
  });

  // Un préstamo a la vez: pedir otro dice que ya hay uno en revisión.
  await bot.handleUpdate(mensaje('/prestamo', { chatId: ANA }));
  assert.match(textos(llamadas).at(-1), /^Ya pediste un préstamo de \$75\.000 en Los Amigos el 16 de noviembre/);
});

test('un monto por encima del máximo se vuelve a preguntar, escrito a mano', async () => {
  const { bot, llamadas } = preparar();
  await bot.handleUpdate(mensaje('/prestamo', { chatId: ANA }));
  await bot.handleUpdate(mensaje('200.000', { chatId: ANA }));
  assert.match(llamadas.at(-1).payload.text, /Puedes pedir entre \$10\.000 y \$150\.000/);
  await bot.handleUpdate(mensaje('$120.000', { chatId: ANA }));
  assert.match(llamadas.at(-1).payload.text, /¿En cuántos meses lo pagas\?/);
});

test('al confirmar se revisa otra vez en staging: si quedó una cuota pendiente, no se pide nada', async () => {
  const { bot, llamadas, servicio, avisosWeb, registro, ultimoId } = preparar();
  await bot.handleUpdate(mensaje('/prestamo', { chatId: ANA }));
  await bot.handleUpdate(boton('f:p:0:150000', { chatId: ANA, messageId: ultimoId() }));
  await bot.handleUpdate(boton('f:p:1:2', { chatId: ANA, messageId: ultimoId() }));

  servicio.contratos['c-ana'] = participacion({ EstadoParticipacion: 3 });
  await bot.handleUpdate(boton('f:ok', { chatId: ANA, messageId: ultimoId() }));

  assert.match(textos(llamadas).at(-1), /^Tienes una cuota pendiente en Los Amigos/);
  assert.deepEqual(avisosWeb, []);
  assert.equal(registro.solicitudDe('par-ana'), undefined);
});

test('al confirmar, si el máximo bajó por debajo de lo pedido, se pide empezar de nuevo', async () => {
  const { bot, llamadas, servicio, avisosWeb, ultimoId } = preparar();
  await bot.handleUpdate(mensaje('/prestamo', { chatId: ANA }));
  await bot.handleUpdate(boton('f:p:0:150000', { chatId: ANA, messageId: ultimoId() }));
  await bot.handleUpdate(boton('f:p:1:2', { chatId: ANA, messageId: ultimoId() }));
  servicio.contratos['c-ana'] = participacion({ MultiploPrestamo: 2 });
  await bot.handleUpdate(boton('f:ok', { chatId: ANA, messageId: ultimoId() }));
  assert.equal(textos(llamadas).at(-1), textoCambio(100000));
  assert.deepEqual(avisosWeb, []);
});

test('sin poder pedirlo, /prestamo responde el motivo y no abre el flujo', async () => {
  const { bot, llamadas } = preparar({ estados: { 'c-ana': participacion({ CuotasPagadas: 1 }) } });
  await bot.handleUpdate(mensaje('/prestamo', { chatId: ANA }));
  assert.deepEqual(textos(llamadas), ['Puedes pedir un préstamo en Los Amigos cuando pagues 2 cuotas. Llevas 1.']);
});

test('/prestamo sin natillera, con staging caído y con varias natilleras', async () => {
  const sinNada = preparar();
  await sinNada.bot.handleUpdate(mensaje('/prestamo', { chatId: BETO }));
  assert.deepEqual(textos(sinNada.llamadas), [TEXTO_SIN_NATILLERA]);

  const caido = preparar({ falla: true });
  await caido.bot.handleUpdate(mensaje('/prestamo', { chatId: ANA }));
  assert.deepEqual(textos(caido.llamadas), [TEXTO_NO_SE_PUDO_LEER]);

  const varias = preparar();
  varias.registro.guardarParticipacion({ participacionId: 'par-ana-2', contractId: 'c-ana-2', natilleraId: 'nat-2', telegramId: ANA });
  await varias.bot.handleUpdate(mensaje('/prestamo', { chatId: ANA }));
  const pregunta = varias.llamadas.at(-1);
  assert.equal(pregunta.payload.text, PREGUNTA_CUAL);
  assert.deepEqual(pregunta.payload.reply_markup.inline_keyboard.map(([b]) => [b.text, b.callback_data]), [
    ['Primos', datoPrestamo('par-ana-2')],
    ['Los Amigos', datoPrestamo('par-ana')],
  ]);
  await varias.bot.handleUpdate(boton(datoPrestamo('par-ana'), { chatId: ANA }));
  assert.match(varias.llamadas.at(-1).payload.text, /En Los Amigos puedes pedir hasta \$150\.000/);
});

test('el botón de pedir préstamo solo responde a la dueña de la participación', async () => {
  const { bot, llamadas } = preparar();
  await bot.handleUpdate(boton(datoPrestamo('par-ana'), { chatId: BETO }));
  assert.equal(llamadas.find((l) => l.method === 'answerCallbackQuery').payload.text, TEXTO_NO_ES_TUYO);
  assert.deepEqual(textos(llamadas), []);
});

test('/start prestamo (el botón de la Mini App) abre el mismo flujo', async () => {
  const { bot, llamadas } = preparar();
  await bot.handleUpdate(mensaje('/start prestamo', { chatId: ANA }));
  assert.match(llamadas.at(-1).payload.text, /¿Cuánto necesitas\?/);
});

// ---------- Avisos y «Mi natillera» ----------

test('el aviso ElegibleParaPrestamo trae el botón de pedirlo', () => {
  const teclado = AVISOS.ElegibleParaPrestamo.botones({ participacionId: 'par-ana' });
  assert.deepEqual(teclado.inline_keyboard.flat().map((b) => [b.text, b.callback_data]), [['Pedir préstamo', datoPrestamo('par-ana')]]);
});

test('«Mi natillera» ofrece el préstamo solo con las cuotas pedidas y sin saldo de otro préstamo', () => {
  const datos = (r) => r.teclado?.inline_keyboard.flat().map((b) => b.callback_data) ?? [];
  assert.deepEqual(datos(resumenParticipacion(natillera(), participacion())), [datoPrestamo('par-ana')]);
  assert.deepEqual(datos(resumenParticipacion(natillera(), participacion({ CuotasPagadas: 1 }))), []);
  assert.deepEqual(datos(resumenParticipacion(natillera(), participacion({ DeudaPrestamoEnMora: 1 }))), []);
});

test('los avisos del préstamo llegan a quien lo pidió si la web usa el solicitudId como CreditoId', async () => {
  const registro = crearRegistro(abrirBaseDeDatos(EN_MEMORIA));
  registro.guardarNatillera({ natilleraId: 'nat-1', contractId: 'c-nat-1', nombre: 'Los Amigos', adminTelegramId: 999, creadaEn: 'x' });
  registro.guardarNatillera({ natilleraId: 'nat-2', contractId: 'c-nat-2', nombre: 'Primos', adminTelegramId: 999, creadaEn: 'y' });
  registro.guardarParticipacion({ participacionId: 'par-ana', contractId: 'c-ana', natilleraId: 'nat-1', telegramId: ANA });
  // La más reciente es la de Primos: sin la solicitud, el aviso se iría a la natillera equivocada.
  registro.guardarParticipacion({ participacionId: 'par-ana-2', contractId: 'c-ana-2', natilleraId: 'nat-2', telegramId: ANA });
  registro.guardarSolicitud({ solicitudId: 'sol-1', participacionId: 'par-ana', monto: 75000, plazoMeses: 3, creadaEn: '2026-11-16T15:00:00.000Z' });
  const enviados = [];
  const api = { sendMessage: async (chatId, texto) => enviados.push({ chatId, texto }) };
  const { aviso } = crearDespachador({ api, registro, log: logSilencioso });

  await aviso('CreditoEnMora', { creditoId: 'sol-1', saldoVencido: '30000' });
  await aviso('PrestamoDesembolsado', { creditoId: 'sol-1', participanteId: String(ANA), capital: '75000' });
  await aviso('DesembolsoFallo', { creditoId: 'otro', motivo: 'x' });

  assert.deepEqual(enviados, [
    { chatId: ANA, texto: 'Quedó pendiente $30.000 de tu préstamo en <b>Los Amigos</b>.' },
    { chatId: ANA, texto: '✅ Te llegó tu préstamo de $75.000 a tu billetera.' },
  ]);
});

test('/prestamo está en el menú y los textos del flujo cumplen la guía', () => {
  assert.ok(COMANDOS.some((c) => c.command === 'prestamo'));
  const textosFlujo = [
    TEXTO_SIN_NATILLERA, PREGUNTA_CUAL, TEXTO_NO_SE_PUDO_LEER, TEXTO_NO_ES_TUYO, preguntaMonto({ natillera: 'Los Amigos', maximo: 150000 }),
    textoResumen({ monto: 75000, plazo: 1, natillera: 'Los Amigos' }), textoSolicitado(75000), textoCambio(100000),
  ];
  for (const t of textosFlujo) {
    assert.ok(t.split('\n').length <= 3, `más de 3 líneas: ${t}`);
    assert.ok(!PROHIBIDAS.test(t), `palabra prohibida en: ${t}`);
    assert.ok((t.match(/\p{Extended_Pictographic}/gu) ?? []).length <= 1, `más de un emoji en: ${t}`);
  }
  assert.doesNotMatch(TEXTO_NO_SE_PUDO_LEER, /\p{Extended_Pictographic}/u, 'sin emoji en errores');
});
