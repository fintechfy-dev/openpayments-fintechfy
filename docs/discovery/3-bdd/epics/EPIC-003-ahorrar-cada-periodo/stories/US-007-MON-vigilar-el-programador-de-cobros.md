# US-007-MON — Enterarme de inmediato si el programador de cobros se detien…

> Sesión `natillera-2` · Fase 4 · Historia de completitud (nace con criterios; no pasa por la Fase 3)

## User Story
**Como** Equipo de la hackathon que opera la demo, **quiero** enterarme de inmediato si el programador de cobros se detiene o un cobro no se ejecuta a tiempo, **para** corregirlo antes de que arruine la demo

## Epic
- Parent: EPIC-003
- Área funcional: monitoreo
- Criticidad: ⚡ importante
- Depends on: US-007

## Origin
- origen: analisis_completitud
- En el corte de la hackathon por decisión del equipo («Críticas e importantes»)

## Gap Justification
Los cobros, la mora y la liquidación dependen de tareas programadas cada pocos minutos.

## Impact Without Implementation
Un programador detenido no cobra, no liquida y deja la demo sin flujo de pago.

## Acceptance Criteria

```yaml
acceptance_criteria:
  success_scenarios:
  - Si un cobro programado no se ejecuta dentro de su ventana, el equipo recibe una alerta en un chat de Telegram
    del equipo.
  validations:
  - La alerta indica natillera, cobro y hora esperada.
  error_handling:
  - Si la alerta no se puede enviar, queda en el registro de la aplicación.
  ux_requirements:
  - El comando de diagnóstico muestra la hora del último cobro y del próximo.
  edge_cases:
  - En la fecha final no se alerta por cobros que ya no corresponden.
```

## Status
- State: criteria_complete
- Origin: analisis_completitud
- Phase: 4
