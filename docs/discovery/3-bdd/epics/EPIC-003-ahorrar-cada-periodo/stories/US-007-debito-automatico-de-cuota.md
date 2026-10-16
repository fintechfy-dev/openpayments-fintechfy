# US-007 — Que mi cuota se debite automáticamente de mi billetera hacia…

> Sesión `natillera-2` · Fase 2 · Origen: USMD T19, T20 · PDF E-12 · respuestas del equipo sobre morosos

## User Story
**Como** Participante de la natillera que ahorra para tener su dinero en diciembre, **quiero** que mi cuota se debite automáticamente de mi billetera hacia la billetera del grupo en cada periodo, **para** ahorrar con disciplina sin depender de acordarme

## Description
Cada periodo (minutos en la demo) se cobra la cuota con el permiso ya otorgado. Si el cobro falla por falta de fondos, el participante queda en mora y se registra lo que queda debiendo; la mora diaria y el recordatorio están en US-017.

## Epic
- Parent: EPIC-003 — Ahorrar cada periodo
- Priority in Epic: 1
- Complexity: Alta
- Depends on: US-006

## INVEST Validation
- [x] Independent (depende de US-006 en secuencia del recorrido; se puede construir y probar por separado con datos de prueba)
- [x] Negotiable
- [x] Valuable
- [x] Estimable
- [x] Small
- [x] Testable

## Users
- Participante de la natillera que ahorra para tener su dinero en diciembre

## Use Cases
- Cobro exitoso del periodo
- Cobro fallido: queda registrado lo que debe

## Integrations
- Open Payments
- Test Wallet

## Acceptance Criteria

```yaml
criterios_aceptacion:
  escenarios_exito:
  - En cada fecha de cobro (cada N minutos en la demo) se cobra la cuota de cada participante activo con su permiso
    y se acredita en la billetera del grupo, asociada a él.
  - 'Cada cobro deja un registro con participante, periodo, monto, fecha y las cuatro etapas del flujo de pago:
    solicitud, autorización, ejecución y finalización.'
  validaciones_reglas:
  - Nunca se cobra más de una cuota por periodo por participante.
  - No se cobra ninguna cuota después de la fecha final.
  - El monto cobrado es exactamente el valor de la cuota.
  manejo_errores:
  - Si el cobro falla por fondos insuficientes, el participante pasa a «Mora» y se registra una deuda igual a la
    cuota del periodo.
  - Si el proveedor falla, se reintenta dentro del mismo periodo un número configurable de veces; si sigue fallando,
    se trata como cobro fallido.
  requisitos_ux:
  - El registro de cobros se puede mostrar en la demo para evidenciar las cuatro etapas del pago.
  casos_edge:
  - En este corte, una deuda solo se recupera descontándola en la liquidación; el pago anticipado de la deuda («ya
    tengo el dinero») queda fuera (declarado).
  - Si el permiso del participante se revoca, el cobro falla y se trata como fondos insuficientes.
notas_implementacion: Es el pago real de punta a punta de la demo y el centinela contra la demo de humo (IMD).
prioridad_criterios: 'Críticos: cobro automático sin intervención y registro de las cuatro etapas.'
smart_validated: true
```

## Status
- State: criteria_complete
- Origin: discovery_inicial (semilla USMD REB-001)
- Phase: 3 complete
