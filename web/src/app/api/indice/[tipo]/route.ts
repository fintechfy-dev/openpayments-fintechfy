// El bot avisa aquí lo que staging no lista (web/INTEGRACION.md, sección 1). No usa la sesión del
// panel (el proxy la exceptúa): se autentica con X-Api-Key = WEB_INDICE_API_KEY.
import { NextResponse } from "next/server";
import { guardarRegistro, llaveIndice } from "@/lib/indice";
import { leerCuerpoLimitado, MAX_CUERPO_BYTES } from "@/lib/indice/cuerpo";
import { esTipoRegistro } from "@/lib/indice/validacion";

export const dynamic = "force-dynamic";

const SIN_CACHE = { "Cache-Control": "no-store" };
const responder = (cuerpo: unknown, status: number) => NextResponse.json(cuerpo, { status, headers: SIN_CACHE });

export async function POST(request: Request, { params }: { params: Promise<{ tipo: string }> }) {
  const { tipo } = await params;
  if (!esTipoRegistro(tipo)) return responder({ error: "Esa ruta del índice no existe. Usa natilleras, participaciones, actividades o solicitudes." }, 404);

  const llave = llaveIndice(request.headers.get("x-api-key"));
  if (llave === "sin-configurar") {
    console.error("WEB_INDICE_API_KEY no está configurada: el índice no recibe registros");
    return responder({ error: "El índice no está disponible todavía." }, 503);
  }
  if (llave === "invalida") return responder({ error: "Falta la X-Api-Key o no es la correcta." }, 401);

  try {
    const cuerpo = await leerCuerpoLimitado(request);
    if (!cuerpo.ok) return responder({ error: `El cuerpo pasa de ${MAX_CUERPO_BYTES / 1024} KB.` }, 413);

    let datos: unknown;
    try {
      datos = JSON.parse(cuerpo.texto);
    } catch {
      return responder({ error: "El cuerpo no es JSON válido." }, 400);
    }

    const guardado = await guardarRegistro(tipo, datos);
    if (!guardado.ok) return responder({ errores: guardado.errores }, 400);
    if (guardado.resultado === "conflicto") {
      return responder({ resultado: "conflicto", error: "Ese id ya está registrado con otros datos; no se cambió." }, 409);
    }
    return responder({ resultado: guardado.resultado }, guardado.resultado === "nuevo" ? 201 : 200);
  } catch (error) {
    // El detalle (ruta del archivo, error de disco) queda en el servidor; el bot solo sabe que reintente.
    console.error(`No se pudo guardar en el índice (${tipo})`, error);
    return responder({ error: "No pudimos guardar el registro. Intenta de nuevo en unos segundos." }, 500);
  }
}
