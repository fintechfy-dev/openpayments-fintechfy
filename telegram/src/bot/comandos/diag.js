import { Composer } from 'grammy';
import { formatoCOP, formatoPorcentaje } from '../../formato.js';
import { contarSesiones } from '../../db.js';

// Diagnóstico del equipo (US-001-CFG). Solo responde en TEAM_CHAT_ID; en otro chat no dice nada,
// para no revelar que existe. Nunca muestra secretos: de las URL solo enseña el origen.

function duracion(ms) {
  const minutos = Math.floor(ms / 60_000);
  if (minutos < 60) return `${minutos} min`;
  return `${Math.floor(minutos / 60)} h ${minutos % 60} min`;
}

function servicio(url, extra = '') {
  return url ? `${new URL(url).origin}${extra}` : 'sin configurar';
}

// `sesiones`: cuántas hay guardadas; undefined si no hay base abierta y null si no respondió.
export function textoDiagnostico(config, { encendidoMs, sesiones }) {
  const llave = config.externo.apiKey ? ' (con llave)' : ' (sin llave)';
  return [
    'Diagnóstico del bot',
    `Encendido hace: ${duracion(encendidoMs)}`,
    `Cuota: mínimo ${formatoCOP(config.cuota.min)} · máximo ${formatoCOP(config.cuota.max)}`,
    `Mora diaria máxima: ${formatoPorcentaje(config.moraDiariaMaxPct)}`,
    `Servicio externo: ${config.externo.url ? servicio(config.externo.url, llave) : 'sin configurar'} · conexión: sin probar (tarea 5)`,
    `Servicio de pagos: ${servicio(config.pagosUrl)}`,
    `Formulario (Mini App): ${servicio(config.miniappUrl)}`,
    `Base de datos: ${baseDeDatos(config, sesiones)}`,
  ].join('\n');
}

function baseDeDatos(config, sesiones) {
  if (sesiones === undefined) return 'sin abrir (sesiones en memoria)';
  if (sesiones === null) return `${config.dbPath} · no responde`;
  return `${config.dbPath} · ${sesiones} ${sesiones === 1 ? 'sesión guardada' : 'sesiones guardadas'}`;
}

function leerSesiones(db) {
  if (!db) return undefined;
  try {
    return contarSesiones(db);
  } catch {
    return null;
  }
}

export function diag({ config, db, inicio = Date.now(), ahora = () => Date.now() }) {
  const comandos = new Composer();

  comandos
    .filter((ctx) => String(ctx.chat?.id) === config.teamChatId)
    .command('diag', (ctx) =>
      ctx.reply(textoDiagnostico(config, { encendidoMs: ahora() - inicio, sesiones: leerSesiones(db) })),
    );

  return comandos;
}
