// El bot le avisa a la web cada cosa que crea, porque staging no lista nada y la web guarda la lista
// (telegram/INTEGRACION.md, sección 3). La web ignora los repetidos por id, así que reintentar es seguro.

const INTENTOS = 3;

export function crearAvisoWeb({ url, apiKey, log, fetch = globalThis.fetch, esperar = (ms) => new Promise((r) => setTimeout(r, ms)), timeoutMs = 10_000 }) {
  const base = url.replace(/\/+$/, '');

  // Nunca lanza: lo creado en staging ya existe y la persona no debe ver un error por esto. Si se
  // agotan los intentos, el log deja el cuerpo para cargarlo a mano en la web.
  async function avisar(ruta, cuerpo) {
    for (let intento = 1; intento <= INTENTOS; intento += 1) {
      try {
        const res = await fetch(`${base}${ruta}`, {
          method: 'POST',
          headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify(cuerpo),
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (res.ok) return true;
        // Un 4xx no se arregla reintentando (llave o cuerpo malos).
        if (res.status < 500) {
          log.error(`La web rechazó ${ruta} con ${res.status}. Cuerpo para cargarlo a mano:`, cuerpo);
          return false;
        }
        log.warn(`La web respondió ${res.status} en ${ruta} (intento ${intento} de ${INTENTOS}).`);
      } catch (error) {
        log.warn(`No se pudo avisar a la web en ${ruta} (intento ${intento} de ${INTENTOS}): ${error.message}`);
      }
      if (intento < INTENTOS) await esperar(1000 * 2 ** (intento - 1));
    }
    log.error(`La web no recibió ${ruta}. Cuerpo para cargarlo a mano:`, cuerpo);
    return false;
  }

  return {
    natillera: (cuerpo) => avisar('/api/indice/natilleras', cuerpo),
  };
}
