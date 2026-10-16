import { Icono } from "./Icono";

/** Recordatorio de quién guarda la plata: va donde se muestre dinero del grupo. */
export function BloqueCustodia({ financiera = "Financiera Aliada" }: { financiera?: string }) {
  return (
    <p className="bloque-custodia nt-card nt-card--calida">
      <Icono nombre="candado" />
      <span>
        La plata la guarda <b>{financiera}</b>. Nadie del grupo la puede sacar, ni el administrador.
      </span>
    </p>
  );
}
