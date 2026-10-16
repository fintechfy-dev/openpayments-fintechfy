import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BOTON_CHAT,
  BOTON_FORMULARIO,
  MENSAJE_FORMULARIO_ILEGIBLE,
  TIPO_FORMULARIO,
  textoCreada,
  textoElegir,
  textoResumen,
  textoVistaPrevia,
} from '../src/bot/flujos/crear.js';
import { boton, botones, crearBotDePrueba, datosDeMiniApp, mensaje, textos } from './helpers/bot-prueba.js';

const PROHIBIDAS = /interledger|ilp|grant|wallet|token|blockchain|cripto|transacci|payment pointer|moroso|debes/i;
const hoy = () => '2026-10-16';
const MINIAPP = 'https://fintechfy-dev.github.io/openpayments-fintechfy/telegram/miniapp/';

const NATILLERA = {
  nombre: 'Los Primos',
  cuota: 50000,
  periodicidad: 'mensual',
  inicio: '2026-11-01',
  final: '2026-12-01',
  cupo: 5,
  mora: 1,
};

function formulario(datos) {
  return datosDeMiniApp(JSON.stringify({ tipo: TIPO_FORMULARIO, v: 1, datos }));
}

test('sin Mini App configurada, /crear pregunta en el chat con botones', async () => {
  const { bot, llamadas } = crearBotDePrueba({ hoy });
  await bot.handleUpdate(mensaje('/crear'));

  const tarjeta = llamadas.at(-1);
  assert.match(tarjeta.payload.text, /^<b>Paso 1 de 7<\/b>.*\n¿Cómo se va a llamar la natillera\?\nEjemplo: Los Primos$/);
});

test('con Mini App, /crear ofrece el formulario en el teclado de abajo, con los límites en la dirección', async () => {
  const { bot, llamadas } = crearBotDePrueba({ hoy, env: { MINIAPP_URL: MINIAPP } });
  await bot.handleUpdate(mensaje('/crear'));

  const { payload } = llamadas.at(-1);
  assert.equal(payload.text, textoElegir('Ana'));
  const [[formularioBtn], [chatBtn]] = payload.reply_markup.keyboard;
  assert.equal(formularioBtn.text, BOTON_FORMULARIO);
  const url = new URL(formularioBtn.web_app.url);
  assert.equal(url.origin + url.pathname, MINIAPP);
  assert.deepEqual(Object.fromEntries(url.searchParams), { cuotaMin: '10000', cuotaMax: '500000', moraMax: '2.5' });
  assert.equal(chatBtn.text, BOTON_CHAT);

  await bot.handleUpdate(mensaje(BOTON_CHAT));
  assert.deepEqual(llamadas.at(-2).payload.reply_markup, { remove_keyboard: true });
  assert.match(llamadas.at(-1).payload.text, /Paso 1 de 7/);
});

test('MINIAPP_URL tiene que ser https', () => {
  assert.throws(() => crearBotDePrueba({ env: { MINIAPP_URL: 'http://localhost:8080/' } }), /MINIAPP_URL debe ser una URL que empiece por https:\/\//);
});

test('crear en el chat de punta a punta con botones termina en el resumen y la vista previa', async () => {
  const { bot, llamadas } = crearBotDePrueba({ hoy });
  await bot.handleUpdate(mensaje('/crear'));
  await bot.handleUpdate(mensaje('Los Primos'));

  assert.deepEqual(botones(llamadas.at(-1)), ['f:p:1:10000', 'f:p:1:20000', 'f:p:1:50000', 'f:p:1:100000', 'f:x']);
  await bot.handleUpdate(boton('f:p:1:50000', { messageId: 1001 }));
  assert.deepEqual(botones(llamadas.at(-1)), ['f:p:2:mensual', 'f:x']);
  await bot.handleUpdate(boton('f:p:2:mensual', { messageId: 1001 }));
  assert.deepEqual(botones(llamadas.at(-1)), ['f:p:3:2026-10-16', 'f:p:3:2026-10-23', 'f:p:3:2026-11-01', 'f:x']);
  await bot.handleUpdate(boton('f:p:3:2026-11-01', { messageId: 1001 }));
  // Las fechas finales sugeridas dependen del inicio y la periodicidad.
  const finales = llamadas.at(-1).payload.reply_markup.inline_keyboard.flat().map((b) => b.text);
  assert.deepEqual(finales, ['31 de diciembre · 2 cuotas', '3 cuotas', '6 cuotas', '12 cuotas', 'Cancelar']);
  // Escrita a mano también sirve.
  await bot.handleUpdate(mensaje('01/12/2026'));
  await bot.handleUpdate(boton('f:p:5:5', { messageId: 1002 }));
  await bot.handleUpdate(boton('f:p:6:1', { messageId: 1002 }));

  const resumen = llamadas.at(-1);
  assert.equal(resumen.payload.text, textoResumen(NATILLERA));
  assert.equal(
    textoResumen(NATILLERA),
    [
      '🐷 Revisa <b>Los Primos</b>: $50.000 cada mes, 2 cuotas.',
      'Del 1 de noviembre al 1 de diciembre de 2026. Cada quien ahorra $100.000, que guarda Financiera Aliada.',
      'Mínimo 5 personas · mora de 1 % diario.',
    ].join('\n'),
  );
  assert.equal(resumen.payload.reply_markup.inline_keyboard[0][0].text, 'Crear natillera');

  await bot.handleUpdate(boton('f:ok', { messageId: 1002 }));
  assert.ok(textos(llamadas).includes(textoVistaPrevia('Ana', NATILLERA)));
});

test('con el servicio conectado, confirmar crea la natillera una sola vez', async () => {
  const creadas = [];
  const { bot, llamadas } = crearBotDePrueba({ hoy, crearNatillera: (datos) => creadas.push(datos) });
  await bot.handleUpdate(formulario(NATILLERA));
  await bot.handleUpdate(boton('f:ok'));
  await bot.handleUpdate(boton('f:ok'));

  assert.deepEqual(creadas, [NATILLERA]);
  assert.ok(textos(llamadas).includes(textoCreada('Ana', NATILLERA)));
});

test('el formulario de la Mini App llega validado al resumen', async () => {
  const { bot, llamadas } = crearBotDePrueba({ hoy });
  await bot.handleUpdate(formulario({ ...NATILLERA, cuota: '50000', cupo: '5', mora: '1' }));

  assert.equal(llamadas.at(-2).payload.text, 'Recibí el formulario.');
  assert.deepEqual(llamadas.at(-2).payload.reply_markup, { remove_keyboard: true });
  assert.equal(llamadas.at(-1).payload.text, textoResumen(NATILLERA));
});

test('lo que no sirve del formulario se vuelve a preguntar en el chat sin perder lo demás', async () => {
  const { bot, llamadas } = crearBotDePrueba({ hoy });
  await bot.handleUpdate(formulario({ ...NATILLERA, cuota: 999999999 }));

  assert.match(llamadas.at(-1).payload.text, /^La cuota debe estar entre \$10\.000 y \$500\.000\.\n¿De cuánto es la cuota/);
  await bot.handleUpdate(mensaje('20.000'));
  assert.equal(llamadas.at(-1).payload.text, textoResumen({ ...NATILLERA, cuota: 20000 }));
});

test('un formulario que no se entiende se rechaza sin romper nada', async () => {
  const { bot, llamadas } = crearBotDePrueba({ hoy });
  for (const data of ['no es json', JSON.stringify({ tipo: 'otro', datos: {} }), JSON.stringify({ tipo: TIPO_FORMULARIO })]) {
    await bot.handleUpdate(datosDeMiniApp(data));
    assert.equal(llamadas.at(-1).payload.text, MENSAJE_FORMULARIO_ILEGIBLE);
  }
});

test('corregir el inicio puede invalidar la fecha final: se vuelve a preguntar', async () => {
  const { bot, llamadas } = crearBotDePrueba({ hoy });
  // Del 1 al 10 de noviembre (1 cuota); al mover el inicio al 16, la fecha final queda antes.
  await bot.handleUpdate(formulario({ ...NATILLERA, final: '2026-11-10' }));
  await bot.handleUpdate(boton('f:c'));
  await bot.handleUpdate(boton('f:e:3'));
  await bot.handleUpdate(mensaje('16/11/2026'));

  assert.match(llamadas.at(-1).payload.text, /^La fecha final debe ser después del 16 de noviembre\.\n¿Hasta qué día va la natillera\?/);
});

test('el botón de la bienvenida empieza a crear', async () => {
  const { bot, llamadas } = crearBotDePrueba({ hoy });
  await bot.handleUpdate(mensaje('/start'));
  assert.deepEqual(botones(llamadas.at(-1)), ['menu:crear']);

  await bot.handleUpdate(boton('menu:crear'));
  assert.match(llamadas.at(-1).payload.text, /Paso 1 de 7/);
});

test('los textos de /crear cumplen la guía de voz y tono', () => {
  const textosCrear = [
    textoElegir('Ana'),
    textoElegir(undefined),
    textoResumen(NATILLERA),
    textoVistaPrevia('Ana', NATILLERA),
    textoCreada('Ana', NATILLERA),
    MENSAJE_FORMULARIO_ILEGIBLE,
  ];
  for (const texto of textosCrear) {
    assert.ok(texto.split('\n').length <= 3, `más de 3 líneas: ${texto}`);
    assert.ok(!PROHIBIDAS.test(texto), `palabra prohibida en: ${texto}`);
    assert.ok((texto.match(/\p{Extended_Pictographic}/gu) ?? []).length <= 1, `más de un emoji en: ${texto}`);
  }
  for (const b of [BOTON_FORMULARIO, BOTON_CHAT, 'Crear natillera', 'Corregir un dato']) {
    assert.ok(b.split(' ').length <= 3, `botón de más de 3 palabras: ${b}`);
  }
});
