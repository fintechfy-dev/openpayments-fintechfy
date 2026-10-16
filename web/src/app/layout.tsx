import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
// Orden: tokens → componentes del design system → layout de la app. src/styles/ds lo genera `npm run ds`.
import "@/styles/ds/tokens/tokens.css";
import "@/styles/ds/components/bundle.css";
import "@/styles/app.css";

export const metadata: Metadata = {
  title: { default: "Natillera 2.0", template: "%s · Natillera 2.0" },
  description: "Ahorro en grupo como la natillera de siempre, sin que nadie del grupo guarde la plata. Hecho sobre Open Payments.",
  icons: { icon: "/ds/logos/01_simbolo/marranito_32px.png", apple: "/ds/logos/05_avatar/avatar_verde_oscuro_256px.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // La web va siempre en tema claro (decisión del equipo): coincide con superficie-elevada.
  colorScheme: "light",
  themeColor: "#FFFFFF",
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    // data-theme="light": la web no sigue el modo oscuro del sistema; siempre usa la crema y el blanco
    // del design system. Los tokens oscuros siguen existiendo por si el equipo decide ofrecerlos.
    <html lang="es" data-theme="light">
      <body className="nt">
        <a className="saltar" href="#contenido">
          Saltar al contenido
        </a>
        {children}
      </body>
    </html>
  );
}
