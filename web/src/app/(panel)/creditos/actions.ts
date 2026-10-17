"use server";

import { revalidatePath } from "next/cache";
import { listarSolicitudesCredito, responderSolicitud } from "@/lib/servicio";
import { filtrarPorNatillera, obtenerSesion } from "@/lib/sesion";
import { ErrorServicio } from "@/lib/servicio/http";
import { ERROR_CREDITO_INCIERTO, ERROR_ENTRADA, ERROR_SERVICIO, ERROR_YA_RESPONDIDA, mensajeRespuesta, validarEntrada, type ResultadoRespuesta } from "./logica";

/**
 * La financiera o el administrador de la natillera aprueba o no una solicitud de préstamo. Aprobar crea el
 * crédito en staging y el motor desembolsa desde la billetera de la financiera.
 * Valida la entrada en el servidor, comprueba que la solicitud exista y siga sin respuesta,
 * y nunca devuelve el error crudo del servicio: lo registra aquí y responde con un mensaje claro.
 */
const SIN_PERMISO: ResultadoRespuesta = {
  ok: false,
  titulo: "No puedes responder esta solicitud",
  mensaje: "Solo la financiera o el administrador de esa natillera responden sus solicitudes.",
};

export async function responderSolicitudAccion(_previo: ResultadoRespuesta | null, datos: FormData): Promise<ResultadoRespuesta> {
  // Una Server Action se puede llamar directo por HTTP: el permiso se revisa aquí, no solo en la página.
  const sesion = await obtenerSesion();
  if (!sesion) return SIN_PERMISO;

  const entrada = validarEntrada(datos.get("id"), datos.get("decision"));
  if (!entrada.ok) return ERROR_ENTRADA;

  try {
    const solicitudes = await listarSolicitudesCredito();
    const actual = solicitudes.find((s) => s.id === entrada.id);
    if (!actual) return ERROR_ENTRADA;
    // La misma regla que la página: un administrador solo responde las de sus natilleras.
    if ((await filtrarPorNatillera(sesion, [actual])).length === 0) return SIN_PERMISO;
    if (actual.estado !== "solicitado") return ERROR_YA_RESPONDIDA;

    const respondida = await responderSolicitud(entrada.id, entrada.decision, sesion.nombre);
    return mensajeRespuesta(respondida, entrada.decision);
  } catch (error) {
    console.error("[creditos] No se pudo responder la solicitud", entrada.id, error);
    if (error instanceof ErrorServicio && error.codigo === "ya_respondida") return ERROR_YA_RESPONDIDA;
    if (error instanceof ErrorServicio && error.codigo === "credito_incierto") return ERROR_CREDITO_INCIERTO;
    return ERROR_SERVICIO;
  } finally {
    revalidatePath("/creditos");
    revalidatePath("/bitacora");
  }
}
