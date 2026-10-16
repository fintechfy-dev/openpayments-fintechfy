import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearBotDePrueba, mensaje, boton, botones, logSilencioso } from './helpers/bot-prueba.js';
import { crearRegistro } from '../src/registro.js';
import { abrirBaseDeDatos, EN_MEMORIA } from '../src/db.js';
import {
  MAXIMO_NATILLERAS,
  TEXTO_NO_SE_PUDO_LEER,
  TEXTO_SIN_NATILLERA,
  resumenAdministra,
  resumenParticipacion,
} from '../src/bot/comandos/mi-natillera.js';
import { datoAutorizar } from '../src/bot/flujos/unirse.js';
import { datoBotonDeuda } from '../src/avisos/mensajes.js';

// «Mi natillera» con los datos de staging (US-008, #26).

const PROHIBIDAS = /interledger|ilp\b|grant|wallet|token|blockchain|cripto|transacci|payment pointer|moroso|debes/i;
const ANA = 100;
const ADMIN = 300;

// Como los devuelve estadoDe() para «los amigos» en staging (16 de octubre), con lo que cambie la prueba.
const natillera = (cambios = {}) => ({
  NombreNatillera: 'Los <Amigos>',
  EstadoNatillera: 0,
  ValorCuota: 50000,
  NumeroCuotas: 2,
  PeriodicidadMeses: 1,
  FechaInicio: '2026-11-01',
  FechaFinal: '2026-12-31',
  FechaProximoCobro: null,
  CupoMinimo: 5,
  ParticipantesValidados: 4,
  PagosPrimeraCuota: 0,
  PeriodoActual: 0,
  SaldoNatillera: 0,
  ...cambios,
});
const participacion = (cambios = {}) => ({
  ParticipacionId: 'par-1',
  EstadoParticipacion: 1,
  CuotasPagadas: 0,
  TotalAportado: 0,
  CuotasAdeudadas: 0,
  DeudaCuotas: 0,
  MoraAcumulada: 0,
  ParteFinal: 0,
  ...cambios,
});

// ---------- Los textos ----------

test('autorizada y esperando el arranque: fecha, cuántos van y dónde está la plata', () => {
  const { texto, teclado } = resumenParticipacion(natillera(), participacion());
  assert.equal(
    texto,
    [
      '🐷 <b>Los &lt;Amigos&gt;</b>: tu cobro está autorizado, $50.000 cada mes.',
      'Arranca el 1 de noviembre. Van 4 de 5 personas listas.',
      'La plata la guarda Financiera Aliada, no el administrador.',
    ].join('\n'),
  );
  assert.equal(teclado, undefined);
});

test('ya se pidió la primera cuota: cuenta los que pagaron, no los autorizados', () => {
  const { texto } = resumenParticipacion(natillera({ EstadoNatillera: 1, PagosPrimeraCuota: 2 }), participacion());
  assert.match(texto, /van 2 de 5 personas que pagaron/);
  assert.doesNotMatch(texto, /4 de 5/);
});

test('sin autorizar: lo dice como prueba y trae el botón de autorizar de su participación', () => {
  const { texto, teclado } = resumenParticipacion(natillera(), participacion({ EstadoParticipacion: 0 }));
  assert.match(texto, /te falta autorizar el cobro/);
  assert.match(texto, /autorización de prueba/);
  assert.deepEqual(teclado.inline_keyboard.flat().map((b) => b.callback_data), [datoAutorizar('par-1')]);
});

test('activa: ahorro, próxima cuota y saldo de la natillera', () => {
  const { texto } = resumenParticipacion(
    natillera({ EstadoNatillera: 2, FechaProximoCobro: '2026-12-01', SaldoNatillera: 250000, PeriodoActual: 1 }),
    participacion({ EstadoParticipacion: 2, CuotasPagadas: 1, TotalAportado: 50000 }),
  );
  assert.equal(
    texto,
    [
      '🐷 <b>Los &lt;Amigos&gt;</b>. Llevas $50.000 ahorrado: 1 de 2 cuotas.',
      'Tu próxima cuota: $50.000 el 1 de diciembre.',
      'La natillera tiene $250.000. La guarda Financiera Aliada.',
    ].join('\n'),
  );
});

test('en mora: lo pendiente con la mora, sin emoji, y el botón de pagar la deuda', () => {
  const { texto, teclado } = resumenParticipacion(
    natillera({ EstadoNatillera: 2 }),
    participacion({ EstadoParticipacion: 3, CuotasPagadas: 1, TotalAportado: 50000, CuotasAdeudadas: 1, DeudaCuotas: 50000, MoraAcumulada: 1500 }),
  );
  assert.match(texto, /tienes 1 cuota pendiente, \$51\.500 con la mora/);
  assert.doesNotMatch(texto, /\p{Extended_Pictographic}/u);
  assert.deepEqual(teclado.inline_keyboard.flat().map((b) => b.callback_data), [datoBotonDeuda('par-1')]);
});

test('el administrador que no ahorra ve cómo va el arranque y cómo invitar', () => {
  assert.equal(
    resumenAdministra(natillera()).texto,
    ['🐷 <b>Los &lt;Amigos&gt;</b>, la administras.', 'Arranca el 1 de noviembre. Van 4 de 5 personas listas.', 'Para ver a cada persona y el enlace, usa /administrar.'].join('\n'),
  );
  assert.match(resumenAdministra(natillera({ EstadoNatillera: 2, PeriodoActual: 1, SaldoNatillera: 250000 })).texto, /Van 1 de 2 cuotas\.\nLa natillera tiene \$250\.000/);
});

test('todos los estados cumplen la guía: 3 líneas, palabras y un emoji como máximo', () => {
  const casos = [
    ...[0, 1, 2, 3, 4, 5, 6, 7, 99].map((e) => resumenParticipacion(natillera({ EstadoNatillera: 2 }), participacion({ EstadoParticipacion: e, CuotasAdeudadas: 2 }))),
    resumenParticipacion(natillera({ EstadoNatillera: 1 }), participacion()),
    resumenAdministra(natillera()),
    resumenAdministra(natillera({ EstadoNatillera: 2 })),
  ];
  for (const { texto } of [...casos, { texto: TEXTO_SIN_NATILLERA }, { texto: TEXTO_NO_SE_PUDO_LEER }]) {
    assert.ok(texto.split('\n').length <= 3, `más de 3 líneas: ${texto}`);
    assert.ok(!PROHIBIDAS.test(texto), `palabra prohibida en: ${texto}`);
    assert.ok((texto.match(/\p{Extended_Pictographic}/gu) ?? []).length <= 1, `más de un emoji en: ${texto}`);
    assert.doesNotMatch(texto, /undefined|NaN/, texto);
  }
});

// ---------- El comando ----------

const tipado = (type, value) => ({ type, value, assigned: true });
const comoStaging = (estado) => ({
  currentStateRaw: Object.fromEntries(Object.entries(estado).map(([k, v]) => [k, tipado(typeof v === 'number' ? 'Integer' : 'Text', v)])),
});

function preparar({ falla = false } = {}) {
  const registro = crearRegistro(abrirBaseDeDatos(EN_MEMORIA));
  const contratos = {
    'c-nat-1': natillera(),
    'c-nat-2': natillera({ NombreNatillera: 'Primos', EstadoNatillera: 2, FechaProximoCobro: '2026-12-01' }),
    'c-par-1': participacion(),
    'c-par-2': participacion({ ParticipacionId: 'par-2', EstadoParticipacion: 3, CuotasAdeudadas: 1, DeudaCuotas: 50000 }),
  };
  const leidos = [];
  const servicio = {
    async leerContrato(id) {
      leidos.push(id);
      if (falla) throw new Error('staging caído');
      return comoStaging(contratos[id]);
    },
    async disparar() {
      return { results: [] };
    },
  };
  registro.guardarNatillera({ natilleraId: 'nat-1', contractId: 'c-nat-1', nombre: 'Los <Amigos>', adminTelegramId: ADMIN, creadaEn: '2026-10-16T10:00:00Z' });
  registro.guardarNatillera({ natilleraId: 'nat-2', contractId: 'c-nat-2', nombre: 'Primos', adminTelegramId: ADMIN, creadaEn: '2026-10-16T11:00:00Z' });
  const { bot, llamadas } = crearBotDePrueba({ servicio, registro, log: logSilencioso });
  return { bot, llamadas, registro, contratos, leidos };
}

const mensajesEnviados = (llamadas) => llamadas.filter((l) => l.method === 'sendMessage');

test('/mi_natillera responde con un mensaje por cada natillera en la que está la persona', async () => {
  const { bot, llamadas, registro } = preparar();
  registro.guardarParticipacion({ participacionId: 'par-1', contractId: 'c-par-1', natilleraId: 'nat-1', telegramId: ANA });
  registro.guardarParticipacion({ participacionId: 'par-2', contractId: 'c-par-2', natilleraId: 'nat-2', telegramId: ANA });

  await bot.handleUpdate(mensaje('/mi_natillera', { chatId: ANA }));

  const enviados = mensajesEnviados(llamadas);
  assert.equal(enviados.length, 2);
  assert.ok(enviados.every((l) => l.payload.parse_mode === 'HTML' && l.payload.chat_id === ANA));
  const [primos, amigos] = enviados;
  assert.match(primos.payload.text, /<b>Primos<\/b>: tienes 1 cuota pendiente/, 'la más reciente primero');
  assert.deepEqual(botones(primos), [datoBotonDeuda('par-2')]);
  assert.match(amigos.payload.text, /tu cobro está autorizado/);
  assert.deepEqual(botones(amigos), []);
});

test('el botón de pagar la deuda de «Mi natillera» funciona igual que el del aviso', async () => {
  const { bot, llamadas, registro } = preparar();
  registro.guardarParticipacion({ participacionId: 'par-2', contractId: 'c-par-2', natilleraId: 'nat-2', telegramId: ANA });
  await bot.handleUpdate(mensaje('/mi_natillera', { chatId: ANA }));
  await bot.handleUpdate(boton(datoBotonDeuda('par-2'), { chatId: ANA }));
  assert.match(mensajesEnviados(llamadas).at(-1).payload.text, /ya pedí el cobro/);
});

test('el administrador ve las natilleras que administra sin ahorrar en ellas', async () => {
  const { bot, llamadas, registro } = preparar();
  registro.guardarParticipacion({ participacionId: 'par-1', contractId: 'c-par-1', natilleraId: 'nat-1', telegramId: ADMIN });

  await bot.handleUpdate(mensaje('/mi_natillera', { chatId: ADMIN }));

  const enviados = mensajesEnviados(llamadas).map((l) => l.payload.text);
  assert.equal(enviados.length, 2, 'en «Los Amigos» ahorra; «Primos» solo la administra');
  assert.match(enviados[0], /Los &lt;Amigos&gt;<\/b>: tu cobro está autorizado/);
  assert.match(enviados[1], /<b>Primos<\/b>, la administras/);
});

test('sin natilleras, le dice cómo entrar a una', async () => {
  const { bot, llamadas, leidos } = preparar();
  await bot.handleUpdate(mensaje('/mi_natillera', { chatId: ANA }));
  assert.deepEqual(mensajesEnviados(llamadas).map((l) => l.payload.text), [TEXTO_SIN_NATILLERA]);
  assert.deepEqual(leidos, []);
});

test('si staging no responde, un solo mensaje amable y nada a medias', async () => {
  const { bot, llamadas, registro } = preparar({ falla: true });
  registro.guardarParticipacion({ participacionId: 'par-1', contractId: 'c-par-1', natilleraId: 'nat-1', telegramId: ANA });
  await bot.handleUpdate(mensaje('/mi_natillera', { chatId: ANA }));
  assert.deepEqual(mensajesEnviados(llamadas).map((l) => l.payload.text), [TEXTO_NO_SE_PUDO_LEER]);
});

test(`con más de ${MAXIMO_NATILLERAS} natilleras, muestra solo las ${MAXIMO_NATILLERAS} más recientes`, async () => {
  const { bot, llamadas, registro, contratos, leidos } = preparar();
  const total = MAXIMO_NATILLERAS + 2;
  for (let i = 0; i < total; i += 1) {
    contratos[`c-n${i}`] = natillera({ NombreNatillera: `N${i}` });
    registro.guardarNatillera({ natilleraId: `n${i}`, contractId: `c-n${i}`, nombre: `N${i}`, adminTelegramId: ANA, creadaEn: `2026-10-16T12:0${i}:00Z` });
  }

  await bot.handleUpdate(mensaje('/mi_natillera', { chatId: ANA }));

  const nombres = mensajesEnviados(llamadas).map((l) => l.payload.text.match(/<b>(.+?)<\/b>/)[1]);
  assert.deepEqual(nombres, ['N6', 'N5', 'N4', 'N3', 'N2']);
  assert.equal(leidos.length, MAXIMO_NATILLERAS, 'tampoco lee de staging las que no muestra');
});
