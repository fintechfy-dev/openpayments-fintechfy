# US-017 — Recibir cada día por Telegram un recordatorio con lo que deb…

> Sesión `natillera-2` · Fase 2 · Origen: USMD T20, T23 · PDF E-12 · respuesta del equipo («Deuda + mora + recordatorio»)

## User Story
**Como** Participante de la natillera que ahorra para tener su dinero en diciembre, **quiero** recibir cada día por Telegram un recordatorio con lo que debo, incluida la mora diaria, **para** ponerme al día antes de que se me descuente en la liquidación

## Description
Mientras el participante está en mora, cada día (acelerado en la demo) se suma el porcentaje de mora diario sobre lo que debe y el bot le recuerda el valor total. El aviso «ya tengo el dinero» queda fuera del corte.

## Epic
- Parent: EPIC-003 — Ahorrar cada periodo
- Priority in Epic: 2
- Complexity: Media
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
- Recordatorio con el valor más la mora
- La deuda con mora llega a la liquidación

## Integrations
- Bot de Telegram

## Acceptance Criteria

```yaml
criterios_aceptacion:
  escenarios_exito:
  - Mientras un participante tiene deuda, cada «día» (duración configurable en la demo) se suma el porcentaje de
    mora diario sobre el valor adeudado.
  - Cada «día» el bot le envía un recordatorio con la deuda, la mora acumulada y el total, y le avisa que se descontará
    en la liquidación.
  validaciones_reglas:
  - 'La mora se calcula sobre el valor adeudado, sin capitalizar la mora anterior [supuesto: interés simple].'
  - Cuotas y actividades usan su propio porcentaje de mora (el de la natillera y el castigo de cada actividad).
  - Los recordatorios y la mora se detienen al liquidar la natillera.
  manejo_errores:
  - Si el recordatorio no se puede entregar, se reintenta en el siguiente «día» sin perder el cálculo de la mora.
  requisitos_ux:
  - El recordatorio dice el total en una sola cifra destacada y desglosa deuda y mora.
  casos_edge:
  - Con 0 % de mora, el recordatorio igual se envía con la deuda.
notas_implementacion: Agregada en la Fase 2 por el equipo («Deuda + mora + recordatorio»). Se recorta antes que
  el cobro real si el viernes a las 15:00 van atrasados.
prioridad_criterios: 'Crítico: el cálculo de la mora coincide con lo que se descuenta en la liquidación.'
smart_validated: true
```

## Status
- State: criteria_complete
- Origin: discovery_inicial (semilla USMD REB-001)
- Phase: 3 complete
