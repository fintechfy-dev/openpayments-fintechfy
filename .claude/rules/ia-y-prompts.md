# Regla: uso de IA y registro de prompts (política de la hackathon)

Incumplir la política de IA puede invalidar la entrega, aunque todo funcione.

- **Prompts reales, no resúmenes.** Cada prompt usado para programar se copia tal cual en `prompts/<frente>-<tema>.md`, con fecha, hora y herramienta (con su modelo). Incluye las instrucciones que Claude da a sus subagentes: también son prompts. Se guarda a medida que se trabaja; reconstruirlo al final no cumple.
- **`AI_USAGE.md` en el mismo PR:** una fila por archivo o componente tocado, con herramienta, para qué y cuánta IA (mucho, poco o nada). Al resolver conflictos en esa tabla se conservan todas las filas.
- **Herramientas declaradas con su modelo**: Claude Code (Claude Opus 5.5), Claude Design, ChatGPT (con el modelo exacto).
- **El código de Open Payments se escribe con poca o ninguna IA.** Vive en `web/src/lib/open-payments/`, `web/src/app/api/open-payments/` y `web/src/app/api/permisos/` (y en `pagos/`, si algo quedara ahí). Los mentores lo revisan línea por línea y la política lo pone como ejemplo. Claude puede explicar el SDK, revisar y sugerir; quien escribe ese código es el equipo. Si se usó IA allí, se declara con precisión.
- **Todo el código se escribe durante el evento.** La lógica financiera es un servicio externo que solo se llama por API; no se copia código del motor previo.
- Las rutas absolutas de máquina (`/Users/...`, `C:\Users\...`) no van en archivos versionados, porque no resuelven en la máquina de otra persona. Excepción: el texto literal de los prompts y el discovery congelado en `docs/discovery/`, que son registro histórico.
