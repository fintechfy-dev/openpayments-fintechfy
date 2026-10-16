---
name: natillera-pr
description: Cierra un trabajo en el repo de Natillera 2.0 y lo deja listo para fusionar - rama correcta desde develop, prompts reales en prompts/, fila en AI_USAGE.md, revisión de secretos, pruebas de la carpeta tocada, merge de develop si hay conflictos y PR con la plantilla del repo. Úsala cuando alguien diga "haz el PR", "sube esto", "termina", "commit", "ya quedó, mándalo", cuando haya conflictos contra develop, o el sábado para la entrega (release/entrega a main).
---

# Cerrar un trabajo y abrir el PR

Las reglas están en `.claude/rules/git-y-entrega.md`, `ia-y-prompts.md`, `secretos.md` y `checklist-entrega.md`, y el detalle de GitFlow en `CONTRIBUTING.md`. Esta skill es el procedimiento, en orden.

## 0. Qué te pidieron exactamente

"Súbelo" o "mándalo" no dicen si es commit, push o PR. Si el pedido no lo dice, pregunta: commit, commit + push, o commit + PR. Fusionar un PR siempre se confirma.

## 1. La rama

- `git fetch` y mira en qué rama estás. Debe ser `feature/<frente>-<issue>-<tema>` (frentes: `telegram`, `web`, `pagos`, `transversal`) **creada desde `develop`**.
- Si estás en `develop` o `main`, crea la rama ahora desde `origin/develop` y lleva tus cambios a ella.
- Si la rama salió de otra feature todavía abierta, dilo en el PR: arrastra los commits de la otra.

## 2. Registro de IA (la política de la hackathon)

- Copia **tal cual** cada prompt de esta sesión que llevó a escribir código en `prompts/<frente>-<tema>.md`, con fecha, hora de Bogotá y herramienta con su modelo (`Claude Code (Claude Opus 5.5)`). Incluye las instrucciones completas que se dieron a subagentes. Si un prompt tenía un secreto, reemplázalo por `<SECRETO OMITIDO>`.
- Agrega a la tabla de `AI_USAGE.md` una fila por archivo o componente tocado: herramienta, para qué y cuánta IA.

## 3. Revisa antes de preparar el commit

- **La checklist de entrega:** `node scripts/revisar-entrega.mjs --rama`. Con código 1 (un secreto o un `.env` versionado) no hay commit. Si el cambio cumple o avanza un punto, actualiza su fila y "Lo que falta" en `docs/checklist-entrega.md` en este mismo commit.
- **La documentación al día** (`.claude/rules/documentacion.md`): si el cambio agrega, borra o mueve archivos, cambia variables, comandos, rutas, contratos, reglas o un flujo entre piezas, actualiza en este mismo PR el README de la carpeta, `docs/arquitectura.md` o `CLAUDE.md` según la tabla de esa regla. Los avisos `[docs]` del script lo señalan.
- Sin secretos: `git status` (ningún `.env` ni `.env.local`) y `git diff | grep -inE "key|secret|token|password|BEGIN .*PRIVATE"`.
- Sin archivos generados: `node_modules/`, `.next/`, `web/public/ds/`, `web/src/styles/ds/`, `web/.capturas/`, `telegram/data/`.
- Pruebas de cada carpeta tocada, y guarda la salida para el PR:
  - `web/`: `npm run verificar` (si hay un `npm run dev` corriendo, corre al menos `typecheck`, `lint` y `test`, y dilo).
  - `telegram/`: `npm test`.
  - `design-system/`: si tocaste `tokens.json`, `node design-system/tokens/build.mjs` y mide el contraste de lo que cambiaste.

## 4. Commits

- Gobernanza (`.claude/`, `CLAUDE.md`, reglas) en un commit propio, separado del código.
- Mensajes en español que empiecen con el id: `US-001: ...`, `#9: ...`.
- Termina cada mensaje con la línea de coautoría que indique la sesión.

## 5. Conflictos con develop

`git merge origin/develop` (nunca rebase ni `--force` sobre una rama compartida). En tablas como `AI_USAGE.md` conserva las filas de los dos lados. Vuelve a correr las pruebas después del merge.

## 6. El PR

`gh pr create --base develop` con la plantilla de `.github/pull_request_template.md`:
- **Qué cambia** con `Closes #<issue>` solo si el issue queda completo; si no, "Avanza #<issue>" y qué falta.
- **Frente** marcado.
- **Antes de fusionar:** marca solo lo que de verdad hiciste; lo que falte, sin marcar y explicado.
- Pendientes y decisiones para el equipo en una lista corta.
- **Checklist de entrega:** lo que sigue faltando según el script y los puntos ❌ y 👥 de `docs/checklist-entrega.md` que vencen antes del próximo hito. Lo mismo va al final del reporte al usuario, también después de un commit sin PR.
- Termina con la línea de atribución que indique la sesión.

Después espera unos segundos y confirma `gh pr view <n> --json mergeable,mergeStateStatus`.

## La entrega del sábado (issue #11)

10:30 se congela `develop`; se crea `release/entrega` desde `develop`, se revisan `AI_USAGE.md`, `prompts/` y el README, y se abre el PR de `release/entrega` a `main`, fusionado **antes de las 11:00**. Es el único PR que va a `main` (además de un `hotfix/*`).
