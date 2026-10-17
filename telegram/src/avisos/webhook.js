import { createServer } from 'node:http';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { verificarFirma } from './firma.js';

// Avisos de staging por webhook, si el bot tiene una URL pública HTTPS (un túnel delante de
// AVISOS_PUERTO). La entrega no trae el nombre del evento, así que cada evento se registra con su propia
// URL, POST /avisos/<Evento>, y cada registro tiene su propio secreto de firma. Los secretos se guardan
// junto a la base del bot (telegram/data/, fuera de git), no en .env: son uno por evento.

const MAXIMO_BYTES = 1_000_000;

export const archivoDeSecretos = (dbPath) => join(dirname(dbPath), 'avisos-secretos.json');

export function leerSecretosDeAvisos(ruta) {
  if (!existsSync(ruta)) return {};
  return JSON.parse(readFileSync(ruta, 'utf8'));
}

export function guardarSecretosDeAvisos(ruta, secretos) {
  mkdirSync(dirname(ruta), { recursive: true });
  writeFileSync(ruta, `${JSON.stringify(secretos, null, 2)}\n`, { mode: 0o600 });
}

// `secretos`: { <Evento>: signingSecret }. `aviso(evento, datos)` es el del despachador.
export function manejadorDeAvisos({ secretos, aviso, log, ahoraSeg }) {
  return (req, res) => {
    const evento = req.method === 'POST' ? /^\/avisos\/([A-Za-z]+)$/.exec(req.url ?? '')?.[1] : undefined;
    const secreto = evento && Object.hasOwn(secretos, evento) ? secretos[evento] : undefined;
    if (!secreto) {
      res.writeHead(404).end();
      return;
    }
    const trozos = [];
    let bytes = 0;
    req.on('data', (trozo) => {
      bytes += trozo.length;
      if (bytes > MAXIMO_BYTES) {
        res.writeHead(413).end();
        req.destroy();
        return;
      }
      trozos.push(trozo);
    });
    req.on('end', () => {
      if (res.headersSent) return;
      const cuerpo = Buffer.concat(trozos).toString('utf8');
      if (!verificarFirma(req.headers['x-motor-signature'], cuerpo, secreto, ahoraSeg?.())) {
        log.warn(`Llegó un aviso ${evento} con firma inválida o vencida; se descarta.`);
        res.writeHead(401).end();
        return;
      }
      let datos;
      try {
        datos = JSON.parse(cuerpo);
      } catch {
        res.writeHead(400).end();
        return;
      }
      res.writeHead(204).end();
      aviso(evento, datos).catch((error) => log.error(`No se pudo procesar el aviso ${evento}:`, error));
    });
  };
}

export function iniciarWebhookDeAvisos({ puerto, secretos, aviso, log }) {
  const servidor = createServer(manejadorDeAvisos({ secretos, aviso, log }));
  servidor.listen(puerto, () =>
    log.info(`Avisos de staging por webhook en el puerto ${puerto} (${Object.keys(secretos).length} eventos en POST /avisos/<Evento>).`),
  );
  return servidor;
}
