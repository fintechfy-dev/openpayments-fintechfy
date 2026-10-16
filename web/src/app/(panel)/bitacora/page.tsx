import { EncabezadoPagina } from "@/components/EncabezadoPagina";
import { EstadoVacio } from "@/components/EstadoVacio";
import { Icono } from "@/components/Icono";
import { formatoFechaHora } from "@/lib/fechas";
import { PantallaSinConectar } from "@/components/PantallaSinConectar";
import { listarBitacora, pantallasSinConectar } from "@/lib/servicio";
import { natillerasVisibles, requerirSesion } from "@/lib/sesion";
import { ACTOR, ordenarBitacora, tipoActor } from "./bitacora";
import "./bitacora.css";

export const metadata = { title: "Bitácora" };

// Cambia cuando el administrador, la financiera o el sistema actúan: se lee en cada visita.
export const dynamic = "force-dynamic";

// US-012-AUD: registro de lo que hizo cada quien, lo más reciente primero.
export default async function Pagina() {
  const sesion = await requerirSesion();
  if (pantallasSinConectar) return <PantallaSinConectar titulo="Bitácora" />;
  const visibles = await natillerasVisibles(sesion);
  const eventos = ordenarBitacora((await listarBitacora()).filter((e) => visibles.has(e.natilleraId)));

  return (
    <>
      <EncabezadoPagina
        titulo="Bitácora"
        descripcion="Registro de lo que hacen el administrador, la financiera y el sistema en cada natillera. No se puede borrar ni editar: cada acción queda tal como pasó. Lo más reciente va primero."
      />

      <p className="bitacora__nota nt-card nt-card--calida">
        <Icono nombre="candado" />
        <span>
          Las acciones <b>automáticas</b> (cobros, mora, liquidación) las hace el sistema y se marcan aparte de las del administrador.
        </span>
      </p>

      {eventos.length === 0 ? (
        <EstadoVacio icono="calendario" titulo="Todavía no hay acciones registradas">
          Cuando el administrador cree una natillera o una actividad, o la financiera responda un préstamo, queda anotado aquí.
        </EstadoVacio>
      ) : (
        <div className="nt-tabla-marco">
          <table className="nt-tabla tabla-apilable bitacora__tabla">
            <caption className="solo-lectores">Acciones registradas, las más recientes primero</caption>
            <thead>
              <tr>
                <th scope="col">Fecha y hora</th>
                <th scope="col">Natillera</th>
                <th scope="col">Quién</th>
                <th scope="col">Acción</th>
                <th scope="col">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {eventos.map((e) => {
                const actor = ACTOR[tipoActor(e.actor)];
                return (
                  <tr key={e.id}>
                    <td data-etiqueta="Fecha y hora">
                      <time dateTime={e.fecha}>{formatoFechaHora(e.fecha)}</time>
                    </td>
                    <td data-etiqueta="Natillera">{e.natilleraNombre}</td>
                    <td data-etiqueta="Quién">
                      <span className="bitacora__actor">
                        <span>{e.actor}</span>
                        <span className={`nt-badge nt-badge--${actor.variante}`}>
                          <Icono nombre={actor.icono} />
                          {actor.texto}
                        </span>
                      </span>
                    </td>
                    <td data-etiqueta="Acción" className="nt-tabla__principal">
                      {e.accion}
                    </td>
                    <td data-etiqueta="Detalle" className="bitacora__detalle">
                      {e.detalle}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
