"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Aviso } from "@/components/Aviso";
import type { ResultadoRespuesta } from "./logica";

const Contexto = createContext<(r: ResultadoRespuesta) => void>(() => {});

/** Lo usa cada fila para publicar el resultado de su respuesta. */
export function usePublicarRespuesta() {
  return useContext(Contexto);
}

/**
 * Muestra arriba de las tablas el resultado de la última respuesta.
 * Vive fuera de las filas porque, al responder, la fila pasa de "Por responder" a "Respondidas".
 */
export function AvisoRespuestas({ children }: { children: ReactNode }) {
  const [resultado, setResultado] = useState<ResultadoRespuesta | null>(null);
  const [vez, setVez] = useState(0);
  const region = useRef<HTMLDivElement>(null);
  const publicar = useCallback((r: ResultadoRespuesta) => {
    setResultado(r);
    setVez((v) => v + 1);
  }, []);

  // Al responder, la fila cambia de tabla y su botón desaparece: el foco pasa al aviso para no perderse.
  useEffect(() => {
    if (vez > 0) region.current?.focus();
  }, [vez]);

  return (
    <Contexto.Provider value={publicar}>
      {/* La región viva existe siempre: los lectores de pantalla ignoran una que aparece ya con texto. */}
      <div className="creditos-aviso" ref={region} tabIndex={-1} role="status" aria-live="polite" aria-atomic="true">
        {resultado ? (
          <Aviso key={vez} anunciar={false} tipo={resultado.ok ? "exito" : "error"} titulo={resultado.titulo}>
            {resultado.mensaje}
          </Aviso>
        ) : null}
      </div>
      {children}
    </Contexto.Provider>
  );
}
