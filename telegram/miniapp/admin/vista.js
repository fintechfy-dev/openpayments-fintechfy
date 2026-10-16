// Lo que ve el administrador en el panel (miniapp/admin/), calculado a partir de los datos que arma el
// bot con src/natillera/panel.js. Función pura: corre en el navegador y en las pruebas del bot.
// Textos según design-system/docs/voz-y-tono.md: el dato primero, sin culpa, la plata ubicada.

import { formatoCOP, formatoPorcentaje } from '../../src/formato.js';
import { formatoFecha } from '../../src/natillera/reglas.js';
import { invitacionSinEnlace, textoInvitacion } from '../../src/natillera/invitacion.js';

// Insignias con las variantes e íconos del design system (.nt-badge--x). Las del participante dicen lo
// que el administrador necesita saber, sin palabras de culpa.
export const INSIGNIAS = Object.freeze({
  natillera: {
    creada: { variante: 'neutro', icono: 'punto', texto: 'Esperando gente' },
    iniciada: { variante: 'info', icono: 'calendario', texto: 'Arrancando' },
    activa: { variante: 'exito', icono: 'check', texto: 'Activa' },
    liquidando: { variante: 'celebra', icono: 'premio', texto: 'Repartiendo' },
    reembolsando: { variante: 'neutro', icono: 'reloj', texto: 'Devolviendo' },
    cerrada: { variante: 'neutro', icono: 'candado', texto: 'Cerrada' },
    cerrada_sin_cupo: { variante: 'neutro', icono: 'candado', texto: 'No arrancó' },
  },
  persona: {
    falta_autorizar: { variante: 'aviso', icono: 'reloj', texto: 'Falta autorizar' },
    autorizo: { variante: 'info', icono: 'check', texto: 'Autorizó' },
    activa: { variante: 'exito', icono: 'cuota', texto: 'Al día' },
    pendiente: { variante: 'aviso', icono: 'reloj', texto: 'Cuota pendiente' },
    liquidando: { variante: 'celebra', icono: 'premio', texto: 'Recibiendo su parte' },
    reembolso: { variante: 'neutro', icono: 'reloj', texto: 'En devolución' },
    liquidada: { variante: 'celebra', icono: 'premio', texto: 'Recibió su parte' },
    reembolsada: { variante: 'neutro', icono: 'check', texto: 'Devuelto' },
  },
});

const ANTES_DE_ARRANCAR = new Set(['creada', 'iniciada']);
const porcentaje = (parte, total) => (total > 0 ? Math.min(100, Math.round((parte / total) * 100)) : 0);
const plural = (n, una, varias) => `${n} ${n === 1 ? una : varias}`;

export function iniciales(nombre) {
  return String(nombre)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

// La barra principal: cuánta gente falta para arrancar, o en qué cuota va.
function progreso(d) {
  if (d.estado === 'creada') {
    const faltan = Math.max(0, d.cupo - d.listas);
    return {
      titulo: `Van ${d.listas} de ${d.cupo} personas listas`,
      porcentaje: porcentaje(d.listas, d.cupo),
      texto: faltan
        ? `Arranca el ${formatoFecha(d.inicio)} si se completan ${plural(d.cupo, 'persona', 'personas')}. ${faltan === 1 ? 'Falta 1' : `Faltan ${faltan}`}.`
        : `Ya está el cupo. Arranca el ${formatoFecha(d.inicio)}.`,
    };
  }
  if (d.estado === 'iniciada') {
    return {
      titulo: `Van ${d.pagaron} de ${d.cupo} que pagaron la primera cuota`,
      porcentaje: porcentaje(d.pagaron, d.cupo),
      texto: `Arranca cuando ${plural(d.cupo, 'persona pague', 'personas paguen')} la primera cuota.`,
    };
  }
  return {
    titulo: `Cuota ${d.periodo} de ${d.cuotas}`,
    porcentaje: porcentaje(d.periodo, d.cuotas),
    texto: d.proximo ? `El próximo cobro es el ${formatoFecha(d.proximo)}.` : 'Ya no quedan cuotas por cobrar.',
  };
}

function persona(p, conAporte) {
  return {
    nombre: p.nombre,
    iniciales: iniciales(p.nombre),
    tu: Boolean(p.tu),
    insignia: INSIGNIAS.persona[p.estado] ?? INSIGNIAS.persona.autorizo,
    detalle: conAporte ? `${plural(p.pagadas, 'cuota', 'cuotas')} · ${formatoCOP(p.aportado)}` : null,
  };
}

export function armarPanel(d) {
  const antes = ANTES_DE_ARRANCAR.has(d.estado);
  const faltan = d.personas.filter((p) => p.estado === 'falta_autorizar').length;
  return {
    id: d.id,
    nombre: d.nombre,
    creada: `Creada el ${formatoFecha(d.creada, { anio: true })}`,
    insignia: INSIGNIAS.natillera[d.estado] ?? INSIGNIAS.natillera.creada,
    progreso: progreso(d),
    saldo: antes
      ? null
      : { valor: formatoCOP(d.saldo), texto: 'La guarda Financiera Aliada, a nombre de la natillera, no el administrador.' },
    personas: {
      titulo: plural(d.personas.length, 'persona', 'personas'),
      resumen: faltan ? `${plural(faltan, 'persona', 'personas')} todavía no ${faltan === 1 ? 'autoriza' : 'autorizan'} el cobro.` : null,
      vacio: d.personas.length ? null : 'Todavía no se ha unido nadie. Comparte el enlace con tu grupo.',
      lista: d.personas.map((p) => persona(p, !antes)),
    },
    reglas: [
      { etiqueta: 'Cuota', valor: `${formatoCOP(d.cuota)} cada mes` },
      { etiqueta: 'Fechas', valor: `Del ${formatoFecha(d.inicio)} al ${formatoFecha(d.final, { anio: true })}` },
      { etiqueta: 'Cuotas', valor: String(d.cuotas) },
      { etiqueta: 'Cupo para arrancar', valor: plural(d.cupo, 'persona', 'personas') },
      { etiqueta: 'Mora diaria', valor: `${formatoPorcentaje(d.mora)} si una cuota queda pendiente` },
    ],
    // Solo mientras recibe gente: después del arranque el enlace ya no inscribe a nadie.
    invitar:
      d.estado === 'creada' && d.enlace
        ? { enlace: d.enlace, compartir: invitacionSinEnlace(d.nombre), copiar: textoInvitacion(d.nombre, d.enlace) }
        : null,
  };
}

// Para el selector cuando administra varias: el nombre y, como dos pueden llamarse igual, la fecha.
export const etiquetaDeNatillera = (d) => ({ nombre: d.nombre, fecha: formatoFecha(d.creada) });
