# US-012-AUD — Ver una bitácora de lo que hizo el administrador: crear la n…

> Sesión `natillera-2` · Fase 4 · Historia de completitud (nace con criterios; no pasa por la Fase 3)

## User Story
**Como** Participante de la natillera que ahorra para tener su dinero en diciembre, **quiero** ver una bitácora de lo que hizo el administrador: crear la natillera, crear actividades, elegir ganadores y cerrar actividades, **para** confiar en que nadie hizo nada a escondidas

## Epic
- Parent: EPIC-006
- Área funcional: auditoria
- Criticidad: ⚡ importante
- Depends on: US-010, US-012

## Origin
- origen: analisis_completitud
- En el corte de la hackathon por decisión del equipo («Críticas e importantes»)

## Gap Justification
La transparencia es el corazón de la propuesta (IMD PA1 y AD3) y el administrador ordena premios.

## Impact Without Implementation
Sin bitácora, el participante vuelve a depender de confiar en el organizador.

## Acceptance Criteria

```yaml
acceptance_criteria:
  success_scenarios:
  - Cada acción del administrador queda registrada con fecha, hora, acción y valores.
  - Cualquier participante consulta la bitácora con un comando del bot.
  validations:
  - La bitácora no se puede editar ni borrar desde el bot.
  error_handling:
  - Si la bitácora no se puede consultar, el bot lo dice; las acciones del administrador no se ejecutan si no se
    pueden registrar.
  ux_requirements:
  - La bitácora muestra primero las acciones más recientes.
  edge_cases:
  - Las acciones automáticas (cobros, mora, liquidación) se distinguen de las del administrador.
```

## Status
- State: criteria_complete
- Origin: analisis_completitud
- Phase: 4
