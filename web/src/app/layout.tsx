import type { Metadata, Viewport } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Aviso } from "@/components/Aviso";
import { Logo } from "@/components/Logo";
import { Navegacion } from "@/components/Navegacion";
import { usaDatosDePrueba } from "@/lib/servicio";
// Orden: tokens → componentes del design system → layout de la app. src/styles/ds lo genera `npm run ds`.
import "@/styles/ds/tokens/tokens.css";
import "@/styles/ds/components/bundle.css";
import "@/styles/app.css";

export const metadata: Metadata = {
  title: { default: "Natillera 2.0", template: "%s · Natillera 2.0" },
  description: "Gestión de natilleras para la financiera y el administrador: natilleras, créditos y registro de pagos.",
  icons: { icon: "/ds/logos/01_simbolo/marranito_32px.png", apple: "/ds/logos/05_avatar/avatar_verde_oscuro_256px.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#17221C" },
  ],
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className="nt">
        <a className="saltar" href="#contenido">
          Saltar al contenido
        </a>
        <header className="app-encabezado">
          <div className="app-encabezado__barra">
            <Link href="/natilleras" className="app-encabezado__marca" aria-label="Natillera 2.0, inicio">
              <Logo />
            </Link>
            <span className="app-encabezado__rol">Financiera Aliada</span>
          </div>
          <Navegacion />
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
      </body>
    </html>
  );
}
