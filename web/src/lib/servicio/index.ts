// Única puerta de la web a los sistemas externos: staging (el motor) y la API de pagos. Solo corre en el
// servidor: el token y la X-Api-Key nunca llegan al navegador. Si un componente de cliente lo importa, el
// build falla. No hay datos de prueba: sin configuración, cada pantalla dice qué falta.
import "server-only";

import { cache } from "react";

import { escritorDecisiones, lectorIndice } from "@/lib/indice";
import { crearClientePagos, type SaludPagos } from "./pagos-api";
import { crearServicioStaging } from "./staging";
import type { Servicio } from "./tipos";

/** Si la configuración está incompleta, cada petición falla con un mensaje claro (lo muestra error.tsx)
 *  en vez de tumbar toda la app al arrancar. */
function servicioMalConfigurado(motivo: string): Servicio {
  const falla = async (): Promise<never> => {
    throw new Error(motivo);
  };
  return {
    listarNatilleras: falla,
    obtenerNatillera: falla,
    listarSolicitudesCredito: falla,
    responderSolicitud: falla,
    listarPagos: falla,
    listarBitacora: falla,
  };
}

// API de pagos (pagos/API.md): /pagos lee de ella el registro real de Open Payments cuando está configurada.
const clientePagos = (() => {
  const url = process.env.PAGOS_URL?.trim();
  const apiKey = process.env.PAGOS_API_KEY?.trim();
  return url && apiKey ? crearClientePagos({ urlBase: url, apiKey }) : null;
})();

function crearServicio(): Servicio {
  // Staging (#53, web/INTEGRACION.md): Bearer y la lista desde el índice que alimenta el bot.
  const urlStaging = process.env.SERVICIO_EXTERNO_URL?.trim();
  if (urlStaging) {
    const token = process.env.SERVICIO_EXTERNO_TOKEN?.trim();
    if (!token) {
      console.error("SERVICIO_EXTERNO_URL está definida pero falta SERVICIO_EXTERNO_TOKEN en web/.env.local");
      return servicioMalConfigurado("Falta SERVICIO_EXTERNO_TOKEN: la web no puede hablar con staging.");
    }
    return crearServicioStaging({
      urlBase: urlStaging,
      token,
      indice: lectorIndice,
      pagos: clientePagos ?? undefined,
      decisiones: escritorDecisiones,
      tasaMensualCredito: tasaMensualCredito(),
    });
  }
  console.error("Falta SERVICIO_EXTERNO_URL en web/.env.local: la web no tiene de dónde leer");
  return servicioMalConfigurado("Falta SERVICIO_EXTERNO_URL: la web no está conectada al servicio externo.");
}

/** CREDITO_TASA_MENSUAL en porcentaje («2» = 2 % mensual); undefined si falta o no es un número válido. */
function tasaMensualCredito(): number | undefined {
  const texto = process.env.CREDITO_TASA_MENSUAL?.trim();
  if (!texto) return undefined;
  const n = Number(texto.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0 || n >= 100) {
    console.error(`CREDITO_TASA_MENSUAL no es un porcentaje válido (${texto}): aprobar créditos queda deshabilitado`);
    return undefined;
  }
  return n;
}

const servicio = crearServicio();

/** true si la web lee de staging bien configurado; si falta el token, todas las pantallas muestran ese error. */
export const usaStaging = Boolean(process.env.SERVICIO_EXTERNO_URL?.trim() && process.env.SERVICIO_EXTERNO_TOKEN?.trim());

/** true si /pagos puede leer el registro de la API de pagos (staging y la API configurados). */
export const usaRegistroDePagos = usaStaging && clientePagos !== null;

/** true si se pueden aprobar créditos: hay staging y una CREDITO_TASA_MENSUAL válida. */
export const aprobarCreditosConfigurado = usaStaging && tasaMensualCredito() !== undefined;

/** El estado de la API de pagos, o null si /pagos no usa su registro. Sin respuesta, se registra el detalle
 *  aquí y la pantalla dice solo que no se pudo consultar. */
export async function saludPagos(): Promise<SaludPagos | null> {
  if (!usaRegistroDePagos || !clientePagos) return null;
  try {
    return await clientePagos.salud();
  } catch (e) {
    console.error("No se pudo consultar el estado de la API de pagos", e);
    return { alcanzable: false, ok: false, simuladas: [] };
  }
}

export const listarNatilleras = () => servicio.listarNatilleras();
// cache(): generateMetadata y la página piden la misma natillera; así es una sola petición por visita.
export const obtenerNatillera = cache((id: string) => servicio.obtenerNatillera(id));
export const listarSolicitudesCredito = () => servicio.listarSolicitudesCredito();
export const responderSolicitud: Servicio["responderSolicitud"] = (id, decision, respondio) => servicio.responderSolicitud(id, decision, respondio);
export const listarPagos = () => servicio.listarPagos();
export const listarBitacora = () => servicio.listarBitacora();

export type * from "./tipos";
export { ETAPAS } from "./tipos";
export type { SaludPagos } from "./pagos-api";
