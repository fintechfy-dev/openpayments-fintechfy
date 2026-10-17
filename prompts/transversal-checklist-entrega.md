# Checklist de entrega contra el repo

## 2026-10-16 15:55 (hora de Bogotá) · Claude Code (Claude Opus 5.5)

```text
/director quiero que est alista de tarea slas evalues constantesmente cuando vamos hacer un PR o un commit para mirar siempr equie nos hace falta https://lemon-field-03774490f.1.azurestaticapps.net/#hoy puedes revisar esta informacion contrastarla con el proyecto, documentarla y mantenerla presente
```

Claude Code descargó el `datos.js` de la página (el contenido de la checklist), lo contrastó con el repo, los issues y el historial de git, y escribió `docs/checklist-entrega.md`, `scripts/revisar-entrega.mjs` y la regla `.claude/rules/checklist-entrega.md`. Al contrastar encontró que el commit de `.claude/rules/` se había subido a `feature/web-8-esqueleto` después de fusionar el PR #44, así que nunca llegó a `develop`; esta rama lo trae con `git cherry-pick`.

## 2026-10-16 16:03 (hora de Bogotá) · Claude Code (Claude Opus 5.5)

```text
si crea los Prs pero acrtualiza contra develop
```

Claude Code trajo `develop` (con #49, #50 y #51), actualizó en `docs/checklist-entrega.md` lo que cambió con la integración en staging y agregó a la skill `natillera-pr` el paso de la checklist, que ya estaba en `develop`.
