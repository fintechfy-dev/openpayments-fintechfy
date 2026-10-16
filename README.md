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
| Pagos de Open Payments | En el backend de [`web/`](web/); especificación en [`pagos/`](pagos/) | Lo único que habla con Open Payments: cobrar, pagar, desembolsar y los pagos de las ventas |
| Integración | [`integracion/`](integracion/) | Referencia del servicio externo de lógica financiera y de cómo se conecta todo |

Las reglas de dinero (cobros, mora, crédito, liquidación) las aplica un **servicio externo de lógica financiera**, como un n8n que contiene esa lógica. No forma parte de esta hackathon: el proyecto lo llama por API.

El diagrama, los contratos entre piezas y el orden de trabajo están en el [plan de trabajo](docs/plan-de-trabajo.md).

## Cómo usa Open Payments

_Por completar con lo que quede construido._ El plan: un permiso de pago saliente con tope por participante para cobrar cada cuota, pagos hacia la billetera del grupo y pagos salientes para premios, préstamos y liquidación, todo en la Interledger Test Wallet.

## Cómo trabajamos

GitFlow: cada cosa por hacer es un [issue](https://github.com/fintechfy-dev/openpayments-fintechfy/issues), cada cambio una rama `feature/` desde `develop` y todo entra por pull request. Las reglas y los comandos están en [CONTRIBUTING.md](CONTRIBUTING.md).

Antes de cada commit y de cada PR: `node scripts/revisar-entrega.mjs --rama`. Revisa contra el repo lo que exige la entrega (secretos, Open Payments, `AI_USAGE.md`, prompts, README y ramas) y dice cuánto falta para el próximo hito. Lo que falta de la checklist del equipo está en [docs/checklist-entrega.md](docs/checklist-entrega.md).

## Correr la demo

_Por completar con la demo de punta a punta._ Cada pieza explica cómo correrla en su carpeta:

- Bot de Telegram: [`telegram/README.md`](telegram/README.md#cómo-correrlo)
- Web de la financiera y el administrador: [`web/README.md`](web/README.md#cómo-correrlo)

## Secretos

Las claves de Open Payments y el token del bot van en un archivo `.env` que **nunca** se sube (está en `.gitignore`). Cada pieza tiene su `.env` en su carpeta, y las variables necesarias quedan listadas en su `.env.example` sin valores (por ejemplo, [`telegram/.env.example`](telegram/.env.example)).

## Discovery

En [`docs/discovery/`](docs/discovery/) está el diseño hecho **antes** del evento: el mapa de impacto, el mapa de historias, las historias con sus criterios y escenarios Gherkin, y la especificación funcional de la lógica financiera. Son documentos de diseño; el código de la hackathon se escribe durante el evento en este repositorio. La fuente original es [`docs/fuente/Natillera 2.pdf`](docs/fuente/).

## Design system

En [`design-system/`](design-system/) están la marca (el marranito), los tokens de color y tipografía, los componentes, los íconos y la voz y tono del bot. Toda pieza visual del proyecto parte de ahí: los tokens salen de `design-system/tokens/tokens.json`. Para ver la galería: `python3 -m http.server -d design-system 8080`.

## Uso de IA

Ver [`AI_USAGE.md`](AI_USAGE.md) y la carpeta [`prompts/`](prompts/).

## Equipo

Estiven, Juan Rafael, Johan y Willy.
