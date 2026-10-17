// Convierte el registro de la API de pagos (GET /api/registro, esquema Pago de pagos/API.md) en los
// pagos que muestra /pagos (US-007-RPT). Lógica pura: el cliente HTTP vive en pagos-api.ts.
// La forma de cada pago sale de pagos/src/pagos.js (nuevoPago, terminar y pago.etapas.*).

import { ETAPAS, type EstadoPago, type EtapaPago, type NombreEtapa, type Pago, type TipoPago } from "./tipos";

export interface UbicacionReferencia {
  natilleraId: string;
  natilleraNombre: string;
  participanteNombre: string;
}

const DIRECCION: Partial<Record<TipoPago, Pago["direccion"]>> = {
  // Llegan a la billetera del grupo.
  cuota: "entrante",
  deuda: "entrante",
  actividad: "entrante",
  comision: "entrante",
  // Salen hacia la billetera de una persona: premio y liquidación desde la del grupo, desembolso desde la de
  // la financiera y venta desde la del comprador (pagos/src/operaciones.js).
  premio: "saliente",
  liquidacion: "saliente",
  desembolso: "saliente",
  venta: "saliente",
};

const ESTADOS_API = ["en-curso", "completado", "fallido"] as const;
type EstadoApi = (typeof ESTADOS_API)[number];

const DETALLE_SIMULADA = "Simulada: no pasó por Open Payments";
const DETALLE_DETENIDO = "Aquí se detuvo el pago";
const MOTIVO_SIN_DETALLE = "El pago no se pudo hacer";

type Objeto = Record<string, unknown>;

function objeto(valor: unknown): Objeto | null {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor) ? (valor as Objeto) : null;
}

function texto(valor: unknown): string | null {
  return typeof valor === "string" && valor.trim() !== "" ? valor.trim() : null;
}

function numero(valor: unknown): number | null {
  const n = typeof valor === "number" ? valor : typeof valor === "string" && valor.trim() !== "" ? Number(valor) : NaN;
  return Number.isFinite(n) ? n : null;
}

// Los ids de Open Payments son URLs largas: los últimos 8 caracteres bastan para cruzarlos en la Test Wallet.
function corto(id: unknown): string {
  const t = texto(id);
  if (!t) return "sin id";
  return t.length > 8 ? `…${t.slice(-8)}` : t;
}

/** Lo que el participante entiende del motivo: la parte técnica va después de ":" y se omite. */
export function motivoSimple(motivo: unknown): string {
  const t = texto(motivo);
  if (!t) return MOTIVO_SIN_DETALLE;
  const antes = (t.split(":")[0] ?? "").trim();
  return antes || MOTIVO_SIN_DETALLE;
}

function detalleDe(nombre: NombreEtapa, etapa: Objeto): string | undefined {
  if (etapa.simulado === true) return DETALLE_SIMULADA;
  if (nombre === "autorizacion") {
    const permiso = texto(etapa.permisoId);
    if (!permiso) return undefined;
    const tipo = texto(etapa.tipoPermiso);
    return tipo ? `Permiso ${permiso} (${tipo})` : `Permiso ${permiso}`;
  }
  if (nombre === "ejecucion") {
    return `Cobro ${corto(etapa.cobroId)} · Cotización ${corto(etapa.cotizacionId)} · Pago saliente ${corto(etapa.pagoSalienteId)}`;
  }
  return undefined;
}

function etapasDe(crudas: Objeto, estado: EstadoApi, motivo: string | undefined): EtapaPago[] {
  const registro = ETAPAS.map((nombre) => ({ nombre, dato: objeto(crudas[nombre]) }));
  // La primera etapa que falta (sin contar la finalización): la actual si sigue en curso, donde se detuvo si falló.
  const primeraQueFalta = registro.findIndex((r) => r.nombre !== "finalizacion" && r.dato === null);

  return registro.map(({ nombre, dato }, i): EtapaPago => {
    const fecha = dato ? texto(dato.en) : null;
    if (nombre === "finalizacion") {
      if (estado === "completado") return { nombre, estado: "hecha", fecha };
      if (estado === "fallido") return { nombre, estado: "fallida", fecha, detalle: motivo };
      return { nombre, estado: primeraQueFalta === -1 ? "actual" : "pendiente", fecha: null };
    }
    if (dato) {
      const detalle = detalleDe(nombre, dato);
      return detalle ? { nombre, estado: "hecha", fecha, detalle } : { nombre, estado: "hecha", fecha };
    }
    if (i === primeraQueFalta && estado === "en-curso") return { nombre, estado: "actual", fecha: null };
    if (i === primeraQueFalta && estado === "fallido") return { nombre, estado: "fallida", fecha: null, detalle: DETALLE_DETENIDO };
    return { nombre, estado: "pendiente", fecha: null };
  });
}

function estadoDe(api: EstadoApi, etapas: Objeto): EstadoPago {
  if (api === "completado") return "completado";
  if (api === "fallido") return "fallido";
  return objeto(etapas.autorizacion) ? "autorizado" : "pendiente";
}

function descartar(razon: string, crudo: unknown): null {
  const id = texto(objeto(crudo)?.id);
  console.warn(`[registro-pagos] Se omite un pago del registro${id ? ` (${id})` : ""}: ${razon}`);
  return null;
}

function pagoDe(crudo: unknown, buscar: (referencia: string) => UbicacionReferencia | null): Pago | null {
  const p = objeto(crudo);
  if (!p) return descartar("no es un objeto", crudo);
  const id = texto(p.id);
  const tipoCrudo = texto(p.tipo);
  const creado = texto(p.creado);
  if (!id || !tipoCrudo || !creado) return descartar("le falta id, tipo o creado", crudo);
  if (Number.isNaN(Date.parse(creado))) return descartar(`fecha de creación inválida (${creado})`, crudo);

  const tipo = tipoCrudo as TipoPago;
  const direccion = DIRECCION[tipo];
  // Un tipo que la web no conoce no se disfraza de cuota: se omite y se avisa.
  if (!direccion) return descartar(`tipo desconocido (${tipoCrudo})`, crudo);

  const estadoApi = texto(p.estado);
  if (!estadoApi || !(ESTADOS_API as readonly string[]).includes(estadoApi)) {
    return descartar(`estado desconocido (${estadoApi ?? "vacío"})`, crudo);
  }
  const monto = numero(p.monto);
  if (monto === null) return descartar("monto inválido", crudo);

  const etapasCrudas = objeto(p.etapas) ?? {};
  const estadoPago = estadoApi as EstadoApi;
  const motivo = estadoPago === "fallido" ? motivoSimple(objeto(etapasCrudas.finalizacion)?.motivo) : undefined;
  const simulado = p.simulado === true || ETAPAS.some((n) => objeto(etapasCrudas[n])?.simulado === true);

  const referencia = texto(p.referencia) ?? "";
  // Una referencia de crédito o de actividad no se encuentra entre las participaciones: es normal.
  const ubicacion = (referencia ? buscar(referencia) : null) ?? {
    natilleraId: "",
    natilleraNombre: "Sin identificar",
    participanteNombre: referencia || "Sin referencia",
  };

  const pago: Pago = {
    id,
    tipo,
    natilleraId: ubicacion.natilleraId,
    natilleraNombre: ubicacion.natilleraNombre,
    participanteNombre: ubicacion.participanteNombre,
    direccion,
    monto,
    estado: estadoDe(estadoPago, etapasCrudas),
    etapas: etapasDe(etapasCrudas, estadoPago, motivo),
    simulado,
    creado,
  };
  if (motivo) pago.motivo = motivo;
  return pago;
}

/** Pagos del registro de la API de pagos, del más reciente al más antiguo. Un elemento malformado se omite sin tumbar los demás. */
export function pagosDelRegistro(crudos: unknown[], buscar: (referencia: string) => UbicacionReferencia | null): Pago[] {
  return crudos
    .map((crudo) => pagoDe(crudo, buscar))
    .filter((p): p is Pago => p !== null)
    .sort((a, b) => Date.parse(b.creado) - Date.parse(a.creado));
}
