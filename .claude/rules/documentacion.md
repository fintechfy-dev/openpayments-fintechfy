# Regla: la documentación cambia en el mismo PR que el código

Un README desactualizado es peor que ninguno: quien llega (una persona del equipo, un agente, el jurado) confía en él y construye sobre una premisa falsa. Pasa en silencio, porque nada falla cuando un documento miente. Por eso la documentación se actualiza **en el mismo PR** que el cambio que la vuelve falsa, no "después".

## Dónde vive cada cosa

- **`docs/arquitectura.md`:** la vista de todo el sistema (piezas, flujos entre ellas, puertas a sistemas externos, decisiones). Es el primer documento que se lee.
- **`<carpeta>/README.md`:** qué es la carpeta, su estructura (archivo por archivo en lo que tiene código), cómo se corre y se prueba, sus variables y sus contratos.
- **`<carpeta>/CLAUDE.md`:** lo que Claude debe tener presente al trabajar en esa carpeta. Importa el README (`@README.md`) y agrega solo lo que no está en él: qué mantener al día al cambiar algo ahí. No duplica el README.
- **Mapas de integración** (`web/INTEGRACION.md`, `telegram/INTEGRACION.md`, `integracion/README.md`): cada llamada a staging y su estado.
- **`CLAUDE.md` raíz:** el índice de reglas y de carpetas.

## Si cambias esto, actualiza esto

| Cambio | Se actualiza en el mismo PR |
|---|---|
| Archivo o carpeta nueva, borrada o movida con código (`src/`, `lib/`, `miniapp/`, `scripts/`) | La sección **Estructura** del README de esa carpeta |
| Una pieza nueva, un flujo entre piezas, una llamada nueva a un sistema externo, una decisión de diseño | `docs/arquitectura.md` (diagrama y tabla de flujos) y el mapa de integración del frente |
| Variable de entorno nueva, renombrada o borrada | El `.env.example` de la carpeta y la tabla de variables de su README |
| Comando de `package.json`, comando del bot, ruta de la web | "Cómo correrlo" del README; las rutas de la web también en `web/INTEGRACION.md` |
| Contrato con el servicio externo o con `pagos/` | `integracion/README.md` y el mapa del frente; si cambia el flujo, `docs/arquitectura.md` |
| Regla nueva, borrada o renombrada en `.claude/rules/` | La tabla de reglas de `CLAUDE.md` raíz y `.claude/README.md` |
| Agente, comando, skill o hook nuevo en `.claude/` | `.claude/README.md`; si es de un frente, su README ("Trabajar con Claude Code") |
| Token, componente o asset del design system | `design-system/README.md` y el README del componente |
| Algo del plan que ya no se hace o se hace distinto | Se anota en `docs/arquitectura.md` (decisiones) con la fecha; `docs/plan-de-trabajo.md` no se reescribe |

## Cómo se hace

- **Contra el código, no de memoria** (`verificar.md`): la estructura se saca de `git ls-files`, las variables del código que las lee, los comandos de `package.json`. Si un documento y el código no coinciden, manda el código y se corrige el documento.
- **Si al trabajar encuentras un documento falso**, aunque no sea por tu cambio, corrígelo en el mismo PR o anótalo en la descripción.
- **Lo que no se sabe todavía** va como `_Por definir: …_` con el issue, no como si estuviera hecho.
- `node scripts/revisar-entrega.mjs --rama` avisa (`[docs]`) cuando la rama agrega, borra o mueve archivos de una carpeta, o cambia su `package.json` o `.env.example`, sin tocar su README; o cuando cambia `.claude/rules/` sin tocar `CLAUDE.md`. Es un aviso, no una prueba: también hay que leer si lo que dice el README sigue siendo cierto.
- `docs/discovery/` es diseño previo congelado y no se actualiza; si el código se aparta de él, la diferencia se anota en `docs/arquitectura.md`.
