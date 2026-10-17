import { Icono } from "./Icono";

/** Un pago que la API de pagos simuló (no pasó por Open Payments): se dice con ícono y palabra, nunca solo color. */
export function MarcaSimulado() {
  return (
    <span className="nt-badge nt-badge--neutro">
      <Icono nombre="alerta" />
      Simulado
    </span>
  );
}
