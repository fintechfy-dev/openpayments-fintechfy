# US-008 — Ver en el bot, después de cada cobro, mi aporte acumulado y…

> Sesión `natillera-2` · Fase 2 · Origen: USMD T21, T22 · IMD PA1

## User Story
**Como** Participante de la natillera que ahorra para tener su dinero en diciembre, **quiero** ver en el bot, después de cada cobro, mi aporte acumulado y el total de la natillera, **para** confiar en que mi dinero está ahí sin preguntarle a nadie

## Description
Es la transparencia que quita la desconfianza de la natillera tradicional. El bot avisa tras cada cobro y responde cuando el participante consulta.

## Epic
- Parent: EPIC-003 — Ahorrar cada periodo
- Priority in Epic: 2
- Complexity: Baja
- Depends on: US-007

## INVEST Validation
- [x] Independent (depende de US-007 en secuencia del recorrido; se puede construir y probar por separado con datos de prueba)
- [x] Negotiable
- [x] Valuable
- [x] Estimable
- [x] Small
- [x] Testable

## Users
- Participante de la natillera que ahorra para tener su dinero en diciembre

## Use Cases
- Aviso tras cada cobro
- Consultar en cualquier momento

## Integrations
- Bot de Telegram

## Acceptance Criteria

```yaml
criterios_aceptacion:
  escenarios_exito:
  - Tras cada cobro exitoso, el bot envía al participante su aporte acumulado, las cuotas pagadas sobre el total
    y el total de la natillera.
  - En cualquier momento, el participante consulta su estado con un comando del bot.
  - Si el participante tiene deuda, la consulta la muestra con su mora.
  validaciones_reglas:
  - El total mostrado coincide con el saldo registrado de la billetera del grupo.
  - El aporte mostrado coincide con la suma de los pagos asociados a ese participante.
  - Cada participante ve su detalle y el total del grupo; no ve el detalle individual de los demás.
  manejo_errores:
  - Si el saldo no se puede consultar en ese momento, el bot lo dice y muestra la última cifra confirmada con su
    hora.
  requisitos_ux:
  - El aviso llega en menos de 30 segundos desde que termina el cobro.
  casos_edge:
  - Antes del primer cobro, la consulta muestra aporte 0 y la fecha del primer cobro.
notas_implementacion: Es la transparencia que quita la desconfianza (IMD PA1).
prioridad_criterios: 'Crítico: lo que ve el participante cuadra con la billetera del grupo.'
smart_validated: true
```

## Status
- State: criteria_complete
- Origin: discovery_inicial (semilla USMD REB-001)
- Phase: 3 complete
