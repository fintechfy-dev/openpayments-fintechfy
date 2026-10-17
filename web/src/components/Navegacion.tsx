"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import type { NombreIcono } from "@/lib/natillera";
import { Icono } from "./Icono";

const ENLACES: { href: string; texto: string; corto?: string; icono: NombreIcono }[] = [
  { href: "/natilleras", texto: "Natilleras", icono: "grupo" },
  { href: "/creditos", texto: "Créditos", icono: "credito" },
  { href: "/pagos", texto: "Registro de pagos", corto: "Pagos", icono: "billetera" },
  { href: "/bitacora", texto: "Bitácora", icono: "calendario" },
];

/** Navegación principal. En móvil es una barra que se desplaza; marca la sección actual con aria-current. */
export function Navegacion() {
  const ruta = usePathname();
  const lista = useRef<HTMLUListElement>(null);

  // En móvil la barra se desplaza: la sección actual siempre debe quedar a la vista.
  useEffect(() => {
    lista.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [ruta]);

  return (
    <nav className="navegacion" aria-label="Secciones">
      <ul className="navegacion__lista" ref={lista}>
        {ENLACES.map((e) => {
          const actual = ruta === e.href || ruta.startsWith(`${e.href}/`);
          return (
            <li key={e.href}>
              <Link href={e.href} className="navegacion__enlace" aria-current={actual ? "page" : undefined}>
                <Icono nombre={e.icono} tamano="sm" />
                {e.corto ? (
                  <>
                    <span className="navegacion__texto-corto" aria-hidden="true">
                      {e.corto}
                    </span>
                    <span className="navegacion__texto-largo">{e.texto}</span>
                  </>
                ) : (
                  e.texto
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
