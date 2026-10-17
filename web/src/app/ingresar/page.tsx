/* eslint-disable @next/next/no-img-element -- PNG estático del kit con tamaño fijo. */
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Aviso } from "@/components/Aviso";
import { obtenerSesion, sesionConfigurada } from "@/lib/sesion";
import { destinoSeguro } from "@/lib/sesion/acceso";
import { USUARIOS_DEMO } from "@/lib/sesion/usuarios";
import { FormularioIngreso } from "./FormularioIngreso";
import "../inicio.css";

export const metadata: Metadata = { title: "Iniciar sesión" };

interface Props {
  searchParams: Promise<{ siguiente?: string | string[] }>;
}

export default async function Ingresar({ searchParams }: Props) {
  const { siguiente } = await searchParams;
  const destino = destinoSeguro(Array.isArray(siguiente) ? siguiente[0] : siguiente);
  if (await obtenerSesion()) redirect(destino);

  return (
    <main id="contenido" className="ingreso" tabIndex={-1}>
      <div className="ingreso__tarjeta nt-card">
        <Link href="/" className="ingreso__logo" aria-label="Natillera 2.0, volver al inicio">
          <img src="/ds/logos/01_simbolo/marranito_128px.png" width={72} height={72} alt="" />
        </Link>
        <h1 className="ingreso__titulo">Iniciar sesión</h1>
        <p className="ingreso__texto nt-muted">Para la financiera y los administradores de cada natillera.</p>

        {sesionConfigurada() ? (
          <FormularioIngreso siguiente={destino} />
        ) : (
          <Aviso tipo="error" titulo="El inicio de sesión no está configurado">
            Falta <code>SESION_SECRETO</code> en <code>web/.env.local</code> (ver <code>web/.env.example</code>).
          </Aviso>
        )}

        <p className="ingreso__demo nt-muted">
          Demo: usuarios{" "}
          {USUARIOS_DEMO.map((u, i) => (
            <span key={u.usuario}>
              {i > 0 ? " y " : null}
              <b>{u.usuario}</b>
            </span>
          ))}
          . El código llega al Telegram de cada uno.
        </p>

        <p className="ingreso__participantes">
          ¿Eres participante de una natillera? Todo lo haces desde el bot de Telegram: no necesitas esta página.
        </p>
        <Link href="/" className="nt-btn nt-btn--fantasma nt-btn--sm">
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
