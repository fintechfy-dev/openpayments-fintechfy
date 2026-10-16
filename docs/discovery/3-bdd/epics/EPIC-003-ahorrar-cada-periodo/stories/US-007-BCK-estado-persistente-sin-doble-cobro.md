# US-007-BCK — Que el estado de natilleras, permisos, cobros y deudas sobre…

> Sesión `natillera-2` · Fase 4 · Historia de completitud (nace con criterios; no pasa por la Fase 3)

## User Story
**Como** Equipo de la hackathon que opera la demo, **quiero** que el estado de natilleras, permisos, cobros y deudas sobreviva a un reinicio del bot, **para** seguir donde íbamos sin perder datos ni cobrar dos veces

## Epic
- Parent: EPIC-003
- Área funcional: backup
- Criticidad: ⚡ importante
- Depends on: US-007

## Origin
- origen: analisis_completitud
- En el corte de la hackathon por decisión del equipo («Críticas e importantes»)

## Gap Justification
Durante el evento la aplicación puede reiniciarse; los cobros recurrentes no pueden duplicarse.

## Impact Without Implementation
Un reinicio podría borrar la natillera o cobrar dos veces la misma cuota.

## Acceptance Criteria

```yaml
acceptance_criteria:
  success_scenarios:
  - Tras un reinicio, la aplicación recupera natilleras, participantes, permisos, cobros y deudas.
  - Los cobros pendientes del periodo en curso se ejecutan una sola vez.
  validations:
  - Cada cobro tiene un identificador único por participante y periodo; un segundo intento con el mismo identificador
    no cobra.
  error_handling:
  - Si el estado no se puede leer al arrancar, la aplicación no cobra nada y alerta al equipo.
  ux_requirements:
  - Los participantes no notan el reinicio salvo una demora.
  edge_cases:
  - Un reinicio en plena liquidación retoma los pagos pendientes sin repetir los ya hechos.
```

## Status
- State: criteria_complete
- Origin: analisis_completitud
- Phase: 4
