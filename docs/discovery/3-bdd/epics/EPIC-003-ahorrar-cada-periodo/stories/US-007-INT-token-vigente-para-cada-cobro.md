# US-007-INT — Tener un token vigente del permiso de cada participante ante…

> Sesión `natillera-2` · Fase 4 · Historia de completitud (nace con criterios; no pasa por la Fase 3)

## User Story
**Como** Equipo de la hackathon que opera la demo, **quiero** tener un token vigente del permiso de cada participante antes de cada cobro recurrente, **para** que ningún cobro falle por un token vencido

## Epic
- Parent: EPIC-003
- Área funcional: integraciones
- Criticidad: 🔥 crítico
- Depends on: US-005, US-007

## Origin
- origen: analisis_completitud
- En el corte de la hackathon por decisión del equipo («Críticas e importantes»)

## Gap Justification
Los cobros recurrentes de US-007 usan el permiso a lo largo del tiempo; el token de acceso puede vencer [por verificar en la documentación de Open Payments].

## Impact Without Implementation
Cobros fallidos que no son culpa del participante y lo dejarían en mora injustamente.

## Acceptance Criteria

```yaml
acceptance_criteria:
  success_scenarios:
  - Antes de cada cobro, si el token está vencido o por vencer, se renueva con el mecanismo del permiso.
  - El cobro se ejecuta con el token renovado.
  validations:
  - Un cobro fallido por token vencido no genera deuda ni mora al participante.
  error_handling:
  - Si la renovación falla, se reintenta según la configuración; si sigue fallando, se avisa al equipo (US-007-MON)
    y al participante para reautorizar.
  ux_requirements:
  - El participante solo ve un aviso si tiene que volver a autorizar.
  edge_cases:
  - Si el permiso fue revocado por el participante, se trata como fondos insuficientes (US-007).
```

## Status
- State: criteria_complete
- Origin: analisis_completitud
- Phase: 4
