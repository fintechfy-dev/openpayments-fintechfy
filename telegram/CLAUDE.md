@README.md

## Al trabajar en `telegram/`

Aplica la skill `natillera-telegram` (cómo está hecho el bot) y, para los textos, la voz y tono del design system. Las pruebas no usan red: `npm --prefix telegram test`.

## Qué mantener al día

- **Archivo nuevo, borrado o movido en `src/` o `miniapp/`:** la tabla "Estructura" del README.
- **Variable nueva o renombrada:** `.env.example`, `src/config.js` y la tabla "Variables" del README, en el mismo cambio.
- **Comando nuevo del bot:** `COMANDOS` en `src/bot/index.js`, la lista de "Cómo correrlo" del README y, si cambia un flujo con otra pieza, `docs/arquitectura.md`.
- **Cuando el bot llame a staging, a pagos o a la web:** el estado de esa llamada en `INTEGRACION.md`, la tabla de puertas y la de flujos de `docs/arquitectura.md`, y la nota de "Sistemas externos" del README.
- `docs/plan-esqueleto.md`, `docs/crear-natillera.md` y `docs/mi-natillera.md` son el registro de cada entrega (con sus conteos de pruebas de ese momento); no se reescriben para que coincidan con el código actual.
