import { formatoFechaHora } from "@/lib/fechas";
import { ICONO_ETAPA, NOMBRE_ETAPA, TEXTO_DIRECCION, TEXTO_ESTADO_ETAPA, TEXTO_TIPO, describirEtapas, etapasOrdenadas, horaExacta } from "@/lib/pagos";
import type { EstadoEtapa, Pago } from "@/lib/servicio/tipos";
import { Badge } from "./Badge";
import { Dinero } from "./Dinero";
import { Icono } from "./Icono";
import "./LineaTiempoPago.css";

const CLASE_PASO: Record<EstadoEtapa, string> = {
  hecha: "nt-linea__paso--hecho",
  actual: "nt-linea__paso--actual",
  fallida: "nt-linea__paso--fallido",
  pendiente: "",
};
const DETALLE_POR_DEFECTO: Record<EstadoEtapa, string> = {
  hecha: "Hecha",
  actual: "En curso",
  fallida: "No se pudo completar",
  pendiente: "Pendiente",
};

interface Props {
  pago: Pago;
  /** Nivel del título de la tarjeta según la página donde va. */
  nivelTitulo?: 2 | 3;
  id?: string;
}

/**
 * Recorrido completo de un pago por sus 4 etapas de Open Payments (Solicitud, Autorización, Ejecución, Finalización),
 * con el detalle técnico y la hora exacta de cada una. Si falló, dice el motivo en palabras simples.
 * Ver design-system/components/LineaTiempoPago.
 */
export function LineaTiempoPago({ pago, nivelTitulo = 3, id }: Props) {
  const Titulo = nivelTitulo === 2 ? "h2" : "h3";
  return (
    <section className="nt-card linea-pago" id={id} aria-label={`Línea de tiempo: ${TEXTO_TIPO[pago.tipo]} de ${pago.participanteNombre}`}>
      <div className="nt-card__cabeza">
        <Titulo className="nt-card__titulo">
          {TEXTO_TIPO[pago.tipo]} · {pago.participanteNombre}
        </Titulo>
        <Badge tipo="pago" estado={pago.estado} />
      </div>
      <dl className="linea-pago__resumen">
        <div>
          <dt>Monto</dt>
          <dd>
            <Dinero valor={pago.monto} />
          </dd>
        </div>
        <div>
          <dt>Natillera</dt>
          <dd>{pago.natilleraNombre}</dd>
        </div>
        <div>
          <dt>Dirección</dt>
          <dd>{TEXTO_DIRECCION[pago.direccion]}</dd>
        </div>
        <div>
          <dt>Creado</dt>
          <dd>
            <time dateTime={pago.creado}>{formatoFechaHora(pago.creado)}</time>
          </dd>
        </div>
      </dl>
      <ol className="nt-linea">
        {etapasOrdenadas(pago).map((etapa) => (
          <li key={etapa.nombre} className={["nt-linea__paso", CLASE_PASO[etapa.estado]].filter(Boolean).join(" ")}>
            <span className="nt-linea__marca">
              <Icono nombre={ICONO_ETAPA[etapa.estado]} />
            </span>
            <div>
              <div className="nt-linea__titulo">
                {NOMBRE_ETAPA[etapa.nombre]}
                <span className="solo-lectores">: {TEXTO_ESTADO_ETAPA[etapa.estado]}</span>
              </div>
              {etapa.estado === "fallida" ? <div className="nt-linea__motivo">{pago.motivo ?? "No se pudo completar"}</div> : null}
              <div className="nt-linea__detalle">{etapa.detalle ?? DETALLE_POR_DEFECTO[etapa.estado]}</div>
            </div>
            <span className="nt-linea__hora">
              {etapa.fecha ? (
                <time dateTime={etapa.fecha}>{horaExacta(etapa.fecha)}</time>
              ) : (
                <>
                  <span aria-hidden="true">—</span>
                  <span className="solo-lectores">sin hora todavía</span>
                </>
              )}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/**
 * Las 4 etapas como marcas compactas en orden fijo (para tablas). Las marcas son decorativas;
 * el estado de cada etapa va en texto para lectores de pantalla.
 */
export function EtapasCompactas({ pago }: { pago: Pago }) {
  const etapas = etapasOrdenadas(pago);
  return (
    <span className="etapas-compactas">
      <span className="etapas-compactas__marcas" aria-hidden="true">
        {etapas.map((e) => (
          <span key={e.nombre} className={`etapa-marca etapa-marca--${e.estado}`} title={`${NOMBRE_ETAPA[e.nombre]}: ${TEXTO_ESTADO_ETAPA[e.estado]}`}>
            <Icono nombre={ICONO_ETAPA[e.estado]} />
          </span>
        ))}
      </span>
      <span className="solo-lectores">{describirEtapas(pago)}</span>
    </span>
  );
}
