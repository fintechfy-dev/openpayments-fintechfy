import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/Badge";
import { Dinero } from "@/components/Dinero";
import { EncabezadoPagina } from "@/components/EncabezadoPagina";
import { EstadoVacio } from "@/components/EstadoVacio";
import { Icono } from "@/components/Icono";
import { formatoFecha } from "@/lib/fechas";
import { formatoCOP } from "@/lib/natillera";
import { obtenerNatillera } from "@/lib/servicio";
import { requerirSesion } from "@/lib/sesion";
import { puedeVerNatillera } from "@/lib/sesion/acceso";
import { avanceAhorro, plural, segmentosCuotas, textoPeriodicidad } from "../presentacion";
import "../natilleras.css";

const FINANCIERA = "Financiera Aliada";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const sesion = await requerirSesion();
  const natillera = await obtenerNatillera(id);
  // Sin acceso, ni siquiera el nombre: el título también es información.
  return { title: natillera && puedeVerNatillera(sesion, natillera) ? natillera.nombre : "Natillera no encontrada" };
}

const CLASE_SEGMENTO = { pagada: "nt-cuota nt-cuota--pagada", hoy: "nt-cuota nt-cuota--hoy", pendiente: "nt-cuota" } as const;

export default async function DetalleNatillera({ params }: Props) {
  const { id } = await params;
  const sesion = await requerirSesion();
  const n = await obtenerNatillera(id);
  // Una natillera ajena responde igual que una inexistente: no se confirma que existe.
  if (!n || !puedeVerNatillera(sesion, n)) notFound();

  const avance = avanceAhorro(n);
  const segmentos = segmentosCuotas(n);
  const conPendiente = n.participantes.filter((p) => p.deuda > 0).length;

  return (
    <div className="pila">
      <EncabezadoPagina
        titulo={n.nombre}
        descripcion={
          <>
            Administra {n.administrador}. Cuota de {formatoCOP(n.valorCuota)}, {textoPeriodicidad(n.periodicidad)}. Del{" "}
            {formatoFecha(n.fechaInicio, true)} al {formatoFecha(n.fechaFinal, true)}.
          </>
        }
      >
        <Badge tipo="natillera" estado={n.estado} />
      </EncabezadoPagina>

      <section className="nt-card nt-card--destacada natillera-destacada" aria-labelledby="custodia-titulo">
        <div className="nt-dato">
          <h2 id="custodia-titulo" className="nt-dato__etiqueta natillera-destacada__titulo">
            En la cuenta del grupo
          </h2>
          <Dinero valor={n.saldoCustodia} className="nt-dato__valor nt-dato__valor--verde" />
          <p className="natillera-destacada__custodia">
            <Icono nombre="candado" tamano="sm" />
            <span>
              La plata la guarda <b>{FINANCIERA}</b>. Nadie del grupo la puede sacar, ni el administrador.
            </span>
          </p>
        </div>

        <div className="natillera-avance">
          <div className="nt-progreso">
            <div className="nt-progreso__fila">
              <span>Ahorro del grupo</span>
              <span className="nt-num">
                {formatoCOP(avance.ahorrado)} de {formatoCOP(avance.meta)}
              </span>
            </div>
            <div
              className="nt-progreso__pista"
              role="progressbar"
              aria-valuenow={avance.porcentaje}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Ahorro del grupo ${avance.porcentaje}%`}
            >
              <div className="nt-progreso__barra" style={{ width: `${avance.porcentaje}%` }} />
            </div>
            <span className="nt-muted natillera-nota">
              {avance.porcentaje}% · {avance.cuotasFaltantes > 0 ? `faltan ${plural(avance.cuotasFaltantes, "cuota")}` : "ya se cobraron todas las cuotas"}
            </span>
          </div>

          <div className="nt-progreso">
            <div className="nt-progreso__fila">
              <span>Cuotas cobradas</span>
              <span className="nt-num">
                {n.periodoActual}/{n.cuotasTotales}
              </span>
            </div>
            <div className="nt-cuotas" style={{ "--n": n.cuotasTotales } as CSSProperties} aria-hidden="true">
              {segmentos.map((s, i) => (
                <span key={i} className={CLASE_SEGMENTO[s]} />
              ))}
            </div>
            <span className="nt-muted natillera-nota">
              {n.proximoCobro ? `Próximo cobro: ${formatoFecha(n.proximoCobro)}` : "No quedan cobros pendientes"}
            </span>
          </div>
        </div>
      </section>

      <section aria-labelledby="datos-titulo">
        <h2 id="datos-titulo" className="seccion__titulo">
          Reglas de la natillera
        </h2>
        <div className="grilla-datos">
          <div className="nt-card nt-dato">
            <span className="nt-dato__etiqueta">Cupo mínimo</span>
            <span className="nt-dato__valor nt-dato__valor--md">{plural(n.cupoMinimo, "participante")}</span>
          </div>
          <div className="nt-card nt-dato">
            <span className="nt-dato__etiqueta">Mora diaria</span>
            <span className="nt-dato__valor nt-dato__valor--md">{n.moraDiariaPct.toLocaleString("es-CO")}%</span>
          </div>
          <div className="nt-card nt-dato">
            <span className="nt-dato__etiqueta">Próximo cobro</span>
            <span className="nt-dato__valor nt-dato__valor--md">{n.proximoCobro ? formatoFecha(n.proximoCobro) : "—"}</span>
          </div>
          <div className="nt-card nt-dato">
            <span className="nt-dato__etiqueta">Billetera del grupo</span>
            <span className="natillera-billetera">{n.billeteraGrupo}</span>
            <span className="nt-muted natillera-nota">A nombre de {FINANCIERA}.</span>
          </div>
        </div>
      </section>

      <section aria-labelledby="participantes-titulo">
        <h2 id="participantes-titulo" className="seccion__titulo">
          Participantes
        </h2>
        <p className="nt-muted natillera-resumen-participantes">
          {plural(n.participantes.length, "participante")}
          {conPendiente > 0 ? `, ${conPendiente} con cuotas pendientes.` : ", todos al día."}
        </p>
        {n.participantes.length === 0 ? (
          <EstadoVacio icono="grupo" titulo="Todavía no hay participantes">
            Cuando alguien se una desde el bot y quede validado, aparece aquí.
          </EstadoVacio>
        ) : (
          <div className="nt-tabla-marco">
            <table className="nt-tabla tabla-apilable natillera-participantes">
              <thead>
                <tr>
                  <th scope="col">Participante</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Cuotas pagadas</th>
                  <th scope="col" className="nt-tabla__num">
                    Aportado
                  </th>
                  <th scope="col" className="nt-tabla__num">
                    Pendiente
                  </th>
                </tr>
              </thead>
              <tbody>
                {n.participantes.map((p) => (
                  <tr key={p.id}>
                    <td className="nt-tabla__principal" data-etiqueta="">
                      {p.nombre}
                    </td>
                    <td data-etiqueta="Estado">
                      <Badge tipo="participante" estado={p.estado} />
                    </td>
                    <td data-etiqueta="Cuotas pagadas" className="nt-num">
                      {p.cuotasPagadas}/{n.cuotasTotales}
                    </td>
                    <td data-etiqueta="Aportado" className="nt-tabla__num">
                      <Dinero valor={p.aportado} />
                    </td>
                    <td data-etiqueta="Pendiente" className="nt-tabla__num">
                      {p.deuda > 0 ? <Dinero valor={p.deuda} className="natilleras-pendiente" /> : "Al día"}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="nt-tabla__principal" data-etiqueta="">
                    Total del grupo
                  </td>
                  <td data-etiqueta="" />
                  <td data-etiqueta="" />
                  <td data-etiqueta="Aportado" className="nt-tabla__num">
                    <Dinero valor={avance.ahorrado} className="nt-tabla__principal" />
                  </td>
                  <td data-etiqueta="Pendiente" className="nt-tabla__num">
                    <Dinero valor={n.participantes.reduce((s, p) => s + p.deuda, 0)} />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Link href="/natilleras" className="nt-btn nt-btn--fantasma natillera-volver">
        Volver a natilleras
      </Link>
    </div>
  );
}
