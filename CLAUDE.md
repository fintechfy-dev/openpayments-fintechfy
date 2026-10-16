# Natillera 2.0

Ahorro en grupo sobre Open Payments para la Hackathon de Open Payments Medellín (16 y 17 de octubre de 2026). El plan vigente es `docs/plan-de-trabajo.md`; manda sobre el discovery cuando difieren.

**Antes de cambiar algo, lee [`docs/arquitectura.md`](docs/arquitectura.md)** (las piezas, cómo se hablan y qué está construido) y el `README.md` de la carpeta que vas a tocar. Cada carpeta tiene su `CLAUDE.md`, que se carga solo al trabajar en ella.

## Reglas de la hackathon

- Todo el código se escribe durante el evento. La lógica financiera es un servicio externo que el proyecto solo llama por API.
- Cada prompt real usado para programar se copia tal cual en `prompts/<frente>-<tema>.md`, con fecha y herramienta. En el mismo PR se agrega la fila a `AI_USAGE.md`.
- El servicio de pagos (`pagos/`) se escribe con poca o ninguna IA: los mentores lo revisan línea por línea.
- Repo público: secretos solo en `.env` / `.env.local`, nunca en el código ni en mensajes.

## Reglas

Las reglas del proyecto viven en `.claude/rules/` y Claude Code las carga solas. Si chocan, manda la más específica (la skill o la regla de la carpeta) sobre la general.

| Regla | De qué trata |
|---|---|
| `verificar.md` | Verificar antes de afirmar; evidencia con `ruta:línea` y comandos ejecutados |
| `secretos.md` | Repo público: dónde van las llaves y qué hacer si se filtra una |
| `git-y-entrega.md` | Ramas desde `develop`, nada de git por inferencia, gobernanza en su propio commit |
| `ia-y-prompts.md` | Política de IA de la hackathon: prompts reales, `AI_USAGE.md`, `pagos/` a mano |
| `codigo.md` | Una puerta por sistema externo, datos de prueba visibles, comentarios, idioma |
| `pruebas.md` | Qué se prueba siempre, tests que fallan de verdad, evidencia del pago real |
| `revision.md` | Qué busca una revisión y las severidades comunes |
| `agentes.md` | Cómo se escribe un agente o comando de Claude (frontera, veredicto, `tools` acotado) |
| `checklist-entrega.md` | En cada commit y PR: `node scripts/revisar-entrega.mjs --rama` y lo que falta de la checklist (`docs/checklist-entrega.md`) |
| `documentacion.md` | La documentación y la arquitectura cambian en el mismo PR que el código: qué README actualizar según lo que cambie |

## Cómo se trabaja

GitFlow (`CONTRIBUTING.md`): rama `feature/<frente>-<issue>-<tema>` desde `develop`, PR a `develop` con la plantilla. Nunca a `main` ni `--force`.

## Dónde está cada cosa

| Carpeta | Qué |
|---|---|
| `design-system/` | Marca, tokens, componentes y voz y tono. Skill: `natillera-design-system` |
| `web/` | Web de la financiera y el administrador (Next.js). Skill: `natillera-web`; agentes `web-implementador`, `web-revisor`, `web-verificador-visual`; comando `/director-web` |
| `telegram/` | Bot de Telegram (Node + grammY). Skill: `natillera-telegram` |
| `pagos/`, `integracion/` | Servicio de Open Payments y conexión con el servicio externo. Skill: `natillera-open-payments` (explica y revisa; el código de `pagos/` lo escribe el equipo) |
| `docs/` | Arquitectura, plan de trabajo, checklist de entrega y el discovery congelado (`discovery/3-bdd/` historias y escenarios, `discovery/4-logica-financiera/` reglas de dinero). Índice: `docs/README.md` |
| `scripts/` | Herramientas del repo: `revisar-entrega.mjs` |
| `prompts/` | Prompts reales usados para programar (política de IA) |
| `.claude/` | Reglas, skills, agentes y comandos de Claude. Índice: `.claude/README.md` |

Para cerrar cualquier trabajo (prompts, `AI_USAGE.md`, secretos, pruebas y PR): skill `natillera-pr`.
