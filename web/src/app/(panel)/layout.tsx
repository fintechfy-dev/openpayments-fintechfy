import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";
import { Navegacion } from "@/components/Navegacion";
import { requerirSesion } from "@/lib/sesion";
import { cerrarSesion } from "./acciones-sesion";

const ROL = { financiera: "Financiera", administrador: "Administrador" } as const;

// Todo lo que está dentro de (panel) exige sesión. Cada página y acción lo vuelve a comprobar:
// un layout no protege por sí solo las Server Actions ni las rutas de API.
export default async function LayoutPanel({ children }: { children: ReactNode }) {
  const sesion = await requerirSesion();

  return (
    <>
      <header className="app-encabezado">
        <div className="app-encabezado__barra">
          <Link href="/natilleras" className="app-encabezado__marca" aria-label="Natillera 2.0, ir a las natilleras">
            <Logo />
          </Link>
          <div className="app-encabezado__sesion">
            <span className="app-encabezado__rol">
              <b>{sesion.nombre}</b>
              <span className="nt-muted"> · {ROL[sesion.rol]}</span>
            </span>
            <form action={cerrarSesion}>
              <button type="submit" className="nt-btn nt-btn--fantasma nt-btn--sm">
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
        <Navegacion />
      </header>
      <main id="contenido" className="app-contenido" tabIndex={-1}>
        {children}
      </main>
    </>
  );
}
