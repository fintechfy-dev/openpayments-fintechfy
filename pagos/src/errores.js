// El servicio externo no lee el cuerpo de un error: al contrato le cuenta "http-<código>".
// Por eso cada fallo sale con un código que se entienda solo:
//   400 cuerpo inválido · 401 llave · 402 sin fondos o tope del permiso · 403 permiso no aprobado
//   404 no existe · 422 datos que no cuadran · 502 Open Payments falló · 503 el pago sigue en curso.
// Un 4xx (salvo 429) es definitivo para staging; un 5xx lo reintenta a los 2, 10 y 60 segundos.
export class ErrorHttp extends Error {
  constructor(estado, motivo) {
    super(motivo);
    this.estado = estado;
    this.motivo = motivo;
  }
}
