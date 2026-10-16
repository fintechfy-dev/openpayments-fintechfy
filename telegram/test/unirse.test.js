import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { crearBotDePrueba, mensaje, boton, textos, botones, BOT_INFO } from './helpers/bot-prueba.js';
import { validarBilletera } from '../src/natillera/reglas.js';
import { estadoDe, AccionRechazadaError } from '../src/externo/cliente.js';
import { parametrosParticipacion } from '../src/externo/parametros.js';
import { crearUnirse } from '../src/externo/unirse.js';
import { crearRegistro } from '../src/registro.js';
import { abrirBaseDeDatos, EN_MEMORIA } from '../src/db.js';
import {
  PREGUNTA_BILLETERA,
  TEXTO_AHORA_NO,
  TEXTO_ENLACE_INVALIDO,
  TEXTO_NO_AUTORIZO,
  TEXTO_NO_SE_PUDO_AUTORIZAR,
  datoAutorizar,
  datoNoAutorizar,
  datoUnirme,
  textoAutorizar,
  textoAvisoAdmin,
  textoCerrada,
  textoFaltaAutorizar,
  textoReglas,
  textoValidado,
  textoYaEstas,
} from '../src/bot/flujos/unirse.js';
import { TEXTO_SIN_NATILLERA, textoInvitacion, textoParaElAdmin } from '../src/bot/comandos/invitar.js';
import { logSilencioso } from './helpers/bot-prueba.js';

const PROHIBIDAS = /interledger|ilp\b|grant|wallet|token|blockchain|cripto|transacci|payment pointer|moroso|debes/i;
const CODIGO = 'Cod-123_abcd';
const ADMIN = 100;
const BETO = 200;

// Así devuelve staging el estado de la natillera «los amigos» (GET /api/contracts/{id}, 16 de octubre).
const tipado = (type, value) => ({ type, value, assigned: true });
function contratoNatillera(estado = 0) {
  return {
    contractId: 'c-nat',
    currentStateRaw: {
      NatilleraId: tipado('Text', 'nat-1'),
      NombreNatillera: tipado('Text', 'Los <Amigos>'),
      EstadoNatillera: tipado('Integer', estado),
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
  };
}

// Staging falso: la natillera en `estadoNatillera`, las participaciones que se crean y los triggers.
function stagingFalso({ estadoNatillera = 0, estadoParticipacion = 0, rechazaAutorizar = false } = {}) {
  const creados = [];
  const disparos = [];
  return {
    creados,
    disparos,
    // Se puede cambiar a mitad de una prueba: la natillera arranca mientras alguien se une.
    estadoNatillera,
    async leerContrato(id) {
      if (id === 'c-nat') return contratoNatillera(this.estadoNatillera);
      return { currentStateRaw: { EstadoParticipacion: tipado('Integer', estadoParticipacion) } };
    },
    async crearContrato(templateName, parameters) {
      creados.push({ templateName, parameters });
      return { contractId: `c-par-${creados.length}` };
    },
    async disparar(contrato, trigger, parameters) {
      disparos.push({ contrato, trigger, parameters });
      if (rechazaAutorizar) throw new AccionRechazadaError(trigger, 'Billetera no verificada');
      return { results: [{ preconditionFailed: false }] };
    },
  };
}

function preparar(opciones) {
  const db = abrirBaseDeDatos(EN_MEMORIA);
  const registro = crearRegistro(db);
  registro.guardarNatillera({ natilleraId: 'nat-1', contractId: 'c-nat', nombre: 'Los <Amigos>', adminTelegramId: ADMIN, creadaEn: 'x', codigoInvitacion: CODIGO });
  const servicio = stagingFalso(opciones);
  const avisosWeb = [];
  const web = { participacion: async (c) => (avisosWeb.push(c), true) };
  const unirse = crearUnirse({ servicio, registro, web, log: logSilencioso, nuevoId: () => 'uno' });
  return { db, registro, servicio, avisosWeb, ...crearBotDePrueba({ db, servicio, registro, unirse }) };
}

// Beto abre el enlace, toca «Unirme» y escribe su billetera.
async function betoSeUne(bot, llamadas) {
  await bot.handleUpdate(mensaje(`/start ${CODIGO}`, { chatId: BETO }));
  await bot.handleUpdate(boton(datoUnirme(CODIGO), { chatId: BETO }));
  await bot.handleUpdate(mensaje('$ilp.interledger-test.dev/beto', { chatId: BETO }));
  return llamadas;
}

// ---------- Reglas puras ----------

test('la billetera se acepta completa o con el atajo $, y queda sin barra final', () => {
  assert.deepEqual(validarBilletera('https://ilp.interledger-test.dev/beto'), { valor: 'https://ilp.interledger-test.dev/beto' });
  assert.deepEqual(validarBilletera('  $ilp.interledger-test.dev/beto/ '), { valor: 'https://ilp.interledger-test.dev/beto' });
  for (const mala of ['beto', 'http://ilp.interledger-test.dev/beto', 'https://ilp.interledger-test.dev', 'https://x.dev/a b', 'https://u:p@x.dev/a', 'https://x.dev/a?b=1', `https://x.dev/${'a'.repeat(200)}`]) {
    assert.ok(validarBilletera(mala).error, `aceptó ${mala}`);
  }
});

test('estadoDe desenvuelve { type, value } y deja las fechas en AAAA-MM-DD', () => {
  const estado = estadoDe(contratoNatillera());
  assert.equal(estado.ValorCuota, 50000);
  assert.equal(estado.FechaInicio, '2026-11-01');
  assert.equal(estado.PorcentajeMoraDiaria, 0.01);
  assert.deepEqual(estadoDe({}), {});
});

test('la participación copia las reglas de staging; la mora ya viene en fracción y no se vuelve a dividir', () => {
  const p = parametrosParticipacion(
    { participacionId: 'par-1', natilleraId: 'nat-1', telegramId: 200, billetera: 'https://ilp.interledger-test.dev/beto' },
    estadoDe(contratoNatillera()),
  );
  assert.deepEqual(p, {
    ParticipacionId: { type: 'Text', value: 'par-1' },
    NatilleraId: { type: 'Text', value: 'nat-1' },
    ParticipanteId: { type: 'Text', value: '200' },
    WalletParticipante: { type: 'Text', value: 'https://ilp.interledger-test.dev/beto' },
    ValorCuota: { type: 'Currency', value: 50000 },
    NumeroCuotas: { type: 'Integer', value: 2 },
    PorcentajeMoraDiaria: { type: 'Percentage', value: 0.01 },
    PagosParaPrestamo: { type: 'Integer', value: 1 },
    MultiploPrestamo: { type: 'Integer', value: 2 },
    FechaInicio: { type: 'Date', value: '2026-11-01' },
  });
});

test('una base creada antes del enlace gana la columna del código sin perder sus natilleras', () => {
  const carpeta = mkdtempSync(join(tmpdir(), 'bot-db-'));
  const ruta = join(carpeta, 'bot.db');
  try {
    const vieja = new DatabaseSync(ruta);
    vieja.exec(`CREATE TABLE natilleras (natillera_id TEXT PRIMARY KEY, contract_id TEXT NOT NULL UNIQUE, nombre TEXT NOT NULL,
      admin_telegram_id INTEGER NOT NULL, creada_en TEXT NOT NULL);
      INSERT INTO natilleras VALUES ('nat-vieja', 'c-vieja', 'los amigos', 100, '2026-10-16');`);
    vieja.close();

    const db = abrirBaseDeDatos(ruta);
    const registro = crearRegistro(db);
    assert.equal(registro.natillera('nat-vieja').codigo_invitacion, null);
    assert.equal(registro.codigoDeInvitacion('nat-vieja', 'nuevo-1'), 'nuevo-1');
    // Un enlace ya entregado no cambia.
    assert.equal(registro.codigoDeInvitacion('nat-vieja', 'nuevo-2'), 'nuevo-1');
    db.close();
  } finally {
    rmSync(carpeta, { recursive: true, force: true });
  }
});

// ---------- El enlace ----------

test('el enlace muestra las reglas de staging en un solo mensaje, con el total, y los botones', async () => {
  const { bot, llamadas, db } = preparar();
  await bot.handleUpdate(mensaje(`/start ${CODIGO}`, { chatId: BETO }));

  const texto = llamadas.at(-1).payload.text;
  assert.equal(texto, textoReglas(estadoDe(contratoNatillera())));
  assert.match(texto, /\$50\.000 cada mes, 2 cuotas, del 1 de noviembre al 31 de diciembre de 2026\. En total aportas \$100\.000\./);
  assert.match(texto, /mínimo 5 personas.*1 % diario/);
  assert.match(texto, /<b>Los &lt;Amigos&gt;<\/b>/);
  assert.deepEqual(botones(llamadas.at(-1)), [datoUnirme(CODIGO), 'un:no']);
  db.close();
});

test('un enlace que no es de ninguna natillera, o de una que ya arrancó, lo dice', async () => {
  const { bot, llamadas, db } = preparar({ estadoNatillera: 1 });
  await bot.handleUpdate(mensaje('/start NoExiste123', { chatId: BETO }));
  await bot.handleUpdate(mensaje(`/start ${CODIGO}`, { chatId: BETO }));

  assert.deepEqual(textos(llamadas), [TEXTO_ENLACE_INVALIDO, textoCerrada('Los <Amigos>')]);
  db.close();
});

test('«Ahora no» no inscribe a nadie', async () => {
  const { bot, llamadas, servicio, db } = preparar();
  await bot.handleUpdate(mensaje(`/start ${CODIGO}`, { chatId: BETO }));
  await bot.handleUpdate(boton('un:no', { chatId: BETO }));

  assert.equal(textos(llamadas).at(-1), TEXTO_AHORA_NO);
  assert.equal(servicio.creados.length, 0);
  db.close();
});

// ---------- Unirse ----------

test('unirse: pide la billetera, crea la participación, avisa a la web y al administrador', async () => {
  const { bot, llamadas, servicio, registro, avisosWeb, db } = preparar();
  await bot.handleUpdate(mensaje(`/start ${CODIGO}`, { chatId: BETO }));
  await bot.handleUpdate(boton(datoUnirme(CODIGO), { chatId: BETO }));
  assert.match(textos(llamadas).at(-1), new RegExp(PREGUNTA_BILLETERA.replace(/[?¿]/g, '.')));

  await bot.handleUpdate(mensaje('$ilp.interledger-test.dev/beto', { chatId: BETO }));

  assert.equal(servicio.creados.length, 1);
  assert.equal(servicio.creados[0].templateName, 'natillera-participacion');
  assert.equal(servicio.creados[0].parameters.WalletParticipante.value, 'https://ilp.interledger-test.dev/beto');
  assert.equal(servicio.creados[0].parameters.ParticipanteId.value, String(BETO));
  assert.deepEqual({ ...registro.participacionEn('nat-1', BETO) }, { participacion_id: 'par-uno', contract_id: 'c-par-1', natillera_id: 'nat-1', telegram_id: BETO });
  assert.deepEqual(avisosWeb, [
    { natilleraId: 'nat-1', participacionId: 'par-uno', contractId: 'c-par-1', nombre: 'Ana', telegramId: BETO, billetera: 'https://ilp.interledger-test.dev/beto' },
  ]);

  const aBeto = llamadas.filter((l) => l.method === 'sendMessage' && l.payload.chat_id === BETO);
  assert.equal(aBeto.at(-1).payload.text, textoAutorizar(estadoDe(contratoNatillera())));
  assert.deepEqual(botones(aBeto.at(-1)), [datoAutorizar('par-uno'), datoNoAutorizar('par-uno')]);

  const alAdmin = llamadas.filter((l) => l.method === 'sendMessage' && l.payload.chat_id === ADMIN);
  assert.deepEqual(alAdmin.map((l) => l.payload.text), [textoAvisoAdmin('Ana', 'Los <Amigos>', 1, 5)]);
  db.close();
});

test('si la natillera arranca mientras la persona escribe su billetera, no se inscribe', async () => {
  const { bot, llamadas, servicio, db } = preparar();
  await bot.handleUpdate(mensaje(`/start ${CODIGO}`, { chatId: BETO }));
  await bot.handleUpdate(boton(datoUnirme(CODIGO), { chatId: BETO }));
  servicio.estadoNatillera = 1;
  await bot.handleUpdate(mensaje('$ilp.interledger-test.dev/beto', { chatId: BETO }));

  assert.equal(servicio.creados.length, 0);
  assert.equal(textos(llamadas).at(-1), textoCerrada('Los <Amigos>'));
  db.close();
});

test('la billetera mal escrita se vuelve a pedir sin crear nada', async () => {
  const { bot, llamadas, servicio, db } = preparar();
  await bot.handleUpdate(mensaje(`/start ${CODIGO}`, { chatId: BETO }));
  await bot.handleUpdate(boton(datoUnirme(CODIGO), { chatId: BETO }));
  await bot.handleUpdate(mensaje('mi billetera', { chatId: BETO }));

  assert.match(textos(llamadas).at(-1), /^Esa dirección no se ve bien/);
  assert.equal(servicio.creados.length, 0);
  db.close();
});

test('la misma persona no se inscribe dos veces: si le falta autorizar, se lo ofrece otra vez', async () => {
  const { bot, llamadas, servicio, db } = preparar({ estadoParticipacion: 0 });
  await betoSeUne(bot, llamadas);
  await bot.handleUpdate(mensaje(`/start ${CODIGO}`, { chatId: BETO }));

  assert.equal(servicio.creados.length, 1);
  assert.deepEqual(textos(llamadas).slice(-2), [textoFaltaAutorizar('Los <Amigos>'), textoAutorizar(estadoDe(contratoNatillera()))]);
  db.close();
});

test('si ya autorizó, abrir el enlace otra vez solo se lo confirma', async () => {
  const { bot, llamadas, servicio, db } = preparar({ estadoParticipacion: 1 });
  await betoSeUne(bot, llamadas);
  await bot.handleUpdate(mensaje(`/start ${CODIGO}`, { chatId: BETO }));

  assert.equal(servicio.creados.length, 1);
  assert.equal(textos(llamadas).at(-1), textoYaEstas('Los <Amigos>'));
  db.close();
});

// ---------- Autorizar ----------

test('autorizar dispara ConfirmarAutorizacion con un permiso de prueba que se reconoce como tal', async () => {
  const { bot, llamadas, servicio, db } = preparar();
  await betoSeUne(bot, llamadas);
  await bot.handleUpdate(boton(datoAutorizar('par-uno'), { chatId: BETO }));

  assert.deepEqual(servicio.disparos, [
    {
      contrato: 'c-par-1',
      trigger: 'ConfirmarAutorizacion',
      parameters: {
        PermisoAprobado: { type: 'Integer', value: 1 },
        BilleteraVerificada: { type: 'Integer', value: 1 },
        GrantId: { type: 'Text', value: 'grant-prueba-par-uno' },
      },
    },
  ]);
  assert.equal(textos(llamadas).at(-1), textoValidado('Los <Amigos>'));
  db.close();
});

test('nadie puede autorizar por otra persona', async () => {
  const { bot, llamadas, servicio, db } = preparar();
  await betoSeUne(bot, llamadas);
  await bot.handleUpdate(boton(datoAutorizar('par-uno'), { chatId: 300 }));
  await bot.handleUpdate(boton(datoNoAutorizar('par-uno'), { chatId: 300 }));

  assert.equal(servicio.disparos.length, 0);
  db.close();
});

test('«Ahora no» deja sin autorizar; un rechazo de staging se dice sin tecnicismos', async () => {
  const { bot, llamadas, db } = preparar({ rechazaAutorizar: true });
  await betoSeUne(bot, llamadas);
  await bot.handleUpdate(boton(datoNoAutorizar('par-uno'), { chatId: BETO }));
  assert.equal(textos(llamadas).at(-1), TEXTO_NO_AUTORIZO);

  await bot.handleUpdate(boton(datoAutorizar('par-uno'), { chatId: BETO }));
  assert.equal(textos(llamadas).at(-1), TEXTO_NO_SE_PUDO_AUTORIZAR);
  db.close();
});

// ---------- /invitar ----------

test('/invitar le da el enlace al administrador y uno nuevo a una natillera que no lo tenía', async () => {
  const db = abrirBaseDeDatos(EN_MEMORIA);
  const registro = crearRegistro(db);
  registro.guardarNatillera({ natilleraId: 'nat-vieja', contractId: 'c-v', nombre: 'los amigos', adminTelegramId: ADMIN, creadaEn: 'x' });
  const unirse = crearUnirse({ servicio: stagingFalso(), registro, log: logSilencioso });
  const { bot, llamadas } = crearBotDePrueba({ db, servicio: stagingFalso(), registro, unirse });

  await bot.handleUpdate(mensaje('/invitar', { chatId: ADMIN }));
  const codigo = registro.natillera('nat-vieja').codigo_invitacion;
  assert.match(codigo, /^[A-Za-z0-9_-]{12}$/);
  assert.deepEqual(textos(llamadas), [
    textoParaElAdmin('los amigos', 0),
    textoInvitacion('los amigos', `https://t.me/${BOT_INFO.username}?start=${codigo}`),
  ]);

  await bot.handleUpdate(mensaje('/invitar', { chatId: BETO }));
  assert.equal(textos(llamadas).at(-1), TEXTO_SIN_NATILLERA);
  db.close();
});

test('sin staging, el enlace sigue respondiendo que todavía no se puede unir', async () => {
  const { bot, llamadas } = crearBotDePrueba();
  await bot.handleUpdate(mensaje(`/start ${CODIGO}`));
  assert.match(textos(llamadas)[0], /Todavía no puedes unirte/);
});

// ---------- Voz y tono ----------

test('los textos de unirse e invitar cumplen la voz y tono', () => {
  const estado = estadoDe(contratoNatillera());
  const conBuenaNoticia = [textoReglas(estado), textoValidado('X'), textoAvisoAdmin('Ana', 'X', 1, 5), textoParaElAdmin('X', 2)];
  const sinEmoji = [
    TEXTO_ENLACE_INVALIDO,
    textoCerrada('X'),
    textoYaEstas('X'),
    textoFaltaAutorizar('X'),
    TEXTO_AHORA_NO,
    textoAutorizar(estado),
    TEXTO_NO_AUTORIZO,
    TEXTO_NO_SE_PUDO_AUTORIZAR,
    textoInvitacion('X', 'https://t.me/b?start=c'),
  ];
  for (const texto of [...conBuenaNoticia, ...sinEmoji]) {
    assert.ok(texto.split('\n').length <= 3, `más de 3 líneas: ${texto}`);
    assert.ok(!PROHIBIDAS.test(texto.replace(/https:\/\/\S+/g, '')), `palabra prohibida en: ${texto}`);
    assert.ok((texto.match(/\p{Extended_Pictographic}/gu) ?? []).length <= 1, `más de un emoji: ${texto}`);
  }
  for (const texto of sinEmoji) assert.ok(!/\p{Extended_Pictographic}/u.test(texto), `emoji en: ${texto}`);
  // Que es de prueba se ve antes de autorizar (codigo.md: datos de prueba visibles).
  assert.match(textoAutorizar(estado), /de prueba/);
});
