// Reglas de US-001 para crear una natillera. Las usan el bot (src/) y la Mini App (miniapp/), por eso
// este archivo no importa nada de Node: corre igual en el navegador. El bot siempre vuelve a validar
// lo que llega de la Mini App. La unicidad del nombre la revisa el servicio externo (#5).
//
// Las fechas se manejan como texto 'AAAA-MM-DD', sin hora, en la zona de Bogotá.

import { formatoCOP, formatoPorcentaje } from '../formato.js';

export const NOMBRE_MIN = 3;
export const NOMBRE_MAX = 40;
export const CUPO_MIN = 3;
export const CUPO_MAX = 50;

// Solo mensual (#58): el servicio externo cuenta la periodicidad en meses enteros. Si algún día acepta
// días, basta con volver a agregar { dias: 7 } o { dias: 15 }: fechasDeCobro ya sabe contarlos.
export const PERIODICIDADES = Object.freeze({
  mensual: { texto: 'Mensual', cada: 'cada mes', meses: 1 },
});

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// ---------- Fechas ----------

export function hoyEnBogota(ahora = new Date()) {
  // en-CA da el formato AAAA-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(ahora);
}

function partes(iso) {
  const [a, m, d] = iso.split('-').map(Number);
  return { a, m, d };
}

function aIso(a, m, d) {
  return `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function diasDelMes(a, m) {
  return new Date(Date.UTC(a, m, 0)).getUTCDate();
}

export function sumarDias(iso, n) {
  const { a, m, d } = partes(iso);
  return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10);
}

// Suma meses sin pasarse del último día: 31 de enero + 1 mes = 28 (o 29) de febrero.
export function sumarMeses(iso, n) {
  const { a, m, d } = partes(iso);
  const total = a * 12 + (m - 1) + n;
  const anio = Math.floor(total / 12);
  const mes = (total % 12) + 1;
  return aIso(anio, mes, Math.min(d, diasDelMes(anio, mes)));
}

function esFechaReal(a, m, d) {
  return m >= 1 && m <= 12 && d >= 1 && d <= diasDelMes(a, m);
}

// Acepta 'AAAA-MM-DD' (botones y Mini App), 'DD/MM/AAAA' o 'DD-MM-AAAA', y 'DD/MM' (el año de `hoy`,
// o el siguiente si esa fecha ya pasó). Devuelve 'AAAA-MM-DD' o null.
export function leerFecha(texto, hoy) {
  const t = String(texto).trim();
  let a, m, d;
  let match = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) [, a, m, d] = match.map(Number);
  else if ((match = t.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/))) [, d, m, a] = match.map(Number);
  else if ((match = t.match(/^(\d{1,2})[/-](\d{1,2})$/))) {
    [, d, m] = match.map(Number);
    a = partes(hoy).a;
    if (esFechaReal(a, m, d) && aIso(a, m, d) < hoy) a += 1;
  } else return null;
  return esFechaReal(a, m, d) ? aIso(a, m, d) : null;
}

// '2026-11-15' → '15 de noviembre'; con { anio: true } → '15 de noviembre de 2026'.
export function formatoFecha(iso, { anio = false } = {}) {
  const { a, m, d } = partes(iso);
  return `${d} de ${MESES[m - 1]}${anio ? ` de ${a}` : ''}`;
}

// '2026-11-15' → '15/11/2026', el formato que se pide escribir.
export function formatoFechaCorta(iso) {
  const { a, m, d } = partes(iso);
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${a}`;
}

// Fechas de cobro entre inicio y final, ambas incluidas (US-001). La mensual se cuenta siempre desde
// la fecha de inicio para que el día no se corra (31 ene → 28 feb → 31 mar).
export function fechasDeCobro(inicio, final, periodicidad) {
  const p = PERIODICIDADES[periodicidad];
  if (!p || !inicio || !final || final < inicio) return [];
  const fechas = [];
  for (let k = 0; k < 400; k += 1) {
    const fecha = p.meses ? sumarMeses(inicio, k * p.meses) : sumarDias(inicio, k * p.dias);
    if (fecha > final) break;
    fechas.push(fecha);
  }
  return fechas;
}

// ---------- Números ----------

// Acepta '50000', '50.000' o '$50.000'. Devuelve un entero o NaN.
// El punto solo vale como separador de miles (grupos de 3): '5000.00' o '50.5' no se leen como
// 500.000 y 505, se rechazan.
export function leerMonto(texto) {
  const limpio = String(texto).trim().replace(/^\$\s*/, '');
  if (!/^\d{1,3}(\.\d{3})+$|^\d+$/.test(limpio)) return NaN;
  return Number(limpio.replace(/\./g, ''));
}

// Acepta '1', '1.5', '1,5' o '1,5 %'. Devuelve un número o NaN.
export function leerPorcentaje(texto) {
  const limpio = String(texto).trim().replace(/\s*%$/, '').replace(',', '.');
  return /^\d+(\.\d+)?$/.test(limpio) ? Number(limpio) : NaN;
}

// ---------- Validaciones: cada una devuelve { valor } o { error } ----------
// `limites` = { cuota: { min, max }, moraDiariaMaxPct }, que salen de la configuración del bot.

export function validarNombre(texto) {
  const nombre = String(texto).trim().replace(/\s+/g, ' ');
  if (nombre.length < NOMBRE_MIN || nombre.length > NOMBRE_MAX) {
    return { error: `El nombre debe tener entre ${NOMBRE_MIN} y ${NOMBRE_MAX} letras.` };
  }
  return { valor: nombre };
}

export function validarCuota(texto, limites) {
  const valor = leerMonto(texto);
  const { min, max } = limites.cuota;
  if (!(valor >= min && valor <= max)) {
    return { error: `La cuota debe estar entre ${formatoCOP(min)} y ${formatoCOP(max)}.` };
  }
  return { valor };
}

export function validarPeriodicidad(texto) {
  const t = String(texto).trim().toLowerCase();
  const clave = Object.keys(PERIODICIDADES).find((k) => k === t || PERIODICIDADES[k].texto.toLowerCase() === t);
  if (!clave) return { error: 'Por ahora la cuota se cobra cada mes. Escoge «Mensual».' };
  return { valor: clave };
}

// Dirección de billetera de Open Payments (US-005): 'https://host/ruta' o el atajo '$host/ruta'. Aquí
// solo se revisa la forma; que exista y maneje la misma moneda lo verifica el servicio de pagos (#19).
export const BILLETERA_MAX = 200;

export function validarBilletera(texto) {
  const limpio = String(texto).trim();
  const conEsquema = limpio.startsWith('$') ? `https://${limpio.slice(1)}` : limpio;
  const error = { error: 'Esa dirección no se ve bien. Escríbela completa, como https://ilp.interledger-test.dev/tu-nombre' };
  if (conEsquema.length > BILLETERA_MAX || /\s/.test(conEsquema)) return error;
  let url;
  try {
    url = new URL(conEsquema);
  } catch {
    return error;
  }
  if (url.protocol !== 'https:' || url.pathname.length < 2 || url.search || url.hash || url.username) return error;
  return { valor: `${url.origin}${url.pathname.replace(/\/+$/, '')}` };
}

export function validarInicio(texto, { hoy }) {
  const fecha = leerFecha(texto, hoy);
  if (!fecha) return { error: 'No entendí la fecha. Escríbela como día/mes/año.' };
  const limite = sumarMeses(hoy, 1);
  if (fecha < hoy || fecha > limite) {
    return { error: `La primera cuota debe ser entre hoy y el ${formatoFecha(limite)}.` };
  }
  return { valor: fecha };
}

export function validarFinal(texto, { hoy, inicio }) {
  // 'DD/MM' sin año se lee después de la primera cuota, no de hoy: con inicio el 1 de noviembre,
  // '31/10' es el 31 de octubre del año siguiente.
  const fecha = leerFecha(texto, inicio ?? hoy);
  if (!fecha) return { error: 'No entendí la fecha. Escríbela como día/mes/año.' };
  if (inicio) {
    const limite = sumarMeses(inicio, 12);
    if (fecha <= inicio) return { error: `La fecha final debe ser después del ${formatoFecha(inicio)}.` };
    if (fecha > limite) return { error: `La natillera puede durar hasta un año: máximo el ${formatoFecha(limite, { anio: true })}.` };
    // Siempre hay al menos una cuota: la primera es el día de inicio, y la final va después.
  }
  return { valor: fecha };
}

export function validarCupo(texto) {
  const t = String(texto).trim();
  const valor = /^\d+$/.test(t) ? Number(t) : NaN;
  if (!(valor >= CUPO_MIN)) return { error: `El cupo mínimo es de ${CUPO_MIN} personas, contándote a ti.` };
  if (valor > CUPO_MAX) return { error: `El cupo mínimo puede ser hasta ${CUPO_MAX} personas.` };
  return { valor };
}

export function validarMora(texto, limites) {
  const valor = leerPorcentaje(texto);
  const max = limites.moraDiariaMaxPct;
  if (!(valor >= 0 && valor <= max)) {
    return { error: `La mora diaria va de 0 % a ${formatoPorcentaje(max)}.` };
  }
  return { valor };
}

// Orden de las preguntas, con la etiqueta que se muestra al corregir.
export const CAMPOS = Object.freeze([
  { clave: 'nombre', etiqueta: 'Nombre' },
  { clave: 'cuota', etiqueta: 'Cuota' },
  { clave: 'periodicidad', etiqueta: 'Periodicidad' },
  { clave: 'inicio', etiqueta: 'Primera cuota' },
  { clave: 'final', etiqueta: 'Fecha final' },
  { clave: 'cupo', etiqueta: 'Cupo mínimo' },
  { clave: 'mora', etiqueta: 'Mora diaria' },
]);

// Valida un campo con lo que ya se sabe de los demás.
export function validarCampo(clave, texto, { limites, hoy, datos = {} }) {
  switch (clave) {
    case 'nombre': return validarNombre(texto);
    case 'cuota': return validarCuota(texto, limites);
    case 'periodicidad': return validarPeriodicidad(texto);
    case 'inicio': return validarInicio(texto, { hoy });
    case 'final': return validarFinal(texto, { hoy, inicio: datos.inicio });
    case 'cupo': return validarCupo(texto);
    case 'mora': return validarMora(texto, limites);
    default: return { error: 'Campo desconocido.' };
  }
}

// Valida todos los campos (lo que llega de la Mini App, o el resumen antes de crear).
// Devuelve { datos } con los que sirven y { errores } por clave, en el orden de CAMPOS.
export function validarNatillera(entrada, { limites, hoy }) {
  const datos = {};
  const errores = {};
  for (const { clave } of CAMPOS) {
    const crudo = entrada?.[clave];
    if (crudo === undefined || crudo === null || String(crudo).trim() === '') continue;
    const r = validarCampo(clave, String(crudo), { limites, hoy, datos });
    if (r.error) errores[clave] = r.error;
    else datos[clave] = r.valor;
  }
  return { datos, errores };
}

// ---------- Sugerencias para los botones del chat y la Mini App ----------

export function primeroDelMesSiguiente(hoy) {
  const { a, m } = partes(hoy);
  return sumarMeses(aIso(a, m, 1), 1);
}

// Hasta 4 montos redondos dentro de los límites; si no cabe ninguno, el mínimo y el máximo.
export function sugerenciasCuota({ min, max }) {
  const redondos = [10000, 20000, 50000, 100000, 200000, 500000].filter((v) => v >= min && v <= max);
  return redondos.length ? redondos.slice(0, 4) : [...new Set([min, max])];
}

export function sugerenciasMora(max) {
  const valores = [0, 0.5, 1, 2].filter((v) => v <= max);
  if (!valores.includes(max) && valores.length < 4) valores.push(max);
  return valores;
}

// Fechas finales cómodas: la de la cuota 3, 6 y 12, y el 31 de diciembre. Cada una con su número de
// cuotas. Solo las que cumplen la regla del año.
export function sugerenciasFinal(inicio, periodicidad) {
  if (!inicio || !PERIODICIDADES[periodicidad]) return [];
  const limite = sumarMeses(inicio, 12);
  const posibles = fechasDeCobro(inicio, limite, periodicidad);
  const opciones = [];
  for (const n of [3, 6, 12]) {
    if (posibles.length >= n) opciones.push({ fecha: posibles[n - 1], cuotas: n });
  }
  const diciembre = `${partes(inicio).a}-12-31`;
  if (diciembre > inicio && diciembre <= limite) {
    opciones.push({ fecha: diciembre, cuotas: fechasDeCobro(inicio, diciembre, periodicidad).length, diciembre: true });
  }
  const vistas = new Set();
  return opciones
    .filter((o) => o.cuotas > 1 && !vistas.has(o.fecha) && vistas.add(o.fecha))
    .sort((x, y) => (x.fecha < y.fecha ? -1 : 1));
}

export function resumenNatillera(datos) {
  const fechas = fechasDeCobro(datos.inicio, datos.final, datos.periodicidad);
  return {
    cuotas: fechas.length,
    fechas,
    porPersona: fechas.length * datos.cuota,
    grupoMinimo: fechas.length * datos.cuota * datos.cupo,
  };
}
