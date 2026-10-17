import { test } from 'node:test';
import assert from 'node:assert/strict';
import { avisoDePago, crearLectorDeAvisosDePago, FUENTE } from '../src/avisos/pagos.js';
import { BOTON_PAGAR_DEUDA, datoBotonDeuda } from '../src/avisos/mensajes.js';
import { crearRegistro } from '../src/registro.js';
import { abrirBaseDeDatos, EN_MEMORIA } from '../src/db.js';
import { logSilencioso } from './helpers/bot-prueba.js';

// Las mismas palabras que no ve un participante en los avisos de staging (avisos.test.js).
const PROHIBIDAS = /interledger|ilp|grant|wallet|token|blockchain|cripto|transacci|payment pointer|moroso|debes/i;

// Natillera de Ana (admin, 100, también ahorra) con Beto (200) y una actividad.
function registroDePrueba() {
  const registro = crearRegistro(abrirBaseDeDatos(EN_MEMORIA));
  registro.guardarNatillera({ natilleraId: 'nat-1', contractId: 'c-nat', nombre: 'Los <Primos>', adminTelegramId: 100, creadaEn: '2026-10-16' });
  registro.guardarParticipacion({ participacionId: 'p-ana', contractId: 'c-ana', natilleraId: 'nat-1', telegramId: 100 });
  registro.guardarParticipacion({ participacionId: 'p-beto', contractId: 'c-beto', natilleraId: 'nat-1', telegramId: 200 });
  registro.guardarActividad({ actividadId: 'a-1', contractId: 'c-act', natilleraId: 'nat-1' });
  return registro;
}

const aviso = (id, evento, datos) => ({ id, evento, contractId: null, templateName: null, datos, recibido: '2026-10-17T04:06:18.831Z' });
const completado = (id, datos) => aviso(id, 'PagoCompletado', datos);
const fallido = (id, datos) => aviso(id, 'PagoFallido', datos);

// La API de pagos falsa: devuelve los avisos posteriores al cursor, de a `porPagina`.
function pagosFalso(avisos, { porPagina = 100 } = {}) {
  const lecturas = [];
  return {
    lecturas,
    avisos: async (desde) => {
      lecturas.push(desde);
      return avisos.filter((a) => !desde || a.id > desde).slice(0, porPagina);
    },
  };
}

function apiFalsa() {
  const enviados = [];
  return {
    enviados,
    async sendMessage(chatId, texto, opciones) {
      enviados.push({ chatId, texto, botones: opciones.reply_markup?.inline_keyboard?.flat().map((b) => b.callback_data) });
    },
  };
}

test('la cuota cobrada le llega solo a su dueño, con el periodo, el monto en pesos y el nombre escapado', () => {
  const m = avisoDePago(completado('1', { tipo: 'cuota', referencia: 'p-beto', monto: 50000, periodo: 2 }), registroDePrueba());
  assert.deepEqual(m.chats, [200]);
  assert.equal(m.texto, '✅ Se cobró tu cuota 2 de <b>Los &lt;Primos&gt;</b>: $50.000 de tu billetera.\nLa plata la guarda Financiera Aliada, a nombre de la natillera.');
  assert.equal(m.botones, undefined);
});

test('un cobro fallido no lleva emoji ni el motivo técnico; la deuda fallida trae el botón para reintentar', () => {
  const registro = registroDePrueba();
  const cuota = avisoDePago(fallido('1', { tipo: 'cuota', referencia: 'p-ana', monto: 50000, periodo: 1, motivo: 'Las billeteras están en monedas distintas (EUR y COP)' }), registro);
  assert.deepEqual(cuota.chats, [100]);
  assert.equal(cuota.texto, 'No se pudo cobrar tu cuota 1 de <b>Los &lt;Primos&gt;</b>.\nRevisa que tu billetera tenga saldo.');

  const deuda = avisoDePago(fallido('2', { tipo: 'deuda', referencia: 'p-beto', monto: 51000, motivo: 'sin fondos' }), registro);
  assert.deepEqual(deuda.chats, [200]);
  assert.doesNotMatch(deuda.texto, /fondos|EUR/);
  assert.deepEqual(deuda.botones.inline_keyboard.flat().map((b) => [b.text, b.callback_data]), [[BOTON_PAGAR_DEUDA, datoBotonDeuda('p-beto')]]);
});

test('el premio pagado va al grupo y el fallido solo al administrador; la liquidación, a su dueño', () => {
  const registro = registroDePrueba();
  assert.deepEqual(avisoDePago(completado('1', { tipo: 'premio', referencia: 'a-1', monto: 90000 }), registro).chats, [100, 200]);
  assert.deepEqual(avisoDePago(fallido('2', { tipo: 'premio', referencia: 'a-1', monto: 90000 }), registro).chats, [100]);
  const liquidacion = avisoDePago(completado('3', { tipo: 'liquidacion', referencia: 'p-beto', monto: 150000 }), registro);
  assert.deepEqual(liquidacion.chats, [200]);
  assert.match(liquidacion.texto, /^✅ Te llegó tu plata de <b>Los &lt;Primos&gt;<\/b>: \$150\.000\./);
});

test('un pago simulado se dice como prueba', () => {
  const m = avisoDePago(completado('1', { tipo: 'cuota', referencia: 'p-ana', monto: 50000, periodo: 1, simulado: true }), registroDePrueba());
  assert.equal(m.texto.split('\n').at(-1), 'Pago de prueba: no se movió dinero.');
});

test('no se anuncia lo que no es de este bot, ni los tipos que la referencia no ubica', () => {
  const registro = registroDePrueba();
  assert.equal(avisoDePago(completado('1', { tipo: 'cuota', referencia: 'par-de-otro-bot', monto: 50000, periodo: 1 }), registro), null);
  assert.equal(avisoDePago(completado('2', { tipo: 'actividad', referencia: 'a-1', monto: 10000 }), registro), null);
  assert.equal(avisoDePago(completado('3', { tipo: 'desembolso', referencia: 'cred-1', monto: 100000 }), registro), null);
  assert.equal(avisoDePago(completado('4', { tipo: 'venta', referencia: 'v-1', monto: 20000 }), registro), null);
  assert.equal(avisoDePago(aviso('5', 'OtroEvento', { tipo: 'cuota', referencia: 'p-ana', monto: 1 }), registro), null);
  assert.equal(avisoDePago(aviso('6', 'PagoCompletado', null), registro), null);
});

test('los textos de los avisos de pago cumplen la voz y tono', () => {
  const registro = registroDePrueba();
  for (const tipo of ['cuota', 'deuda', 'liquidacion', 'premio']) {
    const referencia = tipo === 'premio' ? 'a-1' : 'p-ana';
    for (const crear of [completado, fallido]) {
      const { texto } = avisoDePago(crear('1', { tipo, referencia, monto: 50000, periodo: 1 }), registro);
      assert.doesNotMatch(texto, PROHIBIDAS, `${tipo}: ${texto}`);
      assert.ok(texto.split('\n').length <= 3, `${tipo}: más de 3 líneas`);
      if (crear === fallido) assert.doesNotMatch(texto, /\p{Extended_Pictographic}/u, `${tipo}: emoji en un error`);
    }
  }
});

test('la primera pasada se ubica en el último aviso sin anunciar los viejos; después solo los nuevos, una vez', async () => {
  const registro = registroDePrueba();
  const viejos = [completado('001', { tipo: 'cuota', referencia: 'p-ana', monto: 50000, periodo: 1 })];
  const avisos = [...viejos];
  const pagos = pagosFalso(avisos);
  const api = apiFalsa();
  const lector = crearLectorDeAvisosDePago({ pagos, registro, api, log: logSilencioso });

  await lector.pasada();
  assert.equal(api.enviados.length, 0);
  assert.equal(registro.cursor(FUENTE), '001');

  avisos.push(completado('002', { tipo: 'cuota', referencia: 'p-beto', monto: 50000, periodo: 1 }));
  avisos.push(fallido('003', { tipo: 'cuota', referencia: 'p-ana', monto: 50000, periodo: 2 }));
  await lector.pasada();
  assert.deepEqual(api.enviados.map((e) => e.chatId), [200, 100]);
  assert.equal(registro.cursor(FUENTE), '003');

  await lector.pasada();
  assert.equal(api.enviados.length, 2);
  assert.equal(pagos.lecturas.at(-1), '003');
});

test('sin avisos previos, la primera pasada deja el cursor vacío y anuncia lo que llega luego', async () => {
  const registro = registroDePrueba();
  const avisos = [];
  const api = apiFalsa();
  const lector = crearLectorDeAvisosDePago({ pagos: pagosFalso(avisos), registro, api, log: logSilencioso });
  await lector.pasada();
  assert.equal(registro.cursor(FUENTE), '');
  avisos.push(completado('001', { tipo: 'cuota', referencia: 'p-ana', monto: 50000, periodo: 1 }));
  await lector.pasada();
  assert.deepEqual(api.enviados.map((e) => e.chatId), [100]);
});

test('una página llena de 100 hace pedir la siguiente en la misma pasada', async () => {
  const registro = registroDePrueba();
  registro.guardarCursor(FUENTE, '');
  const avisos = Array.from({ length: 101 }, (_, i) => completado(String(i + 1).padStart(3, '0'), { tipo: 'cuota', referencia: 'p-ana', monto: 50000, periodo: 1 }));
  const pagos = pagosFalso(avisos);
  const api = apiFalsa();
  await crearLectorDeAvisosDePago({ pagos, registro, api, log: logSilencioso }).pasada();
  assert.equal(api.enviados.length, 101);
  assert.deepEqual(pagos.lecturas, ['', '100']);
  assert.equal(registro.cursor(FUENTE), '101');
});

test('un chat bloqueado no frena a los demás ni deja el aviso sin marcar', async () => {
  const registro = registroDePrueba();
  registro.guardarCursor(FUENTE, '');
  const enviados = [];
  const api = {
    async sendMessage(chatId) {
      if (chatId === 100) throw new Error('Forbidden: bot was blocked by the user');
      enviados.push(chatId);
    },
  };
  const avisos = [completado('001', { tipo: 'premio', referencia: 'a-1', monto: 90000 })];
  await crearLectorDeAvisosDePago({ pagos: pagosFalso(avisos), registro, api, log: logSilencioso }).pasada();
  assert.deepEqual(enviados, [200]);
  assert.equal(registro.cursor(FUENTE), '001');
});

test('escuchar sigue después de un fallo de red, lo registra una vez y para al abortar', async () => {
  const registro = registroDePrueba();
  registro.guardarCursor(FUENTE, '');
  const avisos = [];
  let llamadas = 0;
  const pagos = {
    avisos: async () => {
      llamadas++;
      if (llamadas <= 2) throw new Error('fetch failed');
      return avisos.splice(0);
    },
  };
  const avisosAlLog = [];
  const log = { ...logSilencioso, warn: (m) => avisosAlLog.push(m) };
  const api = apiFalsa();
  const control = new AbortController();
  avisos.push(completado('001', { tipo: 'cuota', referencia: 'p-ana', monto: 50000, periodo: 1 }));
  const esperar = async () => {
    if (llamadas >= 4) control.abort();
  };
  await crearLectorDeAvisosDePago({ pagos, registro, api, log, esperar }).escuchar({ signal: control.signal });
  assert.equal(avisosAlLog.length, 1);
  assert.deepEqual(api.enviados.map((e) => e.chatId), [100]);
});
