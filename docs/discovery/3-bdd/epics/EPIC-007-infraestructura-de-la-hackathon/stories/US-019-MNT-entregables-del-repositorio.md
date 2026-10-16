# US-019-MNT — Entregar el repositorio con AI_USAGE.md, los prompts usados…

> Sesión `natillera-2` · Fase 4 · Historia de completitud (nace con criterios; no pasa por la Fase 3)

## User Story
**Como** Equipo de la hackathon que opera la demo, **quiero** entregar el repositorio con AI_USAGE.md, los prompts usados y un README para correr la demo, **para** cumplir los requisitos mínimos de evaluación del evento

## Epic
- Parent: EPIC-007
- Área funcional: mantenimiento
- Criticidad: 🔥 crítico
- Depends on: ninguna

## Origin
- origen: analisis_completitud
- En el corte de la hackathon por decisión del equipo («Críticas e importantes»)

## Gap Justification
La política de IA exige AI_USAGE.md y los prompts; la entrega exige repositorio público con todo integrado a la rama principal antes de las 11:00 (H-07).

## Impact Without Implementation
Sin estos entregables la entrega no se evalúa.

## Acceptance Criteria

```yaml
acceptance_criteria:
  success_scenarios:
  - El repositorio público tiene AI_USAGE.md en la raíz con herramientas, para qué y en qué partes.
  - Los prompts usados están en /prompts o al final de AI_USAGE.md.
  - El README explica cómo correr la demo y cómo cargar los secretos.
  validations:
  - Todas las ramas están integradas en la rama principal antes del sábado 2026-10-17 a las 11:00.
  error_handling:
  - A las 10:30 del sábado se revisa la lista de entregables; lo que falte se completa antes de seguir programando.
  ux_requirements:
  - El README empieza con una frase que explica la natillera.
  edge_cases:
  - Código que solo exista en una computadora local no cuenta.
```

## Status
- State: criteria_complete
- Origin: analisis_completitud
- Phase: 4
