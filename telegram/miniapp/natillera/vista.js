// Lo que ve un participante en la Mini App «Mi natillera», calculado a partir de los datos del
// servicio externo. Función pura: corre en el navegador y en las pruebas del bot (node:test).
//
// Los datos siguen la forma de web/src/lib/servicio/tipos.ts (Natillera, Participante, Pago), más lo
// que solo ve la persona: su tope autorizado y si puede pedir préstamo. El contrato definitivo sale
// de #5. Los textos siguen design-system/docs/voz-y-tono.md: el dato primero, sin culpa, y la plata
// siempre ubicada en Financiera Aliada. Nunca se muestra el estado de otra persona del grupo.

import { formatoCOP, formatoPorcentaje } from '../../src/formato.js';
import { PERIODICIDADES, formatoFecha } from '../../src/natillera/reglas.js';

const MAX_SEGMENTOS = 24;

// '2026-11-15T14:00:00Z' → '2026-11-15'. Los cobros son a las 9:00 a. m. de Bogotá: mismo día.
function dia(fechaIso) {
  return fechaIso ? String(fechaIso).slice(0, 10) : null;
}

function iniciales(nombre) {
  return nombre
    .split(/\s+/)
    .filter((p) => /^\p{Lu}/u.test(p))
    .slice(0, 2)
    .map((p) => p[0])
    .join('');
}

// Estado de cada cuota para la barra del design system (nt-cuota--pagada, --mora, --hoy).
export function segmentosDeCuotas({ cuotasTotales, periodoActual }, { cuotasPagadas }) {
  const segmentos = [];
  for (let i = 1; i <= cuotasTotales; i += 1) {
    if (i <= cuotasPagadas) segmentos.push('pagada');
    else if (i <= periodoActual) segmentos.push('mora');
    else if (i === Math.max(periodoActual, cuotasPagadas) + 1) segmentos.push('hoy');
    else segmentos.push('pendiente');
  }
  return segmentos;
}

export function armarVista({ natillera: n, yo, pagos = [], credito = null }) {
  const p = PERIODICIDADES[n.periodicidad];
  const arranco = n.periodoActual > 0;
  const cuotasPendientes = Math.max(0, n.periodoActual - yo.cuotasPagadas);
  const metaGrupo = n.cuotasTotales * n.valorCuota * n.numeroParticipantes;

  const vista = {
    nombreNatillera: n.nombre,
    estadoNatillera: n.estado,
    estadoParticipante: yo.estado,

    ahorro: {
      valor: formatoCOP(yo.aportado),
      detalle: arranco ? `${yo.cuotasPagadas} de ${n.cuotasTotales} cuotas` : 'Todavía no arranca el cobro',
      segmentos: n.cuotasTotales <= MAX_SEGMENTOS ? segmentosDeCuotas(n, yo) : [],
    },

    proxima: n.proximoCobro
      ? { titulo: `Tu próxima cuota: ${formatoCOP(n.valorCuota)}`, texto: `El ${formatoFecha(dia(n.proximoCobro))}, a las 9:00 a. m.` }
      : null,

    // Solo para la propia persona y sin culpa (guía de voz y tono, «Cuota sin fondos»).
    aviso: null,

    grupo: {
      valor: formatoCOP(n.saldoCustodia),
      porcentaje: metaGrupo > 0 ? Math.min(100, Math.round((n.saldoCustodia / metaGrupo) * 100)) : 0,
      texto: `Entre ${n.numeroParticipantes} personas. La plata la guarda Financiera Aliada, a nombre de la natillera.`,
    },

    liquidacion: {
      valor: formatoCOP(n.cuotasTotales * n.valorCuota),
      texto: `Si todo sigue así, el ${formatoFecha(dia(n.fechaFinal), { anio: true })} te llega a tu billetera.`,
    },

    credito: null,

    reglas: [
      { etiqueta: 'Cuota', valor: `${formatoCOP(n.valorCuota)} ${p.cada}` },
      { etiqueta: 'Fechas', valor: `Del ${formatoFecha(dia(n.fechaInicio))} al ${formatoFecha(dia(n.fechaFinal), { anio: true })}` },
      { etiqueta: 'Cuotas', valor: String(n.cuotasTotales) },
      { etiqueta: 'Mora diaria', valor: `${formatoPorcentaje(n.moraDiariaPct)} si una cuota queda pendiente` },
      { etiqueta: 'Cupo para arrancar', valor: `${n.cupoMinimo} personas` },
      { etiqueta: 'Administra', valor: n.administrador },
    ],
    autorizacion: yo.topeAutorizado
      ? `Autorizaste el cobro de tus cuotas, hasta ${formatoCOP(yo.topeAutorizado)} cada vez.`
      : 'Todavía no autorizas el cobro de tus cuotas.',

    // Solo nombres: el estado de cada quien no se expone ante el grupo.
    personas: n.participantes.map((x) => ({
      nombre: x.nombre,
      iniciales: iniciales(x.nombre),
      administra: x.nombre === n.administrador,
    })),

    pagos: [...pagos]
      .sort((a, b) => (a.creado < b.creado ? 1 : -1))
      .map((x) => ({
        titulo: x.tipo === 'cuota' ? 'Cuota' : x.tipo === 'deuda' ? 'Cuota pendiente' : 'Pago',
        monto: formatoCOP(x.monto),
        fecha: formatoFecha(dia(x.creado)),
        estado: x.estado,
        motivo: x.motivo ?? null,
      })),
  };

  if (!arranco) {
    const faltan = Math.max(0, n.cupoMinimo - n.numeroParticipantes);
    vista.arranque = {
      titulo: faltan > 0 ? `Faltan ${faltan} ${faltan === 1 ? 'persona' : 'personas'} para arrancar` : '¡Ya está el cupo completo!',
      texto: `Van ${n.numeroParticipantes} de ${n.cupoMinimo}. Cuando se complete, se cobra la primera cuota a todos el mismo día.`,
      porcentaje: Math.min(100, Math.round((n.numeroParticipantes / n.cupoMinimo) * 100)),
    };
  }

  if (cuotasPendientes > 0 || yo.deuda > 0) {
    vista.aviso = {
      titulo: `Tienes ${cuotasPendientes > 1 ? `${cuotasPendientes} cuotas pendientes` : 'una cuota pendiente'}: ${formatoCOP(yo.deuda)}`,
      texto: 'No pasa nada. Lo intentamos de nuevo mañana a las 9:00 a. m. Revisa que tu billetera tenga saldo.',
    };
  }

  // El préstamo es de la financiera, no de la natillera, y es aparte del ahorro (guía de voz y tono).
  if (credito?.disponible) {
    vista.credito = {
      titulo: `Financiera Aliada te puede prestar hasta ${formatoCOP(credito.montoMaximo)}`,
      texto: `Por llevar ${yo.cuotasPagadas} cuotas al día. Es aparte de la natillera: tu ahorro sigue intacto.`,
    };
  }

  return vista;
}
