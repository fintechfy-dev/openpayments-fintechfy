# Project Context — Natillera 2.0

> Sesión BDD 2.0 `natillera-2` · 2026-10-14 · Sembrada desde USMD ([bdd-seed.yaml](../../../user-story-mapping-discovery/sessions/USMD-20261014-natillera-2/bdd-seed.yaml), rebanada REB-001), con importación confirmada por el usuario. Aguas arriba: [IMD-20261014-natillera-2](../../../impact-mapping-discovery/sessions/IMD-20261014-natillera-2/).
> Alcance de esta sesión: **solo la rebanada «Primera natillera de punta a punta»**, para la hackathon de Open Payments de Medellín (16 y 17 de octubre de 2026).

## Vision

El objetivo inmediato es que el jurado de la hackathon lleve la propuesta a la ronda final y la premie por su aporte a la inclusión financiera. Es la meta de hito acordada en Impact Mapping.

El problema de fondo es la custodia del dinero. En la natillera tradicional, un organizador del grupo guarda el dinero de todos, y hubo casos de autopréstamo o robo; por esa desconfianza hoy se hacen menos natilleras. Natillera 2.0 quiere conservar la familiaridad del ahorro en grupo y quitar ese riesgo: el dinero lo custodia una financiera, cada aporte queda identificado y nadie del grupo puede moverlo por fuera de las reglas.

**Esencia:** un grupo de familiares o amigos ahorra junto para diciembre sin que nadie pueda tocar el dinero del grupo, viendo siempre lo suyo y lo de todos.

**Resultado de la rebanada:** un grupo de demostración arma su natillera y cada participante, incluido el administrador, autoriza una sola vez el cobro. Cada uno ve cobrada su cuota real, con su aporte y el total del grupo a la vista. Con el tiempo acelerado, cada uno recibe su liquidación en su billetera.

## Usuarios

| Rol | En esta rebanada |
|---|---|
| Participante de la natillera que ahorra para tener su dinero en diciembre | Sí |
| Administrador de la natillera (tesorero). También ahorra como participante y no puede tocar el dinero | Sí |
| Operador de la financiera que custodia y presta | No (rebanada de crédito y producto posterior) |

El jurado no es usuario del producto: ve la demo y el pitch.

## Procesos Principales

El recorrido completo va del grupo a diciembre: armar la natillera, unirse, ahorrar cada periodo, participar en actividades, pedir un préstamo y recibir la liquidación.

Esta rebanada cruza cuatro de esos procesos en flaco: **armar la natillera, unirse, ahorrar cada periodo y recibir la liquidación**. Las actividades especiales y el préstamo quedan fuera.

## Integraciones

| Sistema | Uso en la rebanada | Fuente |
|---|---|---|
| Open Payments (protocolo Interledger), SDK `open-payments-node` | Permisos (grants), cobro recurrente autorizado una vez, pagos entrantes a la billetera del grupo y salientes en la liquidación | Reglas de la hackathon (H-10) y nota del equipo («automatico con las capacidades de interledger») |
| Test Wallet de Interledger (`wallet.interledger-test.dev`) | Billeteras de los participantes y del grupo, con saldo de práctica | Reglas de la hackathon (H-10) |
| Bot de Telegram | Invitación por enlace compartido y vista del aporte y del total para el participante | Taller IMD (ENT-003) y notas del equipo |
| Motor financiero propio | **No se usa en la hackathon** (decisión del equipo: «Independiente, motor después»). Evita el choque con la regla de que todo el código se escribe durante el evento. Entra después del evento. | Respuesta del equipo, 2026-10-14 |

## Metricas de Exito

La métrica es la etapa que alcance el equipo según los anuncios oficiales del sábado 17 de octubre. Hoy está en 0, sin entrega. El mínimo aceptable es 1: una entrega válida a las 11:00 con el flujo de pago real completo (solicitud, autorización, ejecución y finalización). El objetivo es 3: el premio a la Inclusión. Esta medición viene de la Fase 1 de Impact Mapping.

El jurado evalúa ocho criterios sin pesos publicados: definición del problema, uso de Open Payments, experiencia del usuario, calidad técnica, presentación, inclusión, innovación e impacto.

## Restricciones

- **9 horas de construcción**: viernes de 10:30 a 14:00 y de 15:00 a 17:30, y sábado de 08:00 a 11:00. Es una restricción del evento, no un apetito decidido aquí.
- El código se escribe durante el evento, en un repositorio público con todas las ramas integradas. El repositorio lleva `AI_USAGE.md` y los prompts usados.
- La demo muestra pagos reales en la Test Wallet. La «demo de humo» quedó prohibida en Impact Mapping.
- Tres personas programan.

## Fase 0 (capa TESIS)

Se saltó por decisión del equipo («Saltarla (Recomendado)»). La meta y su medición ya están acordadas en Impact Mapping y el plazo es de dos días.
