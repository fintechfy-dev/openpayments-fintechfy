// Única puerta de la web al servicio externo. Solo corre en el servidor:
// la X-Api-Key nunca llega al navegador. Si un componente de cliente lo importa, el build falla.
import "server-only";

import { cache } from "react";

import { crearServicioHttp } from "./http";
import { servicioDePrueba } from "./mock";
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

/** true cuando la web muestra datos de prueba (sin SERVICIO_URL). */
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
