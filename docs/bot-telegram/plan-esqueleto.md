# Plan del esqueleto del bot de Telegram

> Rama `feature/estiven` · 2026-10-16 · Tareas 1 a 4 del bot (base sin la que no hay demo).
> Estado: **aprobado**. Tarea 1 hecha y verificada con un bot real; tareas 2 a 4 pendientes.

## 1. Qué se construye y qué no

**Entra:** el proyecto del bot listo para que el equipo le agregue flujos encima.

| # | Tarea | Historia | Resultado |
|---|---|---|---|
| 1 | Arranque del proyecto del bot | — | El bot arranca, responde `/start` y se apaga limpio |
| 2 | Secretos fuera del repo | US-002-SEC | `.env.example` sin valores; el token nunca sale en logs ni en mensajes |
| 3 | Configuración y modo demo | US-001-CFG | Reglas del sistema validadas al arrancar; `/diag` solo en el chat del equipo |
| 4 | Estado de conversación persistente | US-007-BCK (parte del bot) | Un flujo de preguntas a medias sobrevive a un reinicio del bot |

**No entra (va en tareas siguientes):** crear la natillera (`/crear`, tarea 5), el enlace de invitación (tarea 7), Open Payments, el programador de cobros y los avisos. El esqueleto deja los puntos de enganche, pero no implementa esa lógica.

## 2. Decisiones

| # | Decisión | Por qué | Alternativa descartada |
|---|---|---|---|
| D-01 | **Node.js 24, JavaScript con módulos ES** | El SDK oficial `@interledger/open-payments` es de Node; un solo lenguaje para todo el equipo. Node 24 ya está instalado (v24.17.0) | TypeScript: suma un paso de compilación y configuración que en 9 horas no paga |
| D-02 | **grammY 1.46.0** (versión fija) como librería del bot | Mantenida, buena documentación, sesiones con almacenamiento enchufable, teclados en línea | Telegraf: menos activa; la API cruda de Telegram: demasiado código a mano |
| D-03 | **Long polling** en la demo, no webhook | No necesita URL pública para el bot. La URL pública (ngrok) solo hará falta para el retorno de Open Payments (tarea 10) | Webhook: otro punto de falla durante la demo |
| D-04 | **SQLite integrado de Node (`node:sqlite`)** | Viene con Node 24: cero dependencias nativas, que en Windows suelen fallar al instalar. Un archivo, sobrevive reinicios | `better-sqlite3`: requiere compilar; Redis/Postgres: infraestructura extra |
| D-05 | **Una sola app** con carpetas por módulo (`src/bot`, `src/config`, `src/db`), no un proyecto aparte para el bot | Open Payments y el programador van a compartir la base de datos y los eventos con el bot | Varios servicios: más arranque y comunicación entre procesos |
| D-06 | **`process.loadEnvFile()`** de Node para leer `.env` | Integrado en Node 24; una dependencia menos | `dotenv` |
| D-07 | **Toda la configuración se valida al arrancar** y se reportan **todos** los errores juntos, nombrando la variable sin mostrar su valor | Criterio de US-001-CFG y US-002-SEC; en la hackathon ahorra arrancar varias veces | Fallar en el primer error |
| D-08 | **Guardia de salida:** antes de enviar cualquier mensaje, el bot revisa que no contenga el token; si lo contiene, no lo envía | Criterio de US-002-SEC («Ningún mensaje del bot incluye llaves ni tokens»). Cuesta pocas líneas | Confiar en la revisión manual |
| D-09 | **Logs con secretos tapados**: el logger reemplaza el token por `***` | Un error de red o un `console.log` descuidado no filtra el token | — |
| D-10 | **Motor de flujos propio y pequeño**: un flujo es una lista de pasos `{clave, pregunta, ejemplo, validar}`; el estado `{flujo, paso, datos}` vive en la sesión de grammY guardada en SQLite | Es exactamente lo que piden US-001 y US-010 (una pregunta a la vez, con ejemplo, sin perder lo ya respondido). Al guardarse como datos, sobrevive reinicios | Plugin `@grammyjs/conversations`: más potente, pero su modelo de «repetición» es difícil de depurar con prisa |
| D-11 | **Los flujos se registran por id**: la sesión guarda solo el id y los datos, no funciones | Después de un reinicio el bot vuelve a encontrar la definición del flujo por su id | — |
| D-12 | **Nada se crea hasta el último paso**; `/cancelar` borra el flujo en curso | Criterio de US-001: si el administrador abandona a mitad, no queda ninguna natillera creada | — |
| D-13 | **`/diag` responde solo en `TEAM_CHAT_ID`**; en cualquier otro chat el bot no responde nada | No revela que el comando existe | Responder «sin permiso» |
| D-14 | **Mensajes en texto plano** (sin `parse_mode`) en el esqueleto | Evita errores por caracteres sin escapar en Markdown/HTML | Se puede cambiar por flujo más adelante |
| D-15 | **La configuración se congela al crear cada natillera** (se guarda copia de los valores) | Criterio de US-001-CFG: cambiar la configuración no altera natilleras ya creadas. El esqueleto expone la función; se usa en la tarea 5 | — |
| D-16 | **Pruebas con `node:test`** (integrado) | Cero dependencias; corre con `npm test` | Jest/Vitest |
| D-17 | **La base de datos va en `data/`** y `data/` se agrega a `.gitignore` | Guarda ids de chats de personas reales; no debe subirse al repo público | — |

## 3. Qué se usa

| Pieza | Versión | Para qué |
|---|---|---|
| Node.js | 24.17.0 (mínimo 24) | Ejecución, `node:sqlite`, `node:test`, `process.loadEnvFile` |
| grammY | 1.46.0 | Bot de Telegram |
| npm | 11.13.0 | Dependencias y scripts |

Dependencias totales: **una** (`grammy`).

## 4. Estructura de archivos

```text
package.json              scripts: start, dev (con --watch), test
.env.example              variables sin valores (el README ya lo menciona, pero no existía)
src/
  index.js                arranque: lee .env, valida config, abre la BD, lanza el bot, apagado limpio
  config.js               loadConfig(env): valida y devuelve la config congelada
  log.js                  logger que tapa secretos
  db.js                   abre SQLite, crea tablas (migraciones simples)
  bot/
    index.js              crearBot(): sesión, guardia de salida, comandos, manejo de errores
    sesion-storage.js     adaptador de almacenamiento de sesiones de grammY sobre SQLite
    flujo.js              motor de flujos: registrar, iniciar, avanzar, cancelar
    comandos/
      start.js            bienvenida (y punto de enganche del enlace de invitación)
      cancelar.js         cancela el flujo en curso
      diag.js             diagnóstico del equipo
test/
  config.test.js
  sesion-storage.test.js
  flujo.test.js
docs/bot-telegram/
  plan-esqueleto.md       este archivo
prompts/bot-telegram.md   prompts reales usados (exigido por la política de IA)
```

## 5. Variables de entorno

| Variable | Obligatoria | Regla |
|---|---|---|
| `BOT_TOKEN` | Sí | No vacía. Nunca se imprime |
| `TEAM_CHAT_ID` | Sí | Número entero (los grupos son negativos) |
| `CUOTA_MIN` | Sí | Número > 0 y < `CUOTA_MAX` |
| `CUOTA_MAX` | Sí | Número > `CUOTA_MIN` |
| `MORA_DIARIA_MAX_PCT` | Sí | Número ≥ 0 |
| `REINTENTOS_COBRO` | Sí | Entero ≥ 0 |
| `MODO_DEMO` | Sí | `true` o `false` |
| `MINUTOS_POR_PERIODO` | Si `MODO_DEMO=true` | Entero > 0 |
| `MINUTOS_POR_DIA_MORA` | Si `MODO_DEMO=true` | Entero > 0 |
| `DB_PATH` | No | Por defecto `./data/natillera.db` |

Los valores de `CUOTA_MIN` y `CUOTA_MAX` quedan sin fijar hasta conocer la moneda de la Test Wallet (riesgo R-02).

## 6. Tareas en pasos pequeños

Cada paso termina en algo que se puede verificar.

### Tarea 1: arranque del proyecto del bot

- [x] 1.1 Crear `package.json` (`"type": "module"`, `engines.node >= 24`, scripts `start`, `dev`, `test`).
- [x] 1.2 Instalar `grammy@1.46.0` con versión exacta. → Verificado: existe `package-lock.json`, 0 vulnerabilidades.
- [x] 1.3 Crear `src/log.js` con `info`, `warn` y `error`.
- [x] 1.4 Crear `src/bot/index.js` con `crearBot(config, deps)` que devuelve el bot sin arrancarlo (así se puede probar).
- [x] 1.5 Comando `/start` básico (`src/bot/comandos/start.js`): saludo y explicación en una frase de qué es Natillera 2.0. Si trae un payload (enlace de invitación), por ahora responde que esa función llega pronto; es el enganche de la tarea 7.
- [x] 1.6 Registrar el menú de comandos en Telegram (`setMyCommands`). *Cambio:* por ahora solo `/start`; `/cancelar` se agrega al menú en la tarea 4, cuando exista.
- [x] 1.7 Manejo de errores: registra el error y responde al usuario «Algo falló, intenta de nuevo». El tapado de secretos llega en el paso 2.4. *Cambio:* además de `bot.catch` se usa `bot.errorBoundary`, porque `bot.catch` solo actúa con `bot.start()` y no con `handleUpdate` (pruebas o un webhook). Todo el middleware de la app va dentro de ese límite.
- [x] 1.8 Crear `src/index.js`: arranca con long polling. El `chat.id` de quien escribe `/start` queda en el log (lo hace el comando `/start`) para averiguar `TEAM_CHAT_ID`. Validación provisional de `BOT_TOKEN`, que la tarea 3 reemplaza.
- [x] 1.9 Apagado limpio con `SIGINT`/`SIGTERM`: detiene el bot. Cerrar la BD se agrega en la tarea 4.
- [x] 1.11 *(Extra)* Arnés de pruebas sin red (`test/helpers/bot-prueba.js`): intercepta las llamadas a Telegram y simula mensajes. Pruebas de `/start`, del enlace con payload y del mensaje de error. → `npm test`: 3/3. El script de pruebas corre solo `test/**/*.test.js`, para que no tome los helpers como pruebas.
- [x] 1.10 Verificar a mano: `npm start` → escribirle `/start` al bot → responde; `Ctrl+C` → se apaga sin errores. → Verificado por Estiven el 2026-10-16 con un bot real creado en @BotFather. Sin token, sale con código 1 y el mensaje «Falta la variable BOT_TOKEN».

### Tarea 2: secretos fuera del repositorio (US-002-SEC)

- [ ] 2.1 Crear `.env.example` con todas las variables de la sección 5, sin valores y con un comentario por variable.
- [ ] 2.2 Agregar `data/` a `.gitignore`.
- [x] 2.3 En `src/index.js`, leer `.env` con `process.loadEnvFile()` si existe (si no existe, usar las variables del sistema). *Adelantado a la tarea 1 para poder probar el bot a mano.*
- [ ] 2.4 En `src/log.js`, tapar con `***` cualquier aparición del token en lo que se registre.
- [ ] 2.5 Guardia de salida en el bot (`bot.api.config.use`): si el contenido de una llamada a Telegram incluye el token, se bloquea y se registra un error.
- [ ] 2.6 Prueba: un mensaje que contiene el token no se envía.
- [ ] 2.7 Verificar: `git status` no muestra `.env` ni `data/`.

### Tarea 3: configuración y modo demo (US-001-CFG)

- [ ] 3.1 Crear `src/config.js` con `loadConfig(env)`: una función pura que recibe las variables y devuelve un objeto congelado (`Object.freeze`).
- [ ] 3.2 Validar cada variable según la sección 5 y juntar **todos** los errores.
- [ ] 3.3 Si hay errores, lanzar `ConfigError` con la lista; cada error nombra la variable y la regla, nunca el valor.
- [ ] 3.4 En `src/index.js`: si `loadConfig` falla, imprimir la lista y salir con código 1 sin arrancar el bot.
- [ ] 3.5 Exponer `copiaParaNatillera(config)`, que devuelve solo las reglas que se congelan al crear una natillera (D-15).
- [ ] 3.6 Comando `/diag` (solo en `TEAM_CHAT_ID`): modo demo, cuota mínima y máxima, mora máxima, reintentos, minutos por periodo y por «día», tiempo encendido, estado de la BD, sesiones activas y «Programador de cobros: aún no conectado» (enganche de US-007-MON).
- [ ] 3.7 Pruebas: config válida; falta una variable; `CUOTA_MIN ≥ CUOTA_MAX`; minutos no enteros o en 0; `MODO_DEMO=false` no exige minutos; el mensaje de error no contiene el valor del token.
- [ ] 3.8 Verificar a mano: `/diag` en el chat del equipo responde; en un chat privado cualquiera no responde nada.

### Tarea 4: estado de conversación persistente (US-007-BCK, parte del bot)

- [ ] 4.1 Crear `src/db.js`: abrir SQLite en `DB_PATH` (crear la carpeta si no existe), activar el modo WAL y crear la tabla `sesiones (clave TEXT PRIMARY KEY, valor TEXT, actualizado TEXT)`.
- [ ] 4.2 Migraciones simples: una tabla `migraciones` y una lista ordenada de sentencias SQL. Así el resto del equipo agrega sus tablas (natilleras, permisos, cobros) sin pisarse.
- [ ] 4.3 Crear `src/bot/sesion-storage.js`: adaptador `{ read, write, delete }` que guarda la sesión de grammY como JSON en `sesiones`.
- [ ] 4.4 Conectar `session({ initial: () => ({ flujo: null }), storage })` en el bot.
- [ ] 4.5 Crear `src/bot/flujo.js`:
  - `registrarFlujo(def)`: guarda la definición `{ id, pasos, alTerminar }` por id.
  - `iniciarFlujo(ctx, id)`: pone `{ id, paso: 0, datos: {} }` en la sesión y hace la primera pregunta con su ejemplo.
  - `avanzarFlujo(ctx, texto)`: valida la respuesta; si no sirve, explica por qué y repite la pregunta sin perder lo ya respondido; si sirve, la guarda y pasa a la siguiente pregunta.
  - Al terminar el último paso llama a `alTerminar(ctx, datos)` y limpia el flujo. Es el único momento en que se crea algo (D-12).
  - Si la sesión apunta a un flujo que ya no existe (por ejemplo, tras un cambio de código), lo limpia y le avisa al usuario.
- [ ] 4.6 Middleware: si hay un flujo en curso, los mensajes de texto que no son comandos van a `avanzarFlujo`.
- [ ] 4.7 Comando `/cancelar`: borra el flujo en curso y confirma; si no había ninguno, lo dice.
- [ ] 4.8 Flujo de ejemplo `eco` (2 preguntas), registrado solo cuando `MODO_DEMO=true`, para probar el motor sin la tarea 5. Se quita cuando exista `/crear`.
- [ ] 4.9 Pruebas: el adaptador lee lo que escribió; una sesión sobrevive a cerrar y reabrir la BD; el flujo avanza, rechaza una respuesta inválida conservando los datos, termina llamando a `alTerminar` una sola vez y `/cancelar` no llama a `alTerminar`.
- [ ] 4.10 Verificar a mano: empezar el flujo `eco`, responder la primera pregunta, `Ctrl+C`, `npm start` otra vez, responder la segunda → termina bien.

### Cierre

- [ ] C.1 `npm test` en verde.
- [ ] C.2 Completar «Correr la demo» del README: copiar `.env.example` a `.env`, `npm install`, `npm start`.
- [ ] C.3 Registrar los prompts reales en `prompts/bot-telegram.md` y una fila por componente en la tabla de `AI_USAGE.md`.
- [ ] C.4 Commit en `feature/estiven` (sin push hasta que el equipo lo pida).

## 7. Puntos de enganche que deja el esqueleto

| Para | Dónde | Qué queda listo |
|---|---|---|
| Tarea 5 `/crear` | `flujo.js` | Se define como flujo con sus pasos y validaciones; `alTerminar` muestra el resumen con Confirmar / Corregir |
| Tarea 7 enlace de invitación | `comandos/start.js` | El payload de `/start` ya se lee |
| Tarea 10 retorno de la autorización | `src/index.js` | Lugar para montar el servidor HTTP del callback de Open Payments |
| Tareas 11, 14 y 17 avisos | `crearBot` | Recibe `deps`, donde se va a inyectar el `notifier` de eventos |
| Equipo de Open Payments y programador | `db.js` | Agregan sus tablas como nuevas migraciones |

## 8. Pendientes que no bloquean el esqueleto

- Moneda de la Test Wallet (R-02): fija los valores de `CUOTA_MIN` y `CUOTA_MAX`.
- Regla de redondeo del sobrante de la liquidación: hallazgo abierto del discovery; toca la tarea 14.
- ¿Una persona puede estar en varias natilleras? Si sí, `/estado` necesitará un selector (tarea 12).
- Clave de sesión: por ahora es el id del chat (el bot se usa en chats privados). Si se usa en grupos, cambiar a chat + usuario.
