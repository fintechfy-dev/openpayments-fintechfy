"use server";

import { revalidatePath } from "next/cache";
import { listarSolicitudesCredito, responderSolicitud } from "@/lib/servicio";
import { obtenerSesion } from "@/lib/sesion";
import { puedeResponderCreditos } from "@/lib/sesion/acceso";
import { ERROR_ENTRADA, ERROR_SERVICIO, ERROR_YA_RESPONDIDA, mensajeRespuesta, validarEntrada, type ResultadoRespuesta } from "./logica";

/**
 * La financiera aprueba o no aprueba una solicitud de préstamo.
 * Valida la entrada en el servidor, comprueba que la solicitud exista y siga sin respuesta,
 * y nunca devuelve el error crudo del servicio: lo registra aquí y responde con un mensaje claro.
 */
const SIN_PERMISO: ResultadoRespuesta = {
  ok: false,
  titulo: "No puedes responder esta solicitud",
  mensaje: "Solo la financiera aprueba préstamos. Inicia sesión con su usuario.",
};

export async function responderSolicitudAccion(_previo: ResultadoRespuesta | null, datos: FormData): Promise<ResultadoRespuesta> {
  // Una Server Action se puede llamar directo por HTTP: el permiso se revisa aquí, no solo en la página.
  const sesion = await obtenerSesion();
  if (!sesion || !puedeResponderCreditos(sesion)) return SIN_PERMISO;

  const entrada = validarEntrada(datos.get("id"), datos.get("decision"));
  if (!entrada.ok) return ERROR_ENTRADA;

  try {
    const solicitudes = await listarSolicitudesCredito();
    const actual = solicitudes.find((s) => s.id === entrada.id);
    if (!actual) return ERROR_ENTRADA;
    if (actual.estado !== "solicitado") return ERROR_YA_RESPONDIDA;

    const respondida = await responderSolicitud(entrada.id, entrada.decision);
    return mensajeRespuesta(respondida, entrada.decision);
  } catch (error) {
    console.error("[creditos] No se pudo responder la solicitud", entrada.id, error);
    return ERROR_SERVICIO;
  } finally {
    revalidatePath("/creditos");
    revalidatePath("/bitacora");
  }
}
