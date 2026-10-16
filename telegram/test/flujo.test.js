import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Bot, session } from 'grammy';
import {
  AVISO_INACTIVO,
  AVISO_PREGUNTA_VIEJA,
  AVISO_USA_BOTONES,
  MENSAJE_CANCELADO,
  MENSAJE_FLUJO_PERDIDO,
  MENSAJE_NADA_QUE_CANCELAR,
  barraDeAvance,
  crearMotorDeFlujos,
} from '../src/bot/flujo.js';
import { cancelar } from '../src/bot/comandos/cancelar.js';
import { abrirBaseDeDatos, EN_MEMORIA } from '../src/db.js';
import { escaparHTML } from '../src/formato.js';
import { almacenDeSesiones } from '../src/bot/sesion-storage.js';
import { BOT_INFO, TOKEN_DE_PRUEBA, boton, botones, crearBotDePrueba, crearFetchFalso, mensaje, textos } from './helpers/bot-prueba.js';

// Palabras que la guía de voz y tono prohíbe en los mensajes (igual que en start.test.js).
const PROHIBIDAS = /interledger|ilp|grant|wallet|token|blockchain|cripto|transacci|payment pointer|moroso|debes/i;

// Bot mínimo con un motor propio, para probar el motor con un flujo hecho a la medida.
// SQLite y no la memoria de grammY: esa devuelve el mismo objeto y no simula bien un error a medias.
function botConFlujo(def, { memoria = false } = {}) {
  const llamadas = [];
  const bot = new Bot(TOKEN_DE_PRUEBA, { botInfo: BOT_INFO, client: { fetch: crearFetchFalso(llamadas) } });
  // memoria: la sesión por defecto de grammY, la que usa el bot cuando no tiene base de datos.
  const storage = memoria ? undefined : almacenDeSesiones(abrirBaseDeDatos(EN_MEMORIA));
  bot.use(session({ initial: () => ({ flujo: null }), ...(storage ? { storage } : {}) }));

  const motor = crearMotorDeFlujos();
  motor.registrar(def);
  bot.command('probar', (ctx) => motor.iniciar(ctx, def.id));
  bot.use(cancelar({ motor }));
  bot.use(motor.middleware());
  return { bot, llamadas };
}

const paso = (clave, extra = {}) => ({ clave, etiqueta: clave.toUpperCase(), pregunta: `¿${clave}?`, ejemplo: `ej-${clave}`, ...extra });
const soloNumeros = (texto) => (/^\d+$/.test(texto) ? { valor: Number(texto) } : { error: 'Escribe un número.' });

test('pregunta uno a uno con barra de avance y botón Cancelar, y llama a alTerminar una vez', async () => {
  const terminados = [];
  const { bot, llamadas } = botConFlujo({
    id: 'prueba',
    pasos: [paso('a'), paso('b')],
    alTerminar: (ctx, datos) => terminados.push(datos),
  });

  await bot.handleUpdate(mensaje('/probar'));
  const primera = llamadas.at(-1);
  assert.equal(primera.payload.text, `${barraDeAvance(0, 2)}\n¿a?\nEjemplo: ej-a`);
  assert.equal(primera.payload.parse_mode, 'HTML');
  assert.deepEqual(botones(primera), ['f:x']);
  assert.match(barraDeAvance(0, 2), /Paso 1 de 2.*▰▱/);

  await bot.handleUpdate(mensaje('  uno  '));
  assert.equal(llamadas.at(-1).payload.text, `${barraDeAvance(1, 2)}\n¿b?\nEjemplo: ej-b`);
  await bot.handleUpdate(mensaje('dos'));
  // Un texto después de terminar ya no es parte del flujo.
  await bot.handleUpdate(mensaje('tres'));

  assert.deepEqual(terminados, [{ a: 'uno', b: 'dos' }]);
});

test('una respuesta escrita quita los botones de la tarjeta anterior', async () => {
  const { bot, llamadas } = botConFlujo({ id: 'prueba', pasos: [paso('a'), paso('b')], alTerminar() {} });
  await bot.handleUpdate(mensaje('/probar'));
  await bot.handleUpdate(mensaje('uno'));

  const quitar = llamadas.find((l) => l.method === 'editMessageReplyMarkup');
  assert.equal(quitar.payload.message_id, 1000, 'la tarjeta de la primera pregunta');
  assert.deepEqual(quitar.payload.reply_markup.inline_keyboard, []);
});

test('un botón responde por el mismo camino, se valida y edita la tarjeta en su lugar', async () => {
  const terminados = [];
  const { bot, llamadas } = botConFlujo({
    id: 'prueba',
    pasos: [
      paso('n', { validar: soloNumeros, opciones: () => [{ texto: 'Cinco', valor: '5' }, { texto: 'Malo', valor: 'x' }] }),
      paso('b'),
    ],
    alTerminar: (ctx, datos) => terminados.push(datos),
  });

  await bot.handleUpdate(mensaje('/probar'));
  assert.deepEqual(botones(llamadas.at(-1)), ['f:p:0:5', 'f:p:0:x', 'f:x']);

  await bot.handleUpdate(boton('f:p:0:x'));
  const error = llamadas.filter((l) => l.method === 'editMessageText').at(-1);
  assert.equal(error.payload.message_id, 1000);
  assert.match(error.payload.text, /^Escribe un número\.\n¿n\?/);

  await bot.handleUpdate(boton('f:p:0:5'));
  assert.match(textos(llamadas).at(-1), /Paso 2 de 2/);
  assert.equal(llamadas.filter((l) => l.method === 'answerCallbackQuery').length, 2, 'cada toque se contesta');

  await bot.handleUpdate(mensaje('listo'));
  assert.deepEqual(terminados, [{ n: 5, b: 'listo' }]);
});

test('botones viejos o sin flujo avisan sin cambiar nada', async () => {
  const { bot, llamadas } = botConFlujo({
    id: 'prueba',
    pasos: [paso('a', { opciones: () => [{ texto: 'A', valor: 'a' }] }), paso('b')],
    alTerminar() {},
  });

  await bot.handleUpdate(boton('f:p:0:a'));
  assert.equal(llamadas.at(-1).method, 'editMessageReplyMarkup');
  assert.equal(llamadas.find((l) => l.method === 'answerCallbackQuery').payload.text, AVISO_INACTIVO);

  await bot.handleUpdate(mensaje('/probar'));
  await bot.handleUpdate(mensaje('uno'));
  await bot.handleUpdate(boton('f:p:0:a'));
  assert.equal(llamadas.at(-1).payload.text, AVISO_PREGUNTA_VIEJA);
});

test('/cancelar y el botón Cancelar borran el flujo sin llamar a alTerminar', async () => {
  const terminados = [];
  const { bot, llamadas } = botConFlujo({
    id: 'prueba',
    pasos: [paso('a'), paso('b')],
    alTerminar: (ctx, datos) => terminados.push(datos),
  });

  await bot.handleUpdate(mensaje('/probar'));
  await bot.handleUpdate(mensaje('uno'));
  await bot.handleUpdate(mensaje('/cancelar'));
  assert.equal(llamadas.at(-1).payload.text, MENSAJE_CANCELADO);

  const antes = llamadas.length;
  await bot.handleUpdate(mensaje('dos'));
  assert.equal(llamadas.length, antes, 'un texto tras cancelar no debe responderse como parte del flujo');

  await bot.handleUpdate(mensaje('/cancelar'));
  assert.equal(llamadas.at(-1).payload.text, MENSAJE_NADA_QUE_CANCELAR);

  await bot.handleUpdate(mensaje('/probar'));
  await bot.handleUpdate(boton('f:x'));
  const editado = llamadas.filter((l) => l.method === 'editMessageText').at(-1);
  assert.equal(editado.payload.text, MENSAJE_CANCELADO);
  assert.deepEqual(terminados, []);
});

test('si alTerminar falla, el flujo sigue en la última pregunta y se puede reintentar', async () => {
  let intentos = 0;
  const terminados = [];
  const { bot } = botConFlujo({
    id: 'prueba',
    pasos: [paso('a'), paso('b')],
    alTerminar: (ctx, datos) => {
      intentos += 1;
      if (intentos === 1) throw new Error('el servicio no responde');
      terminados.push(datos);
    },
  });

  await bot.handleUpdate(mensaje('/probar'));
  await bot.handleUpdate(mensaje('uno'));
  await assert.rejects(bot.handleUpdate(mensaje('dos')));
  await bot.handleUpdate(mensaje('dos otra vez'));

  assert.deepEqual(terminados, [{ a: 'uno', b: 'dos otra vez' }]);
});

test('sin base de datos (sesión en memoria), si alTerminar falla también se puede reintentar', async () => {
  let intentos = 0;
  const terminados = [];
  const { bot } = botConFlujo(
    {
      id: 'prueba',
      pasos: [paso('a')],
      alTerminar: (ctx, datos) => {
        intentos += 1;
        if (intentos === 1) throw new Error('el servicio no responde');
        terminados.push(datos);
      },
    },
    { memoria: true },
  );

  await bot.handleUpdate(mensaje('/probar'));
  await assert.rejects(bot.handleUpdate(mensaje('uno')));
  await bot.handleUpdate(mensaje('uno otra vez'));

  assert.deepEqual(terminados, [{ a: 'uno otra vez' }]);
});

test('resumen: confirmar, corregir un dato y volver, con lo escrito escapado', async () => {
  const terminados = [];
  const { bot, llamadas } = botConFlujo({
    id: 'prueba',
    textoConfirmar: 'Crear',
    pasos: [paso('a'), paso('b')],
    resumen: (ctx, datos) => `Resumen ${escaparHTML(datos.a)} y ${escaparHTML(datos.b)}`,
    alTerminar: (ctx, datos) => terminados.push(datos),
  });

  await bot.handleUpdate(mensaje('/probar'));
  await bot.handleUpdate(mensaje('uno'));
  await bot.handleUpdate(mensaje('<b>dos</b>'));
  const resumen = llamadas.at(-1);
  assert.equal(resumen.payload.text, 'Resumen uno y &lt;b&gt;dos&lt;/b&gt;');
  assert.deepEqual(botones(resumen), ['f:ok', 'f:c', 'f:x']);

  // Un texto en el resumen no se toma como respuesta: se pide usar los botones.
  await bot.handleUpdate(mensaje('hola'));
  assert.deepEqual(textos(llamadas).slice(-2), [AVISO_USA_BOTONES, 'Resumen uno y &lt;b&gt;dos&lt;/b&gt;']);

  await bot.handleUpdate(boton('f:c'));
  const menu = llamadas.at(-1);
  assert.equal(menu.payload.text, '¿Qué dato quieres corregir?');
  assert.deepEqual(botones(menu), ['f:e:0', 'f:e:1', 'f:r']);

  await bot.handleUpdate(boton('f:e:0'));
  assert.match(llamadas.at(-1).payload.text, /^<b>Corrige: A<\/b>\n¿a\?/);
  await bot.handleUpdate(mensaje('UNO'));
  assert.equal(llamadas.at(-1).payload.text, 'Resumen UNO y &lt;b&gt;dos&lt;/b&gt;', 'vuelve al resumen, no a la pregunta b');

  await bot.handleUpdate(boton('f:c'));
  await bot.handleUpdate(boton('f:r'));
  assert.equal(llamadas.at(-1).payload.text, 'Resumen UNO y &lt;b&gt;dos&lt;/b&gt;');

  await bot.handleUpdate(boton('f:ok'));
  assert.deepEqual(terminados, [{ a: 'UNO', b: '<b>dos</b>' }]);
  assert.equal(llamadas.at(-1).method, 'editMessageReplyMarkup', 'el resumen queda sin botones');
});

test('revisar vuelve a preguntar un dato que dejó de servir', async () => {
  let permitido = 'dos';
  const terminados = [];
  const { bot, llamadas } = botConFlujo({
    id: 'prueba',
    pasos: [paso('a'), paso('b')],
    revisar: (ctx, datos) => (datos.b === permitido ? null : { clave: 'b', error: 'La b ya no sirve.' }),
    resumen: () => 'Resumen',
    alTerminar: (ctx, datos) => terminados.push(datos),
  });

  await bot.handleUpdate(mensaje('/probar'));
  await bot.handleUpdate(mensaje('uno'));
  await bot.handleUpdate(mensaje('dos'));
  permitido = 'tres';
  await bot.handleUpdate(boton('f:ok'));
  assert.match(llamadas.at(-1).payload.text, /^La b ya no sirve\.\n¿b\?/);
  await bot.handleUpdate(mensaje('tres'));
  await bot.handleUpdate(boton('f:ok'));
  assert.deepEqual(terminados, [{ a: 'uno', b: 'tres' }]);
});

test('si la sesión apunta a un flujo que ya no existe, lo limpia y avisa', async () => {
  const db = abrirBaseDeDatos(EN_MEMORIA);
  almacenDeSesiones(db).write('100', { flujo: { id: 'ya-no-existe', paso: 0, datos: {} } });
  const { bot, llamadas } = crearBotDePrueba({ db });

  await bot.handleUpdate(mensaje('hola'));

  assert.equal(llamadas.at(-1).payload.text, MENSAJE_FLUJO_PERDIDO);
  assert.deepEqual(almacenDeSesiones(db).read('100'), { flujo: null });
  db.close();
});

test('los textos fijos del motor cumplen la guía de voz y tono', () => {
  const fijos = [MENSAJE_FLUJO_PERDIDO, MENSAJE_CANCELADO, MENSAJE_NADA_QUE_CANCELAR, AVISO_PREGUNTA_VIEJA, AVISO_INACTIVO, AVISO_USA_BOTONES];
  for (const texto of fijos) {
    assert.ok(texto.split('\n').length <= 3, `más de 3 líneas: ${texto}`);
    assert.ok(!PROHIBIDAS.test(texto), `palabra prohibida en: ${texto}`);
    assert.ok(!/\p{Extended_Pictographic}/u.test(texto), `emoji en: ${texto}`);
  }
  assert.ok(!/\p{Extended_Pictographic}/u.test(barraDeAvance(2, 7)), 'la barra no cuenta como emoji');
});
