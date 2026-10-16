# US-006 — Que la natillera arranque sola cuando se complete el cupo mí…

> Sesión `natillera-2` · Fase 2 · Origen: USMD T16, T17 · PDF E-10

## User Story
**Como** Administrador de la natillera (tesorero), **quiero** que la natillera arranque sola cuando se complete el cupo mínimo de participantes con cobro autorizado, y se cobre la primera cuota a todos, **para** empezar a ahorrar sin perseguir a nadie

## Description
Con el cupo completo la natillera pasa a iniciada y cobra la primera cuota; si todos pagan, queda activa. La devolución por cupo incompleto queda fuera del corte.

## Epic
- Parent: EPIC-003 — Ahorrar cada periodo
- Priority in Epic: 1
- Complexity: Media
- Depends on: US-005

## INVEST Validation
- [x] Independent (depende de US-005 en secuencia del recorrido; se puede construir y probar por separado con datos de prueba)
- [x] Negotiable
- [x] Valuable
- [x] Estimable
- [x] Small
- [x] Testable

## Users
- Administrador de la natillera (tesorero)

## Use Cases
- Cupo completo: arranca y cobra la primera cuota

## Integrations
- Open Payments (pagos salientes autorizados → pago entrante al grupo)

## Acceptance Criteria

```yaml
criterios_aceptacion:
  escenarios_exito:
  - Cuando hay al menos tantos participantes validados como el cupo mínimo y llega la fecha de inicio, la natillera
    pasa a «Iniciada» y ejecuta el cobro de la primera cuota a todos los validados.
  - Si al menos el cupo mínimo paga la primera cuota, la natillera pasa a «Activa» y quienes pagaron pasan a «Activo».
  - El bot avisa a todos que la natillera arrancó y cuánto se recaudó en la primera cuota.
  validaciones_reglas:
  - La natillera no arranca antes de la fecha de inicio ni sin el cupo mínimo de validados.
  - Todos los validados al momento del arranque participan, aunque superen el cupo mínimo.
  manejo_errores:
  - Quien no tenga fondos en la primera cuota queda en «Mora» con la deuda registrada (US-007, US-017).
  requisitos_ux:
  - El aviso de arranque muestra el número de participantes y la fecha del siguiente cobro.
  casos_edge:
  - Si menos del cupo mínimo logra pagar la primera cuota, la natillera queda en «Iniciada»; la devolución por cupo
    incompleto queda fuera del corte (declarado).
notas_implementacion: 'Estados según el documento: Creada → Iniciada → Activa.'
prioridad_criterios: 'Crítico: el arranque cobra a todos con el permiso ya otorgado, sin intervención del administrador.'
smart_validated: true
```

## Status
- State: criteria_complete
- Origin: discovery_inicial (semilla USMD REB-001)
- Phase: 3 complete
