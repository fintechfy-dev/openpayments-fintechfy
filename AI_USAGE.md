# Uso de IA

Declaración exigida por la política de IA de la hackathon. El equipo la completa a medida que avanza y la revisa antes del cierre del sábado a las 11:00.

## Herramientas usadas

- Claude Code (modelo Claude Opus), de Anthropic
- _Agregar aquí cualquier otra herramienta que use el equipo (ChatGPT, Copilot, Cursor, Gemini…), con su modelo._

## Dónde y cómo se usó

### 1. Discovery previo al evento (`docs/discovery/`)

- Claude Code condujo las sesiones de impact mapping, user story mapping, BDD y la especificación funcional de la lógica financiera haciendo preguntas al equipo. El equipo respondió y aprobó cada fase; la IA redactó los documentos a partir de esas respuestas y decisiones.
- No es código de la hackathon. Se hizo antes del 16 de octubre como diseño.

### 2. Arranque del repositorio

- Claude Code armó la estructura inicial y copió el discovery: `README.md`, `.gitignore`, este archivo, `docs/` y la carpeta `prompts/`.
- Con las decisiones del equipo sobre los frentes, Claude Code redactó el plan de trabajo (`docs/plan-de-trabajo.md`), la guía de GitFlow (`CONTRIBUTING.md`), los README de `telegram/`, `web/`, `pagos/` e `integracion/`, las plantillas de `.github/`, y creó los issues y etiquetas del repositorio.

### 3. Código de la hackathon

_Por completar. Una línea por archivo o componente: qué herramienta, para qué y cuánto (mucho, poco o nada)._

| Archivo o componente | Herramienta | Para qué | Cuánta IA |
|---|---|---|---|
| `telegram/docs/plan-esqueleto.md` | Claude Code (Claude Opus 5.5) | Plan del esqueleto del bot: decisiones, herramientas y pasos; el equipo lo revisó y aprobó antes de ejecutar | Mucho |
| `telegram/src/` (arranque, `crearBot`, `/start`, logger) | Claude Code (Claude Opus 5.5) | Esqueleto del bot con grammY (#7) | Mucho; probado a mano por el equipo con un bot real |
| `telegram/src/secretos.js`, guardia de salida y logger que tapa secretos | Claude Code (Claude Opus 5.5) | US-002-SEC (#14): ningún secreto en logs ni en mensajes; `telegram/.env.example` | Mucho; el equipo verificó el arranque con su `.env` |
| `telegram/test/` | Claude Code (Claude Opus 5.5) | Arnés de pruebas sin red, pruebas de `/start` y de secretos | Mucho |
| `telegram/README.md` («Cómo correrlo») | Claude Code (Claude Opus 5.5) | Instrucciones para correr el bot | Mucho |

## Servicios externos

- **Servicio externo de lógica financiera:** aplica las reglas de dinero (cobros, mora, crédito y liquidación), como un n8n que contiene esa lógica. No forma parte de este proyecto ni de esta declaración: el proyecto lo llama por API.
- **Interledger Test Wallet:** billeteras de prueba de Open Payments.

## Archivos hechos con poca o ninguna IA

_Por completar. La política pone como ejemplo el servicio de Open Payments._

## Lo que hizo el equipo

- Todas las decisiones de producto y de alcance del discovery.
- _Por completar: revisión, pruebas y verificación del código que sugiera la IA._

## Registro de prompts

- **Discovery:** los prompts salen de los tres sistemas de descubrimiento que guiaron a la IA; hay una ficha de cada uno en [`prompts/discovery/`](prompts/discovery/).
- **Código de la hackathon:** el texto real de cada prompt, en [`prompts/`](prompts/), un archivo por frente y tema.
