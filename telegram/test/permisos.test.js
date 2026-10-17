import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearBotDePrueba, mensaje, boton, textos, botones, CHAT_EQUIPO } from './helpers/bot-prueba.js';
import { crearRegistro } from '../src/registro.js';
import { abrirBaseDeDatos, EN_MEMORIA } from '../src/db.js';
import { AYUDA_PERMISOS, TOPE_ROL, datoListo, datoPedir, textoAlertaPermiso } from '../src/bot/comandos/permisos.js';
import { crearLectorDeAvisosDePago, ESPERA_ALERTA_MS, FUENTE, faltaPermisoDePlataforma } from '../src/avisos/pagos.js';
import { logSilencioso } from './helpers/bot-prueba.js';

// /permisos: los permisos de las billeteras de la plataforma (#67), desde el chat del equipo.

const GRUPO = 'p1111111111111111';
const NUEVO = 'p2222222222222222';

function pagosFalso(estados = {}) {
  const pedidos = [];
  return {
    pedidos,
    estados,
    async estadoPermiso(id) {
      return { estado: this.estados[id] ?? 'pendiente', grantId: null, motivo: null };
    },
    async pedirPermiso(cuerpo) {
      pedidos.push(cuerpo);
      return { permisoId: NUEVO, urlAprobacion: 'https://auth.interledger-test.dev/interact/x' };
    },
  };
}

function preparar(estados) {
  const registro = crearRegistro(abrirBaseDeDatos(EN_MEMORIA));
  const pagos = pagosFalso(estados);
  const servicio = { leerContrato: async () => ({}) };
  const { bot, llamadas } = crearBotDePrueba({ servicio, registro, pagos });
  return { bot, llamadas, registro, pagos };
}

const enEquipo = (texto) => mensaje(texto, { chatId: CHAT_EQUIPO });
const tocar = (dato) => boton(dato, { chatId: CHAT_EQUIPO });

test('/permisos muestra los dos y ofrece pedir el que no está aprobado', async () => {
  const { bot, llamadas, registro } = preparar({ [GRUPO]: 'aprobado' });
  registro.guardarPermisoRol('grupo', GRUPO);
  await bot.handleUpdate(enEquipo('/permisos'));

  const ultima = llamadas.at(-1);
  assert.equal(ultima.payload.text, 'Permisos de la plataforma:\n✓ Grupo (liquidaciones y premios): aprobado\n✗ Financiera (préstamos): sin pedir');
  assert.deepEqual(botones(ultima), [datoPedir('financiera')]);
});

test('/permisos fuera del chat del equipo no responde', async () => {
  const { bot, llamadas } = preparar();
  await bot.handleUpdate(mensaje('/permisos', { chatId: 100 }));
  assert.equal(llamadas.filter((l) => l.method === 'sendMessage').length, 0);
});

test('pedir guarda el permiso, da el enlace de la billetera y «Ya aprobé» lo termina', async () => {
  const { bot, llamadas, registro, pagos } = preparar();
  await bot.handleUpdate(tocar(datoPedir('grupo')));

  assert.deepEqual(pagos.pedidos, [{ tipo: 'grupo', monto: TOPE_ROL, referencia: 'rol-grupo' }]);
  assert.equal(registro.permisoRol('grupo'), NUEVO);
  const conEnlace = llamadas.filter((l) => l.method === 'sendMessage').at(-1);
  const teclado = conEnlace.payload.reply_markup.inline_keyboard.flat();
  assert.deepEqual(teclado.map((b) => b.url ?? b.callback_data), ['https://auth.interledger-test.dev/interact/x', datoListo('grupo')]);

  await bot.handleUpdate(tocar(datoListo('grupo')));
  assert.match(textos(llamadas).at(-1), /^… El permiso de grupo sigue pendiente/);

  pagos.estados[NUEVO] = 'aprobado';
  await bot.handleUpdate(tocar(datoListo('grupo')));
  assert.match(textos(llamadas).at(-1), /^✓ El permiso de grupo quedó aprobado/);
});

test('«Ya aprobé» de financiera habla de la financiera, aunque el de grupo exista', async () => {
  const { bot, llamadas, registro } = preparar({ [GRUPO]: 'aprobado', [NUEVO]: 'rechazado' });
  registro.guardarPermisoRol('grupo', GRUPO);
  registro.guardarPermisoRol('financiera', NUEVO);
  await bot.handleUpdate(tocar(datoListo('financiera')));
  assert.equal(textos(llamadas).at(-1), '✗ Financiera (préstamos): rechazado');
});

test('/permisos registrar solo acepta un permiso aprobado y con forma de id', async () => {
  const { bot, llamadas, registro } = preparar({ [GRUPO]: 'aprobado', [NUEVO]: 'pendiente' });
  await bot.handleUpdate(enEquipo(`/permisos registrar financiera ${NUEVO}`));
  assert.match(textos(llamadas).at(-1), /pendiente; solo registro un permiso aprobado/);
  assert.equal(registro.permisoRol('financiera'), undefined);

  await bot.handleUpdate(enEquipo('/permisos registrar grupo no-es-un-id'));
  assert.equal(textos(llamadas).at(-1), AYUDA_PERMISOS);

  await bot.handleUpdate(enEquipo(`/permisos registrar grupo ${GRUPO}`));
  assert.equal(registro.permisoRol('grupo'), GRUPO);
});

test('faltaPermisoDePlataforma reconoce solo los pagos de la plataforma sin permiso', () => {
  const motivo = 'La billetera del grupo no tiene permiso aprobado (#67)';
  assert.equal(faltaPermisoDePlataforma({ evento: 'PagoFallido', datos: { tipo: 'liquidacion', motivo } }), 'liquidacion');
  assert.equal(faltaPermisoDePlataforma({ evento: 'PagoFallido', datos: { tipo: 'desembolso', motivo } }), 'desembolso');
  assert.equal(faltaPermisoDePlataforma({ evento: 'PagoFallido', datos: { tipo: 'cuota', motivo } }), null);
  assert.equal(faltaPermisoDePlataforma({ evento: 'PagoFallido', datos: { tipo: 'liquidacion', motivo: 'sin fondos' } }), null);
  assert.equal(faltaPermisoDePlataforma({ evento: 'PagoCompletado', datos: { tipo: 'liquidacion' } }), null);
});

test('la liquidación que falla sin permiso alerta al equipo una sola vez cada 10 minutos', async () => {
  const registro = crearRegistro(abrirBaseDeDatos(EN_MEMORIA));
  registro.guardarCursor(FUENTE, '');
  const motivo = 'La billetera del grupo no tiene permiso aprobado (#67)';
  const avisos = ['001', '002', '003', '004'].map((id) => ({ id, evento: 'PagoFallido', datos: { tipo: 'liquidacion', referencia: `p-${id}`, monto: 1, motivo } }));
  const enviados = [];
  let reloj = 0;
  const lector = crearLectorDeAvisosDePago({
    pagos: { avisos: async (desde) => avisos.filter((a) => a.id > (desde ?? '')) },
    registro,
    api: { sendMessage: async (chatId, texto) => enviados.push([chatId, texto]) },
    log: logSilencioso,
    equipo: String(CHAT_EQUIPO),
    ahora: () => reloj,
  });
  await lector.pasada();
  assert.deepEqual(enviados, [[String(CHAT_EQUIPO), textoAlertaPermiso('liquidacion')]]);

  avisos.push({ id: '005', evento: 'PagoFallido', datos: { tipo: 'liquidacion', referencia: 'p-5', monto: 1, motivo } });
  reloj = ESPERA_ALERTA_MS;
  await lector.pasada();
  assert.equal(enviados.length, 2);
});
