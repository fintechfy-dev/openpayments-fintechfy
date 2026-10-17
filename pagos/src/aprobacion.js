import { createHash, timingSafeEqual } from "node:crypto";

// Al aprobar, la billetera devuelve al participante con interact_ref y un hash. Verificarlo
// prueba que la vuelta viene del servidor de permisos y no de alguien que adivinó la URL.
// Especificación: SHA-256 de "nonceCliente\nnonceServidor\ninteractRef\nurlServidorPermisos",
// en base64 (https://openpayments.dev/identity/hash-verification/).
export function verificarHash({ nonceCliente, nonceServidor, interactRef, urlServidorPermisos, hash }) {
  const recibido = decodificar(hash);
  if (!recibido) return false;
  // La URL del servidor de permisos puede llegar con o sin "/" final según quién la normalizó.
  const sinBarra = urlServidorPermisos.replace(/\/+$/, "");
  return [sinBarra, `${sinBarra}/`].some((url) => {
    const esperado = calcularHash({ nonceCliente, nonceServidor, interactRef, urlServidorPermisos: url });
    return esperado.length === recibido.length && timingSafeEqual(esperado, recibido);
  });
}

export function calcularHash({ nonceCliente, nonceServidor, interactRef, urlServidorPermisos }) {
  return createHash("sha256")
    .update([nonceCliente, nonceServidor, interactRef, urlServidorPermisos].join("\n"), "utf8")
    .digest();
}

function decodificar(texto) {
  // Un "+" sin codificar en la query llega como espacio; en base64 un espacio nunca es válido.
  const normal = typeof texto === "string" ? texto.replace(/ /g, "+") : "";
  if (!normal || !/^[A-Za-z0-9+/_-]+={0,2}$/.test(normal)) return null;
  return Buffer.from(normal.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}
