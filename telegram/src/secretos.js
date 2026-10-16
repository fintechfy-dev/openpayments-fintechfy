// Secretos que nunca pueden salir en un log ni en un mensaje de Telegram (US-002-SEC).

export const TAPADO = '***';

// Deja solo los secretos con valor: un secreto vacío taparía cualquier texto.
export function listaDeSecretos(...valores) {
  return valores.filter((valor) => typeof valor === 'string' && valor.trim() !== '');
}

export function taparSecretos(texto, secretos) {
  let resultado = texto;
  for (const secreto of secretos) resultado = resultado.replaceAll(secreto, TAPADO);
  return resultado;
}

export function contieneSecreto(texto, secretos) {
  return secretos.some((secreto) => texto.includes(secreto));
}
