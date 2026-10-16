import { PERIODICIDADES } from '../natillera/reglas.js';

// Staging pide cada parámetro tipado: { type, value }. Funciones puras, con su prueba.

export const texto = (value) => ({ type: 'Text', value: String(value) });
export const moneda = (value) => ({ type: 'Currency', value: Number(value) });
export const entero = (value) => ({ type: 'Integer', value: Number(value) });
export const fecha = (value) => ({ type: 'Date', value });
// Staging guarda el porcentaje como fracción (1 % = 0.01); el bot, como lo escribe la persona (2,5).
// toFixed corta el ruido de coma flotante: 2.5 / 100 = 0.025, no 0.025000000000000001.
export const porcentaje = (pct) => ({ type: 'Percentage', value: Number((Number(pct) / 100).toFixed(8)) });

// Parámetros de natillera-cuenta a partir de lo que confirmó el administrador (US-001) y de las reglas
// que fija la configuración del bot (US-001-CFG).
export function parametrosNatilleraCuenta(natilleraId, datos, reglasServicio) {
  const meses = PERIODICIDADES[datos.periodicidad]?.meses;
  // Staging cuenta la periodicidad en meses enteros (#58).
  if (!Number.isInteger(meses)) throw new Error(`Periodicidad sin equivalente en meses: ${datos.periodicidad}`);
  return {
    NatilleraId: texto(natilleraId),
    NombreNatillera: texto(datos.nombre),
    ValorCuota: moneda(datos.cuota),
    FechaInicio: fecha(datos.inicio),
    FechaFinal: fecha(datos.final),
    PeriodicidadMeses: entero(meses),
    CupoMinimo: entero(datos.cupo),
    PorcentajeMoraDiaria: porcentaje(datos.mora),
    DiasEsperaCupo: entero(reglasServicio.diasEsperaCupo),
    PagosParaPrestamo: entero(reglasServicio.pagosParaPrestamo),
    MultiploPrestamo: entero(reglasServicio.multiploPrestamo),
  };
}
