import { setTimeout as dormir } from 'node:timers/promises';

// Avisos de staging por GET /api/events/stream (SSE), para cuando el bot corre sin URL pública. Cada
// mensaje es una cascada (cascade_executed o cascade_failed) que se pasa entera a `procesar`. Si el flujo
// se cae, reconecta. Lo que pase mientras está caído no llega: staging no repite avisos por aquí.

// Bloques separados por una línea vacía; de cada bloque, `event:` y las líneas `data:` (unidas con \n).
export async function* leerSse(flujo) {
  let resto = '';
  for await (const trozo of flujo.pipeThrough(new TextDecoderStream())) {
    resto += trozo;
    const bloques = resto.split(/\r?\n\r?\n/);
    resto = bloques.pop();
    for (const bloque of bloques) {
      let evento;
      const datos = [];
      for (const linea of bloque.split(/\r?\n/)) {
        if (linea.startsWith('event:')) evento = linea.slice(6).trim();
        else if (linea.startsWith('data:')) datos.push(linea.slice(5).replace(/^ /, ''));
      }
      if (datos.length > 0) yield { evento, datos: datos.join('\n') };
    }
  }
}

// Staging corta el flujo tras un rato sin tráfico (60 s en el sandbox). Si ya estaba abierto, se reconecta
// de una vez: cada segundo de espera es un aviso que se puede perder. Solo se espera si no logra abrir.
// Un flujo que se cierra apenas abre sí espera, para no quedar en un ciclo sin pausa.
export async function escucharFlujoDeAvisos({ servicio, procesar, log, signal, esperaMs = 5000, ahora = Date.now }) {
  let yaConectado = false;
  while (!signal.aborted) {
    let abierto = false;
    let desde = 0;
    try {
      const flujo = await servicio.abrirFlujoDeAvisos(signal);
      abierto = true;
      desde = ahora();
      if (!yaConectado) log.info('Escuchando los avisos de staging (flujo en vivo).');
      yaConectado = true;
      for await (const { datos } of leerSse(flujo)) {
        let json;
        try {
          json = JSON.parse(datos);
        } catch {
          continue;
        }
        await procesar(json).catch((error) => log.error('No se pudo procesar una cascada de staging:', error));
      }
    } catch (error) {
      if (signal.aborted) break;
      if (!abierto) log.warn(`No se pudo abrir el flujo de avisos de staging: ${error.message}. Reintento en ${esperaMs / 1000} s.`);
    }
    if (abierto && ahora() - desde >= esperaMs) continue;
    try {
      await dormir(esperaMs, undefined, { signal });
    } catch {
      break;
    }
  }
}
