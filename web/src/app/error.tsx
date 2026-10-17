"use client";

import { useEffect } from "react";
import { Aviso } from "@/components/Aviso";

// retry() vuelve a pedir los datos del segmento; reset() solo repintaría el mismo error.
export default function ErrorPagina({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="pila">
      <Aviso tipo="error" titulo="No pudimos cargar esta información">
        Puede ser un problema momentáneo con el servicio. Intenta de nuevo en unos segundos.
      </Aviso>
      <div>
        <button type="button" className="nt-btn nt-btn--primario" onClick={() => retry()}>
          Intentar otra vez
        </button>
      </div>
    </div>
  );
}
