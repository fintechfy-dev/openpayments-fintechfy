import { formatoCOP } from "@/lib/natillera";

/** Monto en pesos con el formato del design system ($100.000) y cifras tabulares. */
export function Dinero({ valor, className }: { valor: number; className?: string }) {
  return <span className={["nt-num", className].filter(Boolean).join(" ")}>{formatoCOP(valor)}</span>;
}
