# US-009 — Recibir automáticamente en mi billetera, en la fecha final,…

> Sesión `natillera-2` · Fase 2 · Origen: USMD T36, T35 · PDF E-16 · respuestas del equipo (automática; partes iguales con descuento a morosos con su mora)

## User Story
**Como** Participante de la natillera que ahorra para tener su dinero en diciembre, **quiero** recibir automáticamente en mi billetera, en la fecha final, mi parte del total de la natillera, **para** tener mi dinero en diciembre sin depender del organizador

## Description
En la fecha final (acelerada en la demo) la natillera cierra sola: el total se divide en partes iguales entre los participantes y a cada uno se le descuenta lo que quedó debiendo con su mora (cuotas y actividades), sin bajar de 0; cada parte se paga a su billetera personal.

## Epic
- Parent: EPIC-004 — Recibir la liquidación
- Priority in Epic: 1
- Complexity: Alta
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
- Liquidación sin deudas
- Liquidación con un participante que quedó debiendo

## Integrations
- Open Payments (pagos salientes desde la billetera del grupo)
- Test Wallet
- Bot de Telegram

## Acceptance Criteria

```yaml
criterios_aceptacion:
  escenarios_exito:
  - En la fecha final (acelerada en la demo), la liquidación arranca sola, sin que nadie la ordene.
  - 'Base de reparto: el mayor entre el valor esperado (cuotas esperadas + actividades − premios pagados) y el saldo
    real de la billetera del grupo.'
  - 'Parte de cada uno: la base dividida en partes iguales entre los participantes.'
  - A cada participante se le descuenta lo que quedó debiendo, con su mora (cuotas y actividades), sin bajar de
    0.
  - El sobrante que quede en la billetera del grupo después de las partes netas se reparte en partes iguales entre
    todos los participantes.
  - Cada parte se paga a la billetera personal de su participante; la natillera pasa a «Cerrada» y los participantes
    a «Liquidados».
  - 'El bot envía a cada participante el detalle: parte, descuentos, sobrante y valor pagado.'
  validaciones_reglas:
  - La suma de lo pagado nunca supera el saldo real de la billetera del grupo.
  - Nadie recibe un valor negativo.
  - El administrador no puede disparar, adelantar ni modificar la liquidación.
  manejo_errores:
  - Si un pago a una billetera personal falla, se reintenta; si sigue fallando, queda pendiente, se avisa al participante
    y la natillera no se marca «Cerrada» hasta pagarlo.
  requisitos_ux:
  - El detalle de liquidación muestra la cuenta completa en un solo mensaje.
  casos_edge:
  - Si la base esperada supera el saldo real y los descuentos no alcanzan a cubrir la diferencia (un deudor queda
    en 0), las partes se recalculan sobre el saldo real para no pagar más de lo que existe [regla derivada, declarada;
    responde a V-05].
  - 'Ejemplo de verificación: 3 personas, cuota 100, 2 cuotas; A debe 100 + 10 de mora → base 600, partes 200; A
    recibe 90, B y C 200; sobrante 10 → 3,33 a cada uno.'
notas_implementacion: Descuentos por préstamo impago (US-015) solo si se hace el extra de crédito.
prioridad_criterios: 'Críticos: nunca pagar más de lo que hay; descuento a morosos; sobrante repartido por igual.'
smart_validated: true
```

## Status
- State: criteria_complete
- Origin: discovery_inicial (semilla USMD REB-001)
- Phase: 3 complete
