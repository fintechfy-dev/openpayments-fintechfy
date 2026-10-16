import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearBotDePrueba, mensaje, CHAT_EQUIPO, TOKEN_DE_PRUEBA } from './helpers/bot-prueba.js';
import { abrirBaseDeDatos, EN_MEMORIA } from '../src/db.js';

const INICIO = Date.UTC(2026, 9, 16, 15, 0);
const reloj = { inicio: INICIO, ahora: () => INICIO + 75 * 60_000 };

test('/diag en el chat del equipo muestra la configuración en uso', async () => {
  const { bot, llamadas } = crearBotDePrueba(reloj);
  await bot.handleUpdate(mensaje('/diag', { chatId: CHAT_EQUIPO }));

  assert.equal(llamadas.length, 1);
  const texto = llamadas[0].payload.text;
  assert.match(texto, /^Diagnóstico del bot/);
  assert.match(texto, /Encendido hace: 1 h 15 min/);
  assert.match(texto, /Cuota: mínimo \$10\.000 · máximo \$500\.000/);
  assert.match(texto, /Mora diaria máxima: 2,5 %/);
  assert.match(texto, /Servicio externo: sin configurar/);
  assert.match(texto, /Base de datos: sin abrir \(sesiones en memoria\)/);
});

test('/diag cuenta las sesiones guardadas en la base', async () => {
  const db = abrirBaseDeDatos(EN_MEMORIA);
  const { bot, llamadas } = crearBotDePrueba({ ...reloj, db });
  await bot.handleUpdate(mensaje('/start', { chatId: 100 }));
  await bot.handleUpdate(mensaje('/diag', { chatId: CHAT_EQUIPO }));

  // La sesión del /diag se guarda al terminar de responderlo, así que solo cuenta la de /start.
  assert.match(llamadas.at(-1).payload.text, /Base de datos: \.\/data\/bot\.db · 1 sesión guardada/);
  db.close();
});

test('/diag fuera del chat del equipo no responde nada', async () => {
  const { bot, llamadas } = crearBotDePrueba(reloj);
  await bot.handleUpdate(mensaje('/diag', { chatId: 100 }));

  assert.equal(llamadas.length, 0);
});

test('/diag nunca muestra secretos y de las URL solo enseña el origen', async () => {
  const { bot, llamadas } = crearBotDePrueba({
    ...reloj,
    env: {
      SERVICIO_EXTERNO_URL: 'https://usuario:clave@externo.example/api/v1',
      SERVICIO_EXTERNO_TOKEN: 'llave-xyz',
      DIAS_ESPERA_CUPO: '5',
      PAGOS_PARA_PRESTAMO: '1',
      MULTIPLO_PRESTAMO: '2',
      WEB_INDICE_URL: 'http://localhost:3000/secreto',
      WEB_INDICE_API_KEY: 'llave-web',
      PAGOS_URL: 'http://localhost:3001/pagos',
    },
  });
  await bot.handleUpdate(mensaje('/diag', { chatId: CHAT_EQUIPO }));

  const texto = llamadas[0].payload.text;
  assert.match(texto, /Servicio externo: https:\/\/externo\.example · avisos por flujo en vivo/);
  assert.match(texto, /Índice de la web: http:\/\/localhost:3000\n/);
  assert.match(texto, /Servicio de pagos: http:\/\/localhost:3001\n/);
  for (const prohibido of [TOKEN_DE_PRUEBA, 'llave-xyz', 'llave-web', 'clave', '/api/v1', '/secreto']) {
    assert.ok(!texto.includes(prohibido), `/diag mostró ${prohibido}`);
  }
});
