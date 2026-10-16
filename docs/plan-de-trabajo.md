# Plan de trabajo

Actualizado el viernes 16 de octubre al mediodía, con la decisión de trabajar en tres frentes sobre el motor financiero.

## La meta

Que el jurado lleve Natillera 2.0 a la ronda final y la premie por su aporte a la inclusión financiera (Premio Puntored). El mínimo aceptable es una entrega válida con **un pago real de Open Payments de punta a punta**: solicitud, autorización, ejecución y finalización.

## Cómo está armado

```mermaid
flowchart LR
  P["Integrantes y administrador"] -->|chat| BOT["telegram/<br/>Bot"]
  F["Financiera y administrador"] --> WEB["web/<br/>Página"]
  BOT -->|crear, unirse, consultar| MOTOR[("Motor financiero<br/>servicio previo al evento")]
  WEB -->|gestionar y consultar| MOTOR
  MOTOR -->|avisos| BOT
  MOTOR -->|cobrar-cuota · cobrar · pagar · desembolsar| PAGOS["pagos/<br/>Servicio de Open Payments"]
  BOT -->|permiso interactivo| PAGOS
  PAGOS --> OP["Open Payments<br/>Test Wallet"]
```

- **El motor** guarda el estado y aplica las reglas: cupo y arranque, cobro de cada periodo, mora, actividades, crédito y liquidación. Se usa como servicio ya existente; las plantillas de la natillera vienen del discovery (`docs/discovery/4-fnd-motor/templates`).
- **El servicio de pagos** es lo único que habla con Open Payments. El motor lo llama con el contrato que ya espera; el bot lo usa para que cada participante apruebe su permiso en la billetera. Es el corazón de lo que evalúa el jurado.
- **El bot y la web** no mueven dinero: piden al motor y muestran lo que el motor responde.

## Los frentes

| Frente | Para quién | Qué construye | Carpeta | Issues |
|---|---|---|---|---|
| **Telegram** | Integrantes y administrador | Crear la natillera, invitar, unirse, autorizar el cobro, ver aportes, mora y recordatorios, actividades, pedir préstamo | [`telegram/`](../telegram/) | [frente: telegram](https://github.com/fintechfy-dev/openpayments-fintechfy/issues?q=is%3Aopen+label%3A%22frente%3A+telegram%22) |
| **Web** | Financiera y administrador | Gestionar las natilleras (#9), registro de pagos para el jurado, bitácora y solicitudes de crédito (#10) | [`web/`](../web/) | [frente: web](https://github.com/fintechfy-dev/openpayments-fintechfy/issues?q=is%3Aopen+label%3A%22frente%3A+web%22) |
| **Motor** (con pagos) | Todo el sistema | Motor arriba con las plantillas (#5), servicio de Open Payments (#4), reglas de cobro, mora y liquidación, avisos al bot (#6) | [`motor/`](../motor/) y [`pagos/`](../pagos/) | [frente: motor](https://github.com/fintechfy-dev/openpayments-fintechfy/issues?q=is%3Aopen+label%3A%22frente%3A+motor%22) · [pagos](https://github.com/fintechfy-dev/openpayments-fintechfy/issues?q=is%3Aopen+label%3Apagos) |

Cada uno se asigna los issues en GitHub. Lo que toca a todos tiene la etiqueta [`transversal`](https://github.com/fintechfy-dev/openpayments-fintechfy/issues?q=is%3Aopen+label%3Atransversal).

## Contratos entre frentes

Se acuerdan primero y se escriben en el README de cada carpeta, para que cada frente avance sin esperar al otro.

| De → a | Qué | Dónde se define |
|---|---|---|
| Motor → Pagos | `POST /cobrar-cuota`, `/cobrar`, `/pagar`, `/desembolsar` con `X-Api-Key` | Ya existe: [`open-payments.api.json`](discovery/4-fnd-motor/apis/open-payments.api.json); se implementa en #4 |
| Bot → Pagos | Iniciar el permiso interactivo y recibir la vuelta a la app | `pagos/README.md`, en #4 |
| Bot y Web → Motor | Crear y consultar natilleras, participantes, aportes y crédito | `motor/README.md`, en #5 |
| Motor → Bot | Avisos: cobro hecho, permiso rechazado, mora, préstamo, liquidación | `telegram/README.md` y `motor/README.md`, en #6 |

## Orden de trabajo

| Cuándo | Qué |
|---|---|
| **Viernes, ahora a 14:00** | #2 confirmar con un mentor el uso del motor · #3 probar el cobro recurrente con un solo permiso · #4 servicio de pagos con un primer cobro real · #5 motor arriba con las plantillas · #7 y #8 esqueletos del bot y la web |
| **Viernes 15:00 · checkpoint** | Si van atrasados, se recorta en orden: `recorte 1` actividades → `recorte 2` mora diaria → `recorte 3` bitácora → `recorte 4` monitoreo. Lo `extra` (crédito, incluida la vista de solicitudes de #10) solo entra si sobra tiempo. Lo `núcleo` no se toca. |
| **Viernes 15:00 a 17:30** | Ciclo de punta a punta: crear → unirse → autorizar → cobrar → liquidar, visto en el bot y en la web |
| **Sábado 08:00 a 10:30** | Guion de demo con 4 billeteras (US-018-TST), video del pago completo, `AI_USAGE.md` y prompts |
| **Sábado 10:30 a 11:00** | Congelar y entregar: #11 |

## Riesgos abiertos

| Riesgo | Qué hacer | Issue |
|---|---|---|
| Que el motor no se pueda usar por ser código previo al evento | Preguntar hoy a un mentor; si dicen que no, las reglas pasan al servicio de pagos o al bot | #2 |
| Que Open Payments no permita cobrar cada periodo con un solo permiso | Probarlo primero; si no, rediseñar el cobro antes de construir encima | #3 |
| El alcance creció: tres frentes, web para la financiera y crédito | Respetar el orden de recorte del checkpoint de las 15:00 | — |
| Dónde corre el motor en la demo, si cada sala de jurado usa una sola laptop | Decidirlo al levantarlo y tener el video como respaldo | #5 |
| Un secreto subido al repo público | `.env` desde el primer commit y rotar la clave si pasa | US-002-SEC |
