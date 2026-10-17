// Primera barrera: sin sesión válida, el panel manda a iniciar sesión y la API responde 401.
// No es la única: cada página, acción y ruta de API vuelve a comprobar la sesión (src/lib/sesion).
import { NextResponse, type NextRequest } from "next/server";
import { NOMBRE_COOKIE, leerSesion } from "@/lib/sesion/firma";
import { SECCION_CREDITOS_VISIBLE } from "@/lib/secciones";

export function proxy(request: NextRequest) {
  // Una sección oculta responde 404 antes de pintar el panel: si lo decidiera la página, el layout ya
  // habría salido con estado 200 y el título de la sección.
  const ruta = request.nextUrl.pathname;
  if (!SECCION_CREDITOS_VISIBLE && (ruta === "/creditos" || ruta.startsWith("/creditos/"))) {
    return NextResponse.rewrite(new URL("/seccion-oculta", request.url));
  }

  // El bot no tiene cookie: el índice se protege con su propia llave (app/api/indice/[tipo]/route.ts).
  // Solo POST: una ruta futura bajo /api/indice/ que lea no queda pública por accidente.
  if (request.method === "POST" && request.nextUrl.pathname.startsWith("/api/indice/")) return NextResponse.next();

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
