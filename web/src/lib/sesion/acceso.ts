// Quién puede ver qué. Cada criterio de acceso se declara aquí una sola vez y lo usan las páginas,
// las acciones y la API: copiado en varios sitios, olvidar uno no rompe nada visible, solo muestra
// a quien no debe.
import type { DatosSesion } from "./firma";

const mismoNombre = (a: string, b: string) => a.normalize("NFC").trim() === b.normalize("NFC").trim();

/**
 * La financiera ve todas las natilleras; un administrador, solo las suyas. Si la natillera trae el
 * id de Telegram de su administrador (staging), se compara ese id: un nombre visible lo puede
 * copiar cualquiera. Solo los datos de prueba, que no lo traen, se reconocen por el nombre.
 */
export function puedeVerNatillera(
  sesion: DatosSesion,
  natillera: { administrador: string; administradorTelegramId?: string },
): boolean {
  if (sesion.rol === "financiera") return true;
  if (natillera.administradorTelegramId) return natillera.administradorTelegramId === sesion.telegramId;
  return mismoNombre(natillera.administrador, sesion.nombre);
}

/** Lo que la sesión puede ver de una lista por natillera. La financiera (superadmin) ve todo, también lo
 *  que no se pudo ubicar en ninguna natillera (natilleraId vacío, por ejemplo un pago del registro de la
 *  API de pagos con una referencia desconocida); un administrador, solo lo de sus natilleras visibles. */
export function quedanVisibles<T extends { natilleraId: string }>(sesion: DatosSesion, elementos: T[], visibles: ReadonlySet<string>): T[] {
  if (sesion.rol === "financiera") return elementos;
  return elementos.filter((e) => visibles.has(e.natilleraId));
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
