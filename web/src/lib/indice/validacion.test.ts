import { describe, expect, it } from "vitest";
import { esTipoRegistro, validarActividad, validarNatillera, validarParticipacion, validarSolicitud } from "./validacion";

const natillera = {
  natilleraId: "nat_01",
  contractId: "natillera-cuenta:abc.123",
  nombre: "  Los del barrio  ",
  administrador: { telegramId: "123456", nombre: "Andrés" },
  creadaEn: "2026-10-16T09:00:00-05:00",
};
const participacion = { natilleraId: "nat_01", participacionId: "par-1", contractId: "c1", nombre: "Luz", telegramId: "999", billetera: "https://ilp.interledger-test.dev/luz" };
const actividad = { natilleraId: "nat_01", actividadId: "act1", contractId: "c2", descripcion: "Rifa", obligaciones: [{ participacionId: "par-1", contractId: "c3" }] };
const solicitud = { solicitudId: "sol1", natilleraId: "nat_01", participacionId: "par-1", montoMaximo: 500000, montoSolicitado: 300000, plazoMeses: 3, fechaSolicitud: "2026-10-16" };

const errores = (r: { ok: boolean; errores?: string[] }) => (r.ok ? [] : r.errores!);

describe("validación del índice: casos buenos", () => {
  it("natillera: recorta textos y deja solo los campos del tipo", () => {
    const r = validarNatillera({ ...natillera, extra: "x", administrador: { ...natillera.administrador, rol: "jefe" } });
    expect(r).toEqual({ ok: true, registro: { ...natillera, nombre: "Los del barrio" } });
  });

  it("natillera con billeteraGrupo; null cuenta como que no vino", () => {
    expect(validarNatillera({ ...natillera, billeteraGrupo: "https://w/grupo" })).toMatchObject({ ok: true, registro: { billeteraGrupo: "https://w/grupo" } });
    const sin = validarNatillera({ ...natillera, billeteraGrupo: null });
    expect(sin.ok && "billeteraGrupo" in sin.registro).toBe(false);
  });

  it("participación, actividad y solicitud descartan campos de más", () => {
    expect(validarParticipacion({ ...participacion, saldo: 1 })).toEqual({ ok: true, registro: participacion });
    expect(validarActividad({ ...actividad, estado: "abierta", obligaciones: [{ ...actividad.obligaciones[0], monto: 5 }] })).toEqual({ ok: true, registro: actividad });
    expect(validarSolicitud({ ...solicitud, aprobado: true })).toEqual({ ok: true, registro: solicitud });
  });

  it("acepta una actividad sin obligaciones y los límites exactos", () => {
    expect(validarActividad({ ...actividad, obligaciones: [] }).ok).toBe(true);
    const obligaciones = Array.from({ length: 100 }, () => actividad.obligaciones[0]);
    expect(validarActividad({ ...actividad, obligaciones }).ok).toBe(true);
    expect(validarNatillera({ ...natillera, natilleraId: "a".repeat(64), contractId: "b".repeat(128), nombre: "n".repeat(200) }).ok).toBe(true);
    expect(validarParticipacion({ ...participacion, billetera: "w".repeat(300) }).ok).toBe(true);
  });

  it("reconoce solo los cuatro tipos", () => {
    expect(["natilleras", "participaciones", "actividades", "solicitudes"].every(esTipoRegistro)).toBe(true);
    expect(esTipoRegistro("pagos")).toBe(false);
    expect(esTipoRegistro("__proto__")).toBe(false);
  });
});

describe("validación del índice: cada regla mala", () => {
  it("el cuerpo tiene que ser un objeto", () => {
    for (const malo of [null, "texto", 3, [natillera]]) expect(errores(validarNatillera(malo))).toHaveLength(1);
  });

  it("ids con el patrón", () => {
    expect(errores(validarNatillera({ ...natillera, natilleraId: "con espacio" }))[0]).toMatch(/^natilleraId: debe tener de 1 a 64/);
    expect(errores(validarNatillera({ ...natillera, natilleraId: "a".repeat(65) }))[0]).toMatch(/^natilleraId:/);
    expect(errores(validarNatillera({ ...natillera, natilleraId: "" }))[0]).toMatch(/^natilleraId:/);
    expect(errores(validarNatillera({ ...natillera, natilleraId: 7 }))).toEqual(["natilleraId: falta o no es texto."]);
    expect(errores(validarParticipacion({ ...participacion, participacionId: "ñ" }))[0]).toMatch(/^participacionId:/);
    expect(errores(validarActividad({ ...actividad, actividadId: "a/b" }))[0]).toMatch(/^actividadId:/);
    expect(errores(validarSolicitud({ ...solicitud, solicitudId: "a.b" }))[0]).toMatch(/^solicitudId:/);
  });

  it("contractId: de 1 a 128 caracteres permitidos", () => {
    expect(errores(validarNatillera({ ...natillera, contractId: "b".repeat(129) }))[0]).toMatch(/^contractId: debe tener de 1 a 128/);
    expect(errores(validarNatillera({ ...natillera, contractId: "a b" }))[0]).toMatch(/^contractId:/);
    expect(errores(validarNatillera({ ...natillera, contractId: "" }))[0]).toMatch(/^contractId:/);
  });

  it("textos no vacíos y con máximo", () => {
    expect(errores(validarNatillera({ ...natillera, nombre: "   " }))).toEqual(["nombre: no puede estar vacío."]);
    expect(errores(validarNatillera({ ...natillera, nombre: "n".repeat(201) }))).toEqual(["nombre: tiene 201 caracteres; el máximo es 200."]);
    expect(errores(validarParticipacion({ ...participacion, billetera: "w".repeat(301) }))[0]).toMatch(/^billetera: .*300/);
    expect(errores(validarNatillera({ ...natillera, billeteraGrupo: "w".repeat(301) }))[0]).toMatch(/^billeteraGrupo: .*300/);
    expect(errores(validarNatillera({ ...natillera, billeteraGrupo: "" }))[0]).toMatch(/^billeteraGrupo:/);
    expect(errores(validarParticipacion({ ...participacion, telegramId: 999 }))).toEqual(["telegramId: falta o no es texto."]);
  });

  it("administrador: objeto con sus campos", () => {
    expect(errores(validarNatillera({ ...natillera, administrador: "Andrés" }))).toEqual(["administrador: falta o no es un objeto."]);
    expect(errores(validarNatillera({ ...natillera, administrador: { telegramId: "1", nombre: "" } }))).toEqual(["administrador.nombre: no puede estar vacío."]);
  });

  it("montos y plazo: finitos y mayores que 0; plazo entero", () => {
    expect(errores(validarSolicitud({ ...solicitud, montoMaximo: 0 }))).toEqual(["montoMaximo: debe ser mayor que 0."]);
    expect(errores(validarSolicitud({ ...solicitud, montoSolicitado: -1 }))).toEqual(["montoSolicitado: debe ser mayor que 0."]);
    expect(errores(validarSolicitud({ ...solicitud, montoSolicitado: "300000" }))).toEqual(["montoSolicitado: falta o no es un número."]);
    expect(errores(validarSolicitud({ ...solicitud, montoMaximo: Infinity }))).toEqual(["montoMaximo: falta o no es un número."]);
    expect(errores(validarSolicitud({ ...solicitud, montoMaximo: NaN }))).toEqual(["montoMaximo: falta o no es un número."]);
    expect(errores(validarSolicitud({ ...solicitud, plazoMeses: 2.5 }))).toEqual(["plazoMeses: debe ser un número entero."]);
  });

  it("fechas que Date.parse entienda", () => {
    expect(errores(validarNatillera({ ...natillera, creadaEn: "ayer" }))[0]).toMatch(/^creadaEn: no es una fecha válida/);
    expect(errores(validarSolicitud({ ...solicitud, fechaSolicitud: 1760000000 }))).toEqual(["fechaSolicitud: falta o no es texto."]);
  });

  it("obligaciones: lista de máximo 100 con elementos válidos", () => {
    const muchas = Array.from({ length: 101 }, () => actividad.obligaciones[0]);
    expect(errores(validarActividad({ ...actividad, obligaciones: muchas }))).toEqual(["obligaciones: tiene 101 elementos; el máximo es 100."]);
    expect(errores(validarActividad({ ...actividad, obligaciones: "par-1" }))).toEqual(["obligaciones: falta o no es una lista."]);
    expect(errores(validarActividad({ ...actividad, obligaciones: [5, { participacionId: "x y", contractId: "c" }] }))).toEqual([
      "obligaciones[0]: no es un objeto.",
      expect.stringMatching(/^obligaciones\[1\]\.participacionId:/),
    ]);
  });

  it("junta todos los errores, no solo el primero", () => {
    expect(errores(validarSolicitud({}))).toHaveLength(7);
  });
});
