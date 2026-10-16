# Regla: cómo se escribe un agente o un comando de Claude

Aplica a `.claude/agents/*.md` y `.claude/commands/*.md`. Un agente mal delimitado repite el trabajo de otro o da informes que el director no puede combinar.

Todo agente tiene:

1. **Frontmatter** con `name`, `description` (cuándo usarlo **y qué no hace**), `tools` y `model` (alias del harness: `opus`, `sonnet`, `haiku` o `inherit`; nunca un id de versión suelto).
2. **Identidad en segunda persona**, una frase.
3. **Mandato:** el fallo concreto que previene. Si no nombra un fallo real, el agente sobra.
4. **`## Frontera`:** qué no hace y de quién es ("no edito código: eso es de `web-implementador`").
5. **`## Cómo trabajas`:** pasos concretos.
6. **`## Formato de salida`** con un **veredicto de valores cerrados** (por ejemplo `APROBADO` · `CAMBIOS-MENORES` · `BLOQUEADO`) y las severidades de `revision.md`. El director combina veredictos; no puede combinar párrafos.
7. **`## Contexto obligatorio`:** qué lee antes de empezar; siempre `CLAUDE.md` y `.claude/rules/verificar.md`.

## `tools` es reducción de superficie, no una barrera

Un agente que solo revisa no lleva `Write` ni `Edit`, pero **`Bash` sin acotar deshace esa reducción**: con `Bash` cualquier agente escribe con `>`, `sed -i` o `tee`. Por eso `Bash` se acota a los prefijos que sus pasos usan (`Bash(npm run:*)`, `Bash(git diff:*)`, `Bash(lsof:*)`), o se omite si el agente no ejecuta comandos. Los agentes que escriben código (como `web-implementador`) pueden llevar `Bash` completo porque su trabajo lo exige, y no hacen commit.

Al delegar a un agente en paralelo con otros, el encargo dice qué carpetas son suyas y qué comandos no puede correr (por ejemplo `npm run build`, que comparte `.next/`).
