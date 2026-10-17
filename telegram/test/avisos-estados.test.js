import { test } from 'node:test';
import assert from 'node:assert/strict';
import { avisoDeNatillera, avisoDeParticipacion, crearVigiaDeEstados, ESTADO, textoLiquidando } from '../src/avisos/estados.js';
import { AVISOS, datoBotonDeuda } from '../src/avisos/mensajes.js';
import { ServicioExternoError } from '../src/externo/cliente.js';
import { crearRegistro } from '../src/registro.js';
import { abrirBaseDeDatos, EN_MEMORIA } from '../src/db.js';
import { logSilencioso } from './helpers/bot-prueba.js';

const tipado = (value) => ({ type: 'Integer', value });

// Natillera de Ana (admin, 100, también ahorra) con Beto (200).
function preparar() {
  const registro = crearRegistro(abrirBaseDeDatos(EN_MEMORIA));
  registro.guardarNatillera({ natilleraId: 'nat-1', contractId: 'c-nat', nombre: 'Los <Primos>', adminTelegramId: 100, creadaEn: '2026-10-17' });
  registro.guardarParticipacion({ participacionId: 'p-ana', contractId: 'c-ana', natilleraId: 'nat-1', telegramId: 100 });
  registro.guardarParticipacion({ participacionId: 'p-beto', contractId: 'c-beto', natilleraId: 'nat-1', telegramId: 200 });
  const estados = {
    'c-nat': { EstadoNatillera: tipado(ESTADO.CREADA) },
    'c-ana': { CuotasAdeudadas: tipado(0), DeudaCuotas: tipado(0) },
    'c-beto': { CuotasAdeudadas: tipado(0), DeudaCuotas: tipado(0) },
  };
  const lecturas = [];
  const servicio = {
    async leerContrato(id) {
      lecturas.push(id);
      if (!estados[id]) throw new ServicioExternoError(`GET /api/contracts/${id}`, 404, 'no encontrado');
      return { currentStateRaw: estados[id] };
    },
  };
  const enviados = [];
  const api = { async sendMessage(chatId, texto, opciones) { enviados.push({ chatId, texto, botones: opciones.reply_markup?.inline_keyboard?.flat().map((b) => b.callback_data) }); } };
  const vigia = crearVigiaDeEstados({ servicio, registro, api, log: logSilencioso });
  return { registro, estados, lecturas, enviados, vigia };
}

test('la primera pasada solo toma la foto; luego cada cambio de la natillera se le avisa al grupo una vez', async () => {
  const { estados, enviados, vigia } = preparar();
  await vigia.pasada();
  assert.equal(enviados.length, 0);

  estados['c-nat'].EstadoNatillera = tipado(ESTADO.ACTIVA);
  await vigia.pasada();
  await vigia.pasada();
  const activada = AVISOS.NatilleraActivada.texto({ nombre: 'Los <Primos>', datos: {} });
  assert.deepEqual(enviados.map((e) => [e.chatId, e.texto]), [[100, activada], [200, activada]]);

  estados['c-nat'].EstadoNatillera = tipado(ESTADO.LIQUIDANDO);
  await vigia.pasada();
  assert.deepEqual(enviados.slice(2).map((e) => e.texto), [textoLiquidando('Los <Primos>'), textoLiquidando('Los <Primos>')]);
});

test('la mora se le avisa solo a quien entra o sale, con el botón para pagar', async () => {
  const { estados, enviados, vigia } = preparar();
  await vigia.pasada();
  estados['c-beto'] = { CuotasAdeudadas: tipado(1), DeudaCuotas: { type: 'Currency', value: 50000 } };
  await vigia.pasada();
  assert.equal(enviados.length, 1);
  assert.equal(enviados[0].chatId, 200);
  assert.match(enviados[0].texto, /quedó pendiente: \$50\.000/);
  assert.deepEqual(enviados[0].botones, [datoBotonDeuda('p-beto')]);

  estados['c-beto'] = { CuotasAdeudadas: tipado(0), DeudaCuotas: tipado(0) };
  await vigia.pasada();
  assert.equal(enviados.at(-1).texto, AVISOS.SalidaDeMora.texto({ nombre: 'Los <Primos>' }));
});

test('una natillera cerrada o borrada en staging deja de leerse', async () => {
  const { registro, estados, lecturas, vigia } = preparar();
  registro.guardarNatillera({ natilleraId: 'nat-vieja', contractId: 'c-vieja', nombre: 'chao', adminTelegramId: 100, creadaEn: '2026-10-16' });
  estados['c-nat'].EstadoNatillera = tipado(ESTADO.CERRADA);
  await vigia.pasada();
  const primera = lecturas.length;
  await vigia.pasada();
  assert.equal(lecturas.length, primera, 'no se vuelve a leer nada');
  assert.equal(lecturas.filter((id) => id === 'c-vieja').length, 1);
});

test('avisoDeNatillera y avisoDeParticipacion no dicen nada sin cambio', () => {
  const natillera = { nombre: 'X' };
  assert.equal(avisoDeNatillera(natillera, { estado: 2 }, { estado: 2 }), null);
  assert.equal(avisoDeNatillera(natillera, { estado: 2 }, { estado: 4 }), null);
  const p = { participacion_id: 'p' };
  assert.equal(avisoDeParticipacion(natillera, p, { adeudadas: 1 }, { adeudadas: 2, deuda: 1 }), null);
  assert.equal(avisoDeParticipacion(natillera, p, { adeudadas: 0 }, { adeudadas: 0, deuda: 0 }), null);
});

test('un fallo de staging no tumba la vigilancia', async () => {
  const { registro } = preparar();
  let n = 0;
  const servicio = { async leerContrato() { n++; throw new Error('fetch failed'); } };
  const avisosAlLog = [];
  const control = new AbortController();
  const vigia = crearVigiaDeEstados({
    servicio, registro, api: { sendMessage: async () => {} }, log: { ...logSilencioso, warn: (m) => avisosAlLog.push(m) },
    esperar: async () => { if (n >= 3) control.abort(); },
  });
  await vigia.escuchar({ signal: control.signal });
  assert.equal(avisosAlLog.length, 1);
});

test('al encender el bot con la natillera ya activa y alguien en mora, no repite esos avisos', async () => {
  const { estados, enviados, vigia } = preparar();
  estados['c-nat'].EstadoNatillera = tipado(ESTADO.ACTIVA);
  estados['c-beto'] = { CuotasAdeudadas: tipado(2), DeudaCuotas: tipado(100000) };
  await vigia.pasada();
  assert.equal(enviados.length, 0);
});
