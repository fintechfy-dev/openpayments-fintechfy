// Los datos del panel del administrador (miniapp/admin/). Los usan el bot, que los arma con lo que lee
// de staging, y la Mini App, que los muestra. Funciones puras: corren en Node y en el navegador.
//
// La Mini App vive en GitHub Pages y no puede llamar a staging (expondría el token del bot). Por eso el
// bot le pasa una foto de los datos en el fragmento del enlace (#d=...): el fragmento no sale del
// teléfono, no llega al servidor de Pages. Para ver datos nuevos se vuelve a abrir desde /administrar.

export const VERSION_PANEL = 1;
// Telegram no publica un límite para la URL de un botón de Mini App; con este tope el enlace queda
// corto y caben 5 natilleras con 30 personas cada una.
export const MAXIMO_PERSONAS = 30;

// EstadoNatillera y EstadoParticipacion de staging (web/INTEGRACION.md, «Los estados»).
const ESTADOS_NATILLERA = ['creada', 'iniciada', 'activa', 'liquidando', 'reembolsando', 'cerrada', 'cerrada_sin_cupo'];
const ESTADOS_PARTICIPACION = ['falta_autorizar', 'autorizo', 'activa', 'pendiente', 'liquidando', 'reembolso', 'liquidada', 'reembolsada'];

const numero = (v) => Number(v) || 0;

// fila: la natillera del registro del bot. n: su estado en staging (estadoDe). personas: [{ nombre, p, esAdmin }]
// con p el estado en staging de cada participación.
export function datosDeNatillera({ fila, n, personas, enlace }) {
  return {
    id: fila.natillera_id,
    nombre: String(n.NombreNatillera ?? fila.nombre),
    creada: String(fila.creada_en).slice(0, 10),
    estado: ESTADOS_NATILLERA[numero(n.EstadoNatillera)] ?? 'creada',
    cuota: numero(n.ValorCuota),
    cuotas: numero(n.NumeroCuotas),
    inicio: n.FechaInicio,
    final: n.FechaFinal,
    proximo: n.FechaProximoCobro ?? null,
    cupo: numero(n.CupoMinimo),
    listas: numero(n.ParticipantesValidados),
    pagaron: numero(n.PagosPrimeraCuota),
    periodo: numero(n.PeriodoActual),
    saldo: numero(n.SaldoNatillera),
    // Staging guarda la mora en fracción (0.01); aquí va en porcentaje, como la lee la persona.
    mora: Number((numero(n.PorcentajeMoraDiaria) * 100).toFixed(4)),
    enlace: enlace ?? null,
    personas: personas.slice(0, MAXIMO_PERSONAS).map(({ nombre, p, esAdmin }) => ({
      nombre: String(nombre || 'Sin nombre'),
      estado: ESTADOS_PARTICIPACION[numero(p.EstadoParticipacion)] ?? 'autorizo',
      pagadas: numero(p.CuotasPagadas),
      aportado: numero(p.TotalAportado),
      ...(esAdmin ? { tu: true } : {}),
    })),
  };
}

// base64url del JSON en UTF-8 (los nombres llevan tildes y eñes).
export function codificarPanel(natilleras, generado) {
  const json = JSON.stringify({ v: VERSION_PANEL, generado, natilleras });
  const bytes = new TextEncoder().encode(json);
  let binario = '';
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Devuelve null si el texto no es un panel válido: la Mini App muestra entonces los datos de ejemplo.
export function decodificarPanel(texto) {
  try {
    const base64 = String(texto).replace(/-/g, '+').replace(/_/g, '/');
    const binario = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
    const datos = JSON.parse(new TextDecoder().decode(Uint8Array.from(binario, (c) => c.charCodeAt(0))));
    if (datos?.v !== VERSION_PANEL || !Array.isArray(datos.natilleras)) return null;
    return datos;
  } catch {
    return null;
  }
}
