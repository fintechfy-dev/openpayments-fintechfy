# US-012 — Indicar al ganador de la actividad, confirmarlo y que la nat…

> Sesión `natillera-2` · Fase 2 · Origen: USMD T29, T30, R06 · notas del equipo del paso 14

## User Story
**Como** Administrador de la natillera (tesorero), **quiero** indicar al ganador de la actividad, confirmarlo y que la natillera le pague el premio sin superar lo recaudado, avisando a todos, **para** que el premio sea transparente y nadie dude de quién ganó

## Description
El administrador indica y confirma; la natillera ejecuta el pago solo a un participante y nunca por más de lo recaudado en la actividad. El administrador no toca el dinero.

## Epic
- Parent: EPIC-006 — Actividades especiales
- Priority in Epic: 2
- Complexity: Media
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
- Pago del premio completo
- Pago limitado a lo recaudado

## Integrations
- Open Payments
- Bot de Telegram

## Acceptance Criteria

```yaml
criterios_aceptacion:
  escenarios_exito:
  - El administrador indica al ganador eligiendo de la lista de participantes.
  - El bot pide confirmar mostrando el nombre del ganador y el monto a pagar.
  - Al confirmar, la natillera paga al ganador el menor entre el premio y lo recaudado en la actividad, en su billetera
    personal.
  - El bot avisa a todos los participantes quién ganó y cuánto recibió.
  validaciones_reglas:
  - El ganador es un participante de la natillera.
  - El pago nunca supera lo recaudado en la actividad.
  - 'El administrador no elige el monto ni la billetera de destino: el monto lo calcula la natillera y el destino
    es la billetera registrada del ganador.'
  manejo_errores:
  - Si lo recaudado es menor que el premio, se paga el 100 % de lo recaudado y se avisa al ganador; pagarle el resto
    cuando lleguen los pagos pendientes queda fuera del corte (declarado).
  - Si el pago falla, se reintenta y se avisa al administrador.
  requisitos_ux:
  - La confirmación muestra los datos antes de pagar, para evitar elegir al ganador equivocado (R06).
  casos_edge:
  - Si el administrador cancela en la confirmación, no se paga nada.
notas_implementacion: El administrador indica y ordena; la natillera paga (aclaración del equipo en USMD).
prioridad_criterios: 'Críticos: nunca más de lo recaudado; destino fijo en la billetera del ganador.'
smart_validated: true
```

## Status
- State: criteria_complete
- Origin: discovery_inicial (semilla USMD REB-001; EPIC-006 agregada por el equipo)
- Phase: 3 complete
