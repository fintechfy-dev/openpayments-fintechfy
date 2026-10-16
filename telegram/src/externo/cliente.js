// La única puerta del bot al servicio externo de staging. Sigue el OpenAPI del ecosistema
// (GET /api/ecosystems/FND-20261015-natillera-2/openapi). Ningún comando ni flujo hace fetch a staging:
// reciben este cliente por parámetro, y así las pruebas corren sin red.

// Un 4xx/5xx de staging. El mensaje nombra la ruta, el estado y el `detail` del problem+json (RFC 9457),
// nunca el token ni el cuerpo enviado.
export class ServicioExternoError extends Error {
  constructor(ruta, estado, detalle) {
    super(`El servicio externo respondió ${estado} en ${ruta}${detalle ? `: ${detalle}` : ''}`);
    this.name = 'ServicioExternoError';
    this.estado = estado;
    this.detalle = detalle;
  }
}

// Una acción que las reglas de staging no dejaron correr: un 400 (precondición bloqueante) o un 200 en
// el que todas sus funciones traen preconditionFailed.
export class AccionRechazadaError extends Error {
  constructor(trigger, motivo) {
    super(`Staging rechazó ${trigger}${motivo ? `: ${motivo}` : ''}`);
    this.name = 'AccionRechazadaError';
    this.motivo = motivo;
  }
}

// Rechazada solo si todas fallaron: un trigger corre las funciones que le aplican y basta con que una
// pase. Sin results[] no hay de dónde saber que falló, y se da por hecha.
export function motivoDeRechazo(respuesta) {
  const resultados = Array.isArray(respuesta?.results) ? respuesta.results : [];
  if (resultados.length === 0 || !resultados.every((r) => r?.preconditionFailed === true)) return null;
  return resultados[0].summary || 'precondición no cumplida';
}

function detalleDelProblema(texto) {
  try {
    const problema = JSON.parse(texto);
    return problema.detail || problema.title || '';
  } catch {
    return texto.slice(0, 200);
  }
}

export function crearClienteExterno({ url, token, fetch = globalThis.fetch, timeoutMs = 15_000 }) {
  const base = url.replace(/\/+$/, '');

  async function llamar(metodo, ruta, cuerpo) {
    const res = await fetch(`${base}${ruta}`, {
      method: metodo,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const texto = await res.text();
    if (!res.ok) throw new ServicioExternoError(`${metodo} ${ruta}`, res.status, detalleDelProblema(texto));
    return texto ? JSON.parse(texto) : {};
  }

  return {
    // POST /api/contracts → { contractId, correlationId, ... }
    async crearContrato(templateName, parameters) {
      const respuesta = await llamar('POST', '/api/contracts', { templateName, parameters });
      if (!respuesta.contractId) throw new ServicioExternoError('POST /api/contracts', 'sin contractId');
      return respuesta;
    },

    // POST /api/contracts/{id}/triggers. Lanza AccionRechazadaError si sus reglas no la dejaron correr.
    async disparar(contractId, trigger, parameters = {}) {
      let respuesta;
      try {
        respuesta = await llamar('POST', `/api/contracts/${encodeURIComponent(contractId)}/triggers`, { trigger, parameters });
      } catch (error) {
        if (error instanceof ServicioExternoError && error.estado === 400) throw new AccionRechazadaError(trigger, error.detalle);
        throw error;
      }
      const motivo = motivoDeRechazo(respuesta);
      if (motivo) throw new AccionRechazadaError(trigger, motivo);
      return respuesta;
    },

    // POST /api/webhooks. La respuesta trae el signingSecret una sola vez.
    registrarWebhook(urlAvisos, events) {
      return llamar('POST', '/api/webhooks', { url: urlAvisos, events });
    },

    // GET /api/events/stream (SSE, eventos cascade_executed y cascade_failed). Devuelve el cuerpo sin
    // leer: es un flujo que no termina.
    async abrirFlujoDeAvisos(signal) {
      const ruta = '/api/events/stream';
      const res = await fetch(`${base}${ruta}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
        signal,
      });
      if (!res.ok || !res.body) throw new ServicioExternoError(`GET ${ruta}`, res.status);
      return res.body;
    },
  };
}
