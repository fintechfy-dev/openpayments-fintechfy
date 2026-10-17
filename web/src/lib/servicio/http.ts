// Error de un sistema externo (staging o la API de pagos), con el estado HTTP si lo hubo. Su mensaje nunca
// lleva el token ni la llave: cada cliente los quita antes de lanzarlo.
export class ErrorServicio extends Error {
  constructor(
    message: string,
    readonly estadoHttp?: number,
    /** Para que la pantalla diga algo preciso: ya_respondida (otra persona se adelantó) o credito_incierto
     *  (se pidió el contrato y no se sabe si staging lo creó). */
    readonly codigo?: "ya_respondida" | "credito_incierto" | "sin_conexion",
  ) {
    super(message);
    this.name = "ErrorServicio";
  }
}
