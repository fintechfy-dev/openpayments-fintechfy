"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { Aviso } from "@/components/Aviso";
import { Badge } from "@/components/Badge";
import { MarcaSimulado } from "@/components/MarcaSimulado";
import { BloqueCustodia } from "@/components/BloqueCustodia";
import { Dinero } from "@/components/Dinero";
import { EncabezadoPagina } from "@/components/EncabezadoPagina";
import { EstadoVacio } from "@/components/EstadoVacio";
import { Icono } from "@/components/Icono";
import { EtapasCompactas, LineaTiempoPago } from "@/components/LineaTiempoPago";
import { formatoFechaHora, formatoHora } from "@/lib/fechas";
import {
  FILTROS,
  ICONO_ETAPA,
  NOMBRE_ETAPA,
  TEXTO_ESTADO_ETAPA,
  TEXTO_DIRECCION,
  textoTipo,
  anunciarPago,
  contarPagos,
  contarPorFiltro,
  etapaFallida,
  filtrarPagos,
  ordenarRecientes,
  pagosRecienTerminados,
  type FiltroPagos,
} from "@/lib/pagos";
import type { EstadoEtapa, Pago } from "@/lib/servicio/tipos";
import { avisoSinOpenPayments, type AvisoPagos } from "./presentacion";

/** Cada cuánto se consulta /api/pagos mientras la pestaña está a la vista. */
const INTERVALO_MS = 3000;

const VACIO_POR_FILTRO: Record<FiltroPagos, string> = {
  todos: "Todavía no hay pagos",
  completados: "No hay pagos completados",
  fallidos: "No hay pagos fallidos",
  en_curso: "No hay pagos en curso",
};

interface Props {
  inicial: Pago[];
  /** Cuándo leyó el servidor los datos iniciales (ISO). */
  /** null si nunca hubo una lectura buena (la primera falló): no se dice una hora que no existe. */
  leidoEn: string | null;
  /** La primera lectura en el servidor falló: se muestra el aviso de falla y el refresco lo reintenta. */
  falloInicial?: boolean;
  /** El estado de la API de pagos (presentacion.ts); null si la web no la tiene configurada. */
  estadoApi?: AvisoPagos | null;
}

/** Registro de pagos para el jurado (US-007-RPT): se refresca solo cada 3 s y anuncia solo pagos que terminan. */
export function RegistroPagos({ inicial, leidoEn: leidoInicial, falloInicial = false, estadoApi = null }: Props) {
  const [pagos, setPagos] = useState<Pago[]>(() => ordenarRecientes(inicial));
  const avisoOpenPayments = avisoSinOpenPayments(pagos);
  const [leidoEn, setLeidoEn] = useState(leidoInicial);
  const [fallo, setFallo] = useState(falloInicial);
  const [anuncio, setAnuncio] = useState({ texto: "", vez: 0 });
  const [filtro, setFiltro] = useState<FiltroPagos>("todos");
  // null = el usuario cerró la línea de tiempo. Si el pago elegido ya no está, se muestra el más reciente.
  const [elegidoId, setElegidoId] = useState<string | null>(() => ordenarRecientes(inicial)[0]?.id ?? null);
  const anteriores = useRef<Pago[]>(inicial);

  useEffect(() => {
    let temporizador: ReturnType<typeof setTimeout> | undefined;
    let control: AbortController | undefined;
    let montado = true;

    function programar() {
      clearTimeout(temporizador);
      if (montado && document.visibilityState === "visible") temporizador = setTimeout(consultar, INTERVALO_MS);
    }

    async function consultar() {
      control?.abort();
      const mio = new AbortController();
      control = mio;
      try {
        const respuesta = await fetch("/api/pagos", { cache: "no-store", signal: mio.signal });
        if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
        const datos: unknown = await respuesta.json();
        if (!Array.isArray(datos)) throw new Error("Respuesta inesperada");
        const nuevos = ordenarRecientes(datos as Pago[]);
        const terminados = pagosRecienTerminados(anteriores.current, nuevos);
        anteriores.current = nuevos;
        if (terminados.length > 0) setAnuncio((a) => ({ texto: terminados.map(anunciarPago).join(" "), vez: a.vez + 1 }));
        setPagos(nuevos);
        setLeidoEn(new Date().toISOString());
        setFallo(false);
      } catch {
        if (mio.signal.aborted) return; // la pestaña se ocultó o salió otra consulta: no es una falla
        setFallo(true);
      }
      programar(); // también tras una falla: se reintenta solo
    }

    function alCambiarVisibilidad() {
      if (document.visibilityState === "visible") {
        void consultar();
      } else {
        clearTimeout(temporizador);
        control?.abort();
      }
    }

    programar();
    document.addEventListener("visibilitychange", alCambiarVisibilidad);
    return () => {
      montado = false;
      clearTimeout(temporizador);
      control?.abort();
      document.removeEventListener("visibilitychange", alCambiarVisibilidad);
    };
  }, []);

  const conteo = contarPagos(pagos);
  const porFiltro = contarPorFiltro(pagos);
  const visibles = filtrarPagos(pagos, filtro);
  const elegido = elegidoId === null ? null : (visibles.find((p) => p.id === elegidoId) ?? visibles[0] ?? null);

  return (
    <div className="registro">
      <EncabezadoPagina
        titulo="Registro de pagos"
        descripcion="Cada pago con sus cuatro etapas de Open Payments: Solicitud, Autorización, Ejecución y Finalización. Se actualiza solo cada pocos segundos; lo más reciente va primero."
      >
        {leidoEn ? (
          <p className="registro__actualizado">
            <span className="registro__vivo" aria-hidden="true" />
            Actualizado a las <time dateTime={leidoEn}>{formatoHora(leidoEn)}</time>
          </p>
        ) : null}
      </EncabezadoPagina>

      {estadoApi ? (
        <Aviso tipo={estadoApi.tipo} titulo={estadoApi.titulo} anunciar={false}>
          {estadoApi.texto}
        </Aviso>
      ) : null}

      {/* Con los pagos de cada refresco: si llega uno simulado, el aviso aparece sin recargar. */}
      {avisoOpenPayments ? (
        <Aviso tipo={avisoOpenPayments.tipo} titulo={avisoOpenPayments.titulo} anunciar={false}>
          {avisoOpenPayments.texto}
        </Aviso>
      ) : null}

      {fallo ? (
        <p className="registro__fallo" role="status">
          <Icono nombre="alerta" tamano="sm" />
          <span>
            {leidoEn
              ? `No pudimos actualizar el registro. Lo seguimos intentando solo; lo que ves es de las ${formatoHora(leidoEn)}`
              : "No pudimos leer el registro de pagos. Lo seguimos intentando solo."}
          </span>
        </p>
      ) : null}

      {/* Solo anuncia pagos que acaban de completarse o fallar, no cada refresco. */}
      <div className="solo-lectores" aria-live="polite" aria-atomic="true">
        {/* key cambia en cada anuncio: así se vuelve a leer aunque el texto se repita. */}
        <span key={anuncio.vez}>{anuncio.texto}</span>
      </div>

      <div className="pila">
        <section aria-labelledby="registro-resumen">
          <h2 id="registro-resumen" className="solo-lectores">
            Resumen de pagos
          </h2>
          <div className="grilla-datos">
            <Dato etiqueta="Pagos procesados" valor={conteo.procesados} />
            <Dato etiqueta="Completados" valor={conteo.completados} variante="exito" />
            <Dato etiqueta="Fallidos" valor={conteo.fallidos} variante="error" />
            <Dato etiqueta="En curso" valor={conteo.enCurso} variante="info" />
          </div>
        </section>

        <BloqueCustodia />

        <section aria-labelledby="registro-lista">
          <div className="registro__cabeza-lista">
            <h2 id="registro-lista" className="seccion__titulo">
              Pagos
            </h2>
            <div className="registro__filtros" role="group" aria-label="Filtrar pagos por estado">
              {FILTROS.map((f) => (
                <button
                  key={f.valor}
                  type="button"
                  className={`nt-btn nt-btn--sm ${filtro === f.valor ? "nt-btn--primario" : "nt-btn--secundario"}`}
                  aria-pressed={filtro === f.valor}
                  onClick={() => setFiltro(f.valor)}
                >
                  {f.texto} <span className="nt-num">({porFiltro[f.valor]})</span>
                </button>
              ))}
            </div>
          </div>

          <Leyenda />

          {/* Sin ninguna lectura buena, "no hay pagos" sería falso: no lo sabemos. */}
          {leidoEn === null && pagos.length === 0 ? (
            <EstadoVacio icono="billetera" titulo="Todavía no pudimos traer los pagos">
              Apenas el registro responda, aparecen aquí con sus cuatro etapas.
            </EstadoVacio>
          ) : visibles.length === 0 ? (
            <EstadoVacio icono="billetera" titulo={VACIO_POR_FILTRO[filtro]}>
              {filtro === "todos" ? "Cuando se cobre la primera cuota o se haga un pago, aparece aquí con sus cuatro etapas." : "Prueba con otro filtro."}
            </EstadoVacio>
          ) : (
            <div className="nt-tabla-marco">
              <table className="nt-tabla tabla-apilable registro__tabla">
                <caption className="solo-lectores">Pagos, los más recientes primero. Elige un pago para ver su línea de tiempo.</caption>
                <thead>
                  <tr>
                    <th scope="col">Fecha y hora</th>
                    <th scope="col">Participante</th>
                    <th scope="col">Tipo</th>
                    <th scope="col" className="nt-tabla__num">
                      Monto
                    </th>
                    <th scope="col" className="registro__th-etapas">
                      Etapas
                      <span className="registro__orden">Solicitud · Autorización · Ejecución · Finalización</span>
                    </th>
                    <th scope="col">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((pago) => {
                    const abierto = elegido?.id === pago.id;
                    const fallida = etapaFallida(pago);
                    const idLinea = `linea-${pago.id}`;
                    return (
                      <Fragment key={pago.id}>
                        <tr className={abierto ? "registro__fila registro__fila--elegida" : "registro__fila"}>
                          <td data-etiqueta="Fecha y hora">
                            <time dateTime={pago.creado}>{formatoFechaHora(pago.creado)}</time>
                          </td>
                          <td data-etiqueta="Participante" className="nt-tabla__principal">
                            <div className="registro__celda">
                              <button
                                type="button"
                                className="registro__elegir"
                                aria-expanded={abierto}
                                aria-controls={abierto ? idLinea : undefined}
                                onClick={() => setElegidoId(abierto ? null : pago.id)}
                              >
                                <span className="solo-lectores">{abierto ? "Ocultar" : "Ver"} la línea de tiempo del pago de </span>
                                {pago.participanteNombre}
                              </button>
                              <span className="registro__secundario">{pago.natilleraNombre}</span>
                            </div>
                          </td>
                          <td data-etiqueta="Tipo">
                            <div className="registro__celda">
                              <span>{textoTipo(pago.tipo)}</span>
                              <span className="registro__secundario">{TEXTO_DIRECCION[pago.direccion]}</span>
                            </div>
                          </td>
                          <td data-etiqueta="Monto" className="nt-tabla__num">
                            <Dinero valor={pago.monto} />
                          </td>
                          <td data-etiqueta="Etapas">
                            <EtapasCompactas pago={pago} />
                          </td>
                          <td data-etiqueta="Estado">
                            <div className="registro__celda">
                              <Badge tipo="pago" estado={pago.estado} />
                              {pago.simulado ? <MarcaSimulado /> : null}
                              {pago.estado === "fallido" ? (
                                <span className="registro__motivo">
                                  {fallida ? `Falló en ${NOMBRE_ETAPA[fallida.nombre]}: ` : ""}
                                  {pago.motivo ?? "sin motivo informado"}
                                </span>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                        {abierto ? (
                          <tr className="registro__detalle">
                            <td data-etiqueta="" colSpan={6}>
                              <LineaTiempoPago pago={pago} id={idLinea} />
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

const LEYENDA: EstadoEtapa[] = ["hecha", "actual", "fallida", "pendiente"];

/** Cómo leer las marcas de etapa. Para lectores de pantalla cada fila ya dice el estado de sus etapas. */
function Leyenda() {
  return (
    <div className="registro__leyenda" aria-hidden="true">
      <span>Etapas en orden: Solicitud · Autorización · Ejecución · Finalización.</span>
      <span className="registro__leyenda-marcas">
        {LEYENDA.map((l) => (
          <span key={l} className="registro__leyenda-item">
            <span className={`etapa-marca etapa-marca--${l}`}>
              <Icono nombre={ICONO_ETAPA[l]} />
            </span>
            {TEXTO_ESTADO_ETAPA[l]}
          </span>
        ))}
      </span>
    </div>
  );
}

function Dato({ etiqueta, valor, variante }: { etiqueta: string; valor: number; variante?: "exito" | "error" | "info" }) {
  return (
    <div className="nt-card">
      <div className="nt-dato">
        <span className="nt-dato__etiqueta">{etiqueta}</span>
        <span className={["nt-dato__valor", "nt-dato__valor--md", variante && `registro__dato--${variante}`].filter(Boolean).join(" ")}>{valor}</span>
      </div>
    </div>
  );
}
