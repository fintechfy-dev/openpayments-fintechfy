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
| `design-system/` (marca, tokens, componentes, voz y tono) | Claude Design; ChatGPT para el logo (_completar modelo_) | Explorar y vectorizar el logo del equipo, definir paleta, tipografía, componentes y guía de mensajes | Mucho |
| `design-system/tokens/build.mjs`, `design-system/index.html` | Claude Code (Claude Opus) | Generar `tokens.css` desde `tokens.json` y galería local de componentes | Mucho |
| `CLAUDE.md`, `.claude/skills/`, `.claude/agents/`, `.claude/commands/director-web.md` | Claude Code (Claude Opus) | Skills del design system y de la web, agentes implementador, revisor y verificador visual, y el comando que los orquesta | Mucho |
| `web/` (configuración, `src/lib/`, `src/components/`, layout, `scripts/`) | Claude Code (Claude Opus) | Esqueleto de Next.js (#8), capa de datos del servicio externo con datos de prueba, componentes sobre el design system, script de capturas | Mucho |
| `web/src/app/natilleras/`, `creditos/`, `pagos/`, `bitacora/`, `api/pagos/` | Claude Code (Claude Opus, subagentes) | Pantallas de #9, #10, US-007-RPT y US-012-AUD, revisadas por un agente revisor y uno visual | Mucho |

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
