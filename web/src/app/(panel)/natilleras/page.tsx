import Link from "next/link";
import { Badge } from "@/components/Badge";
import { BloqueCustodia } from "@/components/BloqueCustodia";
import { Dinero } from "@/components/Dinero";
import { EncabezadoPagina } from "@/components/EncabezadoPagina";
import { EstadoVacio } from "@/components/EstadoVacio";
import { formatoFecha } from "@/lib/fechas";
import { formatoCOP } from "@/lib/natillera";
import { listarNatilleras } from "@/lib/servicio";
import { requerirSesion } from "@/lib/sesion";
import { puedeVerNatillera } from "@/lib/sesion/acceso";
import { plural, resumirNatilleras, textoPeriodicidad } from "./presentacion";
import "./natilleras.css";

// Los datos cambian con cada cobro: se piden en cada visita, nunca se congelan en el build.
export const dynamic = "force-dynamic";

export const metadata = { title: "Natilleras" };

export default async function Natilleras() {
  const sesion = await requerirSesion();
  const natilleras = (await listarNatilleras()).filter((n) => puedeVerNatillera(sesion, n));
  const r = resumirNatilleras(natilleras);

  if (natilleras.length === 0) {
    return (
      <>
        <EncabezadoPagina titulo="Natilleras" descripcion="Aquí vas a ver cada natillera, su estado y la plata que guarda la financiera." />
        <EstadoVacio icono="grupo" titulo="Todavía no hay natilleras">
          Cuando un administrador cree una natillera desde el bot, aparece aquí.
        </EstadoVacio>
      </>
    );
  }

  return (
    <div className="pila">
      <EncabezadoPagina
        titulo="Natilleras"
        descripcion={`${plural(r.total, "natillera")}, ${plural(r.activas, "activa")} · ${formatoCOP(r.enCustodia)} en custodia.`}
      />

      <section aria-labelledby="indicadores-titulo">
        <h2 id="indicadores-titulo" className="solo-lectores">
          Indicadores
        </h2>
        <div className="grilla-datos natilleras-indicadores">
          <div className="nt-card nt-dato">
            <span className="nt-dato__etiqueta">Natilleras activas</span>
            <span className="nt-dato__valor">{r.activas}</span>
          </div>
          <div className="nt-card nt-dato">
            <span className="nt-dato__etiqueta">Plata en custodia</span>
            <Dinero valor={r.enCustodia} className="nt-dato__valor nt-dato__valor--verde" />
          </div>
          <div className="nt-card nt-dato">
            <span className="nt-dato__etiqueta">Participantes</span>
            <span className="nt-dato__valor">{r.participantes}</span>
          </div>
          <div className="nt-card nt-dato">
            <span className="nt-dato__etiqueta">Con cuotas pendientes</span>
            <span className="nt-dato__valor">{r.conCuotasPendientes}</span>
          </div>
        </div>
      </section>

      <section aria-labelledby="lista-titulo">
        <h2 id="lista-titulo" className="seccion__titulo">
          Todas las natilleras
        </h2>
        <div className="nt-tabla-marco">
          <table className="nt-tabla tabla-apilable">
            <thead>
              <tr>
                <th scope="col">Natillera</th>
                <th scope="col">Estado</th>
                <th scope="col">Administrador</th>
                <th scope="col">Cuota</th>
                <th scope="col">Avance</th>
                <th scope="col">Participantes</th>
                <th scope="col" className="nt-tabla__num">
                  En custodia
                </th>
                <th scope="col">Próximo cobro</th>
              </tr>
            </thead>
            <tbody>
              {natilleras.map((n) => (
                <tr key={n.id}>
                  <td className="nt-tabla__principal" data-etiqueta="">
                    <Link href={`/natilleras/${n.id}`} className="natilleras-enlace">
                      {n.nombre}
                    </Link>
                  </td>
                  <td data-etiqueta="Estado">
                    <Badge tipo="natillera" estado={n.estado} />
                  </td>
                  <td data-etiqueta="Administrador">{n.administrador}</td>
                  <td data-etiqueta="Cuota">
                    <span>
                      <Dinero valor={n.valorCuota} /> {textoPeriodicidad(n.periodicidad)}
                    </span>
                  </td>
                  <td data-etiqueta="Avance" className="nt-num">
                    {n.periodoActual}/{n.cuotasTotales} cuotas
                  </td>
                  <td data-etiqueta="Participantes">
                    <span>
                      <span className="nt-num">{n.numeroParticipantes}</span>
                      <span className="natilleras-sub">
                        {n.participantesEnMora > 0 ? (
                          <span className="natilleras-pendiente">{n.participantesEnMora} con cuota pendiente</span>
                        ) : (
                          "Todos al día"
                        )}
                        {` · mínimo ${n.cupoMinimo}`}
                      </span>
                    </span>
                  </td>
                  <td data-etiqueta="En custodia" className="nt-tabla__num">
                    <Dinero valor={n.saldoCustodia} />
                  </td>
                  <td data-etiqueta="Próximo cobro">{n.proximoCobro ? formatoFecha(n.proximoCobro) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <BloqueCustodia />
    </div>
  );
}
