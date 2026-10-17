import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearBotDePrueba, mensaje, logSilencioso } from './helpers/bot-prueba.js';
import { crearRegistro } from '../src/registro.js';
import { abrirBaseDeDatos, EN_MEMORIA } from '../src/db.js';
import { codificarPanel, decodificarPanel } from '../src/natillera/panel.js';
import { cobrosDe, datosDeMiNatillera } from '../src/natillera/mi-natillera.js';
import { armarVista } from '../miniapp/natillera/vista.js';
import { BOTON_MI_NATILLERA, TEXTO_MENU, textoAbrirMiniApp } from '../src/bot/comandos/mi-natillera.js';

// La Mini App «Mi natillera» con los datos de staging: el bot los lee y los pasa en el enlace (#d=...).

const MINIAPP = 'https://fintechfy-dev.github.io/openpayments-fintechfy/telegram/miniapp/';
const ANA = 100;
const BETO = 200;

// Como estaban en staging «test4» y una de sus participaciones el 17 de octubre, tras la primera cuota.
const natillera = (cambios = {}) => ({
  NombreNatillera: 'test4',
  EstadoNatillera: 2,
  ValorCuota: 50000,
  NumeroCuotas: 2,
  PeriodicidadMeses: 1,
  FechaInicio: '2026-11-01',
  FechaFinal: '2026-12-31',
  FechaProximoCobro: '2026-12-01',
  FechaLimiteCupo: '2026-11-06',
  CupoMinimo: 3,
  ParticipantesValidados: 3,
  PagosPrimeraCuota: 3,
  PeriodoActual: 1,
  SaldoNatillera: 150000,
  PorcentajeMoraDiaria: 0.01,
  PagosParaPrestamo: 1,
  MultiploPrestamo: 2,
  ...cambios,
});
const participacion = (cambios = {}) => ({
  ParticipacionId: 'par-ana',
  EstadoParticipacion: 2,
  ValorCuota: 50000,
  CuotasPagadas: 1,
  TotalAportado: 50000,
  CuotasAdeudadas: 0,
  DeudaCuotas: 0,
  MoraAcumulada: 0,
  DeudaPrestamoEnMora: 0,
  ParteFinal: 0,
  PagosParaPrestamo: 1,
  MultiploPrestamo: 2,
  ...cambios,
});
const FILA = { natillera_id: 'nat-4', nombre: 'test4' };
const datos = (n = natillera(), p = participacion(), extra = {}) =>
  datosDeMiNatillera({ fila: FILA, n, p, personas: ['Ana', 'Beto', 'Caro'], administrador: 'Ana', nombre: 'Ana', hoy: '2026-10-17', ...extra });

// ---------- Los datos ----------

test('con la primera cuota cobrada en staging, la Mini App muestra el ahorro, el grupo y el cobro', () => {
  const v = armarVista(datos());
  assert.equal(v.estadoNatillera, 'activa');
  assert.equal(v.ahorro.valor, '$50.000');
  assert.equal(v.ahorro.detalle, '1 de 2 cuotas');
  assert.deepEqual(v.ahorro.segmentos, ['pagada', 'hoy']);
  assert.equal(v.grupo.valor, '$150.000');
  assert.equal(v.grupo.porcentaje, 50, '150.000 de 300.000');
  assert.deepEqual(v.proxima, { titulo: 'Tu próxima cuota: $50.000', texto: 'El 1 de diciembre, a las 9:00 a. m.' });
  assert.deepEqual(v.pagos, [{ titulo: 'Cuota', monto: '$50.000', fecha: '1 de noviembre', estado: 'completado', motivo: null }]);
  assert.equal(v.reglas[0].valor, '$50.000 cada mes');
  assert.equal(v.reglas[3].valor, '1 % si una cuota queda pendiente');
  assert.equal(v.reglas[5].valor, 'Ana');
  assert.equal(v.autorizacion, 'Autorizaste el cobro automático de tus cuotas.');
  // MultiploPrestamo × ValorCuota, con PagosParaPrestamo = 1 ya cumplido.
  assert.equal(v.credito.titulo, 'Financiera Aliada te puede prestar hasta $100.000');
  assert.equal(v.arranque, undefined);
});

test('con una cuota pendiente: el aviso con la mora y el cobro pendiente, sin préstamo', () => {
  const p = participacion({ EstadoParticipacion: 3, CuotasPagadas: 1, CuotasAdeudadas: 1, DeudaCuotas: 50000, MoraAcumulada: 1500 });
  const v = armarVista(datos(natillera({ PeriodoActual: 2, FechaProximoCobro: '2027-01-01' }), p));
  assert.equal(v.aviso.titulo, 'Tienes una cuota pendiente: $51.500');
  assert.equal(v.credito, null);
  assert.equal(v.proxima, null, 'ya no quedan cuotas por abrir');
  assert.deepEqual(cobrosDe(natillera(), p).map((c) => [c.tipo, c.estado, c.creado]), [
    ['cuota', 'completado', '2026-11-01'],
    ['deuda', 'pendiente', '2026-12-01'],
  ]);
});

test('recién creada: lo que falta para arrancar, sin próxima cuota ni cobros; liquidada: su parte', () => {
  const creada = armarVista(datos(
    natillera({ EstadoNatillera: 0, PeriodoActual: 0, ParticipantesValidados: 2, SaldoNatillera: 0, FechaProximoCobro: '0001-01-01' }),
    participacion({ EstadoParticipacion: 1, CuotasPagadas: 0, TotalAportado: 0 }),
  ));
  assert.equal(creada.arranque.titulo, 'Falta 1 persona para arrancar');
  assert.equal(creada.proxima, null);
  assert.deepEqual(creada.pagos, []);

  const liquidada = armarVista(datos(natillera({ EstadoNatillera: 5, PeriodoActual: 2 }), participacion({ EstadoParticipacion: 6, CuotasPagadas: 2, TotalAportado: 100000, ParteFinal: 100000 })));
  assert.equal(liquidada.estadoNatillera, 'cerrada');
  assert.deepEqual(liquidada.liquidacion, { valor: '$100.000', texto: 'Ya te llegó a tu billetera.' });
});

test('con el permiso real se muestra su tope total; sin autorizar, cómo hacerlo', () => {
  assert.equal(
    armarVista(datos(natillera(), participacion(), { permiso: { monto: 150000 } })).autorizacion,
    'Autorizaste desde tu billetera el cobro automático de tus cuotas, con tope de $150.000 en total.',
  );
  assert.match(armarVista(datos(natillera(), participacion({ EstadoParticipacion: 0 }))).autorizacion, /^Todavía no autorizas/);
});

test('de las demás personas solo va el nombre, y los datos llegan iguales por el enlace', () => {
  const d = datos();
  assert.deepEqual(d.natillera.participantes, [{ nombre: 'Ana' }, { nombre: 'Beto' }, { nombre: 'Caro' }]);
  assert.deepEqual(decodificarPanel(codificarPanel([d], '2026-10-17T15:00:00Z')).natilleras, [d]);
});

// ---------- El bot ----------

const tipado = (type, value) => ({ type, value, assigned: true });
const comoStaging = (estado) => ({
  currentStateRaw: Object.fromEntries(Object.entries(estado).map(([k, v]) => [k, tipado(typeof v === 'number' ? 'Integer' : 'Text', v)])),
});

function preparar() {
  const registro = crearRegistro(abrirBaseDeDatos(EN_MEMORIA));
  const contratos = { 'c-nat': natillera(), 'c-ana': participacion(), 'c-beto': participacion({ ParticipacionId: 'par-beto', EstadoParticipacion: 3 }) };
  const servicio = {
    leerContrato: async (id) => comoStaging(contratos[id]),
    disparar: async () => ({ results: [] }),
  };
  registro.guardarNatillera({ natilleraId: 'nat-4', contractId: 'c-nat', nombre: 'test4', adminTelegramId: ANA, creadaEn: '2026-10-16T10:00:00Z' });
  registro.guardarParticipacion({ participacionId: 'par-ana', contractId: 'c-ana', natilleraId: 'nat-4', telegramId: ANA, nombre: 'Ana Parra' });
  registro.guardarParticipacion({ participacionId: 'par-beto', contractId: 'c-beto', natilleraId: 'nat-4', telegramId: BETO, nombre: 'Beto' });
  return crearBotDePrueba({
    env: { MINIAPP_URL: MINIAPP },
    servicio,
    registro,
    log: logSilencioso,
    ahora: () => Date.parse('2026-10-17T15:00:00Z'),
    hoy: () => '2026-10-17',
  });
}

const datosDelEnlace = (url) => decodificarPanel(new URL(url).hash.replace(/^#d=/, ''));

for (const orden of ['/mi_natillera', '/start mi_natillera']) {
  test(`${orden} abre la Mini App con los datos de staging y deja el menú del chat apuntando a ellos`, async () => {
    const { bot, llamadas } = preparar();
    await bot.handleUpdate(mensaje(orden, { chatId: ANA }));

    const enviados = llamadas.filter((l) => l.method === 'sendMessage');
    assert.match(enviados[0].payload.text, /test4/, 'primero el resumen en el chat');
    const ultimo = enviados.at(-1);
    assert.equal(ultimo.payload.text, textoAbrirMiniApp(1));
    const [boton] = ultimo.payload.reply_markup.inline_keyboard.flat();
    assert.equal(boton.text, BOTON_MI_NATILLERA);
    assert.ok(boton.web_app.url.startsWith(`${MINIAPP}natillera/?bot=`));

    const d = datosDelEnlace(boton.web_app.url);
    assert.equal(d.generado, '2026-10-17T15:00:00.000Z');
    assert.equal(d.natilleras.length, 1);
    const [mia] = d.natilleras;
    assert.equal(mia.yo.aportado, 50000);
    assert.equal(mia.yo.nombre, 'Ana Parra');
    assert.equal(mia.natillera.saldoCustodia, 150000);
    assert.equal(mia.natillera.administrador, 'Ana Parra');
    // Beto está en mora, pero eso no viaja en los datos de Ana.
    assert.deepEqual(mia.natillera.participantes, [{ nombre: 'Ana Parra' }, { nombre: 'Beto' }]);
    assert.doesNotMatch(JSON.stringify(d), /par-beto|en_mora/);

    const menu = llamadas.find((l) => l.method === 'setChatMenuButton');
    assert.equal(menu.payload.chat_id, ANA);
    assert.deepEqual(menu.payload.menu_button, { type: 'web_app', text: TEXTO_MENU, web_app: { url: boton.web_app.url } });
  });
}
