import { describe, expect, it } from "vitest";

import type { LectorIndice, RegistroNatillera } from "@/lib/indice/tipos";

import { ADMINISTRADOR_SIN_REGISTRAR, combinarConIndice, leerPaginaTabla } from "./tabla-staging";

// Respuesta real de staging del 16 oct, recortada a una fila.
const PAGINA_REAL = {
  items: [
    {
      contractId: "b7bd12e2-0bb4-4c91-8be9-0fbebacb392c",
      createdAt: "2026-10-16T22:15:24.5091414Z",
      concepts: { NatilleraId: "nat-915ee453-4ab1-408f-a10c-71e829de7ba4", NombreNatillera: "los amigos", EstadoNatillera: "0" },
      lastModifiedAt: "2026-10-16T23:04:35.1899962Z",
      eventCount: 5,
      conceptLabels: { EstadoNatillera: "CREADA" },
    },
  ],
  totalCount: 1,
  hasMore: false,
};

const vacio: LectorIndice = { natilleras: async () => [], natillera: async () => null, participaciones: async () => [], actividades: async () => [] };

describe("leerPaginaTabla", () => {
  it("lee las filas reales y si hay más", () => {
    const { filas, hayMas } = leerPaginaTabla(PAGINA_REAL);
    expect(hayMas).toBe(false);
    expect(filas).toEqual([{ contractId: "b7bd12e2-0bb4-4c91-8be9-0fbebacb392c", creadoEn: "2026-10-16T22:15:24.5091414Z", conceptos: PAGINA_REAL.items[0]!.concepts }]);
  });

  it("descarta lo que no tiene contractId y tolera una respuesta rara", () => {
    expect(leerPaginaTabla({ items: [{ concepts: {} }], hasMore: true })).toEqual({ filas: [], hayMas: true });
    expect(leerPaginaTabla(null)).toEqual({ filas: [], hayMas: false });
  });
});

describe("combinarConIndice", () => {
  const motor = {
    natilleras: leerPaginaTabla(PAGINA_REAL).filas,
    participaciones: [{ contractId: "c-p", creadoEn: "", conceptos: { ParticipacionId: "par-1", NatilleraId: "nat-915ee453-4ab1-408f-a10c-71e829de7ba4", ParticipanteId: "900000001", WalletParticipante: "https://ilp.interledger-test.dev/prueba-tabla" } }],
    actividades: [],
  };

  it("sin índice, el administrador queda «Sin registrar» y la persona con su id de Telegram", async () => {
    const l = combinarConIndice(motor, vacio);
    const [n] = await l.natilleras();
    expect(n).toMatchObject({ natilleraId: "nat-915ee453-4ab1-408f-a10c-71e829de7ba4", nombre: "los amigos", administrador: { telegramId: "", nombre: ADMINISTRADOR_SIN_REGISTRAR } });
    expect(await l.participaciones(n!.natilleraId)).toEqual([
      { natilleraId: n!.natilleraId, participacionId: "par-1", contractId: "c-p", nombre: "Telegram 900000001", telegramId: "900000001", billetera: "https://ilp.interledger-test.dev/prueba-tabla" },
    ]);
    expect(await l.participaciones("otra")).toEqual([]);
  });

  it("el registro del índice gana, y lo que solo está en el índice se conserva", async () => {
    const delIndice: RegistroNatillera = { natilleraId: "nat-915ee453-4ab1-408f-a10c-71e829de7ba4", contractId: "b7bd12e2-0bb4-4c91-8be9-0fbebacb392c", nombre: "Los amigos", administrador: { telegramId: "77", nombre: "Estiven" }, creadaEn: "2026-10-16T22:15:24Z" };
    const soloIndice: RegistroNatillera = { ...delIndice, natilleraId: "vieja", contractId: "c-vieja" };
    const l = combinarConIndice(motor, { ...vacio, natilleras: async () => [delIndice, soloIndice], natillera: async (id) => (id === "vieja" ? soloIndice : null) });
    expect((await l.natilleras()).map((n) => [n.natilleraId, n.administrador.nombre])).toEqual([
      ["nat-915ee453-4ab1-408f-a10c-71e829de7ba4", "Estiven"],
      ["vieja", "Estiven"],
    ]);
    expect(await l.natillera("vieja")).toBe(soloIndice);
    expect((await l.natillera("nat-915ee453-4ab1-408f-a10c-71e829de7ba4"))?.nombre).toBe("los amigos");
  });
});
