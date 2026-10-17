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

  const numero = (nombre, regla, descripcion, { obligatoria = true } = {}) => {
    const valor = texto(nombre, { obligatoria });
    if (valor === undefined) return undefined;
    const n = Number(valor);
    if (!Number.isFinite(n) || !regla(n)) {
      errores.push(`${nombre} debe ser ${descripcion} (usa punto para los decimales).`);
      return undefined;
    }
    return n;
  };

  const url = (nombre, { soloHttps = false } = {}) => {
    const valor = texto(nombre, { obligatoria: false });
    if (valor === undefined) return undefined;
    const permitidos = soloHttps ? ['https:'] : ['http:', 'https:'];
    try {
      if (permitidos.includes(new URL(valor).protocol)) return valor;
    } catch {
      // Cae al error de abajo.
    }
    errores.push(
      soloHttps
        ? `${nombre} debe ser una URL que empiece por https:// (Telegram no abre otras).`
        : `${nombre} debe ser una URL que empiece por http:// o https://.`,
    );
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

  const entero = (nombre, minimo, opciones) =>
    numero(nombre, (n) => Number.isInteger(n) && n >= minimo, `un número entero desde ${minimo}`, opciones);

  // Servicio externo de staging (telegram/INTEGRACION.md). Opcional: sin él, /crear termina en una
  // vista previa. Si viene la URL, se exige todo lo que piden sus llamadas.
  const externoUrl = url('SERVICIO_EXTERNO_URL');
  const conExterno = externoUrl !== undefined;
  const externoToken = texto('SERVICIO_EXTERNO_TOKEN', { obligatoria: conExterno });
  // Reglas del préstamo y del cupo que el bot pone al crear la natillera (US-001-CFG).
  const diasEsperaCupo = entero('DIAS_ESPERA_CUPO', 0, { obligatoria: conExterno });
  const pagosParaPrestamo = entero('PAGOS_PARA_PRESTAMO', 1, { obligatoria: conExterno });
  const multiploPrestamo = entero('MULTIPLO_PRESTAMO', 1, { obligatoria: conExterno });

  // La web guarda la lista de natilleras; el bot le avisa lo que crea. Van juntas o ninguna.
  const webIndiceUrl = url('WEB_INDICE_URL');
  const webIndiceApiKey = texto('WEB_INDICE_API_KEY', { obligatoria: webIndiceUrl !== undefined });

  // Avisos de staging: con AVISOS_PUERTO llegan por webhook (sus secretos, uno por evento, los guarda
  // `npm run registrar-avisos` en telegram/data/); sin él, el bot los lee del flujo en vivo.
  const avisosPuerto = numero('AVISOS_PUERTO', (n) => Number.isInteger(n) && n > 0 && n < 65536, 'un puerto entre 1 y 65535', { obligatoria: false });

  // API de pagos (pagos/API.md). Con PAGOS_URL, el bot pide el permiso real de cada participante en su
  // billetera; sin ella, el permiso es de prueba. Las llaves de Open Payments son las de la billetera
  // cliente de la app (sus Developer Keys) y tienen que ser las mismas que manda staging: el permiso
  // queda atado a la llave que lo pidió. OP_PRIVATE_KEY es el archivo private.key en base64.
  const pagosUrl = url('PAGOS_URL');
  const conPagos = pagosUrl !== undefined;
  const pagosApiKey = texto('PAGOS_API_KEY', { obligatoria: conPagos });
  const opWallet = texto('OP_WALLET_ADDRESS', { obligatoria: conPagos });
  const opKeyId = texto('OP_KEY_ID', { obligatoria: conPagos });
  const opPrivateKey = texto('OP_PRIVATE_KEY', { obligatoria: conPagos });
  // Quién cobra las cuotas: staging en modo real ya llama a la API de pagos por cada cuota. Si el bot
  // también cobra, la cuota sale dos veces de la billetera. Por eso el bot solo cobra si se le pide
  // (`si`), para cuando staging esté en modo de prueba.
  const cobrarCuotas = texto('COBRAR_CUOTAS_BOT', { obligatoria: false })?.toLowerCase();
  if (cobrarCuotas !== undefined && !['si', 'no'].includes(cobrarCuotas)) errores.push('COBRAR_CUOTAS_BOT debe ser «si» o «no».');
  if (cobrarCuotas === 'si' && !conPagos) errores.push('COBRAR_CUOTAS_BOT=si necesita PAGOS_URL.');
  // Formulario de la Mini App (miniapp/). Sin ella, /crear pregunta todo en el chat.
  const miniappUrl = url('MINIAPP_URL', { soloHttps: true });

  const dbPath = texto('DB_PATH', { obligatoria: false }) ?? DB_PATH_POR_DEFECTO;

  if (errores.length > 0) throw new ConfigError(errores);

  return Object.freeze({
    botToken,
    teamChatId,
    cuota: Object.freeze({ min: cuotaMin, max: cuotaMax }),
    moraDiariaMaxPct,
    externo: Object.freeze({ url: externoUrl, token: externoToken }),
    reglasServicio: Object.freeze({ diasEsperaCupo, pagosParaPrestamo, multiploPrestamo }),
    webIndice: Object.freeze({ url: webIndiceUrl, apiKey: webIndiceApiKey }),
    avisos: Object.freeze({ puerto: avisosPuerto }),
    pagosUrl,
    pagos: Object.freeze({ url: pagosUrl, apiKey: pagosApiKey, llaves: Object.freeze({ wallet: opWallet, keyId: opKeyId, privateKey: opPrivateKey }) }),
    cobrarCuotasBot: cobrarCuotas === 'si',
    miniappUrl,
    dbPath,
    secretos: Object.freeze(listaDeSecretos(botToken, externoToken, webIndiceApiKey, pagosApiKey, opPrivateKey)),
  });
}
