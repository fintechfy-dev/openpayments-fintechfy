# Scripts del repositorio

Herramientas que no son de ningún frente. Se corren desde la raíz con Node 24, sin dependencias.

## Estructura

| Archivo | Qué hace | Cuándo |
|---|---|---|
| [`revisar-entrega.mjs`](revisar-entrega.mjs) | Revisa los puntos de [`docs/checklist-entrega.md`](../docs/checklist-entrega.md) que se pueden comprobar desde el repo: secretos en el árbol, los cambios y el historial; Open Payments; `AI_USAGE.md`; prompts; README; repositorio público; `main` contra `develop`; el próximo hito. Con `--rama`, además, lo que le falta al diff de la rama contra `develop`: prompts, `AI_USAGE.md`, `pagos/` y la documentación al día (`[docs]`) | Antes de cada commit y de cada PR (`.claude/rules/checklist-entrega.md`) |

```bash
node scripts/revisar-entrega.mjs           # revisión completa
node scripts/revisar-entrega.mjs --rama    # además, la rama contra develop
```

Sale con código **1 solo ante un bloqueo** (un secreto o un `.env` versionado); todo lo demás son avisos (`!`). Necesita `git fetch` reciente para comparar con `origin/develop`, y `gh` con sesión para saber si el repo es público (si no, avisa).

## Mantenerlo

- Los hitos (`HITOS`) están copiados de la checklist del equipo: si la organización cambia una hora, se actualizan aquí y en `docs/checklist-entrega.md`, y se conservan los ids.
- Un punto nuevo usa el id de la checklist (`s-…`, `b-…`, `hoy-…`); los avisos internos usan `rama` o `docs`.
