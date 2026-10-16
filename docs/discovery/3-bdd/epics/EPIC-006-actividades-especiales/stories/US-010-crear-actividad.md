# US-010 — Crear una actividad (rifa, bazar u otra) con su descripción,…

> Sesión `natillera-2` · Fase 2 · Origen: USMD T25, T26 · PDF E-11

## User Story
**Como** Administrador de la natillera (tesorero), **quiero** crear una actividad (rifa, bazar u otra) con su descripción, fechas, valor por participante y premio, **para** sumar utilidad al grupo como en la natillera de siempre

## Description
Incluye el castigo de mora diario de la actividad. El premio va de 0 (actividades sin premio, como un bazar o un compartir) hasta menos que el valor por participante por el número de participantes. Solo con la natillera activa.

## Epic
- Parent: EPIC-006 — Actividades especiales
- Priority in Epic: 1
- Complexity: Media
- Depends on: US-006

## INVEST Validation
- [x] Independent (depende de US-006 en secuencia del recorrido; se puede construir y probar por separado con datos de prueba)
- [x] Negotiable
- [x] Valuable
- [x] Estimable
- [x] Small
- [x] Testable

## Users
- Administrador de la natillera (tesorero)

## Use Cases
- Crear una rifa con premio
- Crear un bazar sin premio

## Integrations
- Bot de Telegram

## Acceptance Criteria

```yaml
criterios_aceptacion:
  escenarios_exito:
  - Con la natillera «Activa», el administrador crea una actividad con descripción, fecha de inicio, fecha final,
    valor por participante, premio y castigo de mora diario.
  - El bot avisa a todos los participantes la actividad, su valor y la fecha de pago.
  validaciones_reglas:
  - Solo el administrador crea actividades y solo con la natillera «Activa».
  - La fecha de inicio cae a no más de un periodo de la natillera; la fecha final no supera la fecha final de la
    natillera.
  - El premio es mayor o igual a 0 y menor que valor por participante × número de participantes.
  - Un premio igual a 0 marca la actividad como «sin premio» (bazar, compartir).
  manejo_errores:
  - Si un valor está fuera de rango, el bot muestra el rango permitido.
  requisitos_ux:
  - Al crearla, el bot muestra un resumen y pide confirmar.
  casos_edge:
  - En esta versión la actividad solo se registra y se cobra; el control de la rifa o del bazar lo hace el grupo
    por fuera.
notas_implementacion: Agregada al corte por el equipo; se recorta primero si el viernes a las 15:00 van atrasados.
prioridad_criterios: 'Crítico: rango del premio.'
smart_validated: true
```

## Status
- State: criteria_complete
- Origin: discovery_inicial (semilla USMD REB-001; EPIC-006 agregada por el equipo)
- Phase: 3 complete
