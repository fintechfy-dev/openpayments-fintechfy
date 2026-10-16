import type { ReactNode } from "react";

interface Props {
  titulo: string;
  descripcion?: ReactNode;
  /** Acciones o badges a la derecha (abajo en móvil). */
  children?: ReactNode;
}

/** El único <h1> de cada página, con su descripción corta. */
export function EncabezadoPagina({ titulo, descripcion, children }: Props) {
  return (
    <div className="encabezado-pagina">
      <div>
        <h1 className="encabezado-pagina__titulo">{titulo}</h1>
        {descripcion ? <p className="encabezado-pagina__descripcion">{descripcion}</p> : null}
      </div>
      {children ? <div className="encabezado-pagina__acciones">{children}</div> : null}
    </div>
  );
}
