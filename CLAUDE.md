# Natillera 2.0

Ahorro en grupo sobre Open Payments para la Hackathon de Open Payments Medellín (16 y 17 de octubre de 2026). El plan vigente es `docs/plan-de-trabajo.md`; manda sobre el discovery cuando difieren.

## Reglas de la hackathon

- Todo el código se escribe durante el evento. La lógica financiera es un servicio externo que el proyecto solo llama por API.
- Cada prompt real usado para programar se copia tal cual en `prompts/<frente>-<tema>.md`, con fecha y herramienta. En el mismo PR se agrega la fila a `AI_USAGE.md`.
- El código de Open Payments se escribe con poca o ninguna IA: los mentores lo revisan línea por línea. Vive en el backend de la web (`web/src/lib/open-payments/`, `web/src/app/api/open-payments/`, `web/src/app/api/permisos/`); su especificación, en `pagos/`.
- Repo público: secretos solo en `.env` / `.env.local`, nunca en el código ni en mensajes.

## Reglas

Las reglas del proyecto viven en `.claude/rules/` y Claude Code las carga solas. Si chocan, manda la más específica (la skill o la regla de la carpeta) sobre la general.

| Regla | De qué trata |
|---|---|
| `verificar.md` | Verificar antes de afirmar; evidencia con `ruta:línea` y comandos ejecutados |
| `secretos.md` | Repo público: dónde van las llaves y qué hacer si se filtra una |
| `git-y-entrega.md` | Ramas desde `develop`, nada de git por inferencia, gobernanza en su propio commit |
| `ia-y-prompts.md` | Política de IA de la hackathon: prompts reales, `AI_USAGE.md`, el código de Open Payments a mano |
| `codigo.md` | Una puerta por sistema externo, datos de prueba visibles, comentarios, idioma |
| `pruebas.md` | Qué se prueba siempre, tests que fallan de verdad, evidencia del pago real |
| `revision.md` | Qué busca una revisión y las severidades comunes |
| `agentes.md` | Cómo se escribe un agente o comando de Claude (frontera, veredicto, `tools` acotado) |
| `checklist-entrega.md` | En cada commit y PR: `node scripts/revisar-entrega.mjs --rama` y lo que falta de la checklist (`docs/checklist-entrega.md`) |

## Guardias automáticas

Las reglas que más cuestan se hacen cumplir solas (`.claude/settings.json`, scripts en `.claude/hooks/`):

| Cuándo | Qué hace |
|---|---|
| Antes de escribir un archivo | Niega el código de Open Payments (`pagos/` y sus carpetas en la web, salvo los `.md`), cualquier `.env` y texto con forma de secreto |
| Después de escribir un archivo | ESLint (web) o `node --check` (bot, scripts); el error vuelve a Claude en el momento |
| Antes de `git commit` o `gh pr create` | `revisar-entrega.mjs --rama`; niega con un bloqueo o si se mezcla `.claude/` con código |
| Al terminar un turno | Pruebas de cada carpeta con cambios (`web/` sin build); con pruebas en rojo, Claude sigue |

En GitHub, `.github/workflows/calidad.yml` corre la checklist, `verificar` de la web y las pruebas del bot en cada PR. Para revisar o apagar un hook: `/hooks`.

## Cómo se trabaja

GitFlow (`CONTRIBUTING.md`): rama `feature/<frente>-<issue>-<tema>` desde `develop`, PR a `develop` con la plantilla. Nunca a `main` ni `--force`.

## Dónde está cada cosa

| Carpeta | Qué |
|---|---|
| `design-system/` | Marca, tokens, componentes y voz y tono. Skill: `natillera-design-system` |
| `web/` | Web de la financiera y el administrador (Next.js) y backend del sistema: índice, avisos y pagos de Open Payments. Skill: `natillera-web`; agentes `web-implementador`, `web-revisor`, `web-verificador-visual`; comando `/director-web`. Mapa: `web/INTEGRACION.md` |
| `telegram/` | Bot de Telegram (Node + grammY). Skill: `natillera-telegram`. Mapa: `telegram/INTEGRACION.md` |
| `pagos/`, `integracion/` | Especificación de los pagos de Open Payments y guía del servicio externo. Skill: `natillera-open-payments` (explica y revisa; el código de Open Payments lo escribe el equipo) |
| `docs/discovery/` | Historias, criterios y escenarios (`3-bdd/`), reglas de dinero (`4-logica-financiera/`) |

Para cerrar cualquier trabajo (prompts, `AI_USAGE.md`, secretos, pruebas y PR): skill `natillera-pr`.
