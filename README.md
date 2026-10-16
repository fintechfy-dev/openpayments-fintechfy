# Natillera 2.0

Ahorro en grupo sin riesgo de custodia, sobre Open Payments. Proyecto del equipo para la Hackathon de Open Payments Medellín (Ruta N, 16 y 17 de octubre de 2026).

## El problema

En una natillera, un grupo de familiares o amigos ahorra junto durante el año para tener su dinero en diciembre. Alguien del grupo tiene que guardar la plata de todos, y ese es el riesgo: si esa persona se demora, se equivoca o desaparece, el grupo pierde.

## La solución

Un bot de Telegram donde el grupo arma su natillera, cada participante autoriza una sola vez el cobro de sus cuotas y el dinero queda en una billetera a nombre de una financiera, no de una persona. Nadie del grupo puede mover el dinero por fuera de las reglas, ni siquiera el administrador. Todos ven en todo momento lo suyo y lo de todos, y al final la liquidación se paga sola.

## Cómo está armado

| Pieza | Carpeta | Para quién |
|---|---|---|
| Bot de Telegram | [`telegram/`](telegram/) | Integrantes de la natillera y su administrador |
| Página web | [`web/`](web/) | La financiera y el administrador: gestionar natilleras y ver solicitudes de crédito |
| Motor financiero | [`motor/`](motor/) | Guarda el estado y aplica las reglas. Existía antes del evento: se usa como servicio |
| Servicio de pagos | [`pagos/`](pagos/) | Lo único que habla con Open Payments: cobrar, pagar y desembolsar |

El diagrama, los contratos entre piezas y el orden de trabajo están en el [plan de trabajo](docs/plan-de-trabajo.md).

## Cómo usa Open Payments

_Por completar con lo que quede construido._ El plan: un permiso de pago saliente con tope por participante para cobrar cada cuota, pagos hacia la billetera del grupo y pagos salientes para premios, préstamos y liquidación, todo en la Interledger Test Wallet.

## Cómo trabajamos

GitFlow: cada cosa por hacer es un [issue](https://github.com/fintechfy-dev/openpayments-fintechfy/issues), cada cambio una rama `feature/` desde `develop` y todo entra por pull request. Las reglas y los comandos están en [CONTRIBUTING.md](CONTRIBUTING.md).

## Correr la demo

_Por completar._

## Secretos

Las claves de Open Payments y el token del bot van en un archivo `.env` que **nunca** se sube (está en `.gitignore`). Las variables necesarias quedan listadas en `.env.example` sin valores.

## Discovery

En [`docs/discovery/`](docs/discovery/) está el diseño hecho **antes** del evento: el mapa de impacto, el mapa de historias, las historias con sus criterios y escenarios Gherkin, y el discovery financiero sobre el motor. Son documentos de diseño; el código de la hackathon se escribe durante el evento en este repositorio. La fuente original es [`docs/fuente/Natillera 2.pdf`](docs/fuente/).

## Uso de IA

Ver [`AI_USAGE.md`](AI_USAGE.md) y la carpeta [`prompts/`](prompts/).

## Equipo

Estiven, Juan Rafael, Johan y Willy.
