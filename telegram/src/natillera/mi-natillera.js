// Los datos de la Mini App «Mi natillera» (miniapp/natillera/) a partir de lo que hay en staging. Los arma
// el bot en /mi_natillera y viajan en el fragmento del enlace (#d=..., con codificarPanel de panel.js),
// igual que el panel del administrador: la Mini App no puede llamar a staging porque expondría el token.
// Funciones puras: corren en Node y en el navegador.
//
// La forma es la que espera armarVista (miniapp/natillera/vista.js). Nunca lleva el estado de otra
// persona del grupo: de los demás solo va el nombre (guía de voz y tono).

import { sumarMeses } from './reglas.js';
import { elegibilidad } from './prestamo.js';

// EstadoNatillera y EstadoParticipacion de staging → los estados de las insignias del design system.
const ESTADOS_NATILLERA = ['creada', 'iniciada', 'activa', 'liquidando', 'liquidando', 'cerrada', 'cerrada'];
const ESTADOS_PARTICIPANTE = ['sin_autorizar', 'validado', 'activo', 'en_mora', 'liquidado', 'liquidado', 'liquidado', 'liquidado'];
const NATILLERA_ACTIVA = 2;
const PARTICIPACION_LIQUIDADA = 6;

const numero = (v) => Number(v) || 0;
// Staging deja '0001-01-01' en las fechas que todavía no se fijan.
const fecha = (v) => (typeof v === 'string' && !v.startsWith('0001') ? v.slice(0, 10) : null);

// Los cobros de la persona. Staging no lista pagos: cuenta las cuotas pagadas y las pendientes. Cada una
// lleva la fecha simulada de su periodo (inicio + periodos), que es la que usa el reloj de staging.
export function cobrosDe(n, p) {
  const meses = numero(n.PeriodicidadMeses) || 1;
  const valor = numero(p.ValorCuota ?? n.ValorCuota);
  const pagadas = numero(p.CuotasPagadas);
  const adeudadas = numero(p.CuotasAdeudadas);
  const cobros = [];
  for (let i = 1; i <= pagadas + adeudadas; i += 1) {
    const pendiente = i > pagadas;
    cobros.push({
      id: `cuota-${i}`,
      tipo: pendiente ? 'deuda' : 'cuota',
      monto: valor,
      estado: pendiente ? 'pendiente' : 'completado',
      creado: sumarMeses(fecha(n.FechaInicio), (i - 1) * meses),
      motivo: pendiente ? 'No se pudo cobrar. Se intenta de nuevo cuando tu billetera tenga saldo.' : null,
    });
  }
  return cobros;
}

// fila: la natillera del registro del bot. n y p: los estados en staging (estadoDe) de la natillera y de
// la participación. personas: los nombres del grupo, en orden. administrador: su nombre, si se sabe.
// permiso: el último permiso real que pidió la persona (registro.permiso), si hay. solicitud: su última
// solicitud de préstamo. hoy: 'AAAA-MM-DD', para el plazo del préstamo.
export function datosDeMiNatillera({ fila, n, p, personas = [], administrador = null, nombre = null, permiso = null, solicitud = null, hoy }) {
  const estado = numero(n.EstadoNatillera);
  const estadoP = numero(p.EstadoParticipacion);
  const quedanCuotas = numero(n.PeriodoActual) < numero(n.NumeroCuotas);
  const prestamo = elegibilidad(n, p, { hoy, solicitud });

  return {
    natillera: {
      id: fila.natillera_id,
      nombre: String(n.NombreNatillera ?? fila.nombre),
      estado: ESTADOS_NATILLERA[estado] ?? 'creada',
      administrador: administrador ?? 'Quien la creó',
      valorCuota: numero(n.ValorCuota),
      periodicidad: numero(n.PeriodicidadMeses) === 1 ? 'mensual' : `cada ${numero(n.PeriodicidadMeses)} meses`,
      fechaInicio: fecha(n.FechaInicio),
      fechaFinal: fecha(n.FechaFinal),
      cuotasTotales: numero(n.NumeroCuotas),
      periodoActual: numero(n.PeriodoActual),
      cupoMinimo: numero(n.CupoMinimo),
      numeroParticipantes: numero(n.ParticipantesValidados),
      saldoCustodia: numero(n.SaldoNatillera),
      // Solo mientras quedan cuotas por cobrar y la natillera ya arrancó.
      proximoCobro: estado >= 1 && estado <= NATILLERA_ACTIVA && quedanCuotas ? fecha(n.FechaProximoCobro) : null,
      // Staging guarda la mora en fracción (0.01); la persona la lee en porcentaje (1 %).
      moraDiariaPct: Number((numero(n.PorcentajeMoraDiaria) * 100).toFixed(4)),
      participantes: personas.map((x) => ({ nombre: String(x || 'Sin nombre') })),
    },
    yo: {
      nombre: nombre ?? 'Tú',
      estado: ESTADOS_PARTICIPANTE[estadoP] ?? 'activo',
      cuotasPagadas: numero(p.CuotasPagadas),
      aportado: numero(p.TotalAportado),
      deuda: numero(p.DeudaCuotas) + numero(p.MoraAcumulada),
      autorizo: estadoP >= 1,
      // El tope solo se sabe del permiso real; con el de prueba no hay tope que mostrar.
      topeAutorizado: permiso ? numero(permiso.monto) : null,
      parteFinal: estadoP === PARTICIPACION_LIQUIDADA ? numero(p.ParteFinal) : null,
    },
    pagos: cobrosDe(n, p),
    credito: prestamo.puede ? { disponible: true, montoMaximo: prestamo.maximo } : null,
  };
}
