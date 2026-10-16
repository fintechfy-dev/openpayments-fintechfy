import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Bot, session } from 'grammy';
import { crearMotorDeFlujos, textoPregunta, MENSAJE_FLUJO_PERDIDO } from '../src/bot/flujo.js';
import { cancelar, MENSAJE_CANCELADO, MENSAJE_NADA_QUE_CANCELAR } from '../src/bot/comandos/cancelar.js';
import { flujoEco, textoEcoTerminado } from '../src/bot/flujos/eco.js';
import { abrirBaseDeDatos, EN_MEMORIA } from '../src/db.js';
import { almacenDeSesiones } from '../src/bot/sesion-storage.js';
import { BOT_INFO, TOKEN_DE_PRUEBA, crearBotDePrueba, mensaje } from './helpers/bot-prueba.js';

// Palabras que la guía de voz y tono prohíbe en los mensajes (igual que en start.test.js).
const PROHIBIDAS = /interledger|ilp|grant|wallet|token|blockchain|cripto|transacci|payment pointer|moroso|debes/i;

// Bot mínimo con un motor propio, para probar el motor con un flujo hecho a la medida.
function botConFlujo(def) {
  const llamadas = [];
  const fetchFalso = async (url, init) => {
    llamadas.push({ method: String(url).split('/').at(-1), payload: JSON.parse(init.body) });
    return new Response(JSON.stringify({ ok: true, result: true }), { headers: { 'content-type': 'application/json' } });
  };
  const bot = new Bot(TOKEN_DE_PRUEBA, { botInfo: BOT_INFO, client: { fetch: fetchFalso } });
  // SQLite y no la memoria de grammY: esa devuelve el mismo objeto y no simula bien un error a medias.
  bot.use(session({ initial: () => ({ flujo: null }), storage: almacenDeSesiones(abrirBaseDeDatos(EN_MEMORIA)) }));

  const motor = crearMotorDeFlujos();
  motor.registrar(def);
  bot.command('probar', (ctx) => motor.iniciar(ctx, def.id));
  bot.use(cancelar());
  bot.use(motor.middleware());
  return { bot, llamadas };
}

const paso = (clave) => ({ clave, pregunta: `¿${clave}?`, ejemplo: `ej-${clave}` });

test('el flujo pregunta uno a uno con su ejemplo y llama a alTerminar una sola vez', async () => {
  const terminados = [];
  const { bot, llamadas } = botConFlujo({
    id: 'prueba',
    pasos: [paso('a'), paso('b')],
    alTerminar: (ctx, datos) => terminados.push(datos),
  });

  await bot.handleUpdate(mensaje('/probar'));
  assert.equal(llamadas.at(-1).payload.text, '¿a?\nEjemplo: ej-a');
  await bot.handleUpdate(mensaje('  uno  '));
  assert.equal(llamadas.at(-1).payload.text, '¿b?\nEjemplo: ej-b');
  await bot.handleUpdate(mensaje('dos'));
  // Un texto después de terminar ya no es parte del flujo.
  await bot.handleUpdate(mensaje('tres'));

  assert.deepEqual(terminados, [{ a: 'uno', b: 'dos' }]);
});

test('una respuesta inválida explica el porqué y repite la pregunta sin perder lo respondido', async () => {
  const { bot, llamadas } = crearBotDePrueba();

  await bot.handleUpdate(mensaje('/eco'));
  await bot.handleUpdate(mensaje('Natillera de la familia'));
  await bot.handleUpdate(mensaje('mil pesos'));
  const cuota = flujoEco({ cuota: { min: 10000, max: 500000 } }).pasos[1];
  assert.equal(llamadas.at(-1).payload.text, `La cuota debe estar entre $10.000 y $500.000.\n${textoPregunta(cuota)}`);
  await bot.handleUpdate(mensaje('5000'));
  assert.match(llamadas.at(-1).payload.text, /^La cuota debe estar entre/);

  await bot.handleUpdate(mensaje('20000'));
  assert.equal(llamadas.at(-1).payload.text, textoEcoTerminado({ nombre: 'Natillera de la familia', cuota: 20000 }));
});

test('/cancelar borra el flujo sin llamar a alTerminar', async () => {
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
  bot.catch(() => {});

  await bot.handleUpdate(mensaje('/probar'));
  await bot.handleUpdate(mensaje('uno'));
  await assert.rejects(bot.handleUpdate(mensaje('dos')));
  await bot.handleUpdate(mensaje('dos otra vez'));

  assert.deepEqual(terminados, [{ a: 'uno', b: 'dos otra vez' }]);
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

test('los comandos siguen funcionando con un flujo en curso', async () => {
  const { bot, llamadas } = crearBotDePrueba();
  await bot.handleUpdate(mensaje('/eco'));
  await bot.handleUpdate(mensaje('/start'));
  assert.match(llamadas.at(-1).payload.text, /^👋 ¡Hola, Ana!/);
  // El flujo sigue donde iba.
  await bot.handleUpdate(mensaje('Natillera de la familia'));
  assert.match(llamadas.at(-1).payload.text, /^¿De cuánto es la cuota/);
});

test('los textos del motor y de /cancelar cumplen la guía de voz y tono', () => {
  const eco = flujoEco({ cuota: { min: 10000, max: 500000 } });
  const textos = [
    MENSAJE_FLUJO_PERDIDO,
    MENSAJE_CANCELADO,
    MENSAJE_NADA_QUE_CANCELAR,
    textoEcoTerminado({ nombre: 'Familia', cuota: 20000 }),
    ...eco.pasos.map((p) => `Un error.\n${textoPregunta(p)}`),
  ];
  for (const texto of textos) {
    assert.ok(texto.split('\n').length <= 3, `más de 3 líneas: ${texto}`);
    assert.ok(!PROHIBIDAS.test(texto), `palabra prohibida en: ${texto}`);
    assert.ok(!/\p{Extended_Pictographic}/u.test(texto), `emoji en: ${texto}`);
  }
});
