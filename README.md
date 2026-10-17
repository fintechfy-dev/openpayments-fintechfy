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
| Pagos de Open Payments | [`pagos/`](pagos/): API propia, publicada en Azure (guía en [`pagos/API.md`](pagos/API.md)) | Lo único que habla con Open Payments: cobrar, pagar, desembolsar y los pagos de las ventas |
| Integración | [`integracion/`](integracion/) | Referencia del servicio externo de lógica financiera y de cómo se conecta todo |

Las reglas de dinero (cobros, mora, crédito, liquidación) las aplica un **servicio externo de lógica financiera**, como un n8n que contiene esa lógica. No forma parte de esta hackathon: el proyecto lo llama por API.

El diagrama, los contratos entre piezas y el orden de trabajo están en el [plan de trabajo](docs/plan-de-trabajo.md).

## Cómo usa Open Payments

Todo pasa por la **API de pagos** ([`pagos/`](pagos/)), escrita en Node con el SDK oficial `@interledger/open-payments` y publicada en https://natillera-pagos.azurewebsites.net. Es lo único del sistema que habla con Open Payments, y trabaja sobre la Interledger Test Wallet.

- **Permisos.** Cada participante aprueba **una sola vez**, en su propia billetera, un permiso de pago saliente con tope total. Con él se le cobran las cuotas, la deuda con mora y las actividades durante toda la natillera, sin volver a pedirle nada. La compra entre participantes usa un permiso de un solo uso. Las billeteras del grupo y de la financiera tienen su propio permiso para pagar premios, liquidaciones y préstamos. Al aprobar, la billetera devuelve al participante al chat del bot: la API verifica el hash de la vuelta y el bot termina el permiso.
- **Cada pago.** La API crea un *incoming payment* en la billetera que recibe, una cotización (*quote*) en la que paga y un *outgoing payment* con el token del permiso. Después consulta el cobro hasta confirmarlo y rota el token si está por vencer.
- **Entre monedas.** Los montos de la natillera van en pesos. Si un participante tiene la billetera en euros o en dólares, la cotización de Open Payments hace la conversión: al grupo le llegan los pesos exactos y al participante se le debita lo equivalente en su moneda.
- **Las cuatro etapas.** Cada pago queda registrado con su solicitud, autorización, ejecución y finalización (`GET /api/registro`), y la web las muestra en `/pagos`.
- **Quién lo dispara.** El servicio externo de lógica financiera decide cuándo cobrar o pagar (al arrancar la natillera, en cada periodo, ante la mora o al liquidar) y llama a la API de pagos. El bot pide los permisos.

**Probado de punta a punta el 16 de octubre:** se cobraron tres cuotas reales de 50.000 COP desde billeteras en euros y dólares (15,08 EUR, 15,74 USD y 15,08 EUR) a la billetera del grupo en pesos, y quedaron en el registro con sus cuatro etapas.

## Cómo trabajamos

GitFlow: cada cosa por hacer es un [issue](https://github.com/fintechfy-dev/openpayments-fintechfy/issues), cada cambio una rama `feature/` desde `develop` y todo entra por pull request. Las reglas y los comandos están en [CONTRIBUTING.md](CONTRIBUTING.md).

Antes de cada commit y de cada PR: `node scripts/revisar-entrega.mjs --rama`. Revisa contra el repo lo que exige la entrega (secretos, Open Payments, `AI_USAGE.md`, prompts, README y ramas) y dice cuánto falta para el próximo hito. Lo que falta de la checklist del equipo está en [docs/checklist-entrega.md](docs/checklist-entrega.md).

## Correr la demo

**En vivo:**

| Qué | Dónde |
|---|---|
| Bot de Telegram | https://t.me/natillerahackbot |
| Mini App «Mi natillera» y formulario de crear | https://fintechfy-dev.github.io/openpayments-fintechfy/telegram/miniapp/ (se abren desde el bot) |
| API de pagos (Swagger) | https://natillera-pagos.azurewebsites.net/docs |
| Billeteras de prueba | https://wallet.interledger-test.dev |

**El flujo de la demo:**

1. El administrador crea la natillera en el bot (`/crear`) e invita al grupo (`/invitar`).
2. Cada participante se une con su billetera de la Test Wallet y aprueba el permiso de cobro en su billetera. Al terminar, vuelve solo al chat.
3. Cuando arranca la natillera (`Iniciar`, una acción del reloj del servicio externo), se cobra la cuota de cada participante con Open Payments.
4. `/mi_natillera` muestra lo aportado, y el registro de pagos (`GET /api/registro`, o `/pagos` en la web) muestra las cuatro etapas de cada pago.

**Probar solo la API de pagos:** el Swagger de `/docs` y la colección de Postman de [`pagos/postman/`](pagos/postman/README.md), que prueba salud, contrato, seguridad, permisos y lecturas sin mover dinero.

**En una máquina local**, cada pieza explica cómo correrla en su carpeta:

- Bot de Telegram: [`telegram/README.md`](telegram/README.md#cómo-correrlo)
- Web de la financiera y el administrador: [`web/README.md`](web/README.md#cómo-correrlo)
- API de pagos: [`pagos/API.md`](pagos/API.md#correrla)

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
