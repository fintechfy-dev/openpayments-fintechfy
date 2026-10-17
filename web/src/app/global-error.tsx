"use client";

// Último respaldo: solo aparece si falla el layout raíz. Trae su propio <html> y no puede usar el layout,
// así que carga los estilos del design system por su cuenta.
import "@/styles/ds/tokens/tokens.css";
import "@/styles/ds/components/bundle.css";
import "@/styles/app.css";
import { useEffect } from "react";

export default function ErrorGlobal({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="es" data-theme="light">
      <body className="nt">
        <main className="app-contenido">
          <div className="pila">
            <div className="nt-aviso nt-aviso--error" role="alert">
              <div>
                <h1 className="nt-aviso__titulo">La web no pudo arrancar</h1>
                <p className="nt-aviso__texto">Puede ser un problema momentáneo o de configuración. Intenta de nuevo en unos segundos.</p>
              </div>
            </div>
            <div>
              <button type="button" className="nt-btn nt-btn--primario" onClick={() => retry()}>
                Intentar otra vez
              </button>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
