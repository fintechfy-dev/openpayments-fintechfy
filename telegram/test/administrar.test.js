import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearBotDePrueba, mensaje, boton, botones, textos, logSilencioso } from './helpers/bot-prueba.js';
import { crearRegistro } from '../src/registro.js';
import { abrirBaseDeDatos, EN_MEMORIA } from '../src/db.js';
import { codificarPanel, datosDeNatillera, decodificarPanel } from '../src/natillera/panel.js';
import {
  BOTON_ADMINISTRAR,
  TEXTO_NO_SE_PUDO_LEER,
  textoAdministrar,
  textoNatilleraEnChat,
} from '../src/bot/comandos/administrar.js';
import { PREGUNTA_CUAL, TEXTO_NO_ES_TUYA, TEXTO_SIN_NATILLERA, datoInvitar, textoInvitacion } from '../src/bot/comandos/invitar.js';
import { armarPanel } from '../miniapp/admin/vista.js';
import { DATOS_DEMO } from '../miniapp/admin/datos-demo.js';
import { COMANDOS } from '../src/bot/index.js';

// El panel del administrador: /administrar, la Mini App miniapp/admin/ y /invitar con varias natilleras.

const PROHIBIDAS = /interledger|ilp\b|grant|wallet|token|blockchain|cripto|transacci|payment pointer|moroso|debes|mora\b(?! diaria)/i;
const MINIAPP = 'https://fintechfy-dev.github.io/openpayments-fintechfy/telegram/miniapp/';
const ADMIN = 100;
const BETO = 200;

// Estado de staging como lo devuelve estadoDe(), con lo que cambie la prueba.
const natillera = (cambios = {}) => ({
  NombreNatillera: 'Los Amigos',
  EstadoNatillera: 0,
  ValorCuota: 50000,
  NumeroCuotas: 2,
  FechaInicio: '2026-11-01',
  FechaFinal: '2026-12-31',
  FechaProximoCobro: null,
  CupoMinimo: 5,
  ParticipantesValidados: 1,
  PagosPrimeraCuota: 0,
  PeriodoActual: 0,
  SaldoNatillera: 0,
  PorcentajeMoraDiaria: 0.01,
  ...cambios,
});
const participacion = (estado, cambios = {}) => ({ EstadoParticipacion: estado, CuotasPagadas: 0, TotalAportado: 0, ...cambios });
const fila = { natillera_id: 'nat-1', nombre: 'Los Amigos', creada_en: '2026-10-16T22:15:24.843Z' };

// ---------- Los datos que viajan en el enlace ----------

test('datosDeNatillera: estados con nombre, mora en porcentaje y quién es el administrador', () => {
  const d = datosDeNatillera({
    fila,
    n: natillera({ PorcentajeMoraDiaria: 0.015 }),
    personas: [
      { nombre: 'Ana', p: participacion(1), esAdmin: true },
      { nombre: null, p: participacion(0) },
    ],
    enlace: 'https://t.me/bot?start=abc',
  });
  assert.equal(d.estado, 'creada');
  assert.equal(d.creada, '2026-10-16');
  assert.equal(d.mora, 1.5);
  assert.deepEqual(d.personas, [
    { nombre: 'Ana', estado: 'autorizo', pagadas: 0, aportado: 0, tu: true },
    { nombre: 'Sin nombre', estado: 'falta_autorizar', pagadas: 0, aportado: 0 },
  ]);
});

test('el panel va y vuelve por el enlace con tildes y eñes, y un texto dañado da null', () => {
  const natilleras = [{ id: 'n', nombre: 'Año Niño «ñ» 🐷', personas: [{ nombre: 'José Peña' }] }];
  const codificado = codificarPanel(natilleras, '2026-10-16T23:00:00.000Z');
  assert.match(codificado, /^[A-Za-z0-9_-]+$/, 'solo caracteres seguros en una URL');
  assert.deepEqual(decodificarPanel(codificado), { v: 1, generado: '2026-10-16T23:00:00.000Z', natilleras });
  assert.equal(decodificarPanel('esto no es un panel'), null);
  assert.equal(decodificarPanel(codificarPanel(natilleras).slice(0, 10)), null);
  assert.equal(decodificarPanel(''), null);
});

// ---------- La vista de la Mini App ----------

test('esperando gente: cuántos faltan, quién no ha autorizado y el enlace para compartir', () => {
  const d = datosDeNatillera({
    fila,
    n: natillera({ ParticipantesValidados: 3 }),
    personas: [
      { nombre: 'Ana María', p: participacion(1), esAdmin: true },
      { nombre: 'Beto', p: participacion(1) },
      { nombre: 'Caro', p: participacion(1) },
      { nombre: 'Dani', p: participacion(0) },
    ],
    enlace: 'https://t.me/bot?start=abc',
  });
  const v = armarPanel(d);
  assert.equal(v.progreso.titulo, 'Van 3 de 5 personas listas');
  assert.equal(v.progreso.porcentaje, 60);
  assert.equal(v.progreso.texto, 'Arranca el 1 de noviembre si se completan 5 personas. Faltan 2.');
  assert.equal(v.personas.resumen, '1 persona todavía no autoriza el cobro.');
  assert.deepEqual(v.personas.lista.map((p) => [p.nombre, p.iniciales, p.tu, p.insignia.texto, p.detalle]), [
    ['Ana María', 'AM', true, 'Autorizó', null],
    ['Beto', 'B', false, 'Autorizó', null],
    ['Caro', 'C', false, 'Autorizó', null],
    ['Dani', 'D', false, 'Falta autorizar', null],
  ]);
  assert.equal(v.saldo, null, 'antes de arrancar no hay plata que mostrar');
  assert.equal(v.invitar.enlace, 'https://t.me/bot?start=abc');
  assert.equal(v.invitar.copiar, textoInvitacion('Los Amigos', 'https://t.me/bot?start=abc'));
  assert.ok(!v.invitar.compartir.includes('https://'), 'Telegram agrega el enlace al compartir');
  assert.deepEqual(v.reglas.map((r) => r.valor), ['$50.000 cada mes', 'Del 1 de noviembre al 31 de diciembre de 2026', '2', '5 personas', '1 % si una cuota queda pendiente']);
});

test('activa: cuota en curso, saldo, aporte de cada persona y sin enlace', () => {
  const v = armarPanel(
    datosDeNatillera({
      fila,
      n: natillera({ EstadoNatillera: 2, PeriodoActual: 1, FechaProximoCobro: '2026-12-01', SaldoNatillera: 250000 }),
      personas: [
        { nombre: 'Ana', p: participacion(2, { CuotasPagadas: 1, TotalAportado: 50000 }) },
        { nombre: 'Beto', p: participacion(3, { CuotasPagadas: 0 }) },
      ],
      enlace: 'https://t.me/bot?start=abc',
    }),
  );
  assert.equal(v.progreso.titulo, 'Cuota 1 de 2');
  assert.equal(v.progreso.porcentaje, 50);
  assert.equal(v.progreso.texto, 'El próximo cobro es el 1 de diciembre.');
  assert.equal(v.saldo.valor, '$250.000');
  assert.match(v.saldo.texto, /Financiera Aliada/);
  assert.deepEqual(v.personas.lista.map((p) => [p.insignia.texto, p.detalle]), [
    ['Al día', '1 cuota · $50.000'],
    ['Cuota pendiente', '0 cuotas · $0'],
  ]);
  assert.equal(v.invitar, null, 'después del arranque el enlace ya no inscribe a nadie');
});

test('ya se pidió la primera cuota: la barra cuenta los que pagaron', () => {
  const v = armarPanel(datosDeNatillera({ fila, n: natillera({ EstadoNatillera: 1, ParticipantesValidados: 5, PagosPrimeraCuota: 2 }), personas: [] }));
  assert.equal(v.progreso.titulo, 'Van 2 de 5 que pagaron la primera cuota');
  assert.equal(v.progreso.porcentaje, 40);
  assert.equal(v.personas.vacio, 'Todavía no se ha unido nadie. Comparte el enlace con tu grupo.');
});

test('los textos del panel cumplen la guía de voz y tono', () => {
  const estados = [0, 1, 2, 3, 4, 5, 6];
  const vistas = [
    ...DATOS_DEMO.natilleras.map(armarPanel),
    ...estados.map((e) => armarPanel(datosDeNatillera({ fila, n: natillera({ EstadoNatillera: e }), personas: [0, 1, 2, 3, 4, 5, 6, 7].map((p) => ({ nombre: 'Ana', p: participacion(p) })), enlace: 'https://t.me/b?start=x' }))),
  ];
  for (const v of vistas) {
    const textos = [
      v.creada, v.insignia.texto, v.progreso.titulo, v.progreso.texto, v.saldo?.texto, v.personas.titulo, v.personas.resumen, v.personas.vacio,
      v.invitar?.compartir, ...v.personas.lista.map((p) => p.insignia.texto), ...v.reglas.map((r) => r.valor),
    ].filter(Boolean);
    for (const t of textos) {
      assert.ok(!PROHIBIDAS.test(t), `palabra prohibida en: ${t}`);
      assert.doesNotMatch(t, /undefined|NaN|null/, t);
    }
  }
  assert.ok(DATOS_DEMO.natilleras.every((d) => /\(ejemplo\)/.test(d.nombre)), 'los datos de ejemplo se ven como tales');
});

// ---------- El bot ----------

function preparar({ env = {}, falla = false } = {}) {
  const registro = crearRegistro(abrirBaseDeDatos(EN_MEMORIA));
  const contratos = {
    'c-nat-1': natillera(),
    'c-nat-2': natillera({ NombreNatillera: 'Los Amigos', EstadoNatillera: 2, PeriodoActual: 1, SaldoNatillera: 100000 }),
    'c-par-admin': participacion(1),
    'c-par-beto': participacion(0),
  };
  const servicio = {
    async leerContrato(id) {
      if (falla) throw new Error('staging caído');
      return { currentStateRaw: Object.fromEntries(Object.entries(contratos[id]).map(([k, v]) => [k, { type: 'Text', value: v, assigned: true }])) };
    },
  };
  registro.guardarNatillera({ natilleraId: 'nat-1', contractId: 'c-nat-1', nombre: 'Los Amigos', adminTelegramId: ADMIN, creadaEn: '2026-10-16T22:00:00Z', codigoInvitacion: 'cod-1' });
  registro.guardarParticipacion({ participacionId: 'par-admin', contractId: 'c-par-admin', natilleraId: 'nat-1', telegramId: ADMIN, nombre: 'Ana' });
  // Se unió antes de que el bot guardara nombres.
  registro.guardarParticipacion({ participacionId: 'par-beto', contractId: 'c-par-beto', natilleraId: 'nat-1', telegramId: BETO });
  const { bot, llamadas } = crearBotDePrueba({ env, servicio, registro, log: logSilencioso, ahora: () => Date.parse('2026-10-16T23:00:00Z') });
  return { bot, llamadas, registro };
}

const segundaNatillera = (registro) =>
  registro.guardarNatillera({ natilleraId: 'nat-2', contractId: 'c-nat-2', nombre: 'Los Amigos', adminTelegramId: ADMIN, creadaEn: '2026-10-10T10:00:00Z' });

test('/administrar abre el panel con las natilleras, su gente y su enlace en el fragmento', async () => {
  const { bot, llamadas, registro } = preparar({ env: { MINIAPP_URL: MINIAPP } });
  segundaNatillera(registro);

  await bot.handleUpdate(mensaje('/administrar', { chatId: ADMIN }));

  const { payload } = llamadas.findLast((l) => l.method === 'sendMessage');
  assert.equal(payload.text, '🐷 Administras 2 natilleras: Los Amigos y Los Amigos.\nEn el panel ves a cada persona, quién falta por autorizar y el enlace para invitar.');
  const [[b]] = payload.reply_markup.inline_keyboard;
  assert.equal(b.text, BOTON_ADMINISTRAR);
  const url = new URL(b.web_app.url);
  assert.equal(`${url.origin}${url.pathname}`, `${MINIAPP}admin/`);
  assert.equal(url.searchParams.get('bot'), 'natillera_prueba_bot');

  const datos = decodificarPanel(new URLSearchParams(url.hash.slice(1)).get('d'));
  assert.equal(datos.generado, '2026-10-16T23:00:00.000Z');
  assert.deepEqual(datos.natilleras.map((d) => [d.id, d.creada, d.estado]), [['nat-1', '2026-10-16', 'creada'], ['nat-2', '2026-10-10', 'activa']]);
  const [amigos, otra] = datos.natilleras;
  assert.equal(amigos.enlace, 'https://t.me/natillera_prueba_bot?start=cod-1');
  assert.deepEqual(amigos.personas.map((p) => [p.nombre, p.estado, Boolean(p.tu)]), [['Ana', 'autorizo', true], ['Persona 200', 'falta_autorizar', false]]);
  assert.match(otra.enlace, /^https:\/\/t\.me\/natillera_prueba_bot\?start=.+/, 'la natillera sin código recibe uno');
  assert.equal(registro.participacion('par-beto').nombre, 'Persona 200', 'el nombre que dio Telegram queda guardado');
});

test('sin Mini App, /administrar responde en el chat con un mensaje y un botón de enlace por natillera', async () => {
  const { bot, llamadas } = preparar();
  await bot.handleUpdate(mensaje('/administrar', { chatId: ADMIN }));
  const [m] = llamadas.filter((l) => l.method === 'sendMessage');
  assert.equal(m.payload.text, '🐷 <b>Los Amigos</b>, creada el 16 de octubre.\nArranca el 1 de noviembre. Van 1 de 5 personas listas.\nFalta autorizar: Persona 200.');
  assert.deepEqual(botones(m), [datoInvitar('nat-1')]);

  await bot.handleUpdate(boton(datoInvitar('nat-1'), { chatId: ADMIN }));
  assert.match(textos(llamadas).at(-1), /Únete a nuestra natillera «Los Amigos»[\s\S]*start=cod-1/);
});

test('/administrar sin natilleras y con staging caído', async () => {
  const { bot, llamadas } = preparar();
  await bot.handleUpdate(mensaje('/administrar', { chatId: BETO }));
  assert.equal(textos(llamadas).at(-1), TEXTO_SIN_NATILLERA);

  const caido = preparar({ falla: true });
  await caido.bot.handleUpdate(mensaje('/administrar', { chatId: ADMIN }));
  assert.deepEqual(textos(caido.llamadas), [TEXTO_NO_SE_PUDO_LEER]);
});

test('/invitar con varias natilleras pregunta cuál, con el nombre y la fecha para distinguirlas', async () => {
  const { bot, llamadas, registro } = preparar();
  segundaNatillera(registro);
  await bot.handleUpdate(mensaje('/invitar', { chatId: ADMIN }));
  const pregunta = llamadas.findLast((l) => l.method === 'sendMessage');
  assert.equal(pregunta.payload.text, PREGUNTA_CUAL);
  assert.deepEqual(pregunta.payload.reply_markup.inline_keyboard.map(([b]) => [b.text, b.callback_data]), [
    ['Los Amigos · 16 de octubre', datoInvitar('nat-1')],
    ['Los Amigos · 10 de octubre', datoInvitar('nat-2')],
  ]);
});

test('el botón de enlace solo responde a quien administra la natillera', async () => {
  const { bot, llamadas } = preparar();
  await bot.handleUpdate(boton(datoInvitar('nat-1'), { chatId: BETO }));
  const respuesta = llamadas.find((l) => l.method === 'answerCallbackQuery');
  assert.equal(respuesta.payload.text, TEXTO_NO_ES_TUYA);
  assert.deepEqual(textos(llamadas), []);
});

test('/administrar está en el menú y sus textos cumplen la guía', () => {
  assert.ok(COMANDOS.some((c) => c.command === 'administrar'));
  const d = datosDeNatillera({ fila, n: natillera(), personas: [{ nombre: 'Ana', p: participacion(0) }] });
  for (const t of [textoAdministrar([d]), textoAdministrar([d, d, d]), textoNatilleraEnChat(d), textoNatilleraEnChat({ ...d, estado: 'activa' }), textoNatilleraEnChat({ ...d, estado: 'iniciada' }), TEXTO_NO_SE_PUDO_LEER, PREGUNTA_CUAL, TEXTO_NO_ES_TUYA]) {
    assert.ok(t.split('\n').length <= 3, `más de 3 líneas: ${t}`);
    assert.ok(!PROHIBIDAS.test(t), `palabra prohibida en: ${t}`);
    assert.ok((t.match(/\p{Extended_Pictographic}/gu) ?? []).length <= 1, `más de un emoji en: ${t}`);
  }
  assert.equal(textoAdministrar([d]).split('\n')[0], '🐷 Administras 1 natillera: Los Amigos.');
});
