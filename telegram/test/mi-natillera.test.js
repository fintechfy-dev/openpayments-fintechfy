import { test } from 'node:test';
import assert from 'node:assert/strict';
import { armarVista, segmentosDeCuotas } from '../miniapp/natillera/vista.js';
import { CASOS } from '../miniapp/natillera/datos-demo.js';
import {
  BOTON_MI_NATILLERA,
  MENSAJE_SIN_MINIAPP,
  textoMiNatillera,
  urlMiNatillera,
} from '../src/bot/comandos/mi-natillera.js';
import { prestamoPronto } from '../src/bot/comandos/start.js';
import { COMANDOS } from '../src/bot/index.js';
import { crearBotDePrueba, mensaje } from './helpers/bot-prueba.js';

const PROHIBIDAS = /interledger|ilp|grant|wallet|token|blockchain|cripto|transacci|payment pointer|moroso|debes|incumpli/i;
const MINIAPP = 'https://fintechfy-dev.github.io/openpayments-fintechfy/telegram/miniapp/';

// ---------- La vista (lo que pinta la Mini App) ----------

test('al día: ahorro, barra de cuotas, grupo, final y préstamo', () => {
  const v = armarVista(CASOS['al-dia'].datos);
  assert.equal(v.ahorro.valor, '$500.000');
  assert.equal(v.ahorro.detalle, '10 de 12 cuotas');
  assert.deepEqual(v.ahorro.segmentos, [...Array(10).fill('pagada'), 'hoy', 'pendiente']);
  assert.equal(v.aviso, null);
  assert.deepEqual(v.proxima, { titulo: 'Tu próxima cuota: $50.000', texto: 'El 15 de noviembre, a las 9:00 a. m.' });
  assert.equal(v.grupo.valor, '$2.451.500');
  assert.equal(v.grupo.porcentaje, 82, '2.451.500 de 3.000.000');
  assert.match(v.grupo.texto, /La plata la guarda Financiera Aliada/);
  assert.equal(v.liquidacion.valor, '$600.000');
  assert.match(v.liquidacion.texto, /15 de diciembre de 2026/);
  assert.equal(v.credito.titulo, 'Financiera Aliada te puede prestar hasta $300.000');
  assert.match(v.credito.texto, /tu ahorro sigue intacto/);
  assert.equal(v.arranque, undefined);
});

test('cuota pendiente: aviso sin culpa y sin préstamo', () => {
  const v = armarVista(CASOS.pendiente.datos);
  assert.equal(v.aviso.titulo, 'Tienes una cuota pendiente: $51.500');
  assert.match(v.aviso.texto, /Lo intentamos de nuevo mañana a las 9:00 a\. m\./);
  assert.deepEqual(v.ahorro.segmentos.slice(8, 11), ['pagada', 'mora', 'hoy']);
  assert.equal(v.credito, null);
  const fallido = v.pagos.find((p) => p.estado === 'fallido');
  assert.equal(fallido.motivo, 'Tu billetera no tenía saldo suficiente.');
  assert.equal(v.pagos[0].fecha, '15 de octubre', 'el más reciente primero');
});

test('recién creada: cuánto falta para arrancar y sin cobros', () => {
  const v = armarVista(CASOS.nueva.datos);
  assert.equal(v.arranque.titulo, 'Faltan 2 personas para arrancar');
  assert.equal(v.arranque.porcentaje, 60);
  assert.equal(v.ahorro.detalle, 'Todavía no arranca el cobro');
  assert.deepEqual(v.ahorro.segmentos, ['hoy', 'pendiente']);
  assert.equal(v.proxima, null);
  assert.deepEqual(v.pagos, []);
});

test('reglas, autorización y personas sin exponer el estado de nadie', () => {
  const v = armarVista(CASOS['al-dia'].datos);
  assert.deepEqual(v.reglas.map((r) => r.etiqueta), ['Cuota', 'Fechas', 'Cuotas', 'Mora diaria', 'Cupo para arrancar', 'Administra']);
  assert.equal(v.reglas[0].valor, '$50.000 cada mes');
  assert.equal(v.reglas[3].valor, '0,1 % si una cuota queda pendiente');
  assert.equal(v.autorizacion, 'Autorizaste el cobro de tus cuotas, hasta $50.000 cada vez.');
  assert.deepEqual(v.personas[0], { nombre: 'Andrés Restrepo', iniciales: 'AR', administra: true });
  for (const p of v.personas) assert.deepEqual(Object.keys(p), ['nombre', 'iniciales', 'administra']);
});

test('segmentos con más de una cuota pendiente', () => {
  assert.deepEqual(
    segmentosDeCuotas({ cuotasTotales: 6, periodoActual: 4 }, { cuotasPagadas: 2 }),
    ['pagada', 'pagada', 'mora', 'mora', 'hoy', 'pendiente'],
  );
  const v = armarVista({ ...CASOS.pendiente.datos, natillera: { ...CASOS.pendiente.datos.natillera, periodoActual: 10 }, yo: { ...CASOS.pendiente.datos.yo, cuotasPagadas: 8 } });
  assert.match(v.aviso.titulo, /^Tienes 2 cuotas pendientes/);
});

test('los textos de la vista cumplen la guía de voz y tono', () => {
  for (const caso of Object.values(CASOS)) {
    const v = armarVista(caso.datos);
    const textos = [
      v.ahorro.detalle, v.grupo.texto, v.liquidacion.texto, v.autorizacion,
      v.aviso?.titulo, v.aviso?.texto, v.credito?.titulo, v.credito?.texto, v.arranque?.titulo, v.arranque?.texto,
      ...v.pagos.map((p) => p.motivo),
    ].filter(Boolean);
    for (const t of textos) {
      assert.ok(!PROHIBIDAS.test(t), `palabra prohibida en: ${t}`);
      assert.ok(!/\p{Extended_Pictographic}/u.test(t), `emoji en: ${t}`);
    }
  }
});

// ---------- El bot ----------

test('/mi_natillera abre la Mini App del participante con el usuario del bot', async () => {
  const { bot, llamadas } = crearBotDePrueba({ env: { MINIAPP_URL: MINIAPP } });
  await bot.handleUpdate(mensaje('/mi_natillera'));

  const { payload } = llamadas.at(-1);
  assert.equal(payload.text, textoMiNatillera('Ana'));
  const [[boton]] = payload.reply_markup.inline_keyboard;
  assert.equal(boton.text, BOTON_MI_NATILLERA);
  assert.equal(boton.web_app.url, `${MINIAPP}natillera/?bot=natillera_prueba_bot`);
});

test('sin Mini App, /mi_natillera lo dice sin romper nada', async () => {
  const { bot, llamadas } = crearBotDePrueba();
  await bot.handleUpdate(mensaje('/mi_natillera'));
  assert.equal(llamadas.at(-1).payload.text, MENSAJE_SIN_MINIAPP);
});

test('urlMiNatillera funciona con o sin la barra final', () => {
  assert.equal(urlMiNatillera({ miniappUrl: 'https://x.dev/miniapp' }), 'https://x.dev/miniapp/natillera/');
  assert.equal(urlMiNatillera({ miniappUrl: 'https://x.dev/miniapp/' }, 'mi_bot'), 'https://x.dev/miniapp/natillera/?bot=mi_bot');
});

test('«Pedir préstamo» vuelve al chat con /start prestamo', async () => {
  const { bot, llamadas } = crearBotDePrueba();
  await bot.handleUpdate(mensaje('/start prestamo'));
  assert.equal(llamadas.at(-1).payload.text, prestamoPronto('Ana'));
});

test('/mi_natillera está en el menú y sus textos cumplen la guía', () => {
  assert.ok(COMANDOS.some((c) => c.command === 'mi_natillera'));
  for (const t of [textoMiNatillera('Ana'), textoMiNatillera(undefined), MENSAJE_SIN_MINIAPP, prestamoPronto('Ana')]) {
    assert.ok(t.split('\n').length <= 3, `más de 3 líneas: ${t}`);
    assert.ok(!PROHIBIDAS.test(t), `palabra prohibida en: ${t}`);
    assert.ok((t.match(/\p{Extended_Pictographic}/gu) ?? []).length <= 1, `más de un emoji en: ${t}`);
  }
});
