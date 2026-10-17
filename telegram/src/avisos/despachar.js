import { AVISOS, campo } from './mensajes.js';

// Del OpenAPI del ecosistema: la entrega de un webhook trae solo los datos del evento (participacionId,
// deudaCuotas...), sin su nombre; por eso cada evento se registra con su propia URL y el nombre sale de
// ahí (src/avisos/webhook.js). El flujo en vivo manda cascadas enteras (cascade_executed) cuya forma no
// está documentada: se buscan adentro los eventos que el bot conoce.

const esObjeto = (v) => v !== null && typeof v === 'object';
const CAMPOS_NOMBRE = ['type', 'eventType', 'eventName', 'name', 'event'];
const CAMPOS_DATOS = ['data', 'payload', 'parameters', 'body'];

// TODO(#5): verificar contra la primera cascada real que llegue por el flujo en vivo.
export function avisosDeCascada(cascada, profundidad = 0) {
  if (!esObjeto(cascada) || profundidad > 8) return [];
  if (Array.isArray(cascada)) return cascada.flatMap((x) => avisosDeCascada(x, profundidad + 1));

  const evento = CAMPOS_NOMBRE.map((c) => cascada[c]).find((n) => typeof n === 'string' && n in AVISOS);
  if (evento) {
    const datos = CAMPOS_DATOS.map((c) => cascada[c]).find((d) => esObjeto(d) && !Array.isArray(d)) ?? cascada;
    return [{ evento, datos, contractId: cascada.contractId }];
  }
  return Object.values(cascada).flatMap((x) => avisosDeCascada(x, profundidad + 1));
}

// Encuentra en el registro la natillera (y la participación, si aplica) de un aviso. null si el aviso no
// es de algo que este bot creó: staging manda los avisos de toda la organización.
//
// El contrato que lo originó va antes que actividadId: un aviso de una obligación puede traer el id de la
// actividad, pero solo el contrato de la obligación dice quién la debe.
export function ubicar({ datos, contractId }, registro) {
  const conNatillera = (lugar, natilleraId) => {
    const natillera = registro.natillera(natilleraId);
    return natillera ? { ...lugar, natillera } : null;
  };
  const deParticipacion = (p, extra = {}) => p && conNatillera({ participacionId: p.participacion_id, telegramId: p.telegram_id, ...extra }, p.natillera_id);

  const participacionId = campo(datos, 'participacionId');
  if (participacionId) {
    const lugar = deParticipacion(registro.participacion(participacionId), { actividadId: campo(datos, 'actividadId') });
    if (lugar) return lugar;
  }

  const hallado = contractId ? registro.porContrato(contractId) : null;
  if (hallado) {
    const { tipo, fila } = hallado;
    if (tipo === 'natillera') return { natillera: fila };
    if (tipo === 'participacion') return deParticipacion(fila);
    if (tipo === 'actividad') return conNatillera({ actividadId: fila.actividad_id }, fila.natillera_id);
    return deParticipacion(registro.participacion(fila.participacion_id), { actividadId: fila.actividad_id });
  }

  const actividadId = campo(datos, 'actividadId');
  const actividad = actividadId ? registro.actividad(actividadId) : null;
  if (actividad) return conNatillera({ actividadId }, actividad.natillera_id);

  const natilleraId = campo(datos, 'natilleraId');
  if (natilleraId) return conNatillera({}, natilleraId);

  // Los avisos del crédito traen creditoId. El crédito lo crea la web al aprobar: si usa como CreditoId
  // el solicitudId que le mandó el bot (3.4), el bot sabe de quién es. Si no, PrestamoDesembolsado trae
  // también participanteId, que es el id de Telegram.
  const creditoId = campo(datos, 'creditoId');
  const solicitud = creditoId ? registro.solicitud(String(creditoId)) : null;
  if (solicitud) return deParticipacion(registro.participacion(solicitud.participacion_id));
  const participanteId = Number(campo(datos, 'participanteId'));
  return (Number.isInteger(participanteId) && deParticipacion(registro.participacionDe(participanteId))) || null;
}

function destinatarios(a, lugar, registro) {
  if (a === 'grupo') return registro.chatsDelGrupo(lugar.natillera.natillera_id);
  if (a === 'admin') return [lugar.natillera.admin_telegram_id];
  return lugar.telegramId === undefined ? [] : [Number(lugar.telegramId)];
}

// `api` es bot.api: así cada aviso pasa por la guardia de secretos del bot.
export function crearDespachador({ api, registro, log }) {
  async function aviso(evento, datos, contractId) {
    const definicion = AVISOS[evento];
    if (!definicion || !esObjeto(datos)) return;

    const lugar = ubicar({ datos, contractId }, registro);
    if (!lugar) return;
    const chats = destinatarios(definicion.a, lugar, registro);
    if (chats.length === 0) {
      log.warn(`Aviso ${evento} de ${lugar.natillera.natillera_id} sin a quién avisar.`);
      return;
    }
    const motivo = campo(datos, 'motivo');
    if (motivo) log.info(`Aviso ${evento} de ${lugar.natillera.natillera_id}, motivo: ${motivo}`);

    const contexto = { nombre: lugar.natillera.nombre, datos, ...lugar };
    const texto = definicion.texto(contexto);
    const botones = definicion.botones?.(contexto) || undefined;
    for (const chatId of chats) {
      try {
        await api.sendMessage(chatId, texto, { parse_mode: 'HTML', reply_markup: botones });
      } catch (error) {
        // Un chat que bloqueó al bot no debe impedir que les llegue a los demás.
        log.warn(`No se pudo enviar ${evento} al chat ${chatId}: ${error.message}`);
      }
    }
  }

  async function cascada(json) {
    for (const a of avisosDeCascada(json)) await aviso(a.evento, a.datos, a.contractId);
  }

  return { aviso, cascada };
}
