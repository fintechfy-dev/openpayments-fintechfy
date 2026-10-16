"use server";

import { revalidatePath } from "next/cache";
import { listarSolicitudesCredito, responderSolicitud } from "@/lib/servicio";
import { ERROR_ENTRADA, ERROR_SERVICIO, ERROR_YA_RESPONDIDA, mensajeRespuesta, validarEntrada, type ResultadoRespuesta } from "./logica";

/**
 * La financiera aprueba o no aprueba una solicitud de préstamo.
 * Valida la entrada en el servidor, comprueba que la solicitud exista y siga sin respuesta,
 * y nunca devuelve el error crudo del servicio: lo registra aquí y responde con un mensaje claro.
 */
export async function responderSolicitudAccion(_previo: ResultadoRespuesta | null, datos: FormData): Promise<ResultadoRespuesta> {
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
