import { crearBot } from '../../src/bot/index.js';
import { loadConfig } from '../../src/config.js';

export const TOKEN_DE_PRUEBA = '123456:token-de-prueba';
export const CHAT_EQUIPO = -999;

// Variables válidas mínimas; cada prueba puede cambiar las que necesite.
export const ENV_DE_PRUEBA = Object.freeze({
  BOT_TOKEN: TOKEN_DE_PRUEBA,
  TEAM_CHAT_ID: String(CHAT_EQUIPO),
  CUOTA_MIN: '10000',
  CUOTA_MAX: '500000',
  MORA_DIARIA_MAX_PCT: '2.5',
});

const BOT_INFO = {
  id: 1,
  is_bot: true,
  first_name: 'Natillera Prueba',
  username: 'natillera_prueba_bot',
  can_join_groups: true,
  can_read_all_group_messages: false,
  supports_inline_queries: false,
  can_connect_to_business: false,
  has_main_web_app: false,
};

export const logSilencioso = { info() {}, warn() {}, error() {} };

// Bot sin red: un `fetch` falso guarda cada llamada a Telegram en `llamadas` en vez de enviarla.
// Va por debajo de los transformadores del bot, así que la guardia de secretos sí se ejerce.
export function crearBotDePrueba({ env = {}, log = logSilencioso, inicio, ahora } = {}) {
  const llamadas = [];
  const fetchFalso = async (url, init) => {
    const method = String(url).split('/').at(-1);
    const payload = init?.body ? JSON.parse(init.body) : undefined;
    llamadas.push({ method, payload });
    return new Response(JSON.stringify({ ok: true, result: true }), {
      headers: { 'content-type': 'application/json' },
    });
  };

  const config = loadConfig({ ...ENV_DE_PRUEBA, ...env });
  const bot = crearBot(config, {
    log,
    botInfo: BOT_INFO,
    cliente: { fetch: fetchFalso },
    inicio,
    ahora,
  });
  return { bot, llamadas, config };
}

let siguienteUpdate = 1;

// Simula un mensaje de texto en un chat privado. Detecta comandos para marcar la entidad.
export function mensaje(texto, { chatId = 100 } = {}) {
  const entities = texto.startsWith('/')
    ? [{ type: 'bot_command', offset: 0, length: texto.split(' ')[0].length }]
    : undefined;
  return {
    update_id: siguienteUpdate++,
    message: {
      message_id: siguienteUpdate,
      date: Math.floor(Date.now() / 1000),
      chat: { id: chatId, type: 'private', first_name: 'Ana' },
      from: { id: chatId, is_bot: false, first_name: 'Ana' },
      text: texto,
      entities,
    },
  };
}
