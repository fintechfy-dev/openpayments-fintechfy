// Primera barrera: sin sesión válida, el panel manda a iniciar sesión y la API responde 401.
// No es la única: cada página, acción y ruta de API vuelve a comprobar la sesión (src/lib/sesion).
import { NextResponse, type NextRequest } from "next/server";
import { NOMBRE_COOKIE, leerSesion } from "@/lib/sesion/firma";

export function proxy(request: NextRequest) {
  const sesion = leerSesion(request.cookies.get(NOMBRE_COOKIE)?.value, process.env.SESION_SECRETO?.trim() ?? "");
  if (sesion) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Tu sesión terminó. Vuelve a iniciar sesión." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  const destino = new URL("/ingresar", request.url);
  destino.searchParams.set("siguiente", pathname + search);
  return NextResponse.redirect(destino);
}

export const config = {
  matcher: ["/natilleras/:path*", "/creditos/:path*", "/pagos/:path*", "/bitacora/:path*", "/api/:path*"],
};
