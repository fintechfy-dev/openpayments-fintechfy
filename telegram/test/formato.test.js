import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatoCOP, formatoPorcentaje } from '../src/formato.js';

test('formatoCOP sigue la guía: $ pegado, punto de miles y decimales solo si hay', () => {
  assert.equal(formatoCOP(100000), '$100.000');
  assert.equal(formatoCOP(5000), '$5.000');
  assert.equal(formatoCOP(1250.5), '$1.250,50');
  assert.equal(formatoCOP(1250.05), '$1.250,05');
  assert.equal(formatoCOP(999), '$999');
  assert.equal(formatoCOP(0), '$0');
  assert.equal(formatoCOP(-35700), '-$35.700');
});

test('formatoPorcentaje usa coma decimal', () => {
  assert.equal(formatoPorcentaje(2.5), '2,5 %');
  assert.equal(formatoPorcentaje(3), '3 %');
});
