// Logger mínimo con hora. En la tarea 2 se le agrega el tapado de secretos.

function escribir(nivel, salida, partes) {
  salida(`[${new Date().toISOString()}] ${nivel}`, ...partes);
}

export function crearLogger() {
  return {
    info: (...partes) => escribir('INFO ', console.log, partes),
    warn: (...partes) => escribir('WARN ', console.warn, partes),
    error: (...partes) => escribir('ERROR', console.error, partes),
  };
}
