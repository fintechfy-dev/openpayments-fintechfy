# Natillera 2.0

Ahorro en grupo sobre Open Payments para la Hackathon de Open Payments Medellín (16 y 17 de octubre de 2026). El plan vigente es `docs/plan-de-trabajo.md`; manda sobre el discovery cuando difieren.

## Reglas de la hackathon

- Todo el código se escribe durante el evento. La lógica financiera es un servicio externo que el proyecto solo llama por API.
- Cada prompt real usado para programar se copia tal cual en `prompts/<frente>-<tema>.md`, con fecha y herramienta. En el mismo PR se agrega la fila a `AI_USAGE.md`.
- El servicio de pagos (`pagos/`) se escribe con poca o ninguna IA: los mentores lo revisan línea por línea.
- Repo público: secretos solo en `.env` / `.env.local`, nunca en el código ni en mensajes.

## Cómo se trabaja

GitFlow (`CONTRIBUTING.md`): rama `feature/<frente>-<issue>-<tema>` desde `develop`, PR a `develop` con la plantilla. Nunca a `main` ni `--force`.

## Dónde está cada cosa

| Carpeta | Qué |
|---|---|
| `design-system/` | Marca, tokens, componentes y voz y tono. Skill: `natillera-design-system` |
| `web/` | Web de la financiera y el administrador (Next.js). Skill: `natillera-web`; agentes `web-implementador`, `web-revisor`, `web-verificador-visual`; comando `/director-web` |
| `telegram/` | Bot de Telegram (Node + grammY). Skill: `natillera-telegram` |
| `pagos/`, `integracion/` | Servicio de Open Payments y conexión con el servicio externo. Skill: `natillera-open-payments` (explica y revisa; el código de `pagos/` lo escribe el equipo) |
| `docs/discovery/` | Historias, criterios y escenarios (`3-bdd/`), reglas de dinero (`4-logica-financiera/`) |

Para cerrar cualquier trabajo (prompts, `AI_USAGE.md`, secretos, pruebas y PR): skill `natillera-pr`.
