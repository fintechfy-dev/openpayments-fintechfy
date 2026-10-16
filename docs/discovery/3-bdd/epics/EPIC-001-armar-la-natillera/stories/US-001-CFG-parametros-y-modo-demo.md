# US-001-CFG — Configurar los límites de la cuota, el porcentaje de mora má…

> Sesión `natillera-2` · Fase 4 · Historia de completitud (nace con criterios; no pasa por la Fase 3)

## User Story
**Como** Equipo de la hackathon que opera la demo, **quiero** configurar los límites de la cuota, el porcentaje de mora máximo, los reintentos de cobro y el modo demo (minutos por periodo y por «día» de mora), **para** que la natillera respete reglas del sistema y la demo corra en minutos

## Epic
- Parent: EPIC-001
- Área funcional: configuracion
- Criticidad: 🔥 crítico
- Depends on: US-001, US-017

## Origin
- origen: analisis_completitud
- En el corte de la hackathon por decisión del equipo («Críticas e importantes»)

## Gap Justification
US-001 y US-017 exigen límites y duraciones configurables que ninguna historia define.

## Impact Without Implementation
Sin esto no hay demo acelerada ni validación de cuota.

## Acceptance Criteria

```yaml
acceptance_criteria:
  success_scenarios:
  - 'Existe una configuración con: cuota mínima, cuota máxima, % de mora diario máximo, número de reintentos por
    cobro, modo demo activado o no, minutos por periodo y minutos por «día» de mora.'
  - En modo demo, las fechas de la natillera se interpretan en minutos desde el arranque.
  validations:
  - La cuota mínima es mayor que 0 y menor que la máxima.
  - Los minutos del modo demo son enteros mayores que 0.
  error_handling:
  - Si falta un parámetro obligatorio, la aplicación no arranca y dice cuál falta.
  ux_requirements:
  - Los valores en uso se pueden consultar en el bot con un comando de diagnóstico del equipo.
  edge_cases:
  - Cambiar la configuración no altera natilleras ya creadas.
```

## Status
- State: criteria_complete
- Origin: analisis_completitud
- Phase: 4
