import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  fechasDeCobro,
  formatoFecha,
  formatoFechaCorta,
  hoyEnBogota,
  leerFecha,
  primeroDelMesSiguiente,
  resumenNatillera,
  sugerenciasCuota,
  sugerenciasFinal,
  sugerenciasMora,
  sumarMeses,
  validarCupo,
  validarCuota,
  validarFinal,
  validarInicio,
  validarMora,
  validarNatillera,
  validarNombre,
  validarPeriodicidad,
} from '../src/natillera/reglas.js';

const HOY = '2026-10-16';
const LIMITES = { cuota: { min: 10000, max: 500000 }, moraDiariaMaxPct: 2.5 };

test('número de cuotas: fechas de cobro entre inicio y final, ambas incluidas (US-001)', () => {
  // El ejemplo de la historia: del 1 de noviembre al 1 de diciembre, mensual = 2 cuotas.
  assert.deepEqual(fechasDeCobro('2026-11-01', '2026-12-01', 'mensual'), ['2026-11-01', '2026-12-01']);
  // Si el rango no calza exacto, solo cuentan las que caen dentro.
  assert.equal(fechasDeCobro('2026-11-01', '2026-11-30', 'mensual').length, 1);
  assert.equal(fechasDeCobro('2026-11-01', '2026-11-29', 'semanal').length, 5);
  assert.equal(fechasDeCobro('2026-11-01', '2026-12-01', 'quincenal').length, 3);
  // La mensual no corre el día: 31 ene → 28 feb → 31 mar.
  assert.deepEqual(fechasDeCobro('2027-01-31', '2027-03-31', 'mensual'), ['2027-01-31', '2027-02-28', '2027-03-31']);
  assert.deepEqual(fechasDeCobro('2026-12-01', '2026-11-01', 'mensual'), []);
});

test('fechas: leer, sumar y escribir', () => {
  assert.equal(leerFecha('2026-11-15', HOY), '2026-11-15');
  assert.equal(leerFecha('15/11/2026', HOY), '2026-11-15');
  assert.equal(leerFecha('5-1-2027', HOY), '2027-01-05');
  assert.equal(leerFecha('15/11', HOY), '2026-11-15');
  assert.equal(leerFecha('01/10', HOY), '2027-10-01', 'sin año y ya pasó: el año siguiente');
  assert.equal(leerFecha('31/02/2027', HOY), null);
  assert.equal(leerFecha('mañana', HOY), null);
  assert.equal(sumarMeses('2026-01-31', 1), '2026-02-28');
  assert.equal(sumarMeses('2026-11-15', 2), '2027-01-15');
  assert.equal(primeroDelMesSiguiente(HOY), '2026-11-01');
  assert.equal(primeroDelMesSiguiente('2026-12-20'), '2027-01-01');
  assert.equal(formatoFecha('2026-11-01'), '1 de noviembre');
  assert.equal(formatoFecha('2026-12-31', { anio: true }), '31 de diciembre de 2026');
  assert.equal(formatoFechaCorta('2026-11-01'), '01/11/2026');
  assert.equal(hoyEnBogota(new Date('2026-10-17T03:00:00Z')), '2026-10-16', 'a las 10 p. m. de Bogotá sigue siendo el 16');
});

test('validaciones de cada campo con su mensaje', () => {
  assert.deepEqual(validarNombre('  Los   Primos '), { valor: 'Los Primos' });
  assert.ok(validarNombre('LP').error);

  assert.deepEqual(validarCuota('$50.000', LIMITES), { valor: 50000 });
  assert.equal(validarCuota('5000', LIMITES).error, 'La cuota debe estar entre $10.000 y $500.000.');
  assert.ok(validarCuota('mil', LIMITES).error);

  assert.deepEqual(validarPeriodicidad('Mensual'), { valor: 'mensual' });
  assert.ok(validarPeriodicidad('anual').error);

  assert.deepEqual(validarInicio(HOY, { hoy: HOY }), { valor: HOY });
  assert.deepEqual(validarInicio('16/11/2026', { hoy: HOY }), { valor: '2026-11-16' });
  assert.equal(validarInicio('17/11/2026', { hoy: HOY }).error, 'La primera cuota debe ser entre hoy y el 16 de noviembre.');
  assert.ok(validarInicio('15/10/2026', { hoy: HOY }).error);

  const base = { hoy: HOY, inicio: '2026-11-01', periodicidad: 'mensual' };
  assert.deepEqual(validarFinal('01/12/2026', base), { valor: '2026-12-01' });
  assert.equal(validarFinal('01/11/2026', base).error, 'La fecha final debe ser después del 1 de noviembre.');
  assert.match(validarFinal('02/11/2027', base).error, /hasta un año: máximo el 1 de noviembre de 2027/);

  assert.ok(validarCupo('2').error);
  assert.deepEqual(validarCupo('3'), { valor: 3 });
  assert.ok(validarCupo('51').error);

  assert.deepEqual(validarMora('1,5 %', LIMITES), { valor: 1.5 });
  assert.deepEqual(validarMora('0', LIMITES), { valor: 0 });
  assert.equal(validarMora('3', LIMITES).error, 'La mora diaria va de 0 % a 2,5 %.');
});

test('validarNatillera separa lo que sirve de lo que no', () => {
  const entrada = {
    nombre: 'Los Primos',
    cuota: 50000,
    periodicidad: 'mensual',
    inicio: '2026-11-01',
    final: '2026-12-01',
    cupo: 5,
    mora: 1,
  };
  const ok = validarNatillera(entrada, { limites: LIMITES, hoy: HOY });
  assert.deepEqual(ok.errores, {});
  assert.deepEqual(ok.datos, entrada);
  assert.deepEqual(resumenNatillera(ok.datos), {
    cuotas: 2,
    fechas: ['2026-11-01', '2026-12-01'],
    porPersona: 100000,
    grupoMinimo: 500000,
  });

  const mal = validarNatillera({ ...entrada, cuota: 1, final: '2026-10-01', extra: 'x' }, { limites: LIMITES, hoy: HOY });
  assert.deepEqual(Object.keys(mal.errores), ['cuota', 'final']);
  assert.equal(mal.datos.cuota, undefined);
  assert.equal(mal.datos.extra, undefined, 'campos que no existen se ignoran');
});

test('sugerencias para los botones', () => {
  assert.deepEqual(sugerenciasCuota(LIMITES.cuota), [10000, 20000, 50000, 100000]);
  assert.deepEqual(sugerenciasCuota({ min: 1, max: 9 }), [1, 9]);
  assert.deepEqual(sugerenciasMora(2.5), [0, 0.5, 1, 2]);
  assert.deepEqual(sugerenciasMora(1.5), [0, 0.5, 1, 1.5]);
  assert.deepEqual(sugerenciasFinal('2026-11-01', 'mensual'), [
    { fecha: '2026-12-31', cuotas: 2, diciembre: true },
    { fecha: '2027-01-01', cuotas: 3 },
    { fecha: '2027-04-01', cuotas: 6 },
    { fecha: '2027-10-01', cuotas: 12 },
  ]);
  // El 31 de diciembre aparece cuando da más de una cuota.
  assert.deepEqual(sugerenciasFinal('2026-11-01', 'semanal')[0], { fecha: '2026-11-15', cuotas: 3 });
  assert.ok(sugerenciasFinal('2026-11-01', 'semanal').some((o) => o.diciembre && o.cuotas === 9));
  assert.deepEqual(sugerenciasFinal(undefined, 'mensual'), []);
});
