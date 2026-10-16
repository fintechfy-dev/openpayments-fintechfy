import type { ReactNode } from "react";
import { Icono } from "./Icono";
import type { NombreIcono } from "@/lib/natillera";

type Tipo = "exito" | "alerta" | "error" | "info";

const ICONO: Record<Tipo, NombreIcono> = { exito: "check", alerta: "reloj", error: "alerta", info: "candado" };

interface Props {
  tipo: Tipo;
  titulo: string;
  children?: ReactNode;
  /** false cuando el aviso va dentro de una región viva que ya existe (para no anunciarlo dos veces). */
  anunciar?: boolean;
}

/** Aviso en línea. El título dice qué pasó; el texto, qué sigue. role="alert" solo para errores. */
export function Aviso({ tipo, titulo, children, anunciar = true }: Props) {
  const rol = anunciar ? (tipo === "error" ? "alert" : "status") : undefined;
  return (
    <div className={`nt-aviso nt-aviso--${tipo}`} role={rol}>
      <Icono nombre={ICONO[tipo]} />
      <div>
        <p className="nt-aviso__titulo">{titulo}</p>
        {children ? <div className="nt-aviso__texto">{children}</div> : null}
      </div>
    </div>
  );
}
