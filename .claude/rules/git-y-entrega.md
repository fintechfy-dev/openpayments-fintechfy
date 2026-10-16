# Regla: git y entrega

El detalle de GitFlow está en `CONTRIBUTING.md`. Estas son las reglas que más se rompen sin querer.

- **Toda rama nace de `develop` actualizado** (`git fetch` y `git checkout -b feature/<frente>-<issue>-<tema> origin/develop`), nunca de otra feature. Si tu trabajo depende de un PR abierto, lo correcto es esperar a que se fusione o declararlo en la descripción del PR: una rama hija arrastra los commits de la madre y el PR muestra cambios que no son suyos.
- **Ninguna acción de git se ejecuta por inferencia.** "Súbelo", "mándalo", "ciérralo" no dicen si es commit, push, PR o merge: pregunta cuál, salvo que el pedido lo diga explícitamente. Fusionar un PR o borrar una rama remota se confirma siempre.
- Nunca `--force`, `--no-verify` ni commits directos a `main` o `develop` (GitHub los bloquea, pero no lo intentes).
- **Las reglas y la configuración de Claude (`.claude/`, `CLAUDE.md`) van en su propio commit**, separadas del código de una feature: quien revisa no debe separar dos intenciones en el mismo diff.
- **En el mismo PR que agrega código:** los prompts reales en `prompts/<frente>-<tema>.md` y la fila en `AI_USAGE.md` (ver `ia-y-prompts.md`).
- Antes del PR: las pruebas de la carpeta tocada en verde (`npm run verificar` en `web/`, `npm test` en `telegram/`) y el resultado pegado en la descripción.
- Al traer `develop` a tu rama (`git merge origin/develop`) y resolver un conflicto en tablas como `AI_USAGE.md`, conserva las filas de los dos lados.
- Sábado 10:30 se congela `develop`; 11:00 cierra la entrega (issue #11). Después de eso no se toca el código.
