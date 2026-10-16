import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { firmar, verificarFirma } from '../src/avisos/firma.js';
import { avisosDeCascada, ubicar, crearDespachador } from '../src/avisos/despachar.js';
import { AVISOS, EVENTOS, BOTON_PAGAR_DEUDA, datoBotonDeuda, datoBotonObligacion } from '../src/avisos/mensajes.js';
import { manejadorDeAvisos, guardarSecretosDeAvisos, leerSecretosDeAvisos } from '../src/avisos/webhook.js';
import { leerSse, escucharFlujoDeAvisos } from '../src/avisos/flujo-en-vivo.js';
import { crearRegistro } from '../src/registro.js';
import { abrirBaseDeDatos, EN_MEMORIA } from '../src/db.js';
import { logSilencioso } from './helpers/bot-prueba.js';

const PROHIBIDAS = /interledger|ilp|grant|wallet|token|blockchain|cripto|transacci|payment pointer|moroso|debes/i;
const SECRETO = 'secreto-de-avisos';

// Natillera de Ana (admin, 100, también ahorra), con Beto (200) y Caro (300), y una actividad.
function registroDePrueba() {
  const db = abrirBaseDeDatos(EN_MEMORIA);
  const registro = crearRegistro(db);
  registro.guardarNatillera({ natilleraId: 'nat-1', contractId: 'c-nat', nombre: 'Los <Primos>', adminTelegramId: 100, creadaEn: '2026-10-16' });
  registro.guardarParticipacion({ participacionId: 'p-ana', contractId: 'c-ana', natilleraId: 'nat-1', telegramId: 100 });
  registro.guardarParticipacion({ participacionId: 'p-beto', contractId: 'c-beto', natilleraId: 'nat-1', telegramId: 200 });
  registro.guardarParticipacion({ participacionId: 'p-caro', contractId: 'c-caro', natilleraId: 'nat-1', telegramId: 300 });
  registro.guardarActividad({ actividadId: 'a-1', contractId: 'c-act', natilleraId: 'nat-1' });
  registro.guardarObligacion({ contractId: 'c-obl-beto', actividadId: 'a-1', participacionId: 'p-beto' });
  return { db, registro };
}

function apiFalsa({ fallaEn = [] } = {}) {
  const enviados = [];
  return {
    enviados,
    async sendMessage(chatId, texto, opciones) {
      if (fallaEn.includes(chatId)) throw new Error('Forbidden: bot was blocked by the user');
      enviados.push({ chatId, texto, botones: opciones.reply_markup?.inline_keyboard?.flat() });
    },
  };
}

test('la firma válida pasa; otra, vencida o ausente no', () => {
  const ahora = 1_800_000_000;
  const cuerpo = '{"participacionId":"p-1"}';
  assert.ok(verificarFirma(firmar(cuerpo, SECRETO, ahora), cuerpo, SECRETO, ahora));
  assert.ok(!verificarFirma(firmar(cuerpo, 'otro', ahora), cuerpo, SECRETO, ahora));
  assert.ok(!verificarFirma(firmar(`${cuerpo} `, SECRETO, ahora), cuerpo, SECRETO, ahora));
  assert.ok(!verificarFirma(firmar(cuerpo, SECRETO, ahora - 301), cuerpo, SECRETO, ahora));
  assert.ok(!verificarFirma(undefined, cuerpo, SECRETO, ahora));
  assert.ok(!verificarFirma('t=abc,v1=00', cuerpo, SECRETO, ahora));
});

test('de una cascada saca solo los eventos que el bot conoce, estén donde estén', () => {
  const cascada = {
    type: 'cascade_executed',
    correlationId: 'k-1',
    contracts: [
      { contractId: 'c-beto', events: [{ type: 'CobroDeudaSolicitado', data: {} }, { type: 'RecordatorioMora', data: { participacionId: 'p-beto' } }] },
      { contractId: 'c-nat', events: [{ eventType: 'NatilleraActivada', payload: { natilleraId: 'nat-1' }, contractId: 'c-nat' }] },
    ],
  };
  assert.deepEqual(avisosDeCascada(cascada), [
    { evento: 'RecordatorioMora', datos: { participacionId: 'p-beto' }, contractId: undefined },
    { evento: 'NatilleraActivada', datos: { natilleraId: 'nat-1' }, contractId: 'c-nat' },
  ]);
  assert.deepEqual(avisosDeCascada('basura'), []);
  assert.deepEqual(avisosDeCascada({ type: 'cascade_failed', error: 'x' }), []);
});

test('ubica el aviso por participación, contrato, actividad, natillera o id de Telegram', () => {
  const { db, registro } = registroDePrueba();
  assert.equal(ubicar({ datos: { participacionId: 'p-beto' } }, registro).telegramId, 200);
  assert.equal(ubicar({ datos: { ParticipacionId: { type: 'Text', value: 'p-caro' } } }, registro).telegramId, 300);
  assert.equal(ubicar({ datos: { actividadId: 'a-1' } }, registro).actividadId, 'a-1');
  assert.equal(ubicar({ datos: { natilleraId: 'nat-1' } }, registro).natillera.nombre, 'Los <Primos>');
  const porObligacion = ubicar({ datos: { actividadId: 'a-1' }, contractId: 'c-obl-beto' }, registro);
  assert.equal(porObligacion.telegramId, 200);
  assert.equal(porObligacion.actividadId, 'a-1');
  // PrestamoDesembolsado trae creditoId (que el bot no conoce) y participanteId (el id de Telegram).
  assert.equal(ubicar({ datos: { creditoId: 'cr-1', participanteId: '300' } }, registro).telegramId, 300);
  // Lo que este bot no creó no se ubica.
  assert.equal(ubicar({ datos: { natilleraId: 'nat-de-otro' }, contractId: 'c-de-otro' }, registro), null);
  assert.equal(ubicar({ datos: { creditoId: 'cr-1', participanteId: '999' } }, registro), null);
  db.close();
});

test('un aviso del grupo le llega una vez a cada uno, con el administrador incluido', async () => {
  const { db, registro } = registroDePrueba();
  const api = apiFalsa();
  await crearDespachador({ api, registro, log: logSilencioso }).aviso('NatilleraActivada', { currentDate: '2026-11-01', natilleraId: 'nat-1' });

  assert.deepEqual(api.enviados.map((e) => e.chatId).sort(), [100, 200, 300]);
  // El nombre lo escribió una persona: va escapado.
  assert.match(api.enviados[0].texto, /<b>Los &lt;Primos&gt;<\/b> arrancó/);
  db.close();
});

test('la mora le llega solo a quien le quedó pendiente, con el botón para pagar', async () => {
  const { db, registro } = registroDePrueba();
  const api = apiFalsa();
  // Forma de la entrega según el OpenAPI: total llega como texto.
  await crearDespachador({ api, registro, log: logSilencioso }).aviso('RecordatorioMora', {
    currentDate: '2026-11-05',
    participacionId: 'p-beto',
    deudaCuotas: 100000,
    moraAcumulada: 3000,
    total: '103000',
  });

  assert.equal(api.enviados.length, 1);
  assert.equal(api.enviados[0].chatId, 200);
  assert.match(api.enviados[0].texto, /^Sigue pendiente \$103\.000 en <b>Los &lt;Primos&gt;<\/b>: \$100\.000 de cuota y \$3\.000 de mora\./);
  assert.deepEqual(api.enviados[0].botones, [{ text: BOTON_PAGAR_DEUDA, callback_data: datoBotonDeuda('p-beto') }]);
  db.close();
});

test('un total ilegible se muestra como la suma de sus partes, no como $0', async () => {
  const { db, registro } = registroDePrueba();
  const api = apiFalsa();
  await crearDespachador({ api, registro, log: logSilencioso }).aviso('RecordatorioMora', {
    participacionId: 'p-beto',
    deudaCuotas: 100000,
    moraAcumulada: 3000,
    total: 'no-es-numero',
  });
  assert.match(api.enviados[0].texto, /^Sigue pendiente \$103\.000/);
  db.close();
});

test('el recordatorio de una actividad lleva el botón de pagar esa actividad', async () => {
  const { db, registro } = registroDePrueba();
  const api = apiFalsa();
  await crearDespachador({ api, registro, log: logSilencioso }).aviso('RecordatorioObligacion', {
    participacionId: 'p-beto',
    actividadId: 'a-1',
    deudaObligacion: 20000,
    castigoAcumulado: 500,
    total: '20500',
  });

  assert.equal(api.enviados[0].chatId, 200);
  assert.match(api.enviados[0].texto, /^Tienes pendiente \$20\.500/);
  assert.equal(api.enviados[0].botones[0].callback_data, datoBotonObligacion('a-1'));
  db.close();
});

test('el préstamo desembolsado le llega a quien lo pidió por su id de Telegram', async () => {
  const { db, registro } = registroDePrueba();
  const api = apiFalsa();
  await crearDespachador({ api, registro, log: logSilencioso }).aviso('PrestamoDesembolsado', { creditoId: 'cr-1', participanteId: '300', capital: 200000 });

  assert.deepEqual(api.enviados.map((e) => [e.chatId, e.texto]), [[300, '✅ Te llegó tu préstamo de $200.000 a tu billetera.']]);
  db.close();
});

test('se ignoran los avisos de otros y los que no le hablan a nadie; un chat bloqueado no frena a los demás', async () => {
  const { db, registro } = registroDePrueba();
  const api = apiFalsa({ fallaEn: [200] });
  const { aviso, cascada } = crearDespachador({ api, registro, log: logSilencioso });

  await aviso('CuotaPagada', { participacionId: 'p-de-otro' });
  await aviso('PeriodoAbierto', { natilleraId: 'nat-1' });
  assert.equal(api.enviados.length, 0);

  await cascada({ contracts: [{ events: [{ type: 'NatilleraCerrada', data: { natilleraId: 'nat-1' } }] }] });
  assert.deepEqual(api.enviados.map((e) => e.chatId).sort(), [100, 300]);
  db.close();
});

test('los textos de todos los avisos cumplen la voz y tono', () => {
  const datos = { periodo: 2, monto: 100000, deudaCuotas: 100000, moraAcumulada: 1000, total: '101000', deudaObligacion: 1, castigoAcumulado: 1, recaudado: 1, montoMaximoPrestamo: '200000', capital: 1, saldoVencido: 1 };
  for (const [evento, def] of Object.entries(AVISOS)) {
    const texto = def.texto({ nombre: 'Los Primos', datos, participacionId: 'p', actividadId: 'a' });
    assert.ok(texto.split('\n').length <= 3, `${evento}: más de 3 líneas`);
    assert.ok(!PROHIBIDAS.test(texto), `${evento}: palabra prohibida en ${texto}`);
    const emojis = texto.match(/\p{Extended_Pictographic}/gu) ?? [];
    assert.ok(emojis.length <= 1, `${evento}: más de un emoji`);
    if (/Mora|Fallo|Rechazada|Recordatorio/.test(evento)) assert.equal(emojis.length, 0, `${evento}: emoji en mora o error`);
  }
  assert.match(AVISOS.ElegibleParaPrestamo.texto({ nombre: 'X', datos }), /de hasta \$200\.000/);
  assert.ok(!EVENTOS.includes('PremioCompletado'));
});

async function conServidor(manejador, prueba) {
  const servidor = createServer(manejador);
  await new Promise((r) => servidor.listen(0, '127.0.0.1', r));
  try {
    await prueba(`http://127.0.0.1:${servidor.address().port}`);
  } finally {
    servidor.close();
  }
}

test('el webhook saca el evento de la URL y verifica con el secreto de ese evento', async () => {
  const recibidos = [];
  const ahora = 1_800_000_000;
  const secretos = { CuotaPagada: 'secreto-cuota', SalidaDeMora: 'secreto-salida' };
  const manejador = manejadorDeAvisos({ secretos, aviso: async (evento, datos) => recibidos.push([evento, datos]), log: logSilencioso, ahoraSeg: () => ahora });

  await conServidor(manejador, async (base) => {
    const cuerpo = JSON.stringify({ participacionId: 'p-1' });
    const enviar = (ruta, secreto) =>
      fetch(`${base}${ruta}`, { method: 'POST', body: cuerpo, headers: { 'X-Motor-Signature': firmar(cuerpo, secreto, ahora) } });

    assert.equal((await enviar('/avisos/CuotaPagada', 'secreto-cuota')).status, 204);
    // Firmado con el secreto de otro evento: alguien que conoce uno no puede hacerse pasar por otro.
    assert.equal((await enviar('/avisos/CuotaPagada', 'secreto-salida')).status, 401);
    assert.equal((await enviar('/avisos/EventoQueNoRegistramos', 'secreto-cuota')).status, 404);
    assert.equal((await enviar('/avisos/constructor', 'secreto-cuota')).status, 404);
    assert.equal((await enviar('/avisos', 'secreto-cuota')).status, 404);
  });
  assert.deepEqual(recibidos, [['CuotaPagada', { participacionId: 'p-1' }]]);
});

test('los secretos de los webhooks se guardan y se leen del archivo, solo para su dueño', () => {
  const carpeta = mkdtempSync(join(tmpdir(), 'avisos-'));
  const ruta = join(carpeta, 'data', 'avisos-secretos.json');
  try {
    assert.deepEqual(leerSecretosDeAvisos(ruta), {});
    guardarSecretosDeAvisos(ruta, { CuotaPagada: 's1' });
    assert.deepEqual(leerSecretosDeAvisos(ruta), { CuotaPagada: 's1' });
    // En Windows los permisos POSIX no aplican.
    if (process.platform !== 'win32') assert.equal(statSync(ruta).mode & 0o777, 0o600);
  } finally {
    rmSync(carpeta, { recursive: true, force: true });
  }
});

test('el flujo en vivo separa los eventos aunque lleguen partidos', async () => {
  const trozos = ['event: cascade_executed\ndata: {"a":', '1}\n\n: comentario\n\ndata: {"b":2}\r\n\r\n', 'data: {"c":'];
  const flujo = new ReadableStream({
    start(c) {
      for (const t of trozos) c.enqueue(new TextEncoder().encode(t));
      c.close();
    },
  });
  const leidos = [];
  for await (const e of leerSse(flujo)) leidos.push(e);
  assert.deepEqual(leidos, [
    { evento: 'cascade_executed', datos: '{"a":1}' },
    { evento: undefined, datos: '{"b":2}' },
  ]);
});

test('el flujo en vivo reconecta de una vez cuando staging lo corta, y espera si no logra abrir', async () => {
  const control = new AbortController();
  let reloj = 0;
  let aperturas = 0;
  const servicio = {
    async abrirFlujoDeAvisos() {
      aperturas += 1;
      if (aperturas === 3) throw new Error('ECONNRESET');
      if (aperturas === 4) control.abort();
      return new ReadableStream({
        start(c) {
          reloj += 60_000; // estuvo abierto un minuto y staging lo cortó
          c.error(new TypeError('terminated'));
        },
      });
    },
  };
  const avisos = [];
  const log = { info() {}, warn: (m) => avisos.push(m), error() {} };
  await escucharFlujoDeAvisos({ servicio, procesar: async () => {}, log, signal: control.signal, esperaMs: 10, ahora: () => reloj });

  assert.equal(aperturas, 4);
  // El corte tras un minuto abierto no es una falla: no se avisa. Solo la apertura fallida.
  assert.equal(avisos.length, 1);
  assert.match(avisos[0], /No se pudo abrir/);
});
