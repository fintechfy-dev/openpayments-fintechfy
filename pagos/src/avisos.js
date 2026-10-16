// Staging no avisa «cobro hecho»: lo sabe solo esta API, que es la que ejecuta el pago. Por eso deja
// sus propios avisos (PagoCompletado y PagoFallido) con la misma forma que la lista de avisos de la
// web, para que el bot los procese igual. El id sirve de cursor: crece siempre y se compara como texto.
export function crearAvisos({ almacen, ahora = () => Date.now() }) {
  let ultimo = 0;
  return {
    async agregar(evento, datos) {
      ultimo = Math.max(ahora() * 1000, ultimo + 1);
      const id = String(ultimo).padStart(17, "0");
      const aviso = { id, evento, contractId: null, templateName: null, datos, recibido: new Date(ahora()).toISOString() };
      await almacen.guardar("aviso", id, aviso);
      return aviso;
    },
    async desde(cursor, limite = 100) {
      const todos = await almacen.listar("aviso");
      return todos
        .filter((a) => !cursor || a.id > cursor)
        .sort((a, b) => (a.id < b.id ? -1 : 1))
        .slice(0, limite);
    },
  };
}
