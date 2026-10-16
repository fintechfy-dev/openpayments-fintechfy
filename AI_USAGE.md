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
| `design-system/tokens/build.mjs`, `design-system/index.html` | Claude Code (Claude Opus 5.5) | Generar `tokens.css` desde `tokens.json` y galería local de componentes | Mucho |
| `telegram/docs/plan-esqueleto.md` | Claude Code (Claude Opus 5.5) | Plan del esqueleto del bot: decisiones, herramientas y pasos; el equipo lo revisó y aprobó antes de ejecutar | Mucho |
| `telegram/src/` (arranque, `crearBot`, `/start`, logger) | Claude Code (Claude Opus 5.5) | Esqueleto del bot con grammY (#7) | Mucho; probado a mano por el equipo con un bot real |
| `telegram/src/secretos.js`, guardia de salida y logger que tapa secretos | Claude Code (Claude Opus 5.5) | US-002-SEC (#14): ningún secreto en logs ni en mensajes; `telegram/.env.example` | Mucho; el equipo verificó el arranque con su `.env` |
| `telegram/src/formato.js` y textos de `/start` | Claude Code (Claude Opus 5.5) | Montos con el mismo formato que `formatoCOP` del design system y mensajes según la guía de voz y tono | Mucho |
| `telegram/src/config.js` y `/diag` | Claude Code (Claude Opus 5.5) | Parte del bot de US-001-CFG (#12): configuración validada al arrancar y diagnóstico del equipo | Mucho |
| `telegram/src/db.js`, `telegram/src/bot/sesion-storage.js`, `flujo.js`, `/cancelar` y el flujo de prueba `/eco` | Claude Code (Claude Opus 5.5) | Parte del bot de US-007-BCK (#21): sesiones en SQLite y motor de preguntas que sobrevive a un reinicio | Mucho |
| `telegram/src/natillera/reglas.js`, `telegram/src/bot/flujos/crear.js` y botones del motor de flujos | Claude Code (Claude Opus 5.5) | US-001 (#13): `/crear` con botones en el chat, resumen con confirmar o corregir, y reglas compartidas con la Mini App | Mucho |
| `telegram/miniapp/` | Claude Code (Claude Opus 5.5) | Formulario de la Mini App de Telegram para crear la natillera, con el design system; revisado en Chrome sin ventana en claro y oscuro | Mucho |
| `telegram/miniapp/natillera/`, `telegram/miniapp/comun.js` y `/mi_natillera` | Claude Code (Claude Opus 5.5) | US-008 (#26): «Mi natillera», lo que ve el participante (ahorro, reglas y cobros) con datos de ejemplo; revisada en Chrome sin ventana en sus tres casos | Mucho |
| `telegram/test/` | Claude Code (Claude Opus 5.5) | Arnés de pruebas sin red y pruebas de `/start`, secretos, configuración, `/diag`, sesiones, flujos, reglas de US-001 y `/crear` | Mucho |
| `telegram/README.md` («Cómo correrlo») | Claude Code (Claude Opus 5.5) | Instrucciones para correr el bot | Mucho |
| `telegram/src/index.js`, `bot/flujo.js`, `bot/flujos/crear.js`, `natillera/reglas.js`, `miniapp/app.js` y sus pruebas | Claude Code (Claude Opus 5.5) | Correcciones de la revisión de calidad: Mini App dentro de Telegram, doble creación, montos y fechas, reintento del flujo, apagado y token en el log | Mucho |
| `telegram/src/externo/`, `src/web/`, `src/avisos/`, `src/registro.js`, `src/registrar-avisos.js`, `bot/comandos/cobros.js`, `config.js`, `db.js`, `/diag`, `.env.example` y sus pruebas | Claude Code (Claude Opus 5.5) | Integración del bot con staging (#5): crear la natillera de verdad, aviso a la web, registro Telegram ↔ contratos, avisos por webhook o flujo en vivo con sus mensajes, botones de pagar la deuda y la actividad, y solo periodicidad mensual (#58) | Mucho; sin probar aún contra staging real |
| `web/` (revisión de calidad: `Badge`, `lib/pagos.ts`, `lib/financiera.ts`, `presentacion.ts`, `http.ts`, `scripts/`) | Claude Code (Claude Opus 5.5) | Correcciones de los code reviews: estados desconocidos, avance del ahorro, encabezados HTTP, scripts de capturas y del design system | Mucho |
| `CLAUDE.md`, `.claude/skills/`, `.claude/agents/`, `.claude/commands/director-web.md` | Claude Code (Claude Opus 5.5) | Skills del design system y de la web, agentes implementador, revisor y verificador visual, y el comando que los orquesta | Mucho |
| `.claude/rules/` | Claude Code (Claude Opus 5.5) | Reglas del proyecto adaptadas de otro proyecto del equipo: verificar, secretos, git, IA y prompts, código, pruebas, revisión, agentes y checklist de entrega, y el paso de la checklist en la skill `natillera-pr` | Mucho |
| `docs/checklist-entrega.md`, `scripts/revisar-entrega.mjs` | Claude Code (Claude Opus 5.5) | Contraste de la checklist del equipo con el repo y script que revisa lo comprobable en cada commit y PR (secretos en el historial, Open Payments, `AI_USAGE.md`, prompts, README, ramas, hitos) | Mucho |
| `web/` (configuración, `src/lib/`, `src/components/`, layout, `scripts/`) | Claude Code (Claude Opus 5.5) | Esqueleto de Next.js (#8), capa de datos del servicio externo con datos de prueba, componentes sobre el design system, script de capturas | Mucho |
| `web/src/app/page.tsx`, `inicio.css`, `ingresar/`, `(panel)/layout.tsx`, `src/lib/sesion/`, `src/proxy.ts` | Claude Code (Claude Opus 5.5) | Página de inicio con el propósito, inicio de sesión con código por Telegram (OTP), roles y protección del panel | Mucho |
| `web/src/app/natilleras/`, `creditos/`, `pagos/`, `bitacora/`, `api/pagos/` | Claude Code (Claude Opus 5.5, subagentes) | Pantallas de #9, #10, US-007-RPT y US-012-AUD, revisadas por un agente revisor y uno visual | Mucho |
| `.claude/hooks/`, `.claude/settings.json`, `.claude/commands/director-web.md`, `.claude/agents/web-implementador.md` | Claude Code (Claude Opus 5.5) | Guardias automáticas de Claude (no escribe código en `pagos/`, ni `.env`, ni secretos; ESLint por archivo; pruebas antes de terminar; checklist antes de cada commit o PR) y `/director-web` corregido para no compilar en paralelo y registrar prompts mientras trabaja | Mucho |
| `.github/workflows/calidad.yml`, `scripts/secretos.mjs` | Claude Code (Claude Opus 5.5) | CI en cada PR (checklist de entrega, `verificar` de la web, pruebas del bot y de `pagos/` cuando exista) y patrones de secretos declarados una sola vez | Mucho |
| `integracion/README.md`, `telegram/INTEGRACION.md`, `web/INTEGRACION.md`, `pagos/README.md`, `docs/plan-de-trabajo.md`, `docs/discovery/4-logica-financiera/` | Claude Code (Claude Opus 5.5, subagentes de análisis y revisión) | Mapas de integración con la versión 0.2.0 del servicio externo (ventas), especificación de los pagos de Open Payments en el backend de la web y plan de trabajo, contrastados con el código del servicio externo y la documentación de Open Payments | Mucho |
| `.claude/hooks/guardia-edicion.mjs`, `scripts/revisar-entrega.mjs`, `CLAUDE.md`, `.claude/rules/`, `.claude/skills/`, `.claude/agents/`, `.claude/commands/director-web.md` | Claude Code (Claude Opus 5.5) | El código de Open Payments pasa al backend de la web: la guardia y la checklist protegen y revisan sus carpetas nuevas, y las reglas y skills dicen dónde vive | Mucho |

## Servicios externos

- **Servicio externo de lógica financiera:** aplica las reglas de dinero (cobros, mora, crédito y liquidación), como un n8n que contiene esa lógica. No forma parte de este proyecto ni de esta declaración: el proyecto lo llama por API.
- **Interledger Test Wallet:** billeteras de prueba de Open Payments.

## Archivos hechos con poca o ninguna IA

_Por completar. La política pone como ejemplo el servicio de Open Payments, que vive en `web/src/lib/open-payments/`, `web/src/app/api/open-payments/` y `web/src/app/api/permisos/`._

## Lo que hizo el equipo

- Todas las decisiones de producto y de alcance del discovery.
- **Bot de Telegram (Estiven):** pidió y aprobó el plan del esqueleto antes de que se escribiera código, creó el bot en @BotFather, probó a mano el arranque, `/start` y el apagado con el bot real, y decidió el reacomodo a `telegram/` y cada commit.
- _Por completar: revisión, pruebas y verificación del código que sugiera la IA._

## Registro de prompts

- **Discovery:** los prompts salen de los tres sistemas de descubrimiento que guiaron a la IA; hay una ficha de cada uno en [`prompts/discovery/`](prompts/discovery/).
- **Código de la hackathon:** el texto real de cada prompt, en [`prompts/`](prompts/), un archivo por frente y tema.
