import { PERIODICIDADES } from '../natillera/reglas.js';

// Staging pide cada parámetro tipado: { type, value }. Funciones puras, con su prueba.

export const texto = (value) => ({ type: 'Text', value: String(value) });
export const moneda = (value) => ({ type: 'Currency', value: Number(value) });
export const entero = (value) => ({ type: 'Integer', value: Number(value) });
export const fecha = (value) => ({ type: 'Date', value });
// Staging guarda el porcentaje como fracción (1 % = 0.01); el bot, como lo escribe la persona (2,5).
// toFixed corta el ruido de coma flotante: 2.5 / 100 = 0.025, no 0.025000000000000001.
export const porcentaje = (pct) => ({ type: 'Percentage', value: Number((Number(pct) / 100).toFixed(8)) });
// Lo que ya viene de staging está en fracción: se pasa tal cual.
export const fraccion = (valor) => ({ type: 'Percentage', value: Number(valor) });

// Parámetros de natillera-participacion (US-004). Lo de la natillera se copia de su estado en staging
// (estadoDe), no de lo que el bot recuerde: así la participación nace con las reglas vigentes.
export function parametrosParticipacion({ participacionId, natilleraId, telegramId, billetera }, natillera) {
  return {
    ParticipacionId: texto(participacionId),
    NatilleraId: texto(natilleraId),
    ParticipanteId: texto(telegramId),
    WalletParticipante: texto(billetera),
    ValorCuota: moneda(natillera.ValorCuota),
    NumeroCuotas: entero(natillera.NumeroCuotas),
    PorcentajeMoraDiaria: fraccion(natillera.PorcentajeMoraDiaria),
    PagosParaPrestamo: entero(natillera.PagosParaPrestamo),
    MultiploPrestamo: entero(natillera.MultiploPrestamo),
    FechaInicio: fecha(natillera.FechaInicio),
  };
}

// Mientras no exista el servicio de pagos (#19), el permiso es de prueba y su id lo dice.
export const GRANT_DE_PRUEBA = 'grant-prueba-';

export function parametrosConfirmarAutorizacion(grantId) {
  return { PermisoAprobado: entero(1), BilleteraVerificada: entero(1), GrantId: texto(grantId) };
}

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
