# US-005-INT — Volver al bot automáticamente después de aprobar el permiso…

> Sesión `natillera-2` · Fase 4 · Historia de completitud (nace con criterios; no pasa por la Fase 3)

## User Story
**Como** Participante de la natillera que ahorra para tener su dinero en diciembre, **quiero** volver al bot automáticamente después de aprobar el permiso en mi billetera, **para** quedar validado sin pasos manuales

## Epic
- Parent: EPIC-002
- Área funcional: integraciones
- Criticidad: 🔥 crítico
- Depends on: US-005

## Origin
- origen: analisis_completitud
- En el corte de la hackathon por decisión del equipo («Críticas e importantes»)

## Gap Justification
El permiso de Open Payments se aprueba fuera del bot (interacción en la billetera); US-005 necesita saber cuándo terminó.

## Impact Without Implementation
Sin retorno, el participante no queda validado y la natillera no arranca.

## Acceptance Criteria

```yaml
acceptance_criteria:
  success_scenarios:
  - Al aprobar en la billetera, la aplicación recibe el retorno de la interacción, completa el permiso y marca al
    participante «Validado».
  - El bot avisa al participante y al administrador.
  validations:
  - El retorno solo se acepta si corresponde a una solicitud de permiso pendiente de ese participante.
  error_handling:
  - Si el retorno trae rechazo o expira, el participante sigue sin validar y el bot le ofrece reintentar.
  ux_requirements:
  - El enlace de aprobación abre la billetera desde el teléfono y el retorno lleva de vuelta al chat del bot.
  edge_cases:
  - Si el participante aprueba dos veces, solo cuenta un permiso.
```

## Status
- State: criteria_complete
- Origin: analisis_completitud
- Phase: 4
