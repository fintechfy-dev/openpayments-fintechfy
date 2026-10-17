import { createHmac, timingSafeEqual } from 'node:crypto';

// Firma de los webhooks de staging: X-Motor-Signature: t=<unix>,v1=<hmac>, donde hmac es el
// HMAC-SHA256 en hex de "{t}.{cuerpo}" con el signingSecret (telegram/INTEGRACION.md, sección 2).

// Un aviso firmado hace más de 5 minutos se descarta: así una copia capturada no sirve para repetirlo.
const TOLERANCIA_SEG = 300;

export function firmar(cuerpo, secreto, t) {
  return `t=${t},v1=${createHmac('sha256', secreto).update(`${t}.${cuerpo}`).digest('hex')}`;
}

export function verificarFirma(cabecera, cuerpo, secreto, ahoraSeg = Math.floor(Date.now() / 1000)) {
  if (typeof cabecera !== 'string') return false;
  const partes = Object.fromEntries(
    cabecera.split(',').map((p) => {
      const i = p.indexOf('=');
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()];
    }),
  );
  const t = Number(partes.t);
  if (!Number.isInteger(t) || !partes.v1 || Math.abs(ahoraSeg - t) > TOLERANCIA_SEG) return false;

  const esperada = Buffer.from(createHmac('sha256', secreto).update(`${t}.${cuerpo}`).digest('hex'));
  const recibida = Buffer.from(partes.v1);
  return esperada.length === recibida.length && timingSafeEqual(esperada, recibida);
}
