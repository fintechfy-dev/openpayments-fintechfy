// Única puerta de la web al servicio externo. Solo corre en el servidor:
// el token y la X-Api-Key nunca llegan al navegador. Si un componente de cliente lo importa, el build falla.
import "server-only";

import { cache } from "react";

import { lectorIndice } from "@/lib/indice";
import { crearServicioHttp } from "./http";
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

function crearServicio(): Servicio {
  // Staging (#53, web/INTEGRACION.md): Bearer y la lista desde el índice que alimenta el bot.
  const urlStaging = process.env.SERVICIO_EXTERNO_URL?.trim();
  if (urlStaging) {
    const token = process.env.SERVICIO_EXTERNO_TOKEN?.trim();
    if (!token) {
      console.error("SERVICIO_EXTERNO_URL está definida pero falta SERVICIO_EXTERNO_TOKEN en web/.env.local");
      return servicioMalConfigurado("Falta SERVICIO_EXTERNO_TOKEN: la web no puede hablar con staging.");
    }
    return crearServicioStaging({ urlBase: urlStaging, token, indice: lectorIndice });
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

export const listarNatilleras = () => servicio.listarNatilleras();
// cache(): generateMetadata y la página piden la misma natillera; así es una sola petición por visita.
export const obtenerNatillera = cache((id: string) => servicio.obtenerNatillera(id));
export const listarSolicitudesCredito = () => servicio.listarSolicitudesCredito();
export const responderSolicitud: Servicio["responderSolicitud"] = (id, decision) => servicio.responderSolicitud(id, decision);
export const listarPagos = () => servicio.listarPagos();
export const listarBitacora = () => servicio.listarBitacora();

export type * from "./tipos";
export { ETAPAS } from "./tipos";
