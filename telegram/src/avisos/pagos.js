import { InlineKeyboard } from 'grammy';
import { escaparHTML, formatoCOP } from '../formato.js';
import { BOTON_PAGAR_DEUDA, datoBotonDeuda, LO_REVISAMOS, PLATA_UBICADA } from './mensajes.js';

// Los avisos de pago (telegram/INTEGRACION.md, sección 3): «cobro hecho» no es un aviso de staging; lo
// sabe solo la API de pagos, que ejecuta cada pago y deja un PagoCompletado o PagoFallido. El bot se
// los pide cada pocos segundos con su propio cursor, guardado en SQLite.
//
// Los avisos de pago no traen contrato: a quién avisar sale de la `referencia` según el `tipo`. En
// `cuota`, `deuda` y `liquidacion` es la participación; en `premio`, la actividad. Los demás no se
// anuncian: en `actividad` la referencia no dice quién pagó, el `desembolso` ya lo anuncia staging con
// PrestamoDesembolsado y las ventas no están en el bot.

export const FUENTE = 'pagos';
export const INTERVALO_MS = 4_000;
const POR_PAGINA = 100;

const PRUEBA = 'Pago de prueba: no se movió dinero.';
const REVISA_SALDO = 'Revisa que tu billetera tenga saldo.';

const negrita = (texto) => `<b>${escaparHTML(texto)}</b>`;
const conPrueba = (lineas, datos) => (datos?.simulado ? [...lineas, PRUEBA] : lineas).join('\n');

// Por tipo: a quién va y qué dice. `n` es el nombre de la natillera; `d`, los datos del aviso.
const TIPOS = {
  cuota: {
    a: 'participante',
    completado: (n, d) => [`✅ Se cobró tu cuota${d.periodo ? ` ${d.periodo}` : ''} de ${negrita(n)}: ${formatoCOP(d.monto)} de tu billetera.`, PLATA_UBICADA],
    fallido: (n, d) => [`No se pudo cobrar tu cuota${d.periodo ? ` ${d.periodo}` : ''} de ${negrita(n)}.`, REVISA_SALDO],
  },
  deuda: {
    a: 'participante',
    completado: (n, d) => [`✅ Se cobró lo pendiente en ${negrita(n)}: ${formatoCOP(d.monto)}. Quedaste al día.`, PLATA_UBICADA],
    fallido: (n) => [`No se pudo cobrar lo pendiente en ${negrita(n)}.`, `${REVISA_SALDO} Luego toca el botón otra vez.`],
    botonFallido: true,
  },
  liquidacion: {
    a: 'participante',
    completado: (n, d) => [`✅ Te llegó tu plata de ${negrita(n)}: ${formatoCOP(d.monto)}.`, 'Ya está en tu billetera.'],
    fallido: (n) => [`No se pudo enviar tu plata de ${negrita(n)} a tu billetera.`, LO_REVISAMOS],
  },
  premio: {
    a: 'grupo',
    aFallido: 'admin',
    completado: (n, d) => [`🎉 Se pagó el premio de la actividad de ${negrita(n)}: ${formatoCOP(d.monto)}.`],
    fallido: (n) => [`No se pudo pagar el premio de la actividad de ${negrita(n)}.`, LO_REVISAMOS],
  },
};

const EVENTOS = { PagoCompletado: 'completado', PagoFallido: 'fallido' };

// El mensaje de un aviso de pago y a qué chats va, o null si no es de algo que este bot creó (la API
// de pagos atiende a toda la organización) o si no se anuncia.
export function avisoDePago({ evento, datos }, registro) {
  const resultado = EVENTOS[evento];
  const tipo = TIPOS[datos?.tipo];
  if (!resultado || !tipo || typeof datos.referencia !== 'string') return null;

  let natillera;
  let participante;
  if (tipo.a === 'participante') {
    const p = registro.participacion(datos.referencia);
    if (!p) return null;
    natillera = registro.natillera(p.natillera_id);
    participante = { participacionId: p.participacion_id, telegramId: Number(p.telegram_id) };
  } else {
    const actividad = registro.actividad(datos.referencia);
    natillera = actividad && registro.natillera(actividad.natillera_id);
  }
  if (!natillera) return null;

  const a = resultado === 'fallido' ? (tipo.aFallido ?? tipo.a) : tipo.a;
  const chats =
    a === 'grupo' ? registro.chatsDelGrupo(natillera.natillera_id) : a === 'admin' ? [Number(natillera.admin_telegram_id)] : [participante.telegramId];
  const texto = conPrueba(tipo[resultado](natillera.nombre, datos), datos);
  const botones =
    resultado === 'fallido' && tipo.botonFallido ? new InlineKeyboard().text(BOTON_PAGAR_DEUDA, datoBotonDeuda(participante.participacionId)) : undefined;
  return { chats, texto, botones, natilleraId: natillera.natillera_id };
}

const dormir = (ms, signal) =>
  new Promise((resolver) => {
    const timer = setTimeout(resolver, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      resolver();
    }, { once: true });
  });

// `pagos`: el cliente de la API de pagos (externo/pagos.js). `api`: bot.api, para que cada aviso pase
// por la guardia de secretos.
export function crearLectorDeAvisosDePago({ pagos, registro, api, log, esperar = dormir }) {
  async function enviar(aviso) {
    const mensaje = avisoDePago(aviso, registro);
    if (aviso.datos?.motivo) log.info(`Aviso ${aviso.evento} (${aviso.datos.tipo} ${aviso.datos.referencia}), motivo: ${aviso.datos.motivo}`);
    if (!mensaje) return;
    for (const chatId of mensaje.chats) {
      try {
        await api.sendMessage(chatId, mensaje.texto, { parse_mode: 'HTML', reply_markup: mensaje.botones });
      } catch (error) {
        // Un chat que bloqueó al bot no debe impedir que les llegue a los demás.
        log.warn(`No se pudo enviar ${aviso.evento} al chat ${chatId}: ${error.message}`);
      }
    }
  }

  // Lee todo lo nuevo y avisa. La primera vez (sin cursor) solo se ubica en el último aviso: los pagos
  // de antes de encender el bot ya pasaron y anunciarlos ahora confundiría.
  async function pasada() {
    const primeraVez = registro.cursor(FUENTE) === undefined;
    let cursor = registro.cursor(FUENTE);
    let saltados = 0;
    for (;;) {
      const lista = await pagos.avisos(cursor);
      if (!Array.isArray(lista) || lista.length === 0) break;
      for (const aviso of lista) {
        if (primeraVez) saltados++;
        else await enviar(aviso);
        // Después de cada uno: si el bot se cae a mitad, no repite los que ya mandó.
        cursor = aviso.id;
        registro.guardarCursor(FUENTE, cursor);
      }
      if (lista.length < POR_PAGINA) break;
    }
    if (primeraVez) {
      registro.guardarCursor(FUENTE, cursor ?? '');
      log.info(`Avisos de pago: empiezo después de los ${saltados} que ya había.`);
    }
  }

  // Corre hasta que se aborte `signal`. Un fallo de red no lo detiene; se registra una vez por racha.
  async function escuchar({ signal, intervaloMs = INTERVALO_MS } = {}) {
    let fallando = false;
    while (!signal?.aborted) {
      try {
        await pasada();
        if (fallando) log.info('Avisos de pago: la API de pagos volvió a responder.');
        fallando = false;
      } catch (error) {
        if (!fallando) log.warn(`Avisos de pago: no pude leer la API de pagos (${error.message}). Sigo intentando.`);
        fallando = true;
      }
      await esperar(intervaloMs, signal);
    }
  }

  return { pasada, escuchar };
}
