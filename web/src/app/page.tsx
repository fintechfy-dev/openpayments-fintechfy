/* eslint-disable @next/next/no-img-element -- PNG estáticos del kit con tamaño fijo. */
import type { Metadata } from "next";
import Link from "next/link";
import { BloqueCustodia } from "@/components/BloqueCustodia";
import { Icono } from "@/components/Icono";
import type { NombreIcono } from "@/lib/natillera";
import { obtenerSesion } from "@/lib/sesion";
import "./inicio.css";

export const metadata: Metadata = { title: { absolute: "Natillera 2.0 · Ahorrar juntos, siempre" } };

const PASOS: { icono: NombreIcono; titulo: string; texto: string }[] = [
  { icono: "grupo", titulo: "Arman la natillera", texto: "El administrador la crea en Telegram con la cuota y las fechas, y comparte un enlace con el grupo." },
  { icono: "candado", titulo: "Cada quien autoriza una vez", texto: "Desde su billetera, cada persona autoriza el cobro de sus cuotas con un tope. No hay que acordarse de pagar." },
  { icono: "cuota", titulo: "El ahorro se cobra solo", texto: "Cada periodo se cobra la cuota y todos ven lo suyo y el total del grupo, sin cuadernos ni capturas." },
  { icono: "premio", titulo: "En diciembre, a cada billetera", texto: "La liquidación se paga sola, en partes iguales. Nadie la puede adelantar ni cambiar, ni el administrador." },
];

export default async function Inicio() {
  const sesion = await obtenerSesion();
  const accion = sesion ? { href: "/natilleras", texto: "Ir al panel" } : { href: "/ingresar", texto: "Iniciar sesión" };

  return (
    <div className="inicio">
      <header className="inicio__encabezado">
        <div className="inicio__barra">
          <Link href="/" className="inicio__marca" aria-label="Natillera 2.0, inicio">
            <img src="/ds/logos/01_simbolo/marranito_64px.png" width={40} height={40} alt="" />
            <img src="/ds/logos/04_logotipo/nombre_original_512px.png" width={150} height={26} alt="Natillera 2.0" />
          </Link>
          <nav aria-label="Inicio" className="inicio__nav">
            <a href="#como-funciona" className="inicio__enlace">
              Cómo funciona
            </a>
            <Link href={accion.href} className="nt-btn nt-btn--primario nt-btn--sm">
              {accion.texto}
            </Link>
          </nav>
        </div>
      </header>

      <main id="contenido" tabIndex={-1}>
        <section className="inicio__heroe" aria-labelledby="titulo-inicio">
          <div className="inicio__heroe-texto">
            <p className="inicio__antetitulo">Ahorro en grupo para diciembre</p>
            <h1 id="titulo-inicio" className="inicio__titulo">
              Ahorrar juntos, siempre.
            </h1>
            <p className="inicio__lema">
              La natillera de toda la vida, sin que nadie del grupo tenga que guardar la plata. Cada aporte queda a la vista
              de todos y en diciembre a cada uno le llega lo suyo.
            </p>
            <div className="inicio__acciones">
              <Link href={accion.href} className="nt-btn nt-btn--primario">
                {accion.texto}
              </Link>
              <a href="#como-funciona" className="nt-btn nt-btn--secundario">
                Cómo funciona
              </a>
            </div>
          </div>
          <div className="inicio__heroe-imagen">
            <img src="/ds/logos/02_vertical/logo_vertical_512px.png" width={340} height={340} alt="El marranito de Natillera 2.0 con una moneda entrando" />
          </div>
        </section>

        <section className="inicio__seccion inicio__problema" aria-labelledby="titulo-problema">
          <h2 id="titulo-problema" className="inicio__subtitulo">
            Por qué una natillera 2.0
          </h2>
          <div className="grilla-tarjetas">
            <article className="nt-card">
              <h3 className="nt-card__titulo">El problema</h3>
              <p>
                En una natillera alguien del grupo guarda la plata de todos. Si se demora, se equivoca o desaparece, el grupo
                pierde. Por esa desconfianza hoy se hacen menos natilleras.
              </p>
            </article>
            <article className="nt-card nt-card--destacada">
              <h3 className="nt-card__titulo">La solución</h3>
              <p>
                La plata queda en una billetera a nombre de una financiera, no de una persona. Los cobros y la liquidación siguen
                las reglas que el grupo eligió, y nadie las puede saltar.
              </p>
            </article>
          </div>
        </section>

        <section id="como-funciona" className="inicio__seccion" aria-labelledby="titulo-como">
          <h2 id="titulo-como" className="inicio__subtitulo">
            Cómo funciona
          </h2>
          <ol className="inicio__pasos">
            {PASOS.map((p, i) => (
              <li key={p.titulo} className="inicio__paso nt-card">
                <span className="inicio__paso-icono">
                  <Icono nombre={p.icono} tamano="lg" />
                </span>
                <h3 className="nt-card__titulo">
                  <span className="solo-lectores">Paso {i + 1}: </span>
                  {p.titulo}
                </h3>
                <p>{p.texto}</p>
              </li>
            ))}
          </ol>
          <BloqueCustodia />
        </section>

        <section className="inicio__seccion" aria-labelledby="titulo-quien">
          <h2 id="titulo-quien" className="inicio__subtitulo">
            ¿Por dónde entro?
          </h2>
          <div className="grilla-tarjetas">
            <article className="nt-card nt-card--calida">
              <h3 className="nt-card__titulo">Si ahorras en una natillera</h3>
              <p>Todo lo haces desde el bot de Telegram: unirte con el enlace de tu grupo, autorizar tu cuota y ver cómo va el ahorro.</p>
            </article>
            <article className="nt-card">
              <h3 className="nt-card__titulo">Si eres la financiera o administras una natillera</h3>
              <p>Aquí ves tus natilleras, el registro de cada pago y, la financiera, las solicitudes de crédito.</p>
              <Link href={accion.href} className="nt-btn nt-btn--primario">
                {accion.texto}
              </Link>
            </article>
          </div>
        </section>
      </main>

      <footer className="inicio__pie">
        <p>
          Natillera 2.0 · Hackathon de Open Payments Medellín, octubre de 2026. Los pagos usan Open Payments (Interledger) en
          billeteras de prueba.
        </p>
      </footer>
    </div>
  );
}
