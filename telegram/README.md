# Frente Telegram

El bot donde los integrantes de la natillera y su administrador hacen todo: crear la natillera, invitar, unirse, autorizar el cobro, ver sus aportes, recibir recordatorios de mora, pagar actividades y pedir préstamos.

**Issues:** [frente: telegram](https://github.com/fintechfy-dev/openpayments-fintechfy/issues?q=is%3Aopen+label%3A%22frente%3A+telegram%22). Empieza por #7 (esqueleto).

## Mensajes e imágenes

Los textos del bot siguen la [voz y tono](../design-system/docs/voz-y-tono.md) del design system. El avatar es `design-system/assets/logos/kit/05_avatar/avatar_verde_oscuro_512px.png`, y las tarjetas-imagen salen de `TarjetaAporte`, `TarjetaBienvenida` y `TarjetaCredito` con los colores de `design-system/tokens/tokens.resolved.json`.

## Contratos

- **Con el servicio externo de lógica financiera:** crea y consulta natilleras, participantes y préstamos. El contrato se escribe en [`../integracion/README.md`](../integracion/README.md) (#5).
- **Con el servicio de pagos:** inicia el permiso interactivo de cada participante y recibe la vuelta después de que aprueba en su billetera (US-005, US-005-INT). Ver [`../pagos/README.md`](../pagos/README.md) (#4).
- **Avisos:** cobro hecho, permiso rechazado, mora, préstamo y liquidación (#6). _Por definir: webhook del bot o consulta periódica._

El bot no mueve dinero: eso pasa en el servicio de pagos.

## Cómo correrlo

Node.js 24 o más nuevo y [grammY](https://grammy.dev). Todo se corre **dentro de esta carpeta**.

1. Crea un bot con [@BotFather](https://t.me/BotFather) (`/newbot`) y copia el token. No lo pegues en ningún chat.
2. Copia `.env.example` a `.env` (el `.env` está en `.gitignore`) y llénalo. Son obligatorias `BOT_TOKEN`, `TEAM_CHAT_ID`, `CUOTA_MIN`, `CUOTA_MAX` y `MORA_DIARIA_MAX_PCT`; si falta alguna o está mal, el bot no arranca y lista todos los errores, sin mostrar los valores.
   ```powershell
   Copy-Item .env.example .env   # solo si todavía no tienes .env: lo sobrescribe
   ```
3. Instala y arranca:
   ```bash
   cd telegram
   npm install
   npm start        # o npm run dev para reiniciar al guardar
   ```
4. Escríbele `/start` al bot. En la terminal queda el id del chat, que sirve como `TEAM_CHAT_ID`.
5. En el chat del equipo, `/diag` muestra la configuración en uso y cuántas sesiones hay guardadas. En cualquier otro chat no responde.
6. `/crear` (o el botón de la bienvenida) arma la natillera: con `MINIAPP_URL` ofrece el formulario de la Mini App o responder en el chat; sin ella, pregunta en el chat con botones. Las respuestas sobreviven a un reinicio del bot y `/cancelar` deja todo como estaba. Las sesiones quedan en `telegram/data/bot.db` (ignorada por git). Por ahora termina en una vista previa: crear de verdad espera el contrato de #5.

7. `/mi_natillera` (o el botón **Mi natillera** junto al cuadro de texto) abre lo que ve el participante: su ahorro, las reglas y sus cobros. Por ahora con datos de ejemplo, hasta #5.

**Mini App:** está en [`miniapp/`](miniapp/): el formulario de crear en `miniapp/` y «Mi natillera» en `miniapp/natillera/`. Se publica en GitHub Pages (`MINIAPP_URL`). Cómo publicarla: [`docs/crear-natillera.md`](docs/crear-natillera.md); la pantalla del participante: [`docs/mi-natillera.md`](docs/mi-natillera.md).

Solo puede correr una copia del bot por token: si sale `409: Conflict`, hay otra abierta.

**Pruebas:** `npm test` (no necesitan token ni conexión).

## Estructura

Node 24 en ESM, una sola dependencia (`grammy`). El bot arranca en long polling: **no hay servidor HTTP** todavía (el enganche para los avisos de #6 está en `src/index.js`).

| Ruta | Qué hace |
|---|---|
| `src/index.js` | Arranque: carga `.env`, valida la configuración (sale con código 1 si falla), abre la base, arma el bot, publica el menú y, con `MINIAPP_URL`, el botón «Mi natillera»; luego `bot.start()` |
| `src/config.js` | `loadConfig`: valida todas las variables de una vez y devuelve un objeto congelado; `ConfigError` lista todos los errores sin mostrar valores |
| `src/secretos.js` | Lista de secretos de la configuración y cómo taparlos (`***`) |
| `src/log.js` | Logger con hora que tapa los secretos |
| `src/db.js` | SQLite de Node (`node:sqlite`) con una sola tabla, `sesiones`. El estado de las natilleras **no** se guarda aquí |
| `src/formato.js` | `formatoCOP` (copia del de `design-system/components/bundle.js`), `escaparHTML`, `formatoPorcentaje` |
| `src/natillera/reglas.js` | Reglas puras de US-001: fechas en hora de Bogotá, validación de cada campo y resumen. Las comparten el bot y la Mini App, por eso no usa nada de Node |
| `src/bot/index.js` | `crearBot`: guardia que bloquea cualquier mensaje con un secreto, manejo de errores, sesión, motor de flujos y los comandos, en ese orden |
| `src/bot/flujo.js` | Motor de flujos de preguntas: una tarjeta que se edita, botones `f:…`, resumen con confirmar, corregir o cancelar |
| `src/bot/sesion-storage.js` | Las sesiones de grammY sobre la tabla `sesiones` |
| `src/bot/comandos/` | Un `Composer` por comando: `start`, `cancelar`, `diag` (solo en el chat del equipo) y `mi-natillera` |
| `src/bot/flujos/crear.js` | `/crear` por el chat o por la Mini App; termina en una vista previa hasta que exista `crearNatillera` (#5) |
| `miniapp/` | Páginas estáticas sin compilar, publicadas en GitHub Pages: el formulario de crear (`index.html`, `app.js`) y «Mi natillera» (`natillera/`, con datos de ejemplo visibles en `datos-demo.js`). Reusan `src/formato.js` y `src/natillera/reglas.js`, y el design system por ruta relativa |
| `test/` | `node:test`; `helpers/bot-prueba.js` reemplaza el `fetch` de grammY, así que las pruebas no usan red ni token |

**Sistemas externos:** hoy el único tráfico es grammY con la API de Telegram. `EXTERNO_URL`, `EXTERNO_API_KEY` y `PAGOS_URL` se validan y se muestran en `/diag`, pero nadie las usa todavía. La integración con staging está planeada en [`INTEGRACION.md`](INTEGRACION.md), con otros nombres de variables (`SERVICIO_EXTERNO_URL`, `SERVICIO_EXTERNO_TOKEN`, `WEB_INDICE_*`, `WEBHOOK_SECRET`); al construirla, se actualizan `.env.example`, `config.js` y la tabla de abajo.

## Variables

Todas se validan al arrancar (`src/config.js`). Coinciden con `.env.example`.

| Variable | Obligatoria | Qué es |
|---|---|---|
| `BOT_TOKEN` | Sí | Token de @BotFather |
| `TEAM_CHAT_ID` | Sí | Chat del equipo, el único donde responde `/diag` |
| `CUOTA_MIN`, `CUOTA_MAX` | Sí | Límites de la cuota al crear una natillera |
| `MORA_DIARIA_MAX_PCT` | Sí | Tope del porcentaje de mora diaria |
| `EXTERNO_URL`, `EXTERNO_API_KEY` | No | Servicio externo (aún sin uso) |
| `PAGOS_URL` | No | Servicio de pagos (aún sin uso) |
| `MINIAPP_URL` | No | URL `https` de la Mini App |
| `DB_PATH` | No | Base de sesiones; por defecto `./data/bot.db` |

**Plan, decisiones y avance del esqueleto:** [`docs/plan-esqueleto.md`](docs/plan-esqueleto.md) (registro de cómo se planeó; la estructura vigente es la de arriba). **Crear la natillera (#13):** [`docs/crear-natillera.md`](docs/crear-natillera.md). **Mi natillera (#26):** [`docs/mi-natillera.md`](docs/mi-natillera.md).
