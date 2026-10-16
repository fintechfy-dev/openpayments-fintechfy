// Datos de ejemplo de «Mi natillera» mientras no exista el contrato con el servicio externo (#5).
// Son la natillera «Los Primos» de los datos de prueba de la web (web/src/lib/servicio/mock.ts), vista
// por una de sus participantes, en tres momentos que sirven para la demo: ?caso=al-dia (por defecto),
// ?caso=pendiente y ?caso=nueva.

const BASE = {
  id: 'los-primos',
  nombre: 'Los Primos',
  estado: 'activa',
  administrador: 'Andrés Restrepo',
  valorCuota: 50000,
  periodicidad: 'mensual',
  fechaInicio: '2026-01-15T14:00:00Z',
  fechaFinal: '2026-12-15T14:00:00Z',
  cuotasTotales: 12,
  periodoActual: 10,
  cupoMinimo: 3,
  numeroParticipantes: 5,
  saldoCustodia: 2451500,
  proximoCobro: '2026-11-15T14:00:00Z',
  moraDiariaPct: 0.1,
  participantes: [
    { nombre: 'Andrés Restrepo' },
    { nombre: 'Marta Restrepo' },
    { nombre: 'Don Jairo Gómez' },
    { nombre: 'Luisa Fernanda Ríos' },
    { nombre: 'Camilo Restrepo' },
  ],
};

// Cobros mensuales del 15, de enero en adelante.
function cuotas(cuantas, { fallidaAl } = {}) {
  const pagos = [];
  for (let i = 1; i <= cuantas; i += 1) {
    const mes = String(i).padStart(2, '0');
    pagos.push({ id: `c${i}`, tipo: 'cuota', monto: 50000, estado: 'completado', creado: `2026-${mes}-15T14:00:00Z` });
  }
  if (fallidaAl) {
    const mes = String(fallidaAl).padStart(2, '0');
    pagos.push({
      id: `c${fallidaAl}`,
      tipo: 'cuota',
      monto: 50000,
      estado: 'fallido',
      motivo: 'Tu billetera no tenía saldo suficiente.',
      creado: `2026-${mes}-15T14:00:00Z`,
    });
  }
  return pagos;
}

export const CASOS = {
  'al-dia': {
    etiqueta: 'Al día',
    datos: {
      natillera: BASE,
      yo: { nombre: 'Marta Restrepo', estado: 'activo', cuotasPagadas: 10, aportado: 500000, deuda: 0, topeAutorizado: 50000 },
      pagos: cuotas(10),
      credito: { disponible: true, montoMaximo: 300000 },
    },
  },
  pendiente: {
    etiqueta: 'Cuota pendiente',
    datos: {
      natillera: BASE,
      yo: { nombre: 'Marta Restrepo', estado: 'en_mora', cuotasPagadas: 9, aportado: 450000, deuda: 51500, topeAutorizado: 50000 },
      pagos: cuotas(9, { fallidaAl: 10 }),
      credito: null,
    },
  },
  nueva: {
    etiqueta: 'Recién creada',
    datos: {
      natillera: {
        ...BASE,
        estado: 'creada',
        fechaInicio: '2026-11-15T14:00:00Z',
        fechaFinal: '2026-12-15T14:00:00Z',
        cuotasTotales: 2,
        periodoActual: 0,
        cupoMinimo: 5,
        numeroParticipantes: 3,
        saldoCustodia: 0,
        proximoCobro: null,
        participantes: BASE.participantes.slice(0, 3),
      },
      yo: { nombre: 'Marta Restrepo', estado: 'validado', cuotasPagadas: 0, aportado: 0, deuda: 0, topeAutorizado: 50000 },
      pagos: [],
      credito: null,
    },
  },
};

export const CASO_POR_DEFECTO = 'al-dia';
