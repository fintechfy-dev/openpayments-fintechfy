# US-001 — Crear la natillera en el bot de Telegram con su nombre, cuot…

> Sesión `natillera-2` · Fase 2 · Origen: USMD T05, T06, T07 (+ T04 nombre) · respuestas del equipo sobre arranque, número de cuotas y mora

## User Story
**Como** Administrador de la natillera (tesorero), **quiero** crear la natillera en el bot de Telegram con su nombre, cuota, fecha de inicio, fecha final, periodicidad, cupo mínimo y porcentaje de mora diario, **para** que el grupo ahorre con reglas claras desde el primer día

## Description
El número de cuotas no se escribe: sale del rango entre la fecha de inicio y la fecha final y de la periodicidad (de noviembre a diciembre con cuota mensual son 2 cuotas). En la demo la periodicidad va en minutos. La cuota respeta los límites del sistema.

## Epic
- Parent: EPIC-001 — Armar la natillera
- Priority in Epic: 1
- Complexity: Media
- Depends on: ninguna

## INVEST Validation
- [x] Independent
- [x] Negotiable
- [x] Valuable
- [x] Estimable
- [x] Small
- [x] Testable

## Users
- Administrador de la natillera (tesorero)

## Use Cases
- Crear natillera mensual de noviembre a diciembre (2 cuotas)
- Crear natillera de demo con cuota cada 2 minutos

## Integrations
- Bot de Telegram

## Acceptance Criteria

```yaml
criterios_aceptacion:
  escenarios_exito:
  - El administrador crea la natillera en el bot respondiendo nombre, valor de cuota, fecha de inicio, fecha final,
    periodicidad, cupo mínimo y porcentaje de mora diario.
  - Antes de crear, el bot muestra un resumen con todos los valores y el número de cuotas calculado, y pide confirmar
    o corregir.
  - Al confirmar, la natillera queda en estado «Creada» y el administrador queda registrado como su administrador.
  - El número de cuotas es la cantidad de fechas de cobro que caen entre la fecha de inicio y la fecha final, ambas
    incluidas, según la periodicidad (del 1 de noviembre al 1 de diciembre con cuota mensual = 2 cuotas).
  - En modo demo, la periodicidad y la duración de un «día» de mora se fijan en minutos.
  validaciones_reglas:
  - El nombre es único en el sistema, sin distinguir mayúsculas ni tildes.
  - El valor de la cuota está entre el mínimo y el máximo configurados en el sistema (los valores se fijan cuando
    se conozca la moneda de la Test Wallet).
  - La fecha de inicio cae a no más de 1 mes de la fecha de creación; la fecha final es posterior a la de inicio
    y cae a no más de 1 año de ella.
  - El cupo mínimo es de al menos 3 personas, contando al administrador.
  - El porcentaje de mora diario es mayor o igual a 0 y no supera el máximo configurado en el sistema.
  - El rango de fechas y la periodicidad dan al menos 1 cuota.
  manejo_errores:
  - Si el nombre ya existe, el bot lo dice y pide otro sin perder los datos ya respondidos.
  - Si la cuota está fuera de límites, el bot muestra el mínimo y el máximo permitidos.
  - Si una fecha incumple su regla, el bot dice cuál regla incumple y pide la fecha otra vez.
  - Si el cupo mínimo es menor que 3, el bot lo rechaza indicando el mínimo.
  requisitos_ux:
  - El bot hace una pregunta a la vez, con un ejemplo de respuesta válida.
  - 'El resumen final tiene dos opciones: confirmar o corregir un campo.'
  casos_edge:
  - Si el rango no calza exacto con la periodicidad, solo cuentan las fechas de cobro que caen dentro del rango.
  - Si el administrador abandona la creación a mitad, no queda ninguna natillera creada.
notas_implementacion: Sin motor propio en la hackathon. La validación de identidad y la revisión financiera del
  administrador (T01, T02) quedan fuera del corte.
prioridad_criterios: 'Críticos: cálculo del número de cuotas, cupo mínimo y unicidad del nombre.'
smart_validated: true
```

## Status
- State: criteria_complete
- Origin: discovery_inicial (semilla USMD REB-001)
- Phase: 3 complete
