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

export const BOT_INFO = {
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
// sendMessage devuelve un mensaje con id, como Telegram, para que el motor pueda editarlo después.
export function crearFetchFalso(llamadas) {
  let siguienteMensaje = 1000;
  return async (url, init) => {
    const method = String(url).split('/').at(-1);
    const payload = init?.body ? JSON.parse(init.body) : undefined;
    llamadas.push({ method, payload });
    const result =
      method === 'sendMessage'
        ? { message_id: siguienteMensaje++, date: 0, chat: { id: payload.chat_id, type: 'private' }, text: payload.text }
        : true;
    return new Response(JSON.stringify({ ok: true, result }), {
      headers: { 'content-type': 'application/json' },
    });
  };
}

export function crearBotDePrueba({ env = {}, log = logSilencioso, db, inicio, ahora, hoy, crearNatillera } = {}) {
  const llamadas = [];
  const config = loadConfig({ ...ENV_DE_PRUEBA, ...env });
  const bot = crearBot(config, {
    log,
    db,
    crearNatillera,
    botInfo: BOT_INFO,
    cliente: { fetch: crearFetchFalso(llamadas) },
    inicio,
    ahora,
    hoy,
  });
  return { bot, llamadas, config };
}

// Mensajes que el bot mandó o editó (sin las llamadas que solo quitan botones).
export function textos(llamadas) {
  return llamadas.filter((l) => l.method === 'sendMessage' || l.method === 'editMessageText').map((l) => l.payload.text);
}

// Datos de los botones de una llamada: ['f:p:1:50000', ...].
export function botones(llamada) {
  return (llamada.payload.reply_markup?.inline_keyboard ?? []).flat().map((b) => b.callback_data);
}

// Simula que alguien toca un botón de un mensaje del bot.
export function boton(dato, { chatId = 100, messageId = 1000 } = {}) {
  return {
    update_id: siguienteUpdate++,
    callback_query: {
      id: String(siguienteUpdate),
      from: { id: chatId, is_bot: false, first_name: 'Ana' },
      chat_instance: '1',
      data: dato,
      message: {
        message_id: messageId,
        date: 0,
        chat: { id: chatId, type: 'private', first_name: 'Ana' },
        from: { id: BOT_INFO.id, is_bot: true, first_name: BOT_INFO.first_name },
        text: 'tarjeta',
      },
    },
  };
}

// Simula lo que llega cuando la Mini App llama a sendData.
export function datosDeMiniApp(data, { chatId = 100 } = {}) {
  return {
    update_id: siguienteUpdate++,
    message: {
      message_id: siguienteUpdate,
      date: 0,
      chat: { id: chatId, type: 'private', first_name: 'Ana' },
      from: { id: chatId, is_bot: false, first_name: 'Ana' },
      web_app_data: { data, button_text: 'Llenar formulario' },
    },
  };
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
