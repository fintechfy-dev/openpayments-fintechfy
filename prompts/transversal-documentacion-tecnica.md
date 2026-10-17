# Documentación técnica: diagramas de arquitectura, maquetas y estados en Mermaid

## 2026-10-17 · ≈09:05 (hora de Bogotá) · Claude Code (Claude Opus 5.5)

```text
ok ahora necesito que hagamos algo en el repo usando mermaid 



Diagramas de arquitectura
Maquetas
Documentación técnica
```

Claude Code leyó la checklist de entrega (punto `s-opcional`: diagrama, maquetas y documentación técnica), el
`CLAUDE.md` y las reglas de `.claude/rules/`, el plan de trabajo con su diagrama, la guía de integración, la API de
pagos (`pagos/API.md`, `pagos/src/permisos.js`, `pagos/src/almacen.js`), el README del bot, las pantallas de la web
(`web/src/app/`) y los tipos del índice (`web/src/lib/indice/tipos.ts`). Con eso escribió `docs/tecnica/`:
arquitectura (contexto, piezas y contratos, despliegue en Azure y los flujos de unirse, cobrar la cuota, liquidar,
prestar y comprar), maquetas de baja fidelidad (mapa de pantallas y cada pantalla del bot y de la web, con los textos
reales donde los hay) y estados y datos (natillera, participación, permiso, pago y lo que guarda cada pieza). Validó
los 23 diagramas con `@mermaid-js/mermaid-cli` 11.4.2 (todos compilan) y revisó dos dibujados en PNG. Actualizó la
fila `s-opcional` de `docs/checklist-entrega.md`, el enlace en `README.md` y la fila en `AI_USAGE.md`. No se lanzaron
subagentes.
