# URLs en vivo y guía para el revisor en el README

## 2026-10-17 · ≈10:05 (hora de Bogotá) · Claude Code (Claude Opus 5.5)

```text
tenemos que actualizar en el repo las urls de la pagina web, del portal de staging donde esta el servicio externo y la url del bot para que este en el repo, para que al revisor le quede muy facil saber como revisar el codigo, hagamos esto en un PR
```

Claude Code comprobó que cada URL responde (web en Azure, portal y Swagger del servicio externo en staging, Swagger de
la API de pagos), leyó el `README.md`, los `package.json` de `telegram/`, `pagos/` y `web/` para los comandos de
prueba, y las carpetas `src/` de cada pieza para los puntos de entrada. Con eso agregó al `README.md` la sección «Para
revisar» (URLs en vivo con cómo se entra, dónde empieza el código de cada pieza y cómo se prueba) y la fila de la web en
«Correr la demo». Actualizó la fila `s-demo-link` de `docs/checklist-entrega.md` y la fila en `AI_USAGE.md`. No se
lanzaron subagentes.

## 2026-10-17 · ≈10:11 (hora de Bogotá) · Claude Code (Claude Opus 5.5)

```text
dime la lista de urls que incluiste y ademas incluye que que para entrar al servicio externos de staging debes de entrar con usuario y contrasena con wsierra@fintechfy.ai
```

Claude Code agregó en la fila del servicio externo de «Para revisar» que el portal de staging se abre con usuario y
contraseña, con el usuario `wsierra@fintechfy.ai`, y dejó escrito que la contraseña no va en el repo.
