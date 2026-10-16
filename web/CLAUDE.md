@AGENTS.md

@README.md

## Al trabajar en `web/`

`AGENTS.md` lo administra `next dev`; no lo edites. Aplica las skills `natillera-web` y `natillera-design-system`. Para construir varias pantallas: `/director-web`.

## Qué mantener al día

- **Archivo o carpeta nueva, borrada o movida en `src/` o `scripts/`:** la tabla "Estructura" del README.
- **Ruta nueva de la web** (página o API): "Estructura", la lista de rutas de `scripts/capturas.mjs` si es del panel, y `INTEGRACION.md` si la llama otra pieza.
- **Variable nueva o renombrada:** `.env.example` (sin valores) y la sección del README que la explica; solo se lee en `src/lib/servicio`, `src/lib/sesion` o `src/proxy.ts`.
- **Cuando la capa de datos hable con staging** (Bearer, índice del bot): la nota "Integración con staging" del README, la tabla de puertas y la de flujos de `docs/arquitectura.md`, y `INTEGRACION.md`.
- **Si cambia el tema, los anchos o la forma de capturar:** "Cómo correrlo" del README y `.claude/agents/web-verificador-visual.md`.
