# US-002-SEC — Guardar las llaves privadas, los tokens de Open Payments y e…

> Sesión `natillera-2` · Fase 4 · Historia de completitud (nace con criterios; no pasa por la Fase 3)

## User Story
**Como** Equipo de la hackathon que opera la demo, **quiero** guardar las llaves privadas, los tokens de Open Payments y el token del bot fuera del repositorio público y fuera del chat, **para** cumplir la regla del repositorio público sin exponer el dinero de prueba ni el bot

## Epic
- Parent: EPIC-001
- Área funcional: seguridad
- Criticidad: 🔥 crítico
- Depends on: US-002

## Origin
- origen: analisis_completitud
- En el corte de la hackathon por decisión del equipo («Críticas e importantes»)

## Gap Justification
La hackathon exige repositorio público (H-07) y US-002 exige que las credenciales de la billetera del grupo nunca se muestren.

## Impact Without Implementation
Un secreto en el repositorio público permite mover fondos de prueba o tomar el bot durante la evaluación.

## Acceptance Criteria

```yaml
acceptance_criteria:
  success_scenarios:
  - Las llaves y tokens se cargan desde variables de entorno o un archivo excluido del control de versiones.
  - El repositorio incluye un archivo de ejemplo con los nombres de las variables, sin valores.
  validations:
  - Ningún commit del repositorio contiene llaves, tokens ni direcciones con credenciales.
  - Ningún mensaje del bot incluye llaves ni tokens.
  error_handling:
  - Si falta un secreto al arrancar, la aplicación se detiene con un mensaje que nombra la variable, sin mostrar
    valores.
  ux_requirements:
  - El README explica cómo cargar los secretos.
  edge_cases:
  - Si un secreto se sube por error, se rota antes de la entrega de las 11:00.
```

## Status
- State: criteria_complete
- Origin: analisis_completitud
- Phase: 4
