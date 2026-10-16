// Capa de datos contra el servicio externo de staging (#53). La lista sale del índice (lib/indice) porque
// staging no lista nada; el estado de cada contrato sale de GET /api/contracts/{contractId}.
// Sin "server-only" aquí: las pruebas lo importan, y la barrera para el navegador es index.ts.

import type { LectorIndice, RegistroNatillera, RegistroParticipacion } from "@/lib/indice/tipos";

import { bitacoraDeNatillera } from "./bitacora-staging";
import { leerEventos, type EventoContrato } from "./eventos-staging";
import { ErrorServicio } from "./http";
import { pagosDeParticipacion } from "./pagos-staging";
import type {
  EstadoNatillera,
  EstadoParticipante,
  FechaISO,
  Natillera,
  NatilleraResumen,
  Participante,
  Periodicidad,
  Servicio,
} from "./tipos";

export interface OpcionesStaging {
  urlBase: string;
  token: string;
  indice: LectorIndice;
  fetch?: typeof fetch;
}

/** Campos de currentStateRaw (o de currentStateLabels): nombre del campo → valor tal como venga. */
type Campos = Record<string, unknown>;

interface Contrato {
  raw: Campos;
  labels: Campos;
}

const TIEMPO_LIMITE_MS = 10_000;
// /api/pagos se consulta cada 3 s y cada consulta lee las natilleras dos veces (natillerasVisibles y
// listarPagos): sin esto son N·(3M+2) GET por refresco. Corto para que un pago nuevo se vea enseguida.
const CACHE_MS = 2_000;

// Staging manda { type, value, assigned } (visto el 16 oct); se acepta también el valor crudo (5000, "ACTIVA")
// o como texto numérico ("5000"), por si otro contrato o versión del motor lo manda así.

/** Quita el envoltorio { type, value } si lo trae. */
export function valorPlano(valor: unknown): unknown {
  if (valor !== null && typeof valor === "object" && "value" in valor) return (valor as { value: unknown }).value;
  return valor;
}

export function leerNumero(valor: unknown): number | undefined {
  const v = valorPlano(valor);
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v.trim());
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

export function leerTexto(valor: unknown): string | undefined {
  const v = valorPlano(valor);
  if (typeof v === "string") return v.trim() === "" ? undefined : v.trim();
  if (typeof v === "number") return String(v);
  return undefined;
}

/** "2026-10-16" → "2026-10-16T17:00:00Z" (mediodía de Bogotá, UTC-5): a medianoche UTC, @/lib/fechas
 *  mostraría el día anterior. Si ya trae hora, se deja igual. */
export function fechaStaging(valor: unknown): FechaISO | undefined {
  const texto = leerTexto(valor);
  if (!texto) return undefined;
  // El motor devuelve un Date como "2026-11-01T00:00:00" (visto en staging el 16 oct): medianoche
  // sin zona, que JavaScript lee en la hora local del servidor y en UTC sería el día anterior en Bogotá.
  const dia = /^(\d{4}-\d{2}-\d{2})(T00:00:00(\.0+)?Z?)?$/.exec(texto);
  return dia ? `${dia[1]}T17:00:00Z` : texto;
}

/** En staging un Percentage es una fracción (1 % = 0.01). Redondeado a 2 decimales: 0.025 → 2.5, no 2.4999999. */
export function porcentajeDeFraccion(fraccion: number): number {
  return Math.round(fraccion * 100 * 100) / 100;
}

// Mapeo de estados de staging a los del design system (decisión del director, #53):
// REEMBOLSANDO se muestra como liquidando y CERRADA_SIN_CUPO como cerrada; en la participación,
// EN_LIQUIDACION y EN_REEMBOLSO siguen "activo" hasta que terminan, y REEMBOLSADA es "liquidado".
// El índice del arreglo es el valor numérico de la máquina de estados de staging.
const ESTADOS_NATILLERA: readonly [string, EstadoNatillera][] = [
  ["CREADA", "creada"],
  ["INICIADA", "iniciada"],
  ["ACTIVA", "activa"],
  ["LIQUIDANDO", "liquidando"],
  ["REEMBOLSANDO", "liquidando"],
  ["CERRADA", "cerrada"],
  ["CERRADA_SIN_CUPO", "cerrada"],
];

const ESTADOS_PARTICIPACION: readonly [string, EstadoParticipante][] = [
  ["PENDIENTE_VALIDACION", "por_validar"],
  ["VALIDADA", "validado"],
  ["ACTIVA", "activo"],
  ["MORA", "en_mora"],
  ["EN_LIQUIDACION", "activo"],
  ["EN_REEMBOLSO", "activo"],
  ["LIQUIDADA", "liquidado"],
  ["REEMBOLSADA", "liquidado"],
];

/** Acepta el número (2, "2") o el nombre ("ACTIVA"). Desconocido → null. */
function buscarEstado<T>(tabla: readonly [string, T][], valor: unknown): T | null {
  const n = leerNumero(valor);
  if (n !== undefined) return Number.isInteger(n) ? (tabla[n]?.[1] ?? null) : null;
  const nombre = leerTexto(valor)?.toUpperCase();
  return tabla.find(([clave]) => clave === nombre)?.[1] ?? null;
}

/** Un estado desconocido no tumba la pantalla: se registra y se muestra el neutro del grupo. */
export function estadoNatillera(valor: unknown): EstadoNatillera {
  const estado = buscarEstado(ESTADOS_NATILLERA, valor);
  if (estado) return estado;
  console.error(`EstadoNatillera desconocido en staging: ${JSON.stringify(valorPlano(valor))}`);
  return "creada";
}

export function estadoParticipacion(valor: unknown): EstadoParticipante {
  const estado = buscarEstado(ESTADOS_PARTICIPACION, valor);
  if (estado) return estado;
  console.error(`EstadoParticipacion desconocido en staging: ${JSON.stringify(valorPlano(valor))}`);
  return "por_validar";
}

/** Staging solo tiene meses; quincenal no existe allí. */
export function periodicidad(valor: unknown): Periodicidad {
  const meses = leerNumero(valor);
  if (meses !== 1) console.warn(`PeriodicidadMeses inesperada en staging: ${JSON.stringify(valorPlano(valor))}; se muestra mensual`);
  return "mensual";
}

/** El estado se lee de currentStateRaw; si no viene, de currentStateLabels (que trae el nombre). */
function campoEstado(c: Contrato, campo: string): unknown {
  return c.raw[campo] ?? c.labels[campo];
}

/** Un monto o conteo que falta se muestra como 0, pero queda registrado: un $0 parece un dato real. */
function numero(c: Contrato, campo: string): number {
  const n = leerNumero(c.raw[campo]);
  if (n === undefined) console.warn(`Staging no trae ${campo}: se muestra 0`);
  return n ?? 0;
}

function comoCampos(valor: unknown): Campos {
  return valor !== null && typeof valor === "object" && !Array.isArray(valor) ? (valor as Campos) : {};
}

/** Junta los resultados de cada elemento; uno que falla se omite con registro (no tumba la pantalla
 *  frente al jurado). Si fallan todos, se lanza el primer error para que la pantalla lo diga. */
async function reunir<T, R>(que: string, elementos: T[], armar: (elemento: T) => Promise<R[]>): Promise<R[]> {
  const resultados = await Promise.allSettled(elementos.map(armar));
  const fallas = resultados.flatMap((r) => (r.status === "rejected" ? [r.reason as unknown] : []));
  for (const f of fallas) console.error(`Se omitió una parte de ${que}: ${f instanceof Error ? f.message : String(f)}`);
  if (elementos.length > 0 && fallas.length === elementos.length) throw fallas[0];
  return resultados.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}

export function crearServicioStaging(opciones: OpcionesStaging): Servicio {
  const base = opciones.urlBase.replace(/\/+$/, "");
  const { token, indice } = opciones;
  const pedirHttp = opciones.fetch ?? fetch;

  /** Ningún mensaje que salga de aquí puede llevar el token, aunque venga en un error de red. */
  function sinToken(texto: string): string {
    return token ? texto.split(token).join("<token>") : texto;
  }

  /** null si staging responde 404 (el contrato no existe). */
  async function leerContrato(contractId: string): Promise<Contrato | null> {
    const cuerpo = await pedirJson(`/api/contracts/${encodeURIComponent(contractId)}`);
    if (cuerpo === null) return null;
    const c = comoCampos(cuerpo);
    return { raw: comoCampos(c.currentStateRaw), labels: comoCampos(c.currentStateLabels) };
  }

  /** Un contrato que no existe da lista vacía (con registro), como en las lecturas de estado. */
  async function eventosDe(contractId: string): Promise<EventoContrato[]> {
    const cuerpo = await pedirJson(`/api/contracts/${encodeURIComponent(contractId)}/events`);
    if (cuerpo === null) console.error(`Contrato ${contractId} sin eventos en staging: no existe`);
    return leerEventos(contractId, cuerpo);
  }

  const cache = new Map<string, { hasta: number; cuerpo: Promise<unknown> }>();

  /** El cuerpo JSON de un GET a staging; null si responde 404. Reusa la misma respuesta por CACHE_MS. */
  function pedirJson(ruta: string): Promise<unknown> {
    const ahora = Date.now();
    const guardado = cache.get(ruta);
    if (guardado && guardado.hasta > ahora) return guardado.cuerpo;
    const cuerpo = pedirJsonSinCache(ruta);
    cache.set(ruta, { hasta: ahora + CACHE_MS, cuerpo });
    // Un fallo no se guarda: el siguiente refresco lo vuelve a intentar.
    cuerpo.catch(() => {
      if (cache.get(ruta)?.cuerpo === cuerpo) cache.delete(ruta);
    });
    return cuerpo;
  }

  async function pedirJsonSinCache(ruta: string): Promise<unknown> {
    let res: Response;
    try {
      res = await pedirHttp(`${base}${ruta}`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(TIEMPO_LIMITE_MS),
      });
    } catch (e) {
      const motivo = e instanceof Error && e.name === "TimeoutError" ? "no respondió en 10 s" : `no se pudo conectar (${e instanceof Error ? e.message : String(e)})`;
      throw new ErrorServicio(sinToken(`Staging ${motivo} en ${ruta}`));
    }
    if (res.status === 404) return null;
    if (!res.ok) throw new ErrorServicio(sinToken(`Staging respondió ${res.status} en ${ruta}`), res.status);
    try {
      return (await res.json()) as unknown;
    } catch {
      throw new ErrorServicio(sinToken(`Staging respondió algo que no es JSON en ${ruta}`), res.status);
    }
  }

  /** Las participaciones cuyo contrato no existe en staging se omiten (con registro), igual que las natilleras. */
  async function leerParticipaciones(natilleraId: string) {
    const registros = await indice.participaciones(natilleraId);
    const contratos = await Promise.all(registros.map((p) => leerContrato(p.contractId)));
    const encontradas: { registro: RegistroParticipacion; contrato: Contrato }[] = [];
    registros.forEach((registro, i) => {
      const contrato = contratos[i];
      if (contrato) encontradas.push({ registro, contrato });
      else console.error(`Participación ${registro.participacionId} sin contrato en staging (${registro.contractId}): se omite`);
    });
    return { registros, encontradas };
  }

  /** Parámetro con el que se crea el contrato: si falta, el dato está mal y no se inventa un 0. */
  function numeroObligatorio(c: Contrato, campo: string, registro: RegistroNatillera): number {
    const n = leerNumero(c.raw[campo]);
    if (n !== undefined) return n;
    throw new ErrorServicio(`La natillera ${registro.natilleraId} no tiene ${campo} en staging.`);
  }

  /** La especificación solo lo declara en `natillera-participacion`, pero la cuenta lo calcula (visto el
   *  16 oct): se toma de la cuenta y, si no lo trae, de sus participaciones. Sin ninguna, 0 y queda registrado. */
  function cuotasTotales(c: Contrato, participaciones: { contrato: Contrato }[]): number {
    const deLaCuenta = leerNumero(c.raw.NumeroCuotas);
    if (deLaCuenta !== undefined) return deLaCuenta;
    for (const p of participaciones) {
      const n = leerNumero(p.contrato.raw.NumeroCuotas);
      if (n !== undefined) return n;
    }
    console.warn("Ni la cuenta ni sus participaciones traen NumeroCuotas: se muestra 0");
    return 0;
  }

  function fechaObligatoria(c: Contrato, campo: string, registro: RegistroNatillera): FechaISO {
    const fecha = fechaStaging(c.raw[campo]);
    if (fecha) return fecha;
    // Es un parámetro obligatorio del contrato: si falta, el dato está mal. Mostrar otra fecha
    // engañaría a quien mira; mejor un error que lo diga.
    throw new ErrorServicio(`La natillera ${registro.natilleraId} no tiene ${campo} en staging.`);
  }

  function resumen(registro: RegistroNatillera, c: Contrato, participaciones: Awaited<ReturnType<typeof leerParticipaciones>>): NatilleraResumen {
    return {
      id: registro.natilleraId,
      nombre: leerTexto(c.raw.NombreNatillera) ?? registro.nombre,
      estado: estadoNatillera(campoEstado(c, "EstadoNatillera")),
      administrador: registro.administrador.nombre,
      // Con esto el control de acceso reconoce al administrador (lib/sesion/acceso.ts).
      administradorTelegramId: registro.administrador.telegramId,
      valorCuota: numeroObligatorio(c, "ValorCuota", registro),
      periodicidad: periodicidad(c.raw.PeriodicidadMeses),
      fechaInicio: fechaObligatoria(c, "FechaInicio", registro),
      fechaFinal: fechaObligatoria(c, "FechaFinal", registro),
      cuotasTotales: cuotasTotales(c, participaciones.encontradas),
      periodoActual: numero(c, "PeriodoActual"),
      cupoMinimo: numero(c, "CupoMinimo"),
      // Las mismas que muestra el detalle: sin las que no tienen contrato en staging.
      numeroParticipantes: participaciones.encontradas.length,
      participantesEnMora: participaciones.encontradas.filter(
        (p) => estadoParticipacion(campoEstado(p.contrato, "EstadoParticipacion")) === "en_mora",
      ).length,
      saldoCustodia: numero(c, "SaldoNatillera"),
      proximoCobro: fechaStaging(c.raw.FechaProximoCobro) ?? null,
    };
  }

  function participante({ registro, contrato: c }: { registro: RegistroParticipacion; contrato: Contrato }): Participante {
    return {
      id: registro.participacionId,
      nombre: registro.nombre,
      billetera: leerTexto(c.raw.WalletParticipante) ?? registro.billetera,
      estado: estadoParticipacion(campoEstado(c, "EstadoParticipacion")),
      cuotasPagadas: numero(c, "CuotasPagadas"),
      aportado: numero(c, "TotalAportado"),
      deuda: numero(c, "DeudaCuotas") + numero(c, "MoraAcumulada"),
    };
  }

  async function armar(registro: RegistroNatillera) {
    const [contrato, participaciones] = await Promise.all([leerContrato(registro.contractId), leerParticipaciones(registro.natilleraId)]);
    if (!contrato) {
      console.error(`Natillera ${registro.natilleraId} sin contrato en staging (${registro.contractId}): se omite`);
      return null;
    }
    return { contrato, participaciones };
  }

  const sinConectar = async (): Promise<never> => {
    throw new ErrorServicio("Esta pantalla todavía no está conectada a staging (#53).");
  };

  return {
    async listarNatilleras() {
      const registros = await indice.natilleras();
      // Una natillera con un dato malo o un contrato que falla no tumba la lista de las demás:
      // se omite y queda registrada. Si fallan todas, el error se ve en la pantalla.
      const armadas = await Promise.allSettled(registros.map(async (r) => {
        const a = await armar(r);
        return a ? resumen(r, a.contrato, a.participaciones) : null;
      }));
      const fallas = armadas.flatMap((a, i) => (a.status === "rejected" ? [{ id: registros[i]?.natilleraId, motivo: a.reason }] : []));
      for (const f of fallas) console.error(`Natillera ${f.id} omitida de la lista: ${f.motivo instanceof Error ? f.motivo.message : String(f.motivo)}`);
      if (registros.length > 0 && fallas.length === registros.length) throw fallas[0]?.motivo;
      return armadas.flatMap((a) => (a.status === "fulfilled" && a.value ? [a.value] : []));
    },
    async obtenerNatillera(id): Promise<Natillera | null> {
      const registro = await indice.natillera(id);
      if (!registro) return null;
      const a = await armar(registro);
      if (!a) return null;
      return {
        ...resumen(registro, a.contrato, a.participaciones),
        moraDiariaPct: porcentajeDeFraccion(numero(a.contrato, "PorcentajeMoraDiaria")),
        billeteraGrupo: registro.billeteraGrupo ?? "Por registrar",
        participantes: a.participaciones.encontradas.map(participante),
      };
    },
    listarSolicitudesCredito: sinConectar,
    responderSolicitud: sinConectar,
    async listarPagos() {
      return reunir("pagos", await indice.natilleras(), async (registro) => {
        const a = await armar(registro);
        if (!a) return [];
        const natillera = { id: registro.natilleraId, nombre: leerTexto(a.contrato.raw.NombreNatillera) ?? registro.nombre };
        const valorCuota = numeroObligatorio(a.contrato, "ValorCuota", registro);
        return reunir(`pagos de ${registro.natilleraId}`, a.participaciones.encontradas, async ({ registro: p, contrato }) =>
          pagosDeParticipacion({
            natillera,
            participanteNombre: p.nombre,
            valorCuota,
            deudaActual: numero(contrato, "DeudaCuotas") + numero(contrato, "MoraAcumulada"),
            eventos: await eventosDe(p.contractId),
          }));
      }).then((pagos) => pagos.sort((x, y) => y.creado.localeCompare(x.creado)));
    },
    async listarBitacora() {
      return reunir("bitácora", await indice.natilleras(), async (registro) => {
        const [contrato, eventosCuenta, actividades] = await Promise.all([
          leerContrato(registro.contractId),
          eventosDe(registro.contractId),
          indice.actividades(registro.natilleraId),
        ]);
        if (!contrato) return [];
        // Si fallan las actividades, la bitácora de la natillera igual se muestra con lo de la cuenta.
        const conEventos = await reunir(`actividades de ${registro.natilleraId}`, actividades, async (r) => [{ registro: r, eventos: await eventosDe(r.contractId) }])
          .catch((e: unknown) => {
            console.error(`Bitácora de ${registro.natilleraId} sin actividades: ${e instanceof Error ? e.message : String(e)}`);
            return [];
          });
        return bitacoraDeNatillera({
          natillera: {
            id: registro.natilleraId,
            nombre: leerTexto(contrato.raw.NombreNatillera) ?? registro.nombre,
            administrador: registro.administrador.nombre,
            valorCuota: numeroObligatorio(contrato, "ValorCuota", registro),
          },
          eventosCuenta,
          actividades: conEventos,
        });
      }).then((eventos) => eventos.sort((x, y) => y.fecha.localeCompare(x.fecha)));
    },
  };
}
