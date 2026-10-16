import Link from "next/link";
import type { ReactNode } from "react";
import { Aviso } from "@/components/Aviso";
import { Logo } from "@/components/Logo";
import { Navegacion } from "@/components/Navegacion";
import { usaDatosDePrueba } from "@/lib/servicio";
import { requerirSesion } from "@/lib/sesion";
import { puedeResponderCreditos } from "@/lib/sesion/acceso";
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
        <Navegacion mostrarCreditos={puedeResponderCreditos(sesion)} />
      </header>
      <main id="contenido" className="app-contenido" tabIndex={-1}>
        {usaDatosDePrueba ? (
          <div className="aviso-prueba">
            <Aviso tipo="info" titulo="Datos de prueba">
              La web todavía no está conectada al servicio externo (issue #5): lo que ves es de ejemplo.
            </Aviso>
          </div>
        ) : null}
        {children}
      </main>
    </>
  );
}
