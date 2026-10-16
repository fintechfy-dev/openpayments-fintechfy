import { describe, expect, it } from "vitest";
import type { EventoBitacora } from "@/lib/servicio/tipos";
import { ordenarBitacora, tipoActor } from "./bitacora";

const evento = (id: string, fecha: string, actor = "Gloria Patiño"): EventoBitacora => ({
  id,
  natilleraId: "n",
  natilleraNombre: "Los Primos",
  actor,
  accion: "Creó una actividad",
  detalle: "Rifa",
  fecha,
});

describe("bitácora", () => {
  it("distingue las acciones automáticas, de la financiera y del administrador", () => {
    expect(tipoActor("Sistema")).toBe("sistema");
    expect(tipoActor("Financiera Aliada")).toBe("financiera");
    expect(tipoActor("Andrés Restrepo")).toBe("administrador");
  });

  it("muestra primero lo más reciente sin cambiar la lista original", () => {
    const original = [evento("a", "2026-01-02T15:00:00Z"), evento("b", "2026-10-10T21:00:00Z"), evento("c", "2026-06-01T14:10:00Z")];
    expect(ordenarBitacora(original).map((e) => e.id)).toEqual(["b", "c", "a"]);
    expect(original.map((e) => e.id)).toEqual(["a", "b", "c"]);
  });
});
