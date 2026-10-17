import { ESTADOS, type EstadoDe, type TipoEstado } from "@/lib/natillera";
import { Icono } from "./Icono";

interface Props<T extends TipoEstado> {
  tipo: T;
  estado: EstadoDe<T>;
}

/** Estado con ícono + palabra (nunca solo color). Ver design-system/docs/estados.md. */
// Si el servicio externo manda un estado que la web todavía no conoce, se muestra neutro con su nombre
// en vez de tumbar toda la página (y el registro de pagos que se refresca solo).
export function Badge<T extends TipoEstado>({ tipo, estado }: Props<T>) {
  const conocido = (ESTADOS[tipo] as Record<string, { variante: string; icono: Parameters<typeof Icono>[0]["nombre"]; texto: string } | undefined>)[
    String(estado)
  ];
  const def = conocido ?? { variante: "neutro", icono: "punto" as const, texto: String(estado).replace(/_/g, " ") };
  return (
    <span className={`nt-badge nt-badge--${def.variante}`}>
      <Icono nombre={def.icono} />
      {def.texto}
    </span>
  );
}
