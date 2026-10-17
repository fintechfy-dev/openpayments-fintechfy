import { listarPagos, saludPagos, usaRegistroDePagos, usaStaging, type Pago } from "@/lib/servicio";
import { filtrarPorNatillera, requerirSesion } from "@/lib/sesion";
import { avisoEstadoApi } from "./presentacion";
import { RegistroPagos } from "./RegistroPagos";
import "./pagos.css";

export const metadata = { title: "Registro de pagos" };

// El jurado lo mira en vivo: nada de caché.
export const dynamic = "force-dynamic";

// US-007-RPT: cada pago con sus cuatro etapas de Open Payments. Los datos iniciales salen del servidor
// y RegistroPagos los refresca desde /api/pagos.
export default async function Pagina() {
  const sesion = await requerirSesion();
  // Si la primera lectura falla (llave mala, API caída), la pantalla se monta igual: avisa la falla, sigue
  // mostrando el estado de la API de pagos y el refresco cada 3 s lo reintenta solo.
  const [lectura, salud] = await Promise.all([
    listarPagos()
      .then((p) => filtrarPorNatillera(sesion, p))
      .then((pagos): { pagos: Pago[]; fallo: boolean } => ({ pagos, fallo: false }))
      .catch((e: unknown) => {
        console.error("No se pudo leer el registro de pagos", e);
        return { pagos: [], fallo: true };
      }),
    saludPagos(),
  ]);
  return (
    <RegistroPagos
      inicial={lectura.pagos}
      falloInicial={lectura.fallo}
      leidoEn={lectura.fallo ? null : new Date().toISOString()}
      sinRegistroDePagos={usaStaging && !usaRegistroDePagos}
      estadoApi={avisoEstadoApi(salud)}
    />
  );
}
