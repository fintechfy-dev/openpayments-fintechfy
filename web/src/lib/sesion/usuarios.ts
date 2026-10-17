// Usuarios de la demo. Cada uno entra con un código que le llega por Telegram, al chat que dice
// su variable de entorno (web/.env.local). Sin esa variable, ese usuario no puede entrar.
// El bot solo puede escribirle a quien ya le escribió: cada persona debe mandarle /start una vez.
import { FINANCIERA } from "@/lib/financiera";
import type { Rol } from "./firma";

export interface UsuarioDemo {
  usuario: string;
  nombre: string;
  rol: Rol;
  variableChat: "DEMO_FINANCIERA_TELEGRAM_CHAT_ID" | "DEMO_ADMIN_TELEGRAM_CHAT_ID";
}

// El administrador de demo ve las natilleras cuyo administrador registró el bot con su chat de Telegram.
export const USUARIOS_DEMO: readonly UsuarioDemo[] = [
  { usuario: "financiera", nombre: FINANCIERA, rol: "financiera", variableChat: "DEMO_FINANCIERA_TELEGRAM_CHAT_ID" },
  { usuario: "andres", nombre: "Andrés Restrepo", rol: "administrador", variableChat: "DEMO_ADMIN_TELEGRAM_CHAT_ID" },
];

/** Normaliza lo que escribió la persona: sin espacios, en minúsculas, corto. */
export function limpiarUsuario(texto: unknown): string {
  return typeof texto === "string" ? texto.trim().toLowerCase().slice(0, 64) : "";
}

export function buscarUsuario(usuario: string): UsuarioDemo | null {
  return USUARIOS_DEMO.find((u) => u.usuario === usuario) ?? null;
}

/** Un chat id de Telegram es un entero (los grupos son negativos). */
export function chatValido(chatId: string | undefined): chatId is string {
  return typeof chatId === "string" && /^-?\d{1,20}$/.test(chatId);
}
