import { estadoDe, ServicioExternoError } from '../externo/cliente.js';
import { escaparHTML } from '../formato.js';
import { AVISOS } from './mensajes.js';

// Los avisos de staging no le llegan al bot: el destino de avisos no tiene dirección y la web todavía
// no los recibe (telegram/INTEGRACION.md, sección 3). Mientras tanto, el bot lee cada pocos segundos el
// estado de sus natilleras y avisa cuando cambia. Retiro: cuando la web entregue los avisos de staging
// (#6), esto se apaga para no avisar dos veces.
//
// Solo se anuncian cambios que se leen sin ambigüedad del estado: el de la natillera (arrancó, empezó
// a liquidar, cerró) y la mora de cada participación (entró, salió). Los cobros y pagos los avisa la
// API de pagos (avisos/pagos.js).

export const INTERVALO_MS = 15_000;

export const ESTADO = Object.freeze({ CREADA: 0, INICIADA: 1, ACTIVA: 2, LIQUIDANDO: 3, REEMBOLSANDO: 4, CERRADA: 5, CERRADA_SIN_CUPO: 6 });
const TERMINADA = new Set([ESTADO.CERRADA, ESTADO.CERRADA_SIN_CUPO]);

export const textoLiquidando = (nombre) =>
  `💸 <b>${escaparHTML(nombre)}</b> llegó a su fecha final.\nEstamos enviando la parte de cada quien a su billetera; te avisamos cuando llegue la tuya.`;

// Lo que se guarda de cada contrato: solo lo que se compara.
const fotoNatillera = (e) => ({ estado: Number(e.EstadoNatillera) });
const fotoParticipacion = (e) => ({ adeudadas: Number(e.CuotasAdeudadas) || 0, deuda: Number(e.DeudaCuotas) || 0 });

// Qué decir cuando la natillera pasa de `antes` a `ahora`. null si no hay nada que contar.
export function avisoDeNatillera(natillera, antes, ahora) {
  if (antes.estado === ahora.estado) return null;
  const c = { nombre: natillera.nombre, datos: {} };
  if (ahora.estado === ESTADO.ACTIVA) return AVISOS.NatilleraActivada.texto(c);
  if (ahora.estado === ESTADO.LIQUIDANDO) return textoLiquidando(natillera.nombre);
  if (ahora.estado === ESTADO.CERRADA) return AVISOS.NatilleraCerrada.texto(c);
  if (ahora.estado === ESTADO.CERRADA_SIN_CUPO) return AVISOS.NatilleraCerradaSinCupo.texto(c);
  return null;
}

// Qué decirle al participante cuando cambia su mora: { texto, botones } o null.
export function avisoDeParticipacion(natillera, participacion, antes, ahora) {
  const c = { nombre: natillera.nombre, participacionId: participacion.participacion_id, datos: { deudaCuotas: ahora.deuda } };
  if (antes.adeudadas === 0 && ahora.adeudadas > 0) {
    return { texto: AVISOS.EntradaEnMora.texto(c), botones: AVISOS.EntradaEnMora.botones(c) };
  }
  if (antes.adeudadas > 0 && ahora.adeudadas === 0) return { texto: AVISOS.SalidaDeMora.texto(c) };
  return null;
}

const dormir = (ms, signal) =>
  new Promise((resolver) => {
    const timer = setTimeout(resolver, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      resolver();
    }, { once: true });
  });

// `api`: bot.api, para que cada aviso pase por la guardia de secretos.
export function crearVigiaDeEstados({ servicio, registro, api, log, esperar = dormir }) {
  // Contratos que staging ya no tiene (se limpiaron los de prueba): no se vuelven a pedir.
  const borrados = new Set();
  const leer = async (contractId) => estadoDe(await servicio.leerContrato(contractId));

  async function enviar(chatId, texto, botones) {
    try {
      await api.sendMessage(chatId, texto, { parse_mode: 'HTML', reply_markup: botones });
    } catch (error) {
      log.warn(`No se pudo enviar un aviso de estado al chat ${chatId}: ${error.message}`);
    }
  }

  // Compara la foto nueva con la guardada; la primera vez solo guarda. Devuelve [antes, ahora] o null.
  function comparar(contractId, ahora) {
    const antes = registro.foto(contractId);
    registro.guardarFoto(contractId, ahora);
    return antes === undefined ? null : [antes, ahora];
  }

  async function revisarNatillera(natillera) {
    const anterior = registro.foto(natillera.contract_id);
    // Una natillera cerrada ya no cambia: no gasta lecturas de staging.
    if (anterior && TERMINADA.has(anterior.estado)) return;

    const cambio = comparar(natillera.contract_id, fotoNatillera(await leer(natillera.contract_id)));
    const texto = cambio && avisoDeNatillera(natillera, ...cambio);
    if (texto) {
      log.info(`Aviso de estado: ${natillera.natillera_id} pasó de ${cambio[0].estado} a ${cambio[1].estado}.`);
      for (const chatId of registro.chatsDelGrupo(natillera.natillera_id)) await enviar(chatId, texto);
    }

    for (const p of registro.participacionesEn(natillera.natillera_id)) {
      if (borrados.has(p.contract_id)) continue;
      let estado;
      try {
        estado = await leer(p.contract_id);
      } catch (error) {
        if (error instanceof ServicioExternoError && error.estado === 404) borrados.add(p.contract_id);
        else log.warn(`Aviso de estado: no pude leer ${p.participacion_id}: ${error.message}`);
        continue;
      }
      const cambioP = comparar(p.contract_id, fotoParticipacion(estado));
      const aviso = cambioP && avisoDeParticipacion(natillera, p, ...cambioP);
      if (aviso) await enviar(Number(p.telegram_id), aviso.texto, aviso.botones);
    }
  }

  async function pasada() {
    for (const natillera of registro.natilleras()) {
      if (borrados.has(natillera.contract_id)) continue;
      try {
        await revisarNatillera(natillera);
      } catch (error) {
        if (error instanceof ServicioExternoError && error.estado === 404) borrados.add(natillera.contract_id);
        else throw error;
      }
    }
  }

  // Corre hasta que se aborte `signal`. Un fallo de red no lo detiene; se registra una vez por racha.
  async function escuchar({ signal, intervaloMs = INTERVALO_MS } = {}) {
    let fallando = false;
    while (!signal?.aborted) {
      try {
        await pasada();
        if (fallando) log.info('Avisos de estado: staging volvió a responder.');
        fallando = false;
      } catch (error) {
        if (!fallando) log.warn(`Avisos de estado: no pude leer staging (${error.message}). Sigo intentando.`);
        fallando = true;
      }
      await esperar(intervaloMs, signal);
    }
  }

  return { pasada, escuchar };
}
