# US-002 — Que al crear la natillera se abra una billetera del grupo a…

> Sesión `natillera-2` · Fase 2 · Origen: USMD T03 · PDF E-07 · IMD AD3 (no toca el dinero)

## User Story
**Como** Administrador de la natillera (tesorero), **quiero** que al crear la natillera se abra una billetera del grupo a nombre de la financiera, sin que yo tenga acceso directo al dinero, **para** que nadie del grupo, ni siquiera yo, pueda tocar el dinero por fuera de las reglas

## Description
En la hackathon la financiera es simulada y la billetera del grupo es una dirección de la Test Wallet controlada por la aplicación. El administrador solo recibe el identificador de la billetera.

## Epic
- Parent: EPIC-001 — Armar la natillera
- Priority in Epic: 1
- Complexity: Media
- Depends on: US-001

## INVEST Validation
- [x] Independent (depende de US-001 en secuencia del recorrido; se puede construir y probar por separado con datos de prueba)
- [x] Negotiable
- [x] Valuable
- [x] Estimable
- [x] Small
- [x] Testable

## Users
- Administrador de la natillera (tesorero)

## Use Cases
- Crear la natillera abre su billetera del grupo
- El administrador consulta el identificador pero no puede mover fondos

## Integrations
- Open Payments (Test Wallet)

## Acceptance Criteria

```yaml
criterios_aceptacion:
  escenarios_exito:
  - Al crearse la natillera se crea una billetera del grupo en la Test Wallet, a nombre de la financiera simulada.
  - El bot muestra al administrador solo el identificador (dirección) de la billetera del grupo.
  - Cada pago que entra a la billetera del grupo queda asociado al participante que lo hizo y a su concepto (cuota
    del periodo N o actividad), formando la cuenta en árbol.
  validaciones_reglas:
  - Ninguna opción del bot permite al administrador ni a un participante iniciar un pago desde la billetera del
    grupo.
  - Los únicos pagos que salen de la billetera del grupo son los del premio de una actividad (US-012) y los de la
    liquidación (US-009).
  - Las credenciales y llaves de la billetera del grupo nunca se muestran ni se envían por Telegram.
  - Dos natilleras nunca comparten la misma billetera del grupo.
  manejo_errores:
  - Si falla la creación de la billetera del grupo, la natillera no queda creada y el bot pide reintentar.
  requisitos_ux:
  - El bot explica en una frase que el dinero lo custodia la financiera y que el administrador no puede moverlo.
  casos_edge:
  - Si el administrador pide «sacar» dinero, el bot responde que no es posible y explica cuándo sale el dinero (premios
    y liquidación).
notas_implementacion: En la hackathon la financiera es simulada y la billetera del grupo es una dirección de la
  Test Wallet controlada por la aplicación (SUP-005).
prioridad_criterios: 'Críticos: nadie inicia pagos desde la billetera del grupo; asociación de cada pago entrante
  a su participante.'
smart_validated: true
```

## Status
- State: criteria_complete
- Origin: discovery_inicial (semilla USMD REB-001)
- Phase: 3 complete
