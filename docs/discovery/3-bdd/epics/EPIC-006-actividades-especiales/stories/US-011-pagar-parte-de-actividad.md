# US-011 — Dar permiso en el bot para que se cobre mi parte de la activ…

> Sesión `natillera-2` · Fase 2 · Origen: USMD T27, T28 · PDF E-13

## User Story
**Como** Participante de la natillera que ahorra para tener su dinero en diciembre, **quiero** dar permiso en el bot para que se cobre mi parte de la actividad, **para** participar sin entregar efectivo a nadie

## Description
El participante recibe el aviso y autoriza el cobro de su parte hacia la billetera del grupo. Si no tiene fondos, queda en alerta en esa actividad y sigue el mismo proceso que la cuota: deuda registrada, castigo de mora diario y recordatorio por Telegram [supuesto: el documento dice «siguiendo el mismo proceso del pago de cuota»].

## Epic
- Parent: EPIC-006 — Actividades especiales
- Priority in Epic: 1
- Complexity: Media
- Depends on: US-010

## INVEST Validation
- [x] Independent (depende de US-010 en secuencia del recorrido; se puede construir y probar por separado con datos de prueba)
- [x] Negotiable
- [x] Valuable
- [x] Estimable
- [x] Small
- [x] Testable

## Users
- Participante de la natillera que ahorra para tener su dinero en diciembre

## Use Cases
- Autorizar y pagar la parte
- Sin fondos: queda debiendo

## Integrations
- Open Payments
- Test Wallet
- Bot de Telegram

## Acceptance Criteria

```yaml
criterios_aceptacion:
  escenarios_exito:
  - En la fecha de pago de la actividad, el bot avisa a cada participante el valor de su parte.
  - El participante da permiso en su billetera y se cobra su parte a la billetera del grupo, asociada a él y a la
    actividad.
  - El bot confirma el pago.
  validaciones_reglas:
  - Se cobra exactamente el valor por participante de la actividad, una sola vez por participante.
  manejo_errores:
  - 'Si no tiene fondos o no da permiso, queda en «alerta» en esa actividad con una deuda igual a su parte, que
    suma el castigo de mora diario y recibe recordatorio por Telegram, como la cuota (US-017) [supuesto: el documento
    dice «siguiendo el mismo proceso del pago de cuota»].'
  requisitos_ux:
  - El aviso incluye el nombre de la actividad, el valor y un botón para autorizar.
  casos_edge:
  - Una deuda de actividad sin pagar se descuenta en la liquidación (US-009).
notas_implementacion: Cada pago de actividad es un permiso puntual, no recurrente.
prioridad_criterios: 'Crítico: el pago queda asociado a la actividad para calcular lo recaudado.'
smart_validated: true
```

## Status
- State: criteria_complete
- Origin: discovery_inicial (semilla USMD REB-001; EPIC-006 agregada por el equipo)
- Phase: 3 complete
