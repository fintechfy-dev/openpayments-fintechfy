import Link from "next/link";
import { EstadoVacio } from "@/components/EstadoVacio";

export default function NoEncontrado() {
  return (
    <EstadoVacio icono="alerta" titulo="No encontramos esta página">
      Puede que la dirección esté mal escrita. <Link href="/natilleras">Volver a las natilleras</Link>
    </EstadoVacio>
  );
}
