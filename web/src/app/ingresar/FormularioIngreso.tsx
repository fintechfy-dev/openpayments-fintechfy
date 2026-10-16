"use client";

import { useActionState, useEffect, useRef } from "react";
import { Aviso } from "@/components/Aviso";
import { ingresar, type EstadoIngreso } from "./actions";

/** Ingreso en dos pasos: el usuario pide un código y lo escribe cuando le llega por Telegram. */
export function FormularioIngreso({ siguiente }: { siguiente: string }) {
  const [estado, accion, enviando] = useActionState(ingresar, { paso: "usuario" } satisfies EstadoIngreso);
  const usuario = useRef<HTMLInputElement>(null);
  const codigo = useRef<HTMLInputElement>(null);

  // El foco va al campo que toca: el código cuando llega, el usuario si hay que volver a empezar.
  useEffect(() => {
    if (estado.paso === "codigo" && codigo.current) {
      codigo.current.value = "";
      codigo.current.focus();
    } else if (estado.error) {
      usuario.current?.focus();
    }
  }, [estado]);

  return (
    <form action={accion} className="ingreso__form" noValidate>
      <input type="hidden" name="siguiente" value={siguiente} />
      {estado.error ? (
        <Aviso tipo="error" titulo="No pudimos iniciar tu sesión">
          {estado.error}
        </Aviso>
      ) : null}

      {estado.paso === "usuario" ? (
        <>
          <div className="campo">
            <label className="campo__etiqueta" htmlFor="usuario">
              Usuario
            </label>
            <input
              ref={usuario}
              id="usuario"
              name="usuario"
              className="campo__entrada"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              defaultValue={estado.usuario}
            />
          </div>
          <button type="submit" name="intencion" value="pedir" className="nt-btn nt-btn--primario nt-btn--bloque" disabled={enviando} aria-busy={enviando}>
            {enviando ? "Enviando…" : "Enviarme un código"}
          </button>
          <p className="ingreso__ayuda">Te llega por Telegram, al chat que tienes con el bot de Natillera.</p>
        </>
      ) : (
        <>
          {estado.aviso && !estado.error ? <Aviso tipo="info" titulo="Revisa tu Telegram">{estado.aviso}</Aviso> : null}
          <input type="hidden" name="usuario" value={estado.usuario ?? ""} />
          <div className="campo">
            <label className="campo__etiqueta" htmlFor="codigo">
              Código de 6 dígitos
            </label>
            <input
              ref={codigo}
              id="codigo"
              name="codigo"
              className="campo__entrada campo__entrada--codigo"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={7}
              required
              aria-describedby="codigo-ayuda"
            />
            <span id="codigo-ayuda" className="ingreso__ayuda">
              Para <b>{estado.usuario}</b>. Vence en 5 minutos y sirve una sola vez.
            </span>
          </div>
          <button type="submit" name="intencion" value="verificar" className="nt-btn nt-btn--primario nt-btn--bloque" disabled={enviando} aria-busy={enviando}>
            {enviando ? "Entrando…" : "Entrar"}
          </button>
          <div className="ingreso__secundarias">
            <button type="submit" name="intencion" value="pedir" className="nt-btn nt-btn--fantasma nt-btn--sm" disabled={enviando}>
              Enviar otro código
            </button>
            <button type="submit" name="intencion" value="cambiar" className="nt-btn nt-btn--fantasma nt-btn--sm" disabled={enviando}>
              Cambiar de usuario
            </button>
          </div>
        </>
      )}
    </form>
  );
}
