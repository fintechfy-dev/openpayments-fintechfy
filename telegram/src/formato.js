// Formatos de la guía de voz y tono (design-system/docs/voz-y-tono.md).

function miles(entero) {
  return String(entero).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Igual que Natillera.formatoCOP de design-system/components/bundle.js, para que el bot y la web
// muestren el dinero igual: formatoCOP(100000) → "$100.000"; formatoCOP(1250.5) → "$1.250,50".
// No se usa Intl.NumberFormat("es-CO"): mete un espacio después del $ y no agrupa números de 4 cifras.
export function formatoCOP(valor) {
  let n = Number(valor) || 0;
  const negativo = n < 0;
  n = Math.abs(n);
  const centavos = Math.round(n * 100);
  const entero = Math.floor(centavos / 100);
  const dec = centavos % 100;
  const texto = `$${miles(entero)}${dec ? `,${dec < 10 ? '0' : ''}${dec}` : ''}`;
  return negativo ? `-${texto}` : texto;
}

// Para mensajes con parse_mode HTML: todo texto que escribió una persona pasa por aquí.
export function escaparHTML(texto) {
  return String(texto).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Porcentaje con coma decimal: 2.5 → "2,5 %".
export function formatoPorcentaje(valor) {
  return `${String(valor).replace('.', ',')} %`;
}
