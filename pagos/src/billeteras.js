// Los participantes escriben su billetera como URL o como payment pointer ("$ilp.../ana").
// Se normaliza en un solo sitio para que comparar dos billeteras no dependa de cómo se escribieron.
export function normalizarWallet(texto) {
  if (typeof texto !== "string" || !texto.trim()) return null;
  let url = texto.trim();
  if (url.startsWith("$")) url = `https://${url.slice(1)}`;
  if (!/^https:\/\//i.test(url)) return null;
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host.toLowerCase()}${u.pathname.replace(/\/+$/, "")}`;
  } catch {
    return null;
  }
}

export function mismaWallet(a, b) {
  const na = normalizarWallet(a);
  return na !== null && na === normalizarWallet(b);
}
