// El registro de pagos consulta esta ruta desde el navegador cada pocos segundos (polling).
// Corre en el servidor: la X-Api-Key del servicio externo no sale de aquí.
import { NextResponse } from "next/server";
import { listarPagos } from "@/lib/servicio";

export const dynamic = "force-dynamic";

const SIN_CACHE = { "Cache-Control": "no-store" };

export async function GET() {
  try {
    const pagos = await listarPagos();
    return NextResponse.json(pagos, { headers: SIN_CACHE });
  } catch (error) {
    // El detalle queda en el servidor; al navegador solo le llega un mensaje claro.
    console.error("No se pudo consultar los pagos", error);
    return NextResponse.json({ error: "No pudimos consultar los pagos. Lo intentamos de nuevo en unos segundos." }, { status: 502, headers: SIN_CACHE });
  }
}
