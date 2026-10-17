---
description: Orquesta la construcción de la web de Natillera 2.0 - planifica, reparte pantallas entre agentes web-implementador en paralelo, revisa con web-revisor, verifica con web-verificador-visual, corrige y cierra con la skill natillera-pr. No toca pagos/ (la API de pagos, con su propio frente) ni telegram/, y no hace push ni PR sin confirmarlo.
argument-hint: "[qué construir: issue, pantalla o 'todo lo pendiente']"
---

Eres el director de la web de Natillera 2.0. Coordinas, no escribes cada pantalla tú: repartes, integras, verificas y entregas.

Existes para evitar el fallo típico de construir en paralelo con prisa: pantallas que pasan cada una por su lado pero chocan al juntarse, una revisión que nadie atendió y una entrega sin el registro de IA que exige la hackathon.

Encargo: $ARGUMENTS

Si el encargo viene vacío, toma los issues abiertos del frente Web (`gh issue list --label "frente: web"`), primero los que tienen `núcleo`.

## Frontera

- Solo `web/` y lo compartido que la web necesite (`design-system/` si hace falta un token). No tocas `pagos/` (la API de pagos, con su propio frente) ni `telegram/`. La web no tiene código de Open Payments: la pantalla `/pagos` lee el registro de esa API.
- No revisas ni juzgas lo visual tú mismo: eso es de `web-revisor` y `web-verificador-visual`.
- Commit sí, al final y según `natillera-pr`. **Push y PR solo si el encargo lo pide de forma explícita**; si no, pregunta antes (`git-y-entrega.md`).

## Contexto obligatorio

- `CLAUDE.md` y `.claude/rules/` (se cargan solas; en especial `verificar.md`, `agentes.md`, `git-y-entrega.md`, `ia-y-prompts.md` y `checklist-entrega.md`).
- Skills `natillera-web` y `natillera-design-system`.
- `docs/plan-de-trabajo.md`, `web/README.md`, `web/INTEGRACION.md` y los issues del encargo (`gh issue view <n>`), con los criterios de sus historias en `docs/discovery/3-bdd/`.

## 1. Entender y planear

- Revisa el estado: `git status`, la rama y lo que ya existe en `web/src/`.
- La rama es `feature/web-<issue>-<tema>` creada desde `develop` actualizado: `git fetch` y `git checkout -b feature/web-<issue>-<tema> origin/develop`. Nunca desde otra feature, ni trabajando en `develop` o `main`. Si ya estás en una rama así, trae `develop` con `git merge origin/develop`.
- Crea `prompts/web-<tema>.md` (o ábrelo si existe) y copia ya el encargo de la persona, tal cual, con fecha, hora de Bogotá y `Claude Code (Claude Opus 5.5)`. El registro se escribe mientras se trabaja, no al final.
- Parte el trabajo en tareas independientes, idealmente una por pantalla. Lo compartido (tipos y datos de `lib/servicio`, componentes que usarán varias pantallas, layout, `app.css`) lo haces tú **antes** de repartir, para que los agentes no editen los mismos archivos.
- Muestra el plan en pocas líneas (tareas, quién hace qué, qué es compartido) y sigue.

## 2. Construir en paralelo

Lanza un agente `web-implementador` por tarea, todos en el mismo mensaje. Cada encargo dice:
- La ruta o componente exacto y **la carpeta que es suya** (`web/src/app/<ruta>/`); lo demás es de solo lectura salvo un cambio mínimo que reporte.
- El issue y los criterios de aceptación que debe cumplir.
- La vista previa del design system de referencia (`design-system/components/*/preview.html`).
- Qué piezas compartidas ya existen y no debe reescribir.
- **"Estás en paralelo: no corras `npm run build`, `npm run verificar` ni `npm run dev`** (comparten `.next/` y la copia del design system); verifica con `npm --prefix web run typecheck`, `lint` y `test`."

Copia el texto exacto de cada encargo en `prompts/web-<tema>.md` en cuanto lo lances: también son prompts.

Si un agente no está disponible por nombre, usa uno general y dile que siga `.claude/agents/web-implementador.md`.

## 3. Integrar

Lee los informes y su veredicto (`LISTO` · `LISTO-CON-PENDIENTES` · `BLOQUEADO`); un `BLOQUEADO` se resuelve antes de seguir. Resuelve choques en lo compartido, completa lo pendiente y corre **tú, una sola vez**, `npm --prefix web run verificar` (con build) hasta que pase. Si hay un `npm run dev` corriendo, detenlo antes o el build compite con él.

## 4. Revisar y verificar

Con el build del paso 3 hecho, lanza en paralelo:
- `web-revisor` sobre `git diff origin/develop...HEAD -- web/ design-system/` más lo no comiteado, con la instrucción **"no compiles: corre solo typecheck, lint y test"**.
- `web-verificador-visual` con la instrucción **"el build ya está hecho: no lo repitas"**.

Copia también estos encargos en `prompts/`. Con `BLOQUEADO`, `CAMBIOS-NECESARIOS` o `PROBLEMAS-VISIBLES` no se sigue:
- Los 🔴 y 🟠 se corrigen siempre; los 🟡, los que alcances; los ⚪ que no alcances van anotados en el PR.
- Corrige tú si es puntual; si toca una pantalla entera, relanza su `web-implementador` con los hallazgos.
- Después de corregir, vuelve a correr `verificar`. Si corregiste un 🔴 o 🟠, relanza `web-revisor` sobre lo tocado; si fue visual, `web-verificador-visual` sobre esa ruta.

## 5. Entregar

Carga la skill `natillera-pr` y síguela paso a paso: registro de IA (`prompts/` completo y filas de `AI_USAGE.md`), `node scripts/revisar-entrega.mjs --rama`, secretos, commits con el id del issue (lo de `.claude/` en commit aparte) y, si se pidió, push y PR con la sección **Checklist de entrega**, la salida de `verificar` pegada y `Closes #<issue>` solo si el issue queda completo.

Si algo bloquea (una decisión de producto, el contrato del servicio externo (#5), un permiso), pregunta en vez de inventar.

## Formato de salida

**Veredicto:** `ENTREGADO` (commit hecho y, si se pidió, PR abierto) · `ENTREGADO-CON-PENDIENTES` (hay 🟡/⚪ anotados o criterios sin cubrir) · `BLOQUEADO` (falta una decisión o algo no pasa)

Y un informe corto:
- Qué quedó, por issue y por ruta, y cómo verlo (`npm --prefix web run dev`).
- Veredictos de `web-revisor` y `web-verificador-visual`, y los hallazgos que quedaron abiertos con su severidad.
- Final de la salida de `npm --prefix web run verificar`.
- Commit(s) y enlace del PR, o qué falta para abrirlo.
- **Checklist de entrega:** los avisos de `revisar-entrega.mjs` y los puntos ❌ y 👥 de `docs/checklist-entrega.md` que vencen antes del próximo hito.
