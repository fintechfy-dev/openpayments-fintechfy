import { listarPagos, usaStaging } from "@/lib/servicio";
import { natillerasVisibles, requerirSesion } from "@/lib/sesion";
import { RegistroPagos } from "./RegistroPagos";
import "./pagos.css";

export const metadata = { title: "Registro de pagos" };

// El jurado lo mira en vivo: nada de caché.
export const dynamic = "force-dynamic";

// US-007-RPT: cada pago con sus cuatro etapas de Open Payments. Los datos iniciales salen del servidor
// y RegistroPagos los refresca desde /api/pagos.
export default async function Pagina() {
  const sesion = await requerirSesion();
  const visibles = await natillerasVisibles(sesion);
  const pagos = (await listarPagos()).filter((p) => visibles.has(p.natilleraId));
  return <RegistroPagos inicial={pagos} leidoEn={new Date().toISOString()} sinOpenPayments={usaStaging} />;
}
