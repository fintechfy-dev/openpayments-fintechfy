# US-013 — Cerrar una actividad sin premio o sin ganador

> Sesión `natillera-2` · Fase 2 · Origen: USMD T32 (nota del equipo) · ampliada por el equipo en la Fase 2 (bazar, compartir)

## User Story
**Como** Administrador de la natillera (tesorero), **quiero** cerrar una actividad sin premio o sin ganador, **para** que todo lo recaudado quede acumulado en la natillera y llegue a la liquidación

## Description
Cubre dos casos: actividades que no tienen premio porque solo generan ingresos (un bazar, un compartir) y rifas en las que nadie ganó. En ambos, lo recaudado se queda en la billetera del grupo y suma al total que se reparte en la fecha final.

## Epic
- Parent: EPIC-006 — Actividades especiales
- Priority in Epic: 3
- Complexity: Baja
- Depends on: US-011

## INVEST Validation
- [x] Independent (depende de US-011 en secuencia del recorrido; se puede construir y probar por separado con datos de prueba)
- [x] Negotiable
- [x] Valuable
- [x] Estimable
- [x] Small
- [x] Testable

## Users
- Administrador de la natillera (tesorero)

## Use Cases
- Bazar o compartir sin premio
- Rifa sin ganador

## Integrations
- Bot de Telegram

## Acceptance Criteria

```yaml
criterios_aceptacion:
  escenarios_exito:
  - Al cerrar una actividad sin premio (bazar, compartir) o una rifa marcada «sin ganador», lo recaudado queda en
    la billetera del grupo como acumulado.
  - El acumulado suma a la base de la liquidación (US-009).
  - El bot avisa a todos que lo recaudado quedó acumulado y el nuevo total de la natillera.
  validaciones_reglas:
  - Solo el administrador cierra la actividad.
  - Una actividad cerrada como «sin ganador» no puede pagar premio después.
  manejo_errores:
  - Si se intenta cerrar sin ganador una actividad que ya pagó premio, el bot lo impide.
  requisitos_ux:
  - El aviso muestra cuánto se acumuló y el total de la natillera.
  casos_edge:
  - Las deudas de esa actividad siguen vigentes y se descuentan en la liquidación.
notas_implementacion: Ampliada por el equipo en la Fase 2.
prioridad_criterios: 'Crítico: lo recaudado entra a la base de liquidación.'
smart_validated: true
```

## Status
- State: criteria_complete
- Origin: discovery_inicial (semilla USMD REB-001; EPIC-006 agregada por el equipo)
- Phase: 3 complete
