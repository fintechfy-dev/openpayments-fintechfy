# US-003 — Obtener un enlace de invitación de la natillera para compart…

> Sesión `natillera-2` · Fase 2 · Origen: USMD R02 (lado del administrador, paso 3)

## User Story
**Como** Administrador de la natillera (tesorero), **quiero** obtener un enlace de invitación de la natillera para compartirlo en el chat de mi grupo, **para** que cada persona se una por su cuenta sin que yo tenga que inscribirla a mano

## Description
El enlace abre el bot de Telegram en la natillera correcta. Reemplaza en este corte a la invitación por usuario de Telegram (R02 en USMD), que depende de que el bot pueda escribirle primero a alguien.

## Epic
- Parent: EPIC-001 — Armar la natillera
- Priority in Epic: 2
- Complexity: Baja
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
- Compartir el enlace en el grupo familiar
- Ver quién aceptó

## Integrations
- Bot de Telegram (enlace profundo)

## Acceptance Criteria

```yaml
criterios_aceptacion:
  escenarios_exito:
  - Al crear la natillera, el bot entrega un enlace único de invitación que abre el bot directamente en esa natillera.
  - El administrador puede consultar en cualquier momento quién abrió el enlace, quién aceptó y quién quedó validado.
  validaciones_reglas:
  - El enlace solo permite unirse mientras la natillera está en estado «Creada».
  - El enlace identifica una sola natillera.
  manejo_errores:
  - Si alguien abre el enlace de una natillera ya iniciada o cerrada, el bot le dice que ya no recibe participantes.
  - Si el enlace no corresponde a ninguna natillera, el bot lo dice.
  requisitos_ux:
  - El bot entrega el enlace listo para copiar y pegar en el chat del grupo, con un texto de invitación sugerido.
  casos_edge:
  - Si la misma persona abre el enlace dos veces, no se duplica su inscripción.
notas_implementacion: Reemplaza en este corte a la invitación por usuario de Telegram (SUP-003).
prioridad_criterios: 'Crítico: el enlace lleva a la natillera correcta.'
smart_validated: true
```

## Status
- State: criteria_complete
- Origin: discovery_inicial (semilla USMD REB-001)
- Phase: 3 complete
