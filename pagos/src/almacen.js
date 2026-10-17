import { TableClient, odata } from "@azure/data-tables";

// Los permisos (con sus tokens), los pagos, los avisos y la idempotencia tienen que sobrevivir un
// reinicio de la app en plena demo. En Azure van a Table Storage; en la laptop y en las pruebas,
// a memoria. Los dos guardan lo mismo: un objeto JSON por (tipo, id).

export function crearAlmacenMemoria() {
  const tipos = new Map();
  const de = (tipo) => {
    if (!tipos.has(tipo)) tipos.set(tipo, new Map());
    return tipos.get(tipo);
  };
  return {
    nombre: "memoria",
    async obtener(tipo, id) {
      const valor = de(tipo).get(id);
      return valor === undefined ? null : structuredClone(valor);
    },
    async guardar(tipo, id, objeto) {
      de(tipo).set(id, structuredClone(objeto));
    },
    async listar(tipo) {
      return [...de(tipo).values()].map((v) => structuredClone(v));
    },
    async borrar(tipo, id) {
      de(tipo).delete(id);
    },
  };
}

export async function crearAlmacenTablas(conexion, nombreTabla = "pagos") {
  const tabla = TableClient.fromConnectionString(conexion, nombreTabla);
  try {
    await tabla.createTable();
  } catch (error) {
    if (error.statusCode !== 409) throw error;
  }
  return {
    nombre: "tablas",
    async obtener(tipo, id) {
      try {
        const entidad = await tabla.getEntity(tipo, id);
        return JSON.parse(entidad.datos);
      } catch (error) {
        if (error.statusCode === 404) return null;
        throw error;
      }
    },
    async guardar(tipo, id, objeto) {
      await tabla.upsertEntity({ partitionKey: tipo, rowKey: id, datos: JSON.stringify(objeto) }, "Replace");
    },
    async listar(tipo) {
      const filas = tabla.listEntities({ queryOptions: { filter: odata`PartitionKey eq ${tipo}` } });
      const lista = [];
      for await (const entidad of filas) lista.push(JSON.parse(entidad.datos));
      return lista;
    },
    async borrar(tipo, id) {
      try {
        await tabla.deleteEntity(tipo, id);
      } catch (error) {
        if (error.statusCode !== 404) throw error;
      }
    },
  };
}
