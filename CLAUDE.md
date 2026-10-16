# Natillera 2.0

Ahorro en grupo sobre Open Payments para la Hackathon de Open Payments Medellín (16 y 17 de octubre de 2026). El plan vigente es `docs/plan-de-trabajo.md`; manda sobre el discovery cuando difieren.

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

## Cómo se trabaja

GitFlow (`CONTRIBUTING.md`): rama `feature/<frente>-<issue>-<tema>` desde `develop`, PR a `develop` con la plantilla. Nunca a `main` ni `--force`.

## Dónde está cada cosa

| Carpeta | Qué |
|---|---|
| `design-system/` | Marca, tokens, componentes y voz y tono. Skill: `natillera-design-system` |
| `web/` | Web de la financiera y el administrador (Next.js). Skill: `natillera-web`; agentes `web-implementador`, `web-revisor`, `web-verificador-visual`; comando `/director-web` |
| `telegram/` | Bot de Telegram |
| `pagos/`, `integracion/` | Servicio de Open Payments y conexión con el servicio externo |
| `docs/discovery/` | Historias, criterios y escenarios (`3-bdd/`), reglas de dinero (`4-logica-financiera/`) |
