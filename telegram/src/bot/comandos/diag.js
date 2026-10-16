import { Composer } from 'grammy';

// Diagnóstico del equipo (US-001-CFG). Solo responde en TEAM_CHAT_ID; en otro chat no dice nada,
// para no revelar que existe. Nunca muestra secretos: de las URL solo enseña el origen.

const numero = new Intl.NumberFormat('es-CO');

function duracion(ms) {
  const minutos = Math.floor(ms / 60_000);
  if (minutos < 60) return `${minutos} min`;
  return `${Math.floor(minutos / 60)} h ${minutos % 60} min`;
}

function servicio(url, extra = '') {
  return url ? `${new URL(url).origin}${extra}` : 'sin configurar';
}

export function textoDiagnostico(config, { encendidoMs }) {
  const llave = config.externo.apiKey ? ' (con llave)' : ' (sin llave)';
  return [
    'Diagnóstico del bot',
    `Encendido hace: ${duracion(encendidoMs)}`,
    `Cuota: mínimo ${numero.format(config.cuota.min)} · máximo ${numero.format(config.cuota.max)}`,
    `Mora diaria máxima: ${numero.format(config.moraDiariaMaxPct)} %`,
    `Servicio externo: ${config.externo.url ? servicio(config.externo.url, llave) : 'sin configurar'} · conexión: sin probar (tarea 5)`,
    `Servicio de pagos: ${servicio(config.pagosUrl)}`,
    `Base de datos: ${config.dbPath} (llega en la tarea 4)`,
  ].join('\n');
}

export function diag({ config, inicio = Date.now(), ahora = () => Date.now() }) {
  const comandos = new Composer();

  comandos
    .filter((ctx) => String(ctx.chat?.id) === config.teamChatId)
    .command('diag', (ctx) => ctx.reply(textoDiagnostico(config, { encendidoMs: ahora() - inicio })));

  return comandos;
}
