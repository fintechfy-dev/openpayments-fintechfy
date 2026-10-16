# US-007-RPT — Mostrar al jurado el registro de cada pago con sus cuatro et…

> Sesión `natillera-2` · Fase 4 · Historia de completitud (nace con criterios; no pasa por la Fase 3)

## User Story
**Como** Equipo de la hackathon que opera la demo, **quiero** mostrar al jurado el registro de cada pago con sus cuatro etapas, **para** demostrar en la demo un flujo de pago real de punta a punta

## Epic
- Parent: EPIC-003
- Área funcional: reportes
- Criticidad: 🔥 crítico
- Depends on: US-007

## Origin
- origen: analisis_completitud
- En el corte de la hackathon por decisión del equipo («Críticas e importantes»)

## Gap Justification
La hackathon exige demo con registro del flujo de pago: solicitud, autorización, ejecución y finalización (H-06).

## Impact Without Implementation
Sin este registro la entrega puede no ser evaluada como válida (mínimo aceptable de IMD).

## Acceptance Criteria

```yaml
acceptance_criteria:
  success_scenarios:
  - Una vista muestra, por cada cobro, participante, monto, hora y las cuatro etapas con su estado.
  - Los pagos de premio y liquidación aparecen en la misma vista.
  validations:
  - Cada etapa mostrada corresponde a una respuesta real de Open Payments, no a un valor simulado.
  error_handling:
  - Un pago fallido se muestra con la etapa en que falló y el motivo.
  ux_requirements:
  - La vista se lee en pantalla compartida en menos de 10 segundos por cobro.
  edge_cases:
  - Con cobros cada pocos minutos, la vista muestra los más recientes primero.
```

## Status
- State: criteria_complete
- Origin: analisis_completitud
- Phase: 4
