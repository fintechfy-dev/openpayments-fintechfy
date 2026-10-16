# US-018-TST — Tener un guion de demo con billeteras de prueba preparadas:…

> Sesión `natillera-2` · Fase 4 · Historia de completitud (nace con criterios; no pasa por la Fase 3)

## User Story
**Como** Equipo de la hackathon que opera la demo, **quiero** tener un guion de demo con billeteras de prueba preparadas: 3 participantes con fondos y uno sin fondos, **para** mostrar en 5 minutos el ciclo completo, la mora y la liquidación sin improvisar

## Epic
- Parent: EPIC-007
- Área funcional: testing
- Criticidad: 🔥 crítico
- Depends on: US-001-CFG, US-009

## Origin
- origen: analisis_completitud
- En el corte de la hackathon por decisión del equipo («Críticas e importantes»)

## Gap Justification
El pitch dura 5 minutos con demo (H-08) y el corte incluye mora y liquidación.

## Impact Without Implementation
Una demo improvisada cae en el atajo prohibido o no alcanza a mostrar el ciclo.

## Acceptance Criteria

```yaml
acceptance_criteria:
  success_scenarios:
  - 'Existen al menos 4 billeteras de prueba: administrador y 2 participantes con fondos, y 1 participante sin fondos.'
  - El guion recorre crear, invitar, autorizar, arrancar, cobrar, mora, actividad y liquidación.
  - El guion se ensaya completo y cabe en 5 minutos con el modo demo.
  validations:
  - Todos los pagos del guion son reales en la Test Wallet.
  error_handling:
  - 'El guion tiene un plan B si falla la red: mostrar el registro de una corrida previa grabada, declarado como
    grabación.'
  ux_requirements:
  - El guion indica qué pantalla mostrar en cada momento del pitch.
  edge_cases:
  - Los saldos de prueba se recargan antes de cada ensayo.
```

## Status
- State: criteria_complete
- Origin: analisis_completitud
- Phase: 4
