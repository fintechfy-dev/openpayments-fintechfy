import { EncabezadoPagina } from "./EncabezadoPagina";
import { EstadoVacio } from "./EstadoVacio";

/** Lo que ve la persona en una pantalla que todavía no lee de staging (#53): dicho tal cual, sin
 *  un error que invite a reintentar ni una lista vacía que parezca real. */
export function PantallaSinConectar({ titulo }: { titulo: string }) {
  return (
    <>
      <EncabezadoPagina titulo={titulo} />
      <EstadoVacio icono="reloj" titulo="Esta parte todavía no está conectada">
        Las natilleras ya muestran sus datos reales. Esta pantalla se conecta en el siguiente paso.
      </EstadoVacio>
    </>
  );
}
