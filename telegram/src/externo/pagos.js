// La única puerta del bot a la API de pagos (pagos/API.md, contrato en
// https://natillera-pagos.azurewebsites.net/api/openapi.json). El bot pide, consulta y cancela
// permisos, y cobra las cuotas que staging registra (externo/cobros.js); los demás pagos los hace
// staging. Ningún comando ni flujo hace fetch a esta API: reciben este
// cliente por parámetro, y así las pruebas corren sin red.

// Un 4xx/5xx de la API de pagos. El mensaje nombra la ruta, el estado y su `error`, nunca las llaves.
export class PagosError extends Error {
  constructor(ruta, estado, detalle) {
    super(`La API de pagos respondió ${estado} en ${ruta}${detalle ? `: ${detalle}` : ''}`);
    this.name = 'PagosError';
    this.estado = estado;
    this.detalle = detalle;
  }
}

export const PERMISO = Object.freeze({ PENDIENTE: 'pendiente', APROBADO: 'aprobado', RECHAZADO: 'rechazado', CANCELADO: 'cancelado' });

// El id que da la API (^p[0-9a-f]{16}$). Llega en /start permiso_<id>, que cualquiera puede escribir.
export const ID_PERMISO = /^p[0-9a-f]{16}$/;

function detalleDelError(texto) {
  try {
    return JSON.parse(texto).error || '';
  } catch {
    return texto.slice(0, 200);
  }
}

// `llaves`: { wallet, keyId, privateKey } de la billetera cliente de la app; privateKey en base64.
export function crearClientePagos({ url, apiKey, llaves, fetch = globalThis.fetch, timeoutMs = 30_000 }) {
  const base = url.replace(/\/+$/, '');
  const encabezadosOP = {
    'X-OP-Wallet-Address': llaves.wallet,
    'X-OP-Key-Id': llaves.keyId,
    'X-OP-Private-Key': llaves.privateKey,
  };

  async function llamar(metodo, ruta, cuerpo) {
    const res = await fetch(`${base}${ruta}`, {
      method: metodo,
      // Las llaves van en todas: la primera consulta después de la vuelta las necesita para terminar el
      // permiso, y en las demás la API las ignora.
      headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json', ...encabezadosOP },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const texto = await res.text();
    if (!res.ok) throw new PagosError(`${metodo} ${ruta}`, res.status, detalleDelError(texto));
    return texto ? JSON.parse(texto) : {};
  }

  return {
    // POST /api/permisos → 201 { permisoId, urlAprobacion }. `monto` es el tope total, en pesos;
    // `vuelta` es https y puede llevar {permisoId}.
    async pedirPermiso({ tipo, wallet, monto, referencia, vuelta }) {
      const respuesta = await llamar('POST', '/api/permisos', { tipo, wallet, monto, referencia, vuelta });
      if (!respuesta.permisoId || !respuesta.urlAprobacion) throw new PagosError('POST /api/permisos', 'sin permisoId o urlAprobacion');
      return respuesta;
    },

    // GET /api/permisos/{id} → { estado, grantId, motivo }. Si el participante ya volvió de su
    // billetera, esta consulta termina el permiso.
    estadoPermiso: (permisoId) => llamar('GET', `/api/permisos/${encodeURIComponent(permisoId)}`),

    // POST /api/permisos/{id}/cancelar → { estado: 'cancelado' }.
    cancelarPermiso: (permisoId) => llamar('POST', `/api/permisos/${encodeURIComponent(permisoId)}/cancelar`),

    // POST /api/open-payments/cobrar-cuota → { periodo, monto }. Saca la cuota de la billetera del
    // participante con su permiso y la deja en la cuenta madre. Idempotente por 5 minutos con el mismo
    // cuerpo; un 503 es que el pago sigue en curso.
    cobrarCuota: ({ grantId, walletOrigen, monto, referencia, periodo }) =>
      llamar('POST', '/api/open-payments/cobrar-cuota', { grantId, walletOrigen, monto, referencia, periodo }),
  };
}
