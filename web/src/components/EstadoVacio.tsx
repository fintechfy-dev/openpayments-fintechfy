import type { ReactNode } from "react";
import type { NombreIcono } from "@/lib/natillera";
import { Icono } from "./Icono";

/** Qué ve la persona cuando una lista no tiene nada todavía. */
export function EstadoVacio({ icono, titulo, children }: { icono: NombreIcono; titulo: string; children?: ReactNode }) {
  return (
    <div className="estado-vacio nt-card">
      <Icono nombre={icono} tamano="lg" />
      <p className="estado-vacio__titulo">{titulo}</p>
      {children ? <p className="nt-muted">{children}</p> : null}
    </div>
  );
}
