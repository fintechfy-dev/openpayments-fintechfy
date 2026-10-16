// Sesión en el servidor. Las páginas del panel, las acciones y la API la verifican aquí;
// el proxy (src/proxy.ts) solo es la primera barrera.
import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { listarNatilleras } from "@/lib/servicio";
import { puedeVerNatillera } from "./acceso";
import { DURACION_SESION_MS, LARGO_MINIMO_SECRETO, NOMBRE_COOKIE, firmarSesion, leerSesion, type DatosSesion } from "./firma";
import { NOMBRE_COOKIE_RETO, VIGENCIA_CODIGO_MS, crearReto, leerReto, type Reto } from "./otp";
import type { UsuarioDemo } from "./usuarios";

export type { DatosSesion, Rol } from "./firma";

function secreto(): string {
  return process.env.SESION_SECRETO?.trim() ?? "";
}

/** false si falta SESION_SECRETO o es corto: nadie puede iniciar sesión hasta configurarlo. */
export function sesionConfigurada(): boolean {
  return secreto().length >= LARGO_MINIMO_SECRETO;
}

/** Chat de Telegram de cada usuario de demo, o undefined si no está configurado. */
export function chatDe(usuario: UsuarioDemo): string | undefined {
  return process.env[usuario.variableChat]?.trim() || undefined;
}

/** Sin token del bot y fuera de producción, el código se muestra en la terminal del servidor. */
export function codigoPorTerminal(): boolean {
  return !process.env.TELEGRAM_BOT_TOKEN?.trim() && process.env.NODE_ENV !== "production";
}

const opcionesCookie = (expira: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  expires: new Date(expira),
});

/** Guarda el reto del código recién enviado (solo su huella) en una cookie firmada. */
export async function guardarReto(usuario: string, codigo: string): Promise<void> {
  const { token } = crearReto(usuario, codigo, secreto());
  (await cookies()).set(NOMBRE_COOKIE_RETO, token, opcionesCookie(Date.now() + VIGENCIA_CODIGO_MS));
}

export async function leerRetoActual(): Promise<Reto | null> {
  return leerReto((await cookies()).get(NOMBRE_COOKIE_RETO)?.value, secreto());
}

export async function borrarReto(): Promise<void> {
  (await cookies()).delete(NOMBRE_COOKIE_RETO);
}

export { secreto as secretoSesion };

/** La sesión de esta petición, o null. Se lee una vez por petición. */
export const obtenerSesion = cache(async (): Promise<DatosSesion | null> => {
  const token = (await cookies()).get(NOMBRE_COOKIE)?.value;
  return leerSesion(token, secreto());
});

/** Para páginas y acciones del panel: sin sesión válida, a iniciar sesión. */
export async function requerirSesion(): Promise<DatosSesion> {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/ingresar");
  return sesion;
}

export async function crearSesion(usuario: UsuarioDemo): Promise<void> {
  const datos: DatosSesion = {
    usuario: usuario.usuario,
    nombre: usuario.nombre,
    rol: usuario.rol,
    telegramId: chatDe(usuario),
    exp: Date.now() + DURACION_SESION_MS,
  };
  (await cookies()).set(NOMBRE_COOKIE, firmarSesion(datos, secreto()), opcionesCookie(datos.exp));
}

export async function borrarSesion(): Promise<void> {
  (await cookies()).delete(NOMBRE_COOKIE);
}

/** Ids de las natilleras que esta sesión puede ver (para filtrar pagos y bitácora). */
export async function natillerasVisibles(sesion: DatosSesion): Promise<Set<string>> {
  const todas = await listarNatilleras();
  return new Set(todas.filter((n) => puedeVerNatillera(sesion, n)).map((n) => n.id));
}
