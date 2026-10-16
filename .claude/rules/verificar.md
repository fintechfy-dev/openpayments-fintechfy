# Regla: verificar antes de afirmar

**Verifica antes de afirmar; pregunta antes de asumir.** Es la defensa contra el error más caro de una hackathon de 9 horas: construir código correcto sobre una premisa falsa y descubrirlo a las 10:45 del sábado.

## Precedentes de este proyecto

| Se creía | La verificación mostró | Qué habría pasado |
|---|---|---|
| El mostaza del logo es `#B87900` (lo dice el `LEEME.json` del kit) | Medido en el PNG, el "2.0" es `#E7A402` | Tokens con un color que no está en la marca |
| La web nueva se ve en el puerto 3100 | Un servidor viejo seguía sirviendo un build anterior; 404 en rutas que sí existían | Capturas y conclusiones sobre código que ya no existía |
| ESLint 10 es la versión a usar | `eslint-config-next` 16.3 solo soporta hasta ESLint 9 | Dependencias con peers inválidos desde el primer commit |
| Si no hay scroll horizontal, la tabla cabe | En 1024 px el botón "Aprobar" quedaba cortado dentro de su marco | Un botón invisible justo en la pantalla que mira la financiera |

## Cómo se verifica

- **Contra el artefacto real**, no contra su descripción: el PNG y no su JSON, la respuesta HTTP y no la documentación, la captura y no la intuición.
- **Contra el código**, no contra los docs del discovery: el plan vigente es `docs/plan-de-trabajo.md` y, por encima, lo que corre.
- **Contra la documentación de la versión instalada.** Next 16 cambia APIs (`retry()` en `error.tsx`, `params` asíncrono): lee `web/node_modules/next/dist/docs/` antes de usar una API que recuerdas de otra versión.
- **Contra `develop` limpio** (`git worktree add /tmp/develop origin/develop`) antes de atribuirte un fallo que puede ser previo.

## Evidencia al reportar

1. Toda afirmación sobre un archivo lleva `ruta:línea` comprobada en ese momento.
2. Todo conteo (pruebas que pasan, archivos, ocurrencias) sale de un comando ejecutado ahora, no de memoria. Si citas una búsqueda, cita el comando exacto.
3. "No existe X" solo vale si corriste la búsqueda que lo confirma.
4. Si algo no se pudo verificar (no corriste el build, no viste la pantalla), se dice tal cual. "Debería funcionar" no es un resultado.
5. Si una afirmación propia resulta falsa, se corrige de inmediato y de forma explícita.
