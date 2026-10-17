// Cuenta eventos por usuario en una ventana de tiempo: códigos pedidos y códigos fallidos.
// Vive en memoria: alcanza para la demo (un solo servidor); con varias instancias habría que compartirlo.

export const MAX_INTENTOS = 5;
export const VENTANA_MS = 10 * 60 * 1000;

export class LimitadorIntentos {
  private readonly fallos = new Map<string, number[]>();

  constructor(
    private readonly maximo = MAX_INTENTOS,
    private readonly ventana = VENTANA_MS,
  ) {}

  private recientes(clave: string, ahora: number) {
    const lista = (this.fallos.get(clave) ?? []).filter((t) => ahora - t < this.ventana);
    this.fallos.set(clave, lista);
    return lista;
  }

  bloqueado(clave: string, ahora = Date.now()) {
    return this.recientes(clave, ahora).length >= this.maximo;
  }

  registrarFallo(clave: string, ahora = Date.now()) {
    this.recientes(clave, ahora).push(ahora);
  }

  limpiar(clave: string) {
    this.fallos.delete(clave);
  }
}
