# US-004 — Entrar a la natillera desde el enlace y ver su cuota, su per…

> Sesión `natillera-2` · Fase 2 · Origen: USMD R02 (lado del participante) + T15

## User Story
**Como** Participante de la natillera que ahorra para tener su dinero en diciembre, **quiero** entrar a la natillera desde el enlace y ver su cuota, su periodicidad, sus fechas y cuántas cuotas son antes de aceptar, **para** decidir si me uno sabiendo exactamente a qué me comprometo

## Description
El participante abre el enlace, el bot le muestra las reglas y el participante acepta o no. El administrador también se une así a su propia natillera, porque también ahorra.

## Epic
- Parent: EPIC-002 — Unirse a la natillera
- Priority in Epic: 1
- Complexity: Baja
- Depends on: US-003

## INVEST Validation
- [x] Independent (depende de US-003 en secuencia del recorrido; se puede construir y probar por separado con datos de prueba)
- [x] Negotiable
- [x] Valuable
- [x] Estimable
- [x] Small
- [x] Testable

## Users
- Participante de la natillera que ahorra para tener su dinero en diciembre

## Use Cases
- Aceptar tras revisar las reglas
- Salir sin aceptar

## Integrations
- Bot de Telegram

## Acceptance Criteria

```yaml
criterios_aceptacion:
  escenarios_exito:
  - Al abrir el enlace, el bot muestra nombre de la natillera, cuota, periodicidad, fechas, número de cuotas, cupo
    mínimo, porcentaje de mora diario y que el dinero lo custodia la financiera, no el administrador.
  - El participante elige aceptar o rechazar.
  - Al aceptar, queda inscrito y pasa al registro de su billetera (US-005); el administrador ve la aceptación.
  - El administrador se une a su propia natillera por el mismo flujo, porque también ahorra.
  validaciones_reglas:
  - Una persona solo puede estar inscrita una vez en la misma natillera.
  manejo_errores:
  - Si rechaza, no queda inscrito y puede volver a abrir el enlace mientras la natillera esté en «Creada».
  requisitos_ux:
  - Las reglas se muestran en un solo mensaje, con el número de cuotas y el total que aportará (cuota × número de
    cuotas).
  casos_edge:
  - Si el cupo mínimo ya se alcanzó pero la natillera no ha iniciado, todavía se puede unir.
notas_implementacion: Saber quién guarda el dinero (R01) se cubre en el mensaje de reglas.
prioridad_criterios: 'Crítico: el participante ve el total al que se compromete antes de aceptar.'
smart_validated: true
```

## Status
- State: criteria_complete
- Origin: discovery_inicial (semilla USMD REB-001)
- Phase: 3 complete
