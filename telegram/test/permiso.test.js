import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearBotDePrueba, mensaje, boton, textos, botones, logSilencioso, BOT_INFO } from './helpers/bot-prueba.js';
import { crearClientePagos, PagosError } from '../src/externo/pagos.js';
import { crearUnirse, topeDelPermiso } from '../src/externo/unirse.js';
import { crearRegistro } from '../src/registro.js';
import { abrirBaseDeDatos, EN_MEMORIA } from '../src/db.js';
import { estadoDe } from '../src/externo/cliente.js';
import {
  BOTON_ABRIR_BILLETERA,
  BOTON_AUTORIZAR,
  BOTON_ENLACE_NUEVO,
  TEXTO_ENLACE_GASTADO,
  TEXTO_NO_AUTORIZO,
  TEXTO_NO_SE_PUDO_AUTORIZAR,
  TEXTO_PERMISO_DESCONOCIDO,
  TEXTO_PERMISO_PENDIENTE,
  datoAutorizar,
  datoUnirme,
  datoYaAprobe,
  textoAbrirBilletera,
  textoAutorizar,
  textoValidado,
} from '../src/bot/flujos/unirse.js';
import { resumenParticipacion } from '../src/bot/comandos/mi-natillera.js';

// Autorizar el cobro con la API de pagos (US-005, #19): el permiso real se pide en POST /api/permisos,
// la persona lo aprueba en su billetera y vuelve con /start permiso_<id>.

const PROHIBIDAS = /interledger|ilp\b|grant|wallet|token|blockchain|cripto|transacci|payment pointer|moroso|debes/i;
const CODIGO = 'Cod-123_abcd';
const ADMIN = 100;
const BETO = 200;
const PERMISO_ID = 'p0123456789abcdef';
const URL_APROBACION = 'https://auth.interledger-test.dev/interact/abc';

const tipado = (type, value) => ({ type, value, assigned: true });
const contratoNatillera = () => ({
  currentStateRaw: {
    NombreNatillera: tipado('Text', 'Los Amigos'),
    EstadoNatillera: tipado('Integer', 0),
    ValorCuota: tipado('Currency', 50000),
    NumeroCuotas: tipado('Integer', 2),
    PeriodicidadMeses: tipado('Integer', 1),
    FechaInicio: tipado('Date', '2026-11-01T00:00:00'),
    FechaFinal: tipado('Date', '2026-12-31T00:00:00'),
    CupoMinimo: tipado('Integer', 5),
    PorcentajeMoraDiaria: tipado('Percentage', 0.01),
    PagosParaPrestamo: tipado('Integer', 1),
    MultiploPrestamo: tipado('Integer', 2),
  },
});

// Staging falso: ConfirmarAutorizacion deja la participación validada, como lo hace staging.
function stagingFalso() {
  const disparos = [];
  return {
    disparos,
    estadoParticipacion: 0,
    async leerContrato(id) {
      if (id === 'c-nat') return contratoNatillera();
      return {
        currentStateRaw: {
          EstadoParticipacion: tipado('Integer', this.estadoParticipacion),
          WalletParticipante: tipado('Text', 'https://ilp.interledger-test.dev/beto'),
          ValorCuota: tipado('Currency', 50000),
          NumeroCuotas: tipado('Integer', 2),
        },
      };
    },
    async crearContrato() {
      return { contractId: 'c-par-1' };
    },
    async disparar(contrato, trigger, parameters) {
      disparos.push({ contrato, trigger, parameters });
      if (trigger === 'ConfirmarAutorizacion') this.estadoParticipacion = 1;
      return { results: [{ preconditionFailed: false }] };
    },
  };
}

// API de pagos falsa: guarda lo pedido y responde el estado que diga la prueba.
function pagosFalso({ falla = false } = {}) {
  return {
    pedidos: [],
    consultas: [],
    estado: 'pendiente',
    motivo: 'grant_rejected',
    async pedirPermiso(cuerpo) {
      if (falla) throw new PagosError('POST /api/permisos', 422, 'La billetera no existe');
      this.pedidos.push(cuerpo);
      // Como la API real: cada pedido es un permiso nuevo, con su propio id.
      const permisoId = this.pedidos.length === 1 ? PERMISO_ID : `p${String(this.pedidos.length).padStart(16, '0')}`;
      return { permisoId, urlAprobacion: URL_APROBACION };
    },
    async estadoPermiso(id) {
      this.consultas.push(id);
      return { estado: this.estado, grantId: this.estado === 'aprobado' ? id : null, motivo: this.estado === 'rechazado' ? this.motivo : null };
    },
  };
}

function preparar(opciones) {
  const db = abrirBaseDeDatos(EN_MEMORIA);
  const registro = crearRegistro(db);
  registro.guardarNatillera({ natilleraId: 'nat-1', contractId: 'c-nat', nombre: 'Los Amigos', adminTelegramId: ADMIN, creadaEn: 'x', codigoInvitacion: CODIGO });
  const servicio = stagingFalso();
  const pagos = pagosFalso(opciones);
  const unirse = crearUnirse({ servicio, registro, pagos, log: logSilencioso, nuevoId: () => 'uno', ahora: () => Date.parse('2026-10-16T20:00:00Z') });
  return { db, registro, servicio, pagos, ...crearBotDePrueba({ db, servicio, registro, unirse }) };
}

async function betoSeUneYAutoriza(bot) {
  await bot.handleUpdate(mensaje(`/start ${CODIGO}`, { chatId: BETO }));
  await bot.handleUpdate(boton(datoUnirme(CODIGO), { chatId: BETO }));
  await bot.handleUpdate(mensaje('$ilp.interledger-test.dev/beto', { chatId: BETO }));
  await bot.handleUpdate(boton(datoAutorizar('par-uno'), { chatId: BETO }));
}

const aBeto = (llamadas) => llamadas.filter((l) => l.method === 'sendMessage' && l.payload.chat_id === BETO);

// ---------- El cliente de la API de pagos ----------

test('el cliente manda la llave de clientes y las tres de Open Payments, y un error dice ruta y código', async () => {
  const llamadas = [];
  const fetch = async (url, init) => {
    llamadas.push({ url, init });
    if (url.endsWith('/cancelar')) return new Response(JSON.stringify({ error: 'Ese permiso no existe' }), { status: 404 });
    return new Response(JSON.stringify({ permisoId: PERMISO_ID, urlAprobacion: URL_APROBACION }), { status: 201 });
  };
  const pagos = crearClientePagos({
    url: 'https://pagos.example/',
    apiKey: 'llave-clientes',
    llaves: { wallet: 'https://ilp.interledger-test.dev/app', keyId: 'key-1', privateKey: 'cHJpdmFkYQ==' },
    fetch,
  });

  const cuerpo = { tipo: 'recurrente', wallet: 'https://ilp.interledger-test.dev/beto', monto: 150000, referencia: 'par-1', vuelta: 'https://t.me/b?start=permiso_{permisoId}' };
  assert.deepEqual(await pagos.pedirPermiso(cuerpo), { permisoId: PERMISO_ID, urlAprobacion: URL_APROBACION });
  assert.equal(llamadas[0].url, 'https://pagos.example/api/permisos');
  assert.equal(llamadas[0].init.method, 'POST');
  assert.deepEqual(JSON.parse(llamadas[0].init.body), cuerpo);
  assert.deepEqual(
    Object.fromEntries(['X-Api-Key', 'X-OP-Wallet-Address', 'X-OP-Key-Id', 'X-OP-Private-Key'].map((h) => [h, llamadas[0].init.headers[h]])),
    { 'X-Api-Key': 'llave-clientes', 'X-OP-Wallet-Address': 'https://ilp.interledger-test.dev/app', 'X-OP-Key-Id': 'key-1', 'X-OP-Private-Key': 'cHJpdmFkYQ==' },
  );

  const error = await pagos.cancelarPermiso(PERMISO_ID).catch((e) => e);
  assert.ok(error instanceof PagosError);
  assert.equal(error.estado, 404);
  assert.equal(error.message, `La API de pagos respondió 404 en POST /api/permisos/${PERMISO_ID}/cancelar: Ese permiso no existe`);
  assert.ok(!error.message.includes('cHJpdmFkYQ=='));
});

test('el tope del permiso es lo que aporta en total más el margen, redondeado a miles', () => {
  assert.equal(topeDelPermiso({ ValorCuota: 50000, NumeroCuotas: 2 }), 150000);
  assert.equal(topeDelPermiso({ ValorCuota: 33333, NumeroCuotas: 3 }), 150000);
});

// ---------- Autorizar en la billetera ----------

test('autorizar pide el permiso recurrente con la billetera de staging, el tope y la vuelta al chat', async () => {
  const { bot, llamadas, pagos, registro, servicio, db } = preparar();
  await betoSeUneYAutoriza(bot);

  assert.deepEqual(pagos.pedidos, [
    {
      tipo: 'recurrente',
      wallet: 'https://ilp.interledger-test.dev/beto',
      monto: 150000,
      referencia: 'par-uno',
      vuelta: `https://t.me/${BOT_INFO.username}?start=permiso_{permisoId}`,
    },
  ]);
  assert.deepEqual({ ...registro.permiso(PERMISO_ID) }, { permiso_id: PERMISO_ID, participacion_id: 'par-uno', monto: 150000, creado_en: '2026-10-16T20:00:00.000Z' });
  // Todavía no se le dice nada a staging: falta que lo apruebe.
  assert.equal(servicio.disparos.length, 0);

  const ultimo = aBeto(llamadas).at(-1);
  assert.equal(ultimo.payload.text, textoAbrirBilletera(150000));
  const [abrir, yaAprobe] = ultimo.payload.reply_markup.inline_keyboard.flat();
  assert.deepEqual(abrir, { text: BOTON_ABRIR_BILLETERA, url: URL_APROBACION });
  assert.equal(yaAprobe.callback_data, datoYaAprobe(PERMISO_ID));
  db.close();
});

test('al volver con el permiso aprobado, staging recibe ConfirmarAutorizacion con su grantId', async () => {
  const { bot, llamadas, pagos, servicio, db } = preparar();
  await betoSeUneYAutoriza(bot);
  pagos.estado = 'aprobado';
  await bot.handleUpdate(mensaje(`/start permiso_${PERMISO_ID}`, { chatId: BETO }));

  assert.deepEqual(pagos.consultas, [PERMISO_ID]);
  assert.deepEqual(servicio.disparos, [
    {
      contrato: 'c-par-1',
      trigger: 'ConfirmarAutorizacion',
      parameters: {
        PermisoAprobado: { type: 'Integer', value: 1 },
        BilleteraVerificada: { type: 'Integer', value: 1 },
        GrantId: { type: 'Text', value: PERMISO_ID },
      },
    },
  ]);
  assert.equal(textos(llamadas).at(-1), textoValidado('Los Amigos'));

  // Volver otra vez (o tocar «Ya aprobé») no dispara de nuevo.
  await bot.handleUpdate(boton(datoYaAprobe(PERMISO_ID), { chatId: BETO }));
  assert.equal(servicio.disparos.length, 1);
  assert.equal(textos(llamadas).at(-1), textoValidado('Los Amigos'));
  db.close();
});

test('si todavía no lo aprueba, lo dice y deja «Ya aprobé»; si lo rechaza, queda sin autorizar', async () => {
  const { bot, llamadas, pagos, servicio, db } = preparar();
  await betoSeUneYAutoriza(bot);

  await bot.handleUpdate(boton(datoYaAprobe(PERMISO_ID), { chatId: BETO }));
  assert.equal(textos(llamadas).at(-1), TEXTO_PERMISO_PENDIENTE);
  assert.deepEqual(botones(aBeto(llamadas).at(-1)), [datoYaAprobe(PERMISO_ID)]);

  pagos.estado = 'rechazado';
  await bot.handleUpdate(mensaje(`/start permiso_${PERMISO_ID}`, { chatId: BETO }));
  assert.equal(textos(llamadas).at(-1), TEXTO_NO_AUTORIZO);
  assert.deepEqual(botones(aBeto(llamadas).at(-1)), [datoAutorizar('par-uno')]);
  assert.equal(servicio.disparos.length, 0);
  db.close();
});

test('si la billetera devuelve invalid_interaction (enlace ya abierto o vencido), ofrece un enlace nuevo', async () => {
  const { bot, llamadas, pagos, servicio, db } = preparar();
  await betoSeUneYAutoriza(bot);
  pagos.estado = 'rechazado';
  pagos.motivo = 'invalid_interaction';
  await bot.handleUpdate(mensaje(`/start permiso_${PERMISO_ID}`, { chatId: BETO }));

  assert.equal(textos(llamadas).at(-1), TEXTO_ENLACE_GASTADO);
  const [nuevo] = aBeto(llamadas).at(-1).payload.reply_markup.inline_keyboard.flat();
  assert.deepEqual(nuevo, { text: BOTON_ENLACE_NUEVO, callback_data: datoAutorizar('par-uno') });

  // El botón pide otro permiso, con otro enlace de aprobación.
  await bot.handleUpdate(boton(datoAutorizar('par-uno'), { chatId: BETO }));
  assert.equal(pagos.pedidos.length, 2);
  assert.equal(textos(llamadas).at(-1), textoAbrirBilletera(150000));
  assert.equal(servicio.disparos.length, 0);
  assert.ok(TEXTO_ENLACE_GASTADO.split('\n').length <= 3);
  db.close();
});

test('el permiso de otra persona, o uno que no existe, no se consulta ni autoriza nada', async () => {
  const { bot, llamadas, pagos, servicio, db } = preparar();
  await betoSeUneYAutoriza(bot);
  pagos.estado = 'aprobado';

  await bot.handleUpdate(mensaje(`/start permiso_${PERMISO_ID}`, { chatId: 300 }));
  await bot.handleUpdate(mensaje('/start permiso_p0000000000000000', { chatId: BETO }));
  await bot.handleUpdate(mensaje('/start permiso_../../api', { chatId: BETO }));

  assert.deepEqual(textos(llamadas).slice(-3), [TEXTO_PERMISO_DESCONOCIDO, TEXTO_PERMISO_DESCONOCIDO, TEXTO_PERMISO_DESCONOCIDO]);
  assert.equal(pagos.consultas.length, 0);
  assert.equal(servicio.disparos.length, 0);
  db.close();
});

test('si la API de pagos no puede pedir el permiso, se dice sin tecnicismos y no se guarda nada', async () => {
  const { bot, llamadas, registro, db } = preparar({ falla: true });
  await betoSeUneYAutoriza(bot);

  assert.equal(textos(llamadas).at(-1), TEXTO_NO_SE_PUDO_AUTORIZAR);
  assert.equal(registro.permiso(PERMISO_ID), undefined);
  db.close();
});

// ---------- Textos ----------

test('con la API de pagos los textos ya no dicen «de prueba» y cumplen la voz y tono', () => {
  const natillera = estadoDe(contratoNatillera());
  const autorizar = textoAutorizar(natillera, { conPagos: true });
  assert.match(autorizar, /desde tu billetera/);
  assert.match(autorizar, /El tope es \$150\.000 en total/);

  const { texto, teclado } = resumenParticipacion(natillera, { ParticipacionId: 'par-1', EstadoParticipacion: 0 }, { conPagos: true });
  assert.match(texto, /Se autoriza desde tu billetera/);
  assert.equal(teclado.inline_keyboard[0][0].text, BOTON_AUTORIZAR);

  for (const t of [autorizar, texto, textoAbrirBilletera(150000), TEXTO_PERMISO_PENDIENTE, TEXTO_PERMISO_DESCONOCIDO]) {
    assert.ok(!/de prueba/.test(t), `dice «de prueba»: ${t}`);
    assert.ok(t.split('\n').length <= 3, `más de 3 líneas: ${t}`);
    assert.ok(!PROHIBIDAS.test(t), `palabra prohibida en: ${t}`);
    assert.ok(!/\p{Extended_Pictographic}/u.test(t), `emoji en: ${t}`);
  }
});
