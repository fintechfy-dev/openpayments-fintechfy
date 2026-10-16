import { crearBot } from '../../src/bot/index.js';

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

// Bot sin red: cada llamada a la API de Telegram se guarda en `llamadas` en vez de enviarse.
export function crearBotDePrueba({ config = {}, log = logSilencioso } = {}) {
  const bot = crearBot({ botToken: 'token-de-prueba', ...config }, { log, botInfo: BOT_INFO });
  const llamadas = [];
  bot.api.config.use(async (_prev, method, payload) => {
    llamadas.push({ method, payload });
    return { ok: true, result: true };
  });
  return { bot, llamadas };
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
