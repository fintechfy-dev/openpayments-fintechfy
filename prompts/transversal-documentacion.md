# Documentación por carpeta, arquitectura y regla de documentación

## 2026-10-16 · ≈16:39 (hora de Bogotá) · Claude Code (Claude Opus 5.5)

```text
necesito que crees la documentacion de los encarpetados del proyecto para que tenga spresente siempre el contexto y mantengas adecuadamanete el proyecto, ademas de generar una nueva regla que si algo cambio dentro del proyecto una regla o una arquitectura etc actualices los readmes correspondientes. mantengas las arquitecturas actualizadas
```

Claude Code creó la rama desde `origin/develop`, revisó qué documentación existía y lanzó en paralelo dos subagentes de solo lectura (tipo `Explore`) con estos encargos:

### Subagente 1: mapa de `telegram/`

```text
Repo: /Users/octopus/Proyectos Johan/openpayments-fintechfy (proyecto Natillera 2.0, hackathon). Solo lectura: no edites nada.

Necesito un mapa verificado de la arquitectura de la carpeta `telegram/` (bot de Telegram en Node 24 + grammY) para escribir su documentación. Lee el código de verdad (no los README) de: telegram/src/** , telegram/miniapp/** , telegram/test/helpers/bot-prueba.js y telegram/package.json. Muy minucioso con src/.

Devuélveme, en español:
1. Por cada archivo de src/ y miniapp/: una línea con su responsabilidad, qué exporta (nombres) y de qué otros archivos del repo importa. Cita `ruta:línea` del export principal.
2. El flujo de arranque: qué hace src/index.js paso a paso (config, db, bot, servidor HTTP si lo hay, qué rutas sirve), con ruta:línea.
3. Llamadas a sistemas externos: ¿hay algún fetch/HTTP a servicio externo, pagos o web? ¿Dónde? Si no hay, dilo con el comando grep que corriste.
4. Persistencia: qué guarda telegram/data/bot.db y cómo (tablas, librería).
5. Variables de entorno que lee (nombre, obligatoria u opcional, dónde se valida), comparadas con telegram/.env.example (dime si alguna falta en uno u otro).
6. Comandos del bot registrados y flujos (crear), y cómo se componen (Composer, etc.).
7. Cómo funcionan las pruebas (helper bot-prueba.js: cómo evita la red).
8. Cualquier cosa en telegram/README.md o telegram/docs/*.md que hoy NO coincida con el código (doc desactualizada), con evidencia.

Sé conciso pero completo; solo hechos verificados con ruta:línea.
```

### Subagente 2: mapa de `web/`

```text
Repo: /Users/octopus/Proyectos Johan/openpayments-fintechfy (proyecto Natillera 2.0, hackathon). Solo lectura: no edites nada.

Necesito un mapa verificado de la arquitectura de la carpeta `web/` (Next.js 16, TypeScript) para escribir su documentación. Lee el código de verdad de: web/src/** (sin leer CSS a fondo), web/scripts/*.mjs, web/package.json, web/next.config.ts, web/.env.example.

Devuélveme, en español:
1. Por cada archivo .ts/.tsx de src/lib/, src/components/, src/proxy.ts y web/scripts/: una línea con su responsabilidad y qué exporta. Cita `ruta:línea`.
2. Rutas de la app (src/app/**): por cada page.tsx / route.ts / actions.ts, la URL, quién puede entrar (rol), qué datos lee y de qué función de lib/servicio, y qué acciones de servidor tiene. Explica el grupo (panel) y su layout.
3. Capa de datos: cómo decide src/lib/servicio entre datos de prueba (mock.ts) y HTTP (http.ts); qué variables mira; cómo se muestra el aviso de datos de prueba; qué funciones expone index.ts.
4. Sesión y acceso: flujo de inicio de sesión con OTP por Telegram (lib/sesion/*, ingresar/actions.ts, proxy.ts): cookie, firma, roles, intentos, usuarios de demo.
5. Lógica pura con prueba (fechas, natillera, pagos, financiera, presentacion, logica, bitacora): qué calcula cada una.
6. Llamadas a sistemas externos: dónde hay fetch y a qué (servicio externo, Telegram API). Confirma con grep que no hay fetch fuera de lib/servicio y lib/sesion/telegram.ts (cita el comando).
7. Qué hacen scripts/sync-ds.mjs (qué copia y a dónde) y scripts/capturas.mjs (anchos, temas, rutas, salida).
8. Variables de entorno que se leen vs las de .env.example (faltantes en uno u otro).
9. Cualquier cosa en web/README.md o web/INTEGRACION.md que hoy NO coincida con el código (doc desactualizada), con evidencia. Ejemplo a verificar: el README dice que /director-web verifica "en 3 anchos".

Sé conciso pero completo; solo hechos verificados con ruta:línea.
```

Con esos informes (y verificando a mano los hallazgos de las capturas y del tema), Claude Code escribió `docs/arquitectura.md`, los índices `docs/README.md`, `.claude/README.md` y `scripts/README.md`, la estructura y las variables en `telegram/README.md` y `web/README.md`, un `CLAUDE.md` por carpeta, la regla `.claude/rules/documentacion.md` y el aviso `[docs]` de `scripts/revisar-entrega.mjs`, que probó rompiéndolo a propósito.

Al traer `develop` (ya con el PR #63 fusionado), Claude Code aplicó la regla nueva a lo que llegó: documentó los hooks en `.claude/README.md`, `secretos.mjs` en `scripts/README.md` y la CI en `docs/arquitectura.md`. También corrigió dos falsos positivos de su propio trabajo: el hook de commit negaba el commit de merge por "mezclar" `.claude/` con código, y `revisar-entrega.mjs` contaba `pagos/CLAUDE.md` como código de `pagos/`.
