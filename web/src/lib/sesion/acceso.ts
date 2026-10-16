// Quién puede ver qué. Cada criterio de acceso se declara aquí una sola vez y lo usan las páginas,
// las acciones y la API: copiado en varios sitios, olvidar uno no rompe nada visible, solo muestra
// a quien no debe.
import type { DatosSesion } from "./firma";

/** La financiera ve todas las natilleras; un administrador, solo las suyas. */
export function puedeVerNatillera(sesion: DatosSesion, natillera: { administrador: string }): boolean {
  return sesion.rol === "financiera" || natillera.administrador === sesion.nombre;
}

/** Solo la financiera presta: solo ella ve y responde solicitudes de crédito. */
export function puedeResponderCreditos(sesion: DatosSesion): boolean {
  return sesion.rol === "financiera";
}

/**
 * A dónde volver después de iniciar sesión. Solo rutas internas: "//otro-sitio.com" o "https://..."
 * convertirían el formulario en un redireccionador abierto.
 */
export function destinoSeguro(siguiente: unknown, porDefecto = "/natilleras"): string {
  if (typeof siguiente !== "string") return porDefecto;
  if (!siguiente.startsWith("/") || siguiente.startsWith("//") || siguiente.startsWith("/\\")) return porDefecto;
  if (siguiente.startsWith("/ingresar")) return porDefecto;
  return siguiente;
}
