"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { responderSolicitudAccion } from "./actions";
import { usePublicarRespuesta } from "./AvisoRespuestas";
import type { ResultadoRespuesta } from "./logica";

interface Props {
  id: string;
  participante: string;
}

/**
 * Botones "No aprobar" y "Aprobar" de una solicitud.
 * "No aprobar" pide un segundo clic: es una decisión sobre una persona.
 */
export function RespuestaSolicitud({ id, participante }: Props) {
  const publicar = usePublicarRespuesta();
  const [confirmando, setConfirmando] = useState(false);
  const confirmar = useRef<HTMLButtonElement>(null);
  const noAprobar = useRef<HTMLButtonElement>(null);
  const volverANoAprobar = useRef(false);

  const [, accion, enviando] = useActionState(async (previo: ResultadoRespuesta | null, datos: FormData) => {
    const resultado = await responderSolicitudAccion(previo, datos);
    publicar(resultado);
    if (!resultado.ok) setConfirmando(false);
    return resultado;
  }, null);

  // El foco sigue a la persona: al pedir confirmación va al botón de confirmar; al cancelar, vuelve.
  useEffect(() => {
    if (confirmando) confirmar.current?.focus();
    else if (volverANoAprobar.current) {
      volverANoAprobar.current = false;
      noAprobar.current?.focus();
    }
  }, [confirmando]);

  return (
    <form action={accion} className="respuesta" aria-busy={enviando}>
      <input type="hidden" name="id" value={id} />
      {confirmando ? (
        <>
          <p className="respuesta__pregunta" id={`confirmar-${id}`}>
            ¿No aprobar el préstamo de {participante}?
          </p>
          <div className="respuesta__botones">
            <button
              type="button"
              className="nt-btn nt-btn--secundario nt-btn--sm"
              disabled={enviando}
              onClick={() => {
                volverANoAprobar.current = true;
                setConfirmando(false);
              }}
            >
              Cancelar
            </button>
            <button
              ref={confirmar}
              type="submit"
              name="decision"
              value="no_aprobar"
              className="nt-btn nt-btn--secundario nt-btn--sm"
              disabled={enviando}
              aria-describedby={`confirmar-${id}`}
            >
              {enviando ? "Guardando…" : "Confirmar: no aprobar"}
            </button>
          </div>
        </>
      ) : (
        <div className="respuesta__botones">
          <button
            ref={noAprobar}
            type="button"
            className="nt-btn nt-btn--secundario nt-btn--sm"
            disabled={enviando}
            onClick={() => setConfirmando(true)}
            aria-label={`No aprobar el préstamo de ${participante}`}
          >
            No aprobar
          </button>
          <button
            type="submit"
            name="decision"
            value="aprobar"
            className="nt-btn nt-btn--primario nt-btn--sm"
            disabled={enviando}
            aria-label={enviando ? undefined : `Aprobar el préstamo de ${participante}`}
          >
            {enviando ? "Guardando…" : "Aprobar"}
          </button>
        </div>
      )}
    </form>
  );
}
