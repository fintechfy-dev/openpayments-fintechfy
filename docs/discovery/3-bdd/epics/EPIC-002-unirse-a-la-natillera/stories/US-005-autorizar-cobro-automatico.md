# US-005 — Registrar mi billetera y autorizar una sola vez el cobro aut…

> Sesión `natillera-2` · Fase 2 · Origen: USMD T14 (nota del equipo) · PDF E-09

## User Story
**Como** Participante de la natillera que ahorra para tener su dinero en diciembre, **quiero** registrar mi billetera y autorizar una sola vez el cobro automático de mi cuota con Open Payments, **para** ahorrar cada periodo sin tener que pagar a mano ni entregar efectivo

## Description
El participante da la dirección de su billetera y aprueba en ella un permiso de pago recurrente por el valor de la cuota y la periodicidad de la natillera. Depende del supuesto SUP-001, que se verifica en la primera hora del viernes.

## Epic
- Parent: EPIC-002 — Unirse a la natillera
- Priority in Epic: 1
- Complexity: Alta
- Depends on: US-004

## INVEST Validation
- [x] Independent (depende de US-004 en secuencia del recorrido; se puede construir y probar por separado con datos de prueba)
- [x] Negotiable
- [x] Valuable
- [x] Estimable
- [x] Small
- [x] Testable

## Users
- Participante de la natillera que ahorra para tener su dinero en diciembre

## Use Cases
- Autorizar desde la Test Wallet
- Rechazar la autorización y quedar sin unirse

## Integrations
- Open Payments (grant de pago saliente recurrente)
- Test Wallet
- Bot de Telegram

## Acceptance Criteria

```yaml
criterios_aceptacion:
  escenarios_exito:
  - El participante entrega la dirección de su billetera de Open Payments y el sistema la verifica.
  - El sistema solicita un permiso de pago saliente recurrente por el valor de la cuota, con la periodicidad de
    la natillera y un tope total igual a cuota × número de cuotas.
  - El participante aprueba el permiso en su billetera y vuelve al bot.
  - Con el permiso aprobado, el participante queda en estado «Validado» y el bot lo confirma.
  validaciones_reglas:
  - La dirección de billetera debe existir y responder como dirección de Open Payments.
  - La billetera del participante maneja la misma moneda que la natillera.
  - El permiso nunca autoriza más que una cuota por periodo ni más que el tope total.
  manejo_errores:
  - Si la dirección no es válida, el bot pide otra y explica el formato esperado.
  - Si el participante rechaza o no completa el permiso, no queda validado y puede reintentar.
  - Si el proveedor de la billetera no responde, el bot avisa y permite reintentar.
  requisitos_ux:
  - 'El bot explica en una frase qué está autorizando: valor por cuota, cada cuánto y hasta cuándo.'
  casos_edge:
  - Si la billetera es de otra moneda, no se puede validar en este corte (la conversión queda fuera).
notas_implementacion: 'Depende de SUP-001: se verifica en la primera hora del viernes (ENT-005 de IMD) que la Test
  Wallet acepta el permiso recurrente con intervalo. Si no lo acepta, el cobro se rediseña antes de seguir.'
prioridad_criterios: 'Críticos: permiso aprobado una sola vez y con tope; es el flujo de autorización que mira el
  jurado.'
smart_validated: true
```

## Status
- State: criteria_complete
- Origin: discovery_inicial (semilla USMD REB-001)
- Phase: 3 complete
