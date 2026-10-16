# Plan del esqueleto del bot de Telegram

> Issue [#7](https://github.com/fintechfy-dev/openpayments-fintechfy/issues/7) · rama `feature/telegram-7-esqueleto-bot` · 2026-10-16.
> Estado: **aprobado**. Tarea 1 hecha y verificada con un bot real; reacomodo hecho; tareas 2 a 5 pendientes.

## 0. Reacomodo del 16 de octubre (después del plan de trabajo del equipo)

El equipo publicó en `develop` el [plan de trabajo](../../docs/plan-de-trabajo.md) y la [guía de GitFlow](../../CONTRIBUTING.md). Cambios que tocan este plan:

- **Tres frentes con carpeta propia** (`telegram/`, `web/`, `pagos/`, más `integracion/`). El bot vive en `telegram/`, como pide #7.
- **Las reglas de dinero las aplica un servicio externo de lógica financiera** ([especificación](../../docs/discovery/4-logica-financiera/especificacion-funcional.md)), y solo `pagos/` habla con Open Payments. **El bot no mueve dinero ni guarda el estado de las natilleras: pide y muestra.**
- US-001-CFG (#12) y US-007-BCK (#21) son del frente Pagos. Al bot le queda solo su parte: las validaciones de rango que hace el bot y su propio estado de conversación.
- Ramas `feature/<frente>-<issue>-<tema>` desde `develop`, PR hacia `develop`, prompts en `prompts/<frente>-<tema>.md` y filas de `AI_USAGE.md` en el mismo PR.

Lo que se hizo en el reacomodo:

- [x] R.1 Rama `feature/telegram-7-esqueleto-bot` creada desde `feature/estiven` (que ya estaba sobre `develop`).
- [x] R.2 `package.json`, `package-lock.json`, `src/` y `test/` movidos a `telegram/`; `node_modules/` y `.env` también. → `npm test` dentro de `telegram/`: 3/3.
- [x] R.3 Este plan movido de `docs/bot-telegram/` a `telegram/docs/`.
- [x] R.4 `prompts/bot-telegram.md` renombrado a `prompts/telegram-esqueleto-bot.md`.
- [x] R.5 Filas del bot en la tabla de `AI_USAGE.md`.
- [x] R.6 «Cómo correrlo» en `telegram/README.md`.

## 1. Qué se construye y qué no

**Entra:** el proyecto del bot listo para que el frente Telegram le agregue flujos encima (issue #7).

| # | Tarea | Historia o issue | Resultado |
|---|---|---|---|
| 1 | Arranque del proyecto del bot | #7 | El bot arranca, responde `/start` y se apaga limpio |
| 2 | Secretos fuera del repo | US-002-SEC (#14, transversal) | `telegram/.env.example` sin valores; el token nunca sale en logs ni en mensajes |
| 3 | Configuración del bot | Parte del bot de US-001-CFG (#12) | Límites que valida el bot y direcciones de los servicios, revisados al arrancar; `/diag` solo en el chat del equipo |
| 4 | Conversaciones que sobreviven a un reinicio | Parte del bot de US-007-BCK (#21) | Un flujo de preguntas a medias sobrevive a un reinicio del bot |
| 5 | Conexión de prueba con el servicio externo | #7, contrato en #5 | **Bloqueada** hasta que exista el contrato en `integracion/README.md` |

**No entra:** crear la natillera (#13), el enlace de invitación (#16), la autorización (#19, #18), los avisos (#6) ni nada que mueva dinero. El esqueleto deja los puntos de enganche.

## 2. Decisiones

| # | Decisión | Por qué | Alternativa descartada |
|---|---|---|---|
| D-01 | **Node.js 24, JavaScript con módulos ES** | El frente Pagos usa el SDK de Node (`@interledger/open-payments`); un solo lenguaje en el equipo. Node 24 ya está instalado (v24.17.0) | TypeScript: suma compilación y configuración que en 9 horas no paga |
| D-02 | **grammY 1.46.0** (versión fija) | Mantenida, buena documentación, sesiones con almacenamiento enchufable, teclados en línea | Telegraf: menos activa; la API cruda: demasiado código a mano |
| D-03 | **Long polling** para recibir los mensajes de Telegram | No necesita URL pública. Es independiente de cómo lleguen los avisos del servicio externo (#6) | Webhook de Telegram: otro punto de falla en la demo |
| D-04 | **SQLite integrado de Node (`node:sqlite`)**, solo para las sesiones del bot | Cero dependencias nativas (en Windows suelen fallar). El estado del negocio no vive aquí: vive en el servicio externo | `better-sqlite3`: requiere compilar; Redis: infraestructura extra |
| D-05 | ~~Una sola app para todo el equipo~~ → **El bot es un proyecto propio en `telegram/`** con su `package.json` | Así lo pide #7 y el plan de trabajo: cada frente en su carpeta. El bot habla con `pagos/` y con el servicio externo por HTTP | Una app en la raíz: chocaría con `web/` y `pagos/` |
| D-06 | **`process.loadEnvFile()`** de Node para leer `telegram/.env` | Integrado en Node 24; una dependencia menos | `dotenv` |
| D-07 | **Toda la configuración se valida al arrancar** y se reportan **todos** los errores juntos, nombrando la variable sin mostrar su valor | Criterios de US-001-CFG y US-002-SEC; ahorra arranques en la hackathon | Fallar en el primer error |
| D-08 | **Guardia de salida:** si un mensaje a Telegram contiene el token, no se envía | US-002-SEC: «Ningún mensaje del bot incluye llaves ni tokens» | Confiar en la revisión manual |
| D-09 | **Logs con secretos tapados** (`***`) | Un error o un `console.log` descuidado no filtra el token | — |
| D-10 | **Motor de flujos propio y pequeño**: un flujo es una lista de pasos `{clave, pregunta, ejemplo, validar}`; el estado `{flujo, paso, datos}` vive en la sesión de grammY guardada en SQLite | Es lo que piden US-001 y US-010 (una pregunta a la vez, con ejemplo, sin perder lo respondido) y sobrevive reinicios | `@grammyjs/conversations`: su modelo de «repetición» es difícil de depurar con prisa |
| D-11 | **Los flujos se registran por id**: la sesión guarda solo el id y los datos | Tras un reinicio el bot reencuentra la definición por su id | — |
| D-12 | **Nada se crea hasta el último paso**; `/cancelar` borra el flujo | US-001: si el administrador abandona a mitad, no queda ninguna natillera creada. Al terminar, el bot llama al servicio externo una sola vez | — |
| D-13 | **`/diag` responde solo en `TEAM_CHAT_ID`**; en otro chat no responde nada | No revela que el comando existe | Responder «sin permiso» |
| D-14 | **Mensajes en texto plano** (sin `parse_mode`) en el esqueleto | Evita errores por caracteres sin escapar | Se puede cambiar por flujo |
| D-15 | ~~Congelar la configuración en cada natillera~~ → **Lo hace el servicio externo** | El bot no guarda natilleras; solo valida rangos antes de enviar | — |
| D-16 | **Pruebas con `node:test`** (integrado), solo `test/**/*.test.js` | Cero dependencias; `npm test` | Jest/Vitest |
| D-17 | **La base de datos va en `telegram/data/`**, ignorada por git | Guarda ids de chats de personas reales; el repo es público | — |
| D-18 | **Errores con `errorBoundary` además de `bot.catch`** | `bot.catch` solo actúa con `bot.start()`; el límite de errores también cubre `handleUpdate` (pruebas o webhook) | Solo `bot.catch` |
| D-19 | **Los textos siguen la [guía de voz y tono](https://github.com/fintechfy-dev/openpayments-fintechfy/blob/feature/transversal-design-system/design-system/docs/voz-y-tono.md)** del design system (aún sin fusionar): tuteo, máximo 3 líneas, un emoji, sin «wallet», «token», «grant» ni «payment pointer» | Coherencia con la marca y con el premio a la Inclusión | — |
| D-20 | **El servicio externo y `pagos/` se llaman por HTTP con un cliente pequeño** en `src/servicios/`, con su URL y su llave en `.env` | Contratos del plan de trabajo: bot → servicio externo (#5) y bot → pagos (#4) | — |

## 3. Qué se usa

| Pieza | Versión | Para qué |
|---|---|---|
| Node.js | 24.17.0 (mínimo 24) | Ejecución, `node:sqlite`, `node:test`, `process.loadEnvFile`, `fetch` |
| grammY | 1.46.0 | Bot de Telegram |
| npm | 11.13.0 | Dependencias y scripts |

Dependencias totales: **una** (`grammy`).

## 4. Estructura de archivos

```text
telegram/
  package.json              scripts: start, dev (con --watch), test
  .env.example              variables sin valores (tarea 2)
  README.md                 qué es el frente y cómo correr el bot
  docs/plan-esqueleto.md    este archivo
  src/
    index.js                arranque: lee .env, valida config, abre la BD, lanza el bot, apagado limpio
    config.js               loadConfig(env): valida y devuelve la config congelada (tarea 3)
    log.js                  logger (tapa secretos desde la tarea 2)
    db.js                   SQLite solo para las sesiones (tarea 4)
    servicios/
      externo.js            cliente HTTP del servicio externo de lógica financiera (tarea 5)
    bot/
      index.js              crearBot(): límite de errores, sesión, comandos
      sesion-storage.js     adaptador de sesiones de grammY sobre SQLite (tarea 4)
      flujo.js              motor de flujos (tarea 4)
      comandos/
        start.js            bienvenida y enganche del enlace de invitación
        cancelar.js         cancela el flujo en curso (tarea 4)
        diag.js             diagnóstico del equipo (tarea 3)
  test/
    helpers/bot-prueba.js   arnés sin red
    *.test.js
prompts/telegram-esqueleto-bot.md   prompts reales (política de IA)
```

## 5. Variables de entorno (`telegram/.env`)

| Variable | Obligatoria | Regla |
|---|---|---|
| `BOT_TOKEN` | Sí | No vacía. Nunca se imprime |
| `TEAM_CHAT_ID` | Sí | Número entero (los grupos son negativos) |
| `CUOTA_MIN` | Sí | Número > 0 y < `CUOTA_MAX` |
| `CUOTA_MAX` | Sí | Número > `CUOTA_MIN` |
| `MORA_DIARIA_MAX_PCT` | Sí | Número ≥ 0 |
| `EXTERNO_URL` | Tarea 5 | URL `http(s)` del servicio externo |
| `EXTERNO_API_KEY` | Tarea 5 | Según el contrato de #5. Nunca se imprime |
| `PAGOS_URL` | Cuando exista #4 | URL del servicio de pagos, para iniciar el permiso interactivo |
| `DB_PATH` | No | Por defecto `./data/bot.db` |

Ya no son del bot (pasan al servicio externo o a `pagos/`): `REINTENTOS_COBRO`, `MODO_DEMO`, `MINUTOS_POR_PERIODO` y `MINUTOS_POR_DIA_MORA`. El reloj de la demo se acelera en el servicio externo («se pueden disparar con la fecha deseada»).

Los valores de `CUOTA_MIN` y `CUOTA_MAX` quedan sin fijar hasta conocer la moneda de la Test Wallet (R-02).

## 6. Tareas en pasos pequeños

Cada paso termina en algo que se puede verificar. Todos los comandos se corren dentro de `telegram/`.

### Tarea 1: arranque del proyecto del bot ✅

- [x] 1.1 Crear `package.json` (`"type": "module"`, `engines.node >= 24`, scripts `start`, `dev`, `test`).
- [x] 1.2 Instalar `grammy@1.46.0` con versión exacta. → Verificado: existe `package-lock.json`, 0 vulnerabilidades.
- [x] 1.3 Crear `src/log.js` con `info`, `warn` y `error`.
- [x] 1.4 Crear `src/bot/index.js` con `crearBot(config, deps)` que devuelve el bot sin arrancarlo.
- [x] 1.5 Comando `/start` (`src/bot/comandos/start.js`): bienvenida; con payload (enlace de invitación) responde que llega pronto. Enganche de #16.
- [x] 1.6 Menú de comandos (`setMyCommands`) con `/start`. `/cancelar` se agrega en la tarea 4.
- [x] 1.7 Manejo de errores con `bot.catch` y `errorBoundary` (D-18): registra el error y responde «Algo falló, intenta de nuevo».
- [x] 1.8 `src/index.js`: long polling; el `chat.id` de quien escribe `/start` queda en el log para averiguar `TEAM_CHAT_ID`. Validación provisional de `BOT_TOKEN`, que la tarea 3 reemplaza.
- [x] 1.9 Apagado limpio con `SIGINT`/`SIGTERM`.
- [x] 1.10 Verificado a mano por Estiven el 2026-10-16 con un bot real. Sin token sale con código 1 y «Falta la variable BOT_TOKEN».
- [x] 1.11 Arnés de pruebas sin red (`test/helpers/bot-prueba.js`) y pruebas de `/start` y del error. → `npm test`: 3/3.

### Tarea 2: secretos fuera del repositorio (US-002-SEC, #14)

- [ ] 2.1 Crear `telegram/.env.example` con las variables de la sección 5, sin valores y con un comentario por variable.
- [ ] 2.2 Agregar `data/` a `.gitignore`.
- [x] 2.3 Leer `.env` con `process.loadEnvFile()` si existe. *Adelantado a la tarea 1.*
- [ ] 2.4 En `src/log.js`, tapar con `***` el token y la llave del servicio externo.
- [ ] 2.5 Guardia de salida (`bot.api.config.use`): si una llamada a Telegram incluye un secreto, se bloquea y se registra.
- [ ] 2.6 Pruebas: un mensaje con el token no se envía; el log tapa el token.
- [ ] 2.7 Verificar: `git status` no muestra `.env` ni `data/`.

### Tarea 3: configuración del bot (parte del bot de US-001-CFG)

- [ ] 3.1 Crear `src/config.js` con `loadConfig(env)`: función pura que devuelve un objeto congelado.
- [ ] 3.2 Validar cada variable según la sección 5 y juntar **todos** los errores.
- [ ] 3.3 Si hay errores, lanzar `ConfigError`; cada error nombra la variable y la regla, nunca el valor.
- [ ] 3.4 En `src/index.js`: si `loadConfig` falla, imprimir la lista y salir con código 1.
- [ ] 3.5 Comando `/diag` (solo en `TEAM_CHAT_ID`): límites en uso, tiempo encendido, estado de la BD, sesiones activas y estado del servicio externo («sin conectar» hasta la tarea 5).
- [ ] 3.6 Pruebas: config válida; falta una variable; `CUOTA_MIN ≥ CUOTA_MAX`; el mensaje de error no contiene el valor del token; `/diag` fuera del chat del equipo no responde.
- [ ] 3.7 Verificar a mano: `/diag` en el chat del equipo responde; en otro chat, nada.

### Tarea 4: conversaciones que sobreviven a un reinicio

- [ ] 4.1 Crear `src/db.js`: abrir SQLite en `DB_PATH` (crear la carpeta si no existe), modo WAL y tabla `sesiones (clave TEXT PRIMARY KEY, valor TEXT, actualizado TEXT)`.
- [ ] 4.2 Crear `src/bot/sesion-storage.js`: adaptador `{ read, write, delete }` que guarda la sesión de grammY como JSON.
- [ ] 4.3 Conectar `session({ initial: () => ({ flujo: null }), storage })`.
- [ ] 4.4 Crear `src/bot/flujo.js`:
  - `registrarFlujo(def)`: guarda `{ id, pasos, alTerminar }` por id.
  - `iniciarFlujo(ctx, id)`: pone `{ id, paso: 0, datos: {} }` y hace la primera pregunta con su ejemplo.
  - `avanzarFlujo(ctx, texto)`: valida; si no sirve, explica por qué y repite la pregunta sin perder lo respondido; si sirve, pasa a la siguiente.
  - Al terminar llama a `alTerminar(ctx, datos)` una sola vez y limpia el flujo (D-12).
  - Si la sesión apunta a un flujo que ya no existe, lo limpia y avisa.
- [ ] 4.5 Middleware: con un flujo en curso, los textos que no son comandos van a `avanzarFlujo`.
- [ ] 4.6 Comando `/cancelar` (y al menú): borra el flujo en curso y confirma; si no había, lo dice.
- [ ] 4.7 Cerrar la BD en el apagado limpio.
- [ ] 4.8 Flujo de ejemplo `eco` (2 preguntas) para probar el motor sin #13; se quita cuando exista `/crear`.
- [ ] 4.9 Pruebas: el adaptador lee lo que escribió; la sesión sobrevive a cerrar y reabrir la BD; el flujo rechaza una respuesta inválida conservando los datos; `alTerminar` se llama una vez; `/cancelar` no lo llama.
- [ ] 4.10 Verificar a mano: empezar `eco`, responder la primera, `Ctrl+C`, `npm start`, responder la segunda → termina bien.

### Tarea 5: conexión de prueba con el servicio externo (#7) — bloqueada por #5

- [ ] 5.1 Esperar el contrato bot → servicio externo en `integracion/README.md` (dirección, autenticación, operaciones).
- [ ] 5.2 Crear `src/servicios/externo.js` con `fetch`, tiempo límite y errores claros («el servicio no responde»), sin imprimir la llave.
- [ ] 5.3 Una llamada de prueba (la más simple del contrato) y su estado en `/diag`.
- [ ] 5.4 Prueba con un servidor falso local.

### Cierre (PR de #7)

- [ ] C.1 `npm test` en verde.
- [ ] C.2 `telegram/README.md` al día.
- [ ] C.3 Prompts reales en `prompts/telegram-esqueleto-bot.md` y filas en `AI_USAGE.md`.
- [ ] C.4 Commits con el id al inicio (por ejemplo `#7: ...` o `US-002-SEC: ...`), push y PR hacia `develop` con `Closes #7`.

## 7. Puntos de enganche que deja el esqueleto

| Para | Dónde | Qué queda listo |
|---|---|---|
| #13 crear la natillera | `flujo.js` | Flujo con pasos y validaciones de rango; `alTerminar` muestra el resumen y llama al servicio externo. Ojo: la especificación suma «días de espera» |
| #16 enlace de invitación | `comandos/start.js` | El payload de `/start` ya se lee |
| #19 y #18 autorización | `servicios/` | Cliente de `pagos/` para iniciar el permiso; el retorno de la billetera lo recibe `pagos/` y el bot se entera por un aviso |
| #6 avisos | `crearBot` recibe `deps` | Se inyecta el `notifier`. **Pendiente del equipo:** webhook del bot o consulta periódica. Si es webhook, el bot necesita un servidor HTTP propio |

## 8. Pendientes

- **Cómo llegan los avisos (#6):** webhook o consulta periódica. Cambia si el bot levanta un servidor HTTP.
- **Contrato con el servicio externo (#5):** bloquea la tarea 5 y todo lo que crea o consulta natilleras.
- **Moneda de la Test Wallet (R-02):** fija `CUOTA_MIN` y `CUOTA_MAX`.
- **¿Una persona en varias natilleras?** Si sí, `/estado` necesitará un selector.
- **Clave de sesión:** hoy es el id del chat (chats privados). Si se usa en grupos, chat + usuario.
- **La bienvenida** se ajusta a la guía de voz y tono cuando se fusione el design system (D-19).
- Resuelto por la especificación: el redondeo de la liquidación (al centavo hacia abajo; lo que sobra, al último).
