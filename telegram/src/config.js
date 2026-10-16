import { listaDeSecretos } from './secretos.js';

// Configuración del bot (parte del bot de US-001-CFG). Se valida toda al arrancar y se
// reportan todos los errores juntos. Cada error nombra la variable y la regla, nunca el valor.

export class ConfigError extends Error {
  constructor(errores) {
    super(`La configuración del bot tiene ${errores.length} error(es):\n- ${errores.join('\n- ')}`);
    this.name = 'ConfigError';
    this.errores = errores;
  }
}

const DB_PATH_POR_DEFECTO = './data/bot.db';

export function loadConfig(env) {
  const errores = [];

  const texto = (nombre, { obligatoria = true } = {}) => {
    const valor = env[nombre]?.trim() ?? '';
    if (valor === '' && obligatoria) errores.push(`Falta la variable ${nombre}.`);
    return valor === '' ? undefined : valor;
  };

  const numero = (nombre, regla, descripcion) => {
    const valor = texto(nombre);
    if (valor === undefined) return undefined;
    const n = Number(valor);
    if (!Number.isFinite(n) || !regla(n)) {
      errores.push(`${nombre} debe ser ${descripcion} (usa punto para los decimales).`);
      return undefined;
    }
    return n;
  };

  const url = (nombre) => {
    const valor = texto(nombre, { obligatoria: false });
    if (valor === undefined) return undefined;
    try {
      const { protocol } = new URL(valor);
      if (protocol === 'http:' || protocol === 'https:') return valor;
    } catch {
      // Cae al error de abajo.
    }
    errores.push(`${nombre} debe ser una URL que empiece por http:// o https://.`);
    return undefined;
  };

  const botToken = texto('BOT_TOKEN');

  const teamChatId = texto('TEAM_CHAT_ID');
  if (teamChatId !== undefined && !/^-?\d+$/.test(teamChatId)) {
    errores.push('TEAM_CHAT_ID debe ser un número entero (los grupos empiezan por -).');
  }

  const cuotaMin = numero('CUOTA_MIN', (n) => n > 0, 'un número mayor que 0');
  const cuotaMax = numero('CUOTA_MAX', (n) => n > 0, 'un número mayor que 0');
  if (cuotaMin !== undefined && cuotaMax !== undefined && cuotaMin >= cuotaMax) {
    errores.push('CUOTA_MIN debe ser menor que CUOTA_MAX.');
  }

  const moraDiariaMaxPct = numero('MORA_DIARIA_MAX_PCT', (n) => n >= 0, 'un número mayor o igual a 0');

  // Del servicio externo y de pagos: opcionales hasta las tareas 5 y #4, pero si vienen, bien formadas.
  const externoUrl = url('EXTERNO_URL');
  const externoApiKey = texto('EXTERNO_API_KEY', { obligatoria: false });
  const pagosUrl = url('PAGOS_URL');

  const dbPath = texto('DB_PATH', { obligatoria: false }) ?? DB_PATH_POR_DEFECTO;

  if (errores.length > 0) throw new ConfigError(errores);

  return Object.freeze({
    botToken,
    teamChatId,
    cuota: Object.freeze({ min: cuotaMin, max: cuotaMax }),
    moraDiariaMaxPct,
    externo: Object.freeze({ url: externoUrl, apiKey: externoApiKey }),
    pagosUrl,
    dbPath,
    secretos: Object.freeze(listaDeSecretos(botToken, externoApiKey)),
  });
}
