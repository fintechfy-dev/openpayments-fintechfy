import { inspect } from 'node:util';
import { taparSecretos } from './secretos.js';

// Logger con hora que tapa los secretos en todo lo que escribe, también en errores y objetos.

function aTexto(parte) {
  return typeof parte === 'string' ? parte : inspect(parte, { depth: 4 });
}

export function crearLogger({ secretos = [] } = {}) {
  const escribir = (nivel, salida, partes) => {
    const linea = partes.map(aTexto).join(' ');
    salida(`[${new Date().toISOString()}] ${nivel} ${taparSecretos(linea, secretos)}`);
  };

  return {
    info: (...partes) => escribir('INFO ', console.log, partes),
    warn: (...partes) => escribir('WARN ', console.warn, partes),
    error: (...partes) => escribir('ERROR', console.error, partes),
  };
}
