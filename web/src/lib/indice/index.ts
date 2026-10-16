// El índice que alimenta el bot y lee la capa de datos (lib/servicio/staging.ts). Solo servidor:
// lee la llave y escribe en disco.
import "server-only";

import path from "node:path";
import { crearAlmacen, type Almacen } from "./almacen";
import { compararLlave, type EstadoLlave } from "./llave";
import type { LectorIndice, ResultadoGuardar, TipoRegistro } from "./tipos";
import { VALIDADORES, type RegistroPorTipo } from "./validacion";

export type { EstadoLlave } from "./llave";

const rutaIndice = () => process.env.INDICE_RUTA?.trim() || path.join(process.cwd(), "data", "indice.json");

let actual: { ruta: string; almacen: Almacen } | null = null;

// La ruta se lee en cada uso y no al cargar el módulo, para que cambiar INDICE_RUTA (en pruebas)
// no deje un almacén apuntando al archivo anterior.
function almacen(): Almacen {
  const ruta = rutaIndice();
  if (actual?.ruta !== ruta) actual = { ruta, almacen: crearAlmacen(ruta) };
  return actual.almacen;
}

export const lectorIndice: LectorIndice = {
  natilleras: () => almacen().natilleras(),
  natillera: (natilleraId) => almacen().natillera(natilleraId),
  participaciones: (natilleraId) => almacen().participaciones(natilleraId),
};

export type ResultadoRegistro = { ok: true; resultado: ResultadoGuardar } | { ok: false; errores: string[] };

/** Valida lo que mandó el bot y lo guarda. Un error de disco o un índice dañado se lanzan. */
export async function guardarRegistro(tipo: TipoRegistro, cuerpo: unknown): Promise<ResultadoRegistro> {
  const validacion = VALIDADORES[tipo](cuerpo);
  if (!validacion.ok) return validacion;
  const resultado = await almacen().guardar(tipo, validacion.registro as RegistroPorTipo[typeof tipo]);
  return { ok: true, resultado };
}

export function llaveIndice(encabezado: string | null): EstadoLlave {
  return compararLlave(encabezado, process.env.WEB_INDICE_API_KEY);
}
