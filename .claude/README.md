# Configuración de Claude Code

Lo que Claude Code carga al abrir este repo: reglas del proyecto, skills por frente, agentes y comandos. Está versionado para que todo el equipo trabaje con las mismas reglas. Si agregas, borras o renombras algo aquí, actualiza este archivo y, si es una regla, la tabla de `CLAUDE.md` en la raíz (`rules/documentacion.md`).

## Estructura

| Carpeta | Qué hay | Cómo se usa |
|---|---|---|
| [`rules/`](rules/) | Reglas del proyecto, una por tema | Se cargan solas en cada sesión. El índice está en `CLAUDE.md` |
| [`skills/`](skills/) | Conocimiento por frente o por tarea | Claude las carga cuando el pedido coincide con su descripción, o con `/<nombre>` |
| [`agents/`](agents/) | Subagentes con una tarea acotada y herramientas reducidas | Los lanza `/director-web` o se piden por nombre |
| [`commands/`](commands/) | Comandos con `/` | `/director-web <encargo>` |

## Reglas

| Archivo | De qué trata |
|---|---|
| `verificar.md` | Verificar antes de afirmar; evidencia con `ruta:línea` |
| `secretos.md` | Repo público: dónde van las llaves y qué hacer si se filtra una |
| `git-y-entrega.md` | Ramas desde `develop`, nada de git por inferencia, gobernanza en su propio commit |
| `ia-y-prompts.md` | Política de IA de la hackathon: prompts reales, `AI_USAGE.md`, `pagos/` a mano |
| `codigo.md` | Una puerta por sistema externo, datos de prueba visibles, comentarios, idioma |
| `pruebas.md` | Qué se prueba siempre y cómo saber que una prueba sirve |
| `revision.md` | Qué busca una revisión y las severidades |
| `agentes.md` | Cómo se escribe un agente o un comando |
| `checklist-entrega.md` | La checklist de entrega en cada commit y PR |
| `documentacion.md` | La documentación y la arquitectura cambian en el mismo PR que el código |

## Skills

| Skill | Para qué |
|---|---|
| `natillera-web` | Construir y revisar `web/` (con `references/checklist.md`, la checklist de revisión) |
| `natillera-telegram` | Construir y revisar `telegram/` |
| `natillera-design-system` | Marca, tokens, componentes y voz y tono, en cualquier pieza visual o texto |
| `natillera-open-payments` | Explicar y revisar Open Payments y `pagos/`; no escribe el código de `pagos/` |
| `natillera-pr` | Cerrar un trabajo: rama, prompts, `AI_USAGE.md`, secretos, pruebas y PR |

## Agentes y comandos

| Nombre | Hace | No hace | Herramientas |
|---|---|---|---|
| `web-implementador` | Construye una pantalla o componente de `web/` | Revisar, commit, push ni PR | Lectura, escritura y `Bash` |
| `web-revisor` | Revisa el diff de `web/` y da hallazgos con severidad | Editar ni tomar capturas | Lectura y `npm --prefix web run …`, `git diff/log/status` |
| `web-verificador-visual` | Capturas en 360, 768, 1024 y 1280 px, claro y oscuro | Revisar código ni editarlo | Lectura, build, start, capturas, `curl`, `lsof` |
| `/director-web` | Planea, reparte entre implementadores, revisa, verifica y entrega | Tocar `pagos/` ni `telegram/` | Las de la sesión |

Cómo se escribe uno nuevo: `rules/agentes.md`.
