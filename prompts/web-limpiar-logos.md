# Web · limpiar los logos viejos del design system

Prompts reales de la sesión, tal cual. Herramienta: Claude Code (Claude Opus 5.5).

### 2026-10-17 08:34 (Bogotá) · Claude Code (Claude Opus 5.5)

```text
/director-web creo que hay logos y cosas del DS viejos que no se usa  design-system/assets/logos/avatar-telegram.svg por ejemplo este, puedes revisar y eliminar los losgos viejos del DS
```

Claude Code buscó con `git grep` cada archivo de `design-system/assets/` en todo el repo. Retiró los 12 SVG redibujados de `assets/logos/` (sin uso; solo los citaba `docs/marca.md`) y actualizó las guías y la skill `natillera-design-system`. Conservó el kit oficial, los íconos y `tablero-original.png`. No lanzó subagentes: el cambio no toca código de la web.
