import { ESTADOS, type EstadoDe, type TipoEstado } from "@/lib/natillera";
import { Icono } from "./Icono";

interface Props<T extends TipoEstado> {
  tipo: T;
  estado: EstadoDe<T>;
}

/** Estado con ícono + palabra (nunca solo color). Ver design-system/docs/estados.md. */
export function Badge<T extends TipoEstado>({ tipo, estado }: Props<T>) {
  const def = ESTADOS[tipo][estado] as { variante: string; icono: Parameters<typeof Icono>[0]["nombre"]; texto: string };
  return (
    <span className={`nt-badge nt-badge--${def.variante}`}>
      <Icono nombre={def.icono} />
      {def.texto}
    </span>
  );
}
