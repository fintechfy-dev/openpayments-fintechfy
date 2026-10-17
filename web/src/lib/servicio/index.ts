// Única puerta de la web al servicio externo. Solo corre en el servidor:
// el token y la X-Api-Key nunca llegan al navegador. Si un componente de cliente lo importa, el build falla.
import "server-only";

import { cache } from "react";

import { lectorIndice } from "@/lib/indice";
import { crearServicioHttp } from "./http";
import { crearClientePagos, type SaludPagos } from "./pagos-api";
import { servicioDePrueba } from "./mock";
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
    return crearServicioStaging({ urlBase: urlStaging, token, indice: lectorIndice, pagos: clientePagos ?? undefined });
  }

  const url = process.env.SERVICIO_URL?.trim();
  if (!url) return servicioDePrueba;
  const apiKey = process.env.SERVICIO_API_KEY?.trim();
  if (!apiKey) {
    console.error("SERVICIO_URL está definida pero falta SERVICIO_API_KEY en web/.env.local");
    return servicioMalConfigurado("Falta SERVICIO_API_KEY: la web no puede hablar con el servicio externo.");
  }
  return crearServicioHttp(url, apiKey);
}

const servicio = crearServicio();

/** true si la web lee de staging bien configurado; si falta el token, todas las pantallas muestran ese error. */
export const usaStaging = Boolean(process.env.SERVICIO_EXTERNO_URL?.trim() && process.env.SERVICIO_EXTERNO_TOKEN?.trim());

/** Con staging, /creditos muestra créditos de prueba sobre las natilleras reales (creditos-prueba.ts) y lo dice. */
export const creditosDePrueba = usaStaging;

/** true cuando la web muestra datos de prueba (sin SERVICIO_EXTERNO_URL ni SERVICIO_URL). */
export const usaDatosDePrueba = servicio === servicioDePrueba;

/** true si /pagos lee el registro de la API de pagos. Solo con staging: con los datos de prueba, el registro
 *  real no se usa y su estado no debe pintarse sobre pagos de ejemplo. */
export const usaRegistroDePagos = usaStaging && clientePagos !== null;

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
export const responderSolicitud: Servicio["responderSolicitud"] = (id, decision) => servicio.responderSolicitud(id, decision);
export const listarPagos = () => servicio.listarPagos();
export const listarBitacora = () => servicio.listarBitacora();

export type * from "./tipos";
export { ETAPAS } from "./tipos";
export type { SaludPagos } from "./pagos-api";
