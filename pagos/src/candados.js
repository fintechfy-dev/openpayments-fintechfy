// Un candado por llave: lo que corre con la misma llave va en fila, lo demás en paralelo.
// Hace falta para rotar el token de un permiso: la rotación anula el token anterior, así que
// dos rotaciones al mismo tiempo se pisan y el segundo pago queda con un token muerto.
export function crearCandados() {
  const colas = new Map();
  return async function conCandado(llave, trabajo) {
    const anterior = colas.get(llave) ?? Promise.resolve();
    let liberar;
    const turno = new Promise((resolver) => (liberar = resolver));
    const cola = anterior.then(() => turno);
    colas.set(llave, cola);
    await anterior;
    try {
      return await trabajo();
    } finally {
      liberar();
      if (colas.get(llave) === cola) colas.delete(llave);
    }
  };
}
