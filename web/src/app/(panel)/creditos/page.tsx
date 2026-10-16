import { Badge } from "@/components/Badge";
import { Dinero } from "@/components/Dinero";
import { EncabezadoPagina } from "@/components/EncabezadoPagina";
import { EstadoVacio } from "@/components/EstadoVacio";
import { Icono } from "@/components/Icono";
import { formatoFecha } from "@/lib/fechas";
import { redirect } from "next/navigation";
import { listarSolicitudesCredito, type SolicitudCredito } from "@/lib/servicio";
import { requerirSesion } from "@/lib/sesion";
import { puedeResponderCreditos } from "@/lib/sesion/acceso";
import { AvisoRespuestas } from "./AvisoRespuestas";
import { agruparSolicitudes, textoAhorro, textoCondiciones, textoPendientes } from "./logica";
import { RespuestaSolicitud } from "./RespuestaSolicitud";
import "./creditos.css";

export const metadata = { title: "Créditos" };

// Las solicitudes cambian cuando un participante pide un préstamo por el bot.
export const dynamic = "force-dynamic";

const FINANCIERA = "Financiera Aliada";

export default async function Pagina() {
  // Solo la financiera presta; un administrador no ve solicitudes de otras personas.
  if (!puedeResponderCreditos(await requerirSesion())) redirect("/natilleras");
  const solicitudes = await listarSolicitudesCredito();
  const { porResponder, respondidas } = agruparSolicitudes(solicitudes);

  return (
    <>
      <EncabezadoPagina titulo="Solicitudes de crédito" descripcion={textoPendientes(porResponder.length)} />

      <div className="pila">
        <p className="bloque-custodia nt-card nt-card--calida">
          <Icono nombre="candado" />
          <span>
            El préstamo lo da <b>{FINANCIERA}</b> y va aparte de la natillera: el ahorro del participante sigue intacto. Los montos, la cuota y el
            máximo vienen del servicio de lógica financiera.
          </span>
        </p>

        {solicitudes.length === 0 ? (
          <EstadoVacio icono="credito" titulo="Todavía no hay solicitudes">
            Cuando un participante pida un préstamo por el bot, aparece aquí para que lo apruebes o no.
          </EstadoVacio>
        ) : (
          <AvisoRespuestas>
            <section className="pila-corta" aria-labelledby="por-responder">
              <h2 className="seccion__titulo" id="por-responder">
                Por responder
              </h2>
              {porResponder.length === 0 ? (
                <p className="nt-muted creditos-nada">No hay solicitudes esperando tu respuesta.</p>
              ) : (
                <TablaSolicitudes solicitudes={porResponder} conAcciones />
              )}
            </section>

            <section className="pila-corta" aria-labelledby="respondidas">
              <h2 className="seccion__titulo" id="respondidas">
                Respondidas
              </h2>
              {respondidas.length === 0 ? (
                <p className="nt-muted creditos-nada">Aún no has respondido ninguna solicitud.</p>
              ) : (
                <TablaSolicitudes solicitudes={respondidas} />
              )}
            </section>
          </AvisoRespuestas>
        )}
      </div>
    </>
  );
}

function TablaSolicitudes({ solicitudes, conAcciones = false }: { solicitudes: SolicitudCredito[]; conAcciones?: boolean }) {
  return (
    <div className="nt-tabla-marco">
      <table className="nt-tabla tabla-apilable tabla-creditos">
        <thead>
          <tr>
            <th scope="col">Participante</th>
            <th scope="col">Ahorro</th>
            <th scope="col" className="nt-tabla__num">
              Pide
            </th>
            <th scope="col" className="nt-tabla__num">
              Cuota mensual
            </th>
            <th scope="col">Estado</th>
            <th scope="col">{conAcciones ? "Pedida" : "Respondida"}</th>
            {conAcciones ? (
              <th scope="col">
                <span className="solo-lectores">Acciones</span>
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {solicitudes.map((s) => (
            <tr key={s.id}>
              <td className="nt-tabla__principal" data-etiqueta="Participante">
                <span className="celda-doble">
                  {s.participanteNombre}
                  <span className="celda-doble__sub">{s.natilleraNombre}</span>
                </span>
              </td>
              <td data-etiqueta="Ahorro">
                <span className="celda-doble">
                  {textoAhorro(s)}
                  <span className="celda-doble__sub">
                    Máximo <Dinero valor={s.montoMaximo} />
                  </span>
                </span>
              </td>
              <td className="nt-tabla__num" data-etiqueta="Pide">
                <Dinero valor={s.montoSolicitado} />
              </td>
              <td className="nt-tabla__num" data-etiqueta="Cuota mensual">
                <span className="celda-doble">
                  <Dinero valor={s.cuotaMensual} />
                  <span className="celda-doble__sub">{textoCondiciones(s)}</span>
                </span>
              </td>
              <td data-etiqueta="Estado">
                <Badge tipo="credito" estado={s.estado} />
              </td>
              {conAcciones ? (
                <td data-etiqueta="Pedida">{formatoFecha(s.fechaSolicitud)}</td>
              ) : (
                <td data-etiqueta="Respondida">
                  <span className="celda-doble">
                    {s.fechaRespuesta ? formatoFecha(s.fechaRespuesta) : "Sin fecha"}
                    <span className="celda-doble__sub">Pedida el {formatoFecha(s.fechaSolicitud)}</span>
                  </span>
                </td>
              )}
              {conAcciones ? (
                <td data-etiqueta="" className="tabla-creditos__acciones">
                  <RespuestaSolicitud id={s.id} participante={s.participanteNombre} />
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
