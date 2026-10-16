import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearBotDePrueba, boton, textos } from './helpers/bot-prueba.js';
import { AccionRechazadaError } from '../src/externo/cliente.js';
import { crearRegistro } from '../src/registro.js';
import { abrirBaseDeDatos, EN_MEMORIA } from '../src/db.js';
import { datoBotonDeuda, datoBotonObligacion } from '../src/avisos/mensajes.js';
import { TEXTO_COBRO_PEDIDO, TEXTO_NO_SE_PUEDE, TEXTO_NO_ES_TUYO } from '../src/bot/comandos/cobros.js';

function preparar({ rechaza = false } = {}) {
  const db = abrirBaseDeDatos(EN_MEMORIA);
  const registro = crearRegistro(db);
  registro.guardarNatillera({ natilleraId: 'nat-1', contractId: 'c-nat', nombre: 'Los Primos', adminTelegramId: 100, creadaEn: 'x' });
  registro.guardarParticipacion({ participacionId: 'p-ana', contractId: 'c-ana', natilleraId: 'nat-1', telegramId: 100 });
  registro.guardarParticipacion({ participacionId: 'p-beto', contractId: 'c-beto', natilleraId: 'nat-1', telegramId: 200 });
  registro.guardarActividad({ actividadId: 'a-1', contractId: 'c-act', natilleraId: 'nat-1' });
  registro.guardarObligacion({ contractId: 'c-obl-ana', actividadId: 'a-1', participacionId: 'p-ana' });

  const disparos = [];
  const servicio = {
    async disparar(contrato, trigger) {
      disparos.push({ contrato, trigger });
      if (rechaza) throw new AccionRechazadaError(trigger, 'No está en mora');
      return { results: [{}] };
    },
  };
  return { db, disparos, ...crearBotDePrueba({ db, servicio, registro }) };
}

test('«Ya tengo la plata» dispara PagarDeuda en la participación de quien lo toca', async () => {
  const { bot, llamadas, disparos, db } = preparar();
  await bot.handleUpdate(boton(datoBotonDeuda('p-ana'), { chatId: 100 }));

  assert.deepEqual(disparos, [{ contrato: 'c-ana', trigger: 'PagarDeuda' }]);
  // Primero se quita el botón, para que un segundo toque no pida otro cobro.
  const metodos = llamadas.map((l) => l.method);
  assert.ok(metodos.indexOf('editMessageReplyMarkup') < metodos.indexOf('sendMessage'));
  assert.deepEqual(textos(llamadas), [TEXTO_COBRO_PEDIDO]);
  db.close();
});

test('el botón de otra persona no dispara nada', async () => {
  const { bot, llamadas, disparos, db } = preparar();
  await bot.handleUpdate(boton(datoBotonDeuda('p-beto'), { chatId: 100 }));
  await bot.handleUpdate(boton(datoBotonDeuda('p-no-existe'), { chatId: 100 }));

  assert.deepEqual(disparos, []);
  assert.deepEqual(
    llamadas.filter((l) => l.method === 'answerCallbackQuery').map((l) => l.payload.text),
    [TEXTO_NO_ES_TUYO, TEXTO_NO_ES_TUYO],
  );
  db.close();
});

test('«Pagar mi parte» dispara AutorizarPago en la obligación de quien lo toca', async () => {
  const { bot, disparos, db } = preparar();
  await bot.handleUpdate(boton(datoBotonObligacion('a-1'), { chatId: 100 }));
  await bot.handleUpdate(boton(datoBotonObligacion('a-1'), { chatId: 200 }));

  assert.deepEqual(disparos, [{ contrato: 'c-obl-ana', trigger: 'AutorizarPago' }]);
  db.close();
});

test('si staging rechaza la acción, se le dice sin tecnicismos', async () => {
  const { bot, llamadas, db } = preparar({ rechaza: true });
  await bot.handleUpdate(boton(datoBotonDeuda('p-ana'), { chatId: 100 }));

  assert.deepEqual(textos(llamadas), [TEXTO_NO_SE_PUEDE]);
  db.close();
});
