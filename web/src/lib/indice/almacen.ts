// Almacén del índice en un archivo JSON: tiene que sobrevivir a un reinicio del servidor en la demo.
// Sin base de datos a propósito: son decenas de registros y una sola instancia de la web.
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { EscritorDecisiones, LectorIndice, RegistroDecision, ResultadoGuardar, TipoRegistro } from "./tipos";
import { TIPOS_REGISTRO, type RegistroPorTipo } from "./validacion";

// decisiones va aparte de TIPOS_REGISTRO a propósito: no tiene ruta POST /api/indice/* (la escribe la web).
type Contenido = { [T in TipoRegistro]: Record<string, RegistroPorTipo[T]> } & { decisiones: Record<string, RegistroDecision> };

const LLAVE: { [T in TipoRegistro]: keyof RegistroPorTipo[T] & string } = {
  natilleras: "natilleraId",
  participaciones: "participacionId",
  actividades: "actividadId",
  solicitudes: "solicitudId",
};

export class IndiceCorrupto extends Error {
  constructor(ruta: string, motivo: string) {
    super(`El índice en ${ruta} está dañado (${motivo}). No se tocó: revísalo, o muévelo a otro nombre para empezar con un índice vacío.`);
    this.name = "IndiceCorrupto";
  }
}

export interface Almacen extends LectorIndice, EscritorDecisiones {
  /** `repetido` si el id ya estaba con los mismos datos (el bot reintenta); `conflicto` si estaba
   *  con otros (la ruta responde 409). En los dos casos no sobrescribe. */
  guardar<T extends TipoRegistro>(tipo: T, registro: RegistroPorTipo[T]): Promise<ResultadoGuardar>;
}

// La cola es por archivo y no por almacén: dos almacenes sobre la misma ruta en el mismo proceso
// tampoco se pisan.
const colas = new Map<string, Promise<unknown>>();

function enCola<T>(ruta: string, tarea: () => Promise<T>): Promise<T> {
  const resultado = (colas.get(ruta) ?? Promise.resolve()).then(tarea);
  colas.set(ruta, resultado.catch(() => undefined));
  return resultado;
}

// Sin prototipo: un id como "__proto__" (el patrón lo admite) queda como una llave más.
const seccion = () => Object.create(null) as Record<string, never>;
const vacio = (): Contenido => ({ natilleras: seccion(), participaciones: seccion(), actividades: seccion(), solicitudes: seccion(), decisiones: seccion() });

async function leer(ruta: string): Promise<Contenido> {
  let texto: string;
  try {
    texto = await readFile(ruta, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return vacio();
    throw error;
  }
  let datos: unknown;
  try {
    datos = JSON.parse(texto);
  } catch {
    throw new IndiceCorrupto(ruta, "no es JSON válido");
  }
  if (typeof datos !== "object" || datos === null || Array.isArray(datos)) throw new IndiceCorrupto(ruta, "no es un objeto");
  const contenido = vacio();
  for (const tipo of [...TIPOS_REGISTRO, "decisiones"] as const) {
    const guardada = (datos as Record<string, unknown>)[tipo];
    if (guardada === undefined) continue;
    if (typeof guardada !== "object" || guardada === null || Array.isArray(guardada)) throw new IndiceCorrupto(ruta, `«${tipo}» no es un objeto`);
    Object.assign(contenido[tipo], guardada);
  }
  return contenido;
}

/** Escribe en un temporal y lo renombra: quien lee ve el archivo viejo o el nuevo, nunca uno a medias. */
async function escribir(ruta: string, contenido: Contenido) {
  const temporal = `${ruta}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporal, JSON.stringify(contenido, null, 2), "utf8");
    await rename(temporal, ruta);
  } catch (error) {
    await unlink(temporal).catch(() => undefined);
    throw error;
  }
}

export function crearAlmacen(ruta: string): Almacen {
  return {
    guardar(tipo, registro) {
      return enCola(ruta, async () => {
        const contenido = await leer(ruta);
        const registros = contenido[tipo] as Record<string, typeof registro>;
        const id = String(registro[LLAVE[tipo]]);
        // Los validadores arman el registro siempre con el mismo orden de campos: el JSON se puede comparar.
        if (Object.hasOwn(registros, id)) return JSON.stringify(registros[id]) === JSON.stringify(registro) ? "repetido" : "conflicto";
        registros[id] = registro;
        await mkdir(path.dirname(ruta), { recursive: true });
        await escribir(ruta, contenido);
        return "nuevo";
      });
    },
    async natilleras() {
      return Object.values((await leer(ruta)).natilleras);
    },
    async natillera(natilleraId) {
      const natilleras = (await leer(ruta)).natilleras;
      return natilleras[natilleraId] ?? null;
    },
    async participaciones(natilleraId) {
      return Object.values((await leer(ruta)).participaciones).filter((p) => p.natilleraId === natilleraId);
    },
    async actividades(natilleraId) {
      return Object.values((await leer(ruta)).actividades).filter((a) => a.natilleraId === natilleraId);
    },
    async solicitudes() {
      return Object.values((await leer(ruta)).solicitudes);
    },
    async decisiones() {
      return Object.values((await leer(ruta)).decisiones);
    },
    guardarDecision(decision) {
      return enCola(ruta, async () => {
        const contenido = await leer(ruta);
        // Una solicitud se responde una sola vez: dos clics o dos personas a la vez no la cambian.
        if (Object.hasOwn(contenido.decisiones, decision.solicitudId)) return "conflicto";
        contenido.decisiones[decision.solicitudId] = decision;
        await mkdir(path.dirname(ruta), { recursive: true });
        await escribir(ruta, contenido);
        return "nuevo";
      });
    },
    quitarDecision(solicitudId) {
      return enCola(ruta, async () => {
        const contenido = await leer(ruta);
        if (!Object.hasOwn(contenido.decisiones, solicitudId)) return;
        delete contenido.decisiones[solicitudId];
        await escribir(ruta, contenido);
      });
    },
  };
}
