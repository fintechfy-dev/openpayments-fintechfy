---
name: natillera-telegram
description: Cómo construir y cambiar el bot de Telegram de Natillera 2.0 (carpeta telegram/, Node 24 + grammY) siguiendo cómo ya está hecho - comandos como Composer, configuración validada al arrancar, guardia que bloquea secretos, pruebas sin red y textos con la voz del design system. Úsala siempre que toques algo dentro de telegram/, agregues un comando o un flujo (crear natillera, invitación por enlace, unirse, autorizar el cobro, ver aportes, mora, préstamo), escribas un mensaje del bot o revises un PR del frente Telegram, aunque el pedido no diga "grammY".
---

# Bot de Telegram de Natillera 2.0

El bot es la cara del producto para los participantes y el administrador. **No mueve dinero ni guarda el estado de las natilleras: pide y muestra.** Las reglas de dinero las aplica el servicio externo, y los pagos de Open Payments los hace la API de pagos (`pagos/`), que también le da al bot los permisos y los avisos de pago; los avisos de staging se los pide a la web. Qué llamar y con qué campos está en `telegram/INTEGRACION.md`. El plan y las decisiones están en `telegram/docs/plan-esqueleto.md` (esqueleto, motor de flujos, sesiones) y `telegram/docs/crear-natillera.md` (el flujo y la Mini App de crear natillera); léelos antes de cambiar algo de la arquitectura.

Usa junto con esta skill `natillera-design-system`: todos los textos que lee un participante siguen `design-system/docs/voz-y-tono.md`.

## Stack y comandos

Node.js 24, JavaScript con módulos ES, grammY 1.46.0 (versión fija), `node:test`. Todo se corre dentro de `telegram/`.

```bash
cd telegram
npm install
npm start          # long polling; necesita telegram/.env
npm test           # sin token ni red
```

Solo corre una copia del bot por token (si sale `409: Conflict`, hay otra abierta).

## Cómo está armado (respétalo)

| Archivo | Qué hace |
|---|---|
| `src/index.js` | Arranque: lee `.env`, valida la config, arma el bot, publica el menú, apaga limpio con SIGINT/SIGTERM |
| `src/config.js` | `loadConfig(env)`: valida **todo** al arrancar y reporta todos los errores juntos, nombrando la variable y nunca su valor |
| `src/bot/index.js` | `crearBot(config, deps)`: arma el bot sin arrancarlo; guardia de secretos, manejo de errores y registro de comandos |
| `src/bot/comandos/<comando>.js` | Un comando = una función que devuelve un `Composer` |
| `src/secretos.js`, `src/log.js` | Tapar secretos en logs; el logger nunca imprime un secreto |
| `src/formato.js` | `formatoCOP`, porcentajes y `escaparHTML`, iguales a los del design system |
| `src/bot/flujo.js` | Motor de flujos: preguntas paso a paso en una sola tarjeta, resumen con confirmar/corregir/cancelar |
| `src/bot/flujos/<flujo>.js` | Cada flujo (por ahora `crear.js`): sus pasos, su resumen y su `alTerminar` |
| `src/natillera/reglas.js` | Reglas puras de la natillera (fechas, montos, cupo, mora, cuotas). Las usan **el bot y la Mini App** |
| `src/db.js`, `src/bot/sesion-storage.js` | Sesiones en SQLite (`node:sqlite`): un flujo a medias sobrevive a un reinicio |
| `miniapp/` | Formulario web dentro de Telegram para crear la natillera; se publica en GitHub Pages (`MINIAPP_URL`) |

### Agregar un comando o un flujo

1. Crea `src/bot/comandos/<nombre>.js` que exporte una función que recibe sus dependencias (`{ log, config, ... }`) y devuelve un `Composer`. Exporta también las funciones que arman los textos, para poder probarlas solas.
2. Regístralo en `crearBot` dentro de `app` (el `errorBoundary`), nunca directo sobre `bot`: así sus errores llegan al manejador común y el participante recibe el mensaje de error amable.
3. Si se publica en el menú, agrégalo a `COMANDOS`. Los comandos internos del equipo (como `/diag`) no se anuncian y solo responden en `TEAM_CHAT_ID`.
4. Si necesita una variable nueva: agrégala a `loadConfig` con su validación, a `.env.example` (sin valor y con un comentario) y, si es secreta, a `listaDeSecretos(...)` para que la guardia y el logger la tapen.
5. Prueba con `test/helpers/bot-prueba.js`: `crearBotDePrueba()` arma el bot con un `fetch` falso que guarda cada llamada a Telegram en `llamadas`, y `mensaje('/comando')` simula el mensaje. Pasa `ahora`/`inicio` si algo depende del reloj.

### Reglas que este diseño protege

- **Ningún secreto sale por Telegram.** La guardia en `bot.api.config.use` revisa el contenido de cada llamada y la bloquea si lleva un secreto. No la saltes llamando a la API de Telegram por fuera de `bot.api`.
- **La configuración falla al arrancar, no a mitad de la demo.** No leas `process.env` fuera de `src/index.js` y `src/config.js`.
- **Las dependencias entran por parámetro** (`log`, `cliente`, `ahora`): es lo que permite probar sin red. No importes un cliente HTTP global dentro de un comando.
- **Dinero con `formatoCOP` de `src/formato.js`.** Debe dar exactamente lo mismo que `formatoCOP` de `design-system/components/bundle.js` (y que `web/src/lib/natillera.ts`).

### Agregar un flujo de preguntas

Usa el motor de `src/bot/flujo.js` en vez de manejar la conversación a mano: ya resuelve la tarjeta única, los botones, `/cancelar`, corregir un dato y sobrevivir a un reinicio.

1. Crea `src/bot/flujos/<nombre>.js` con una definición `{ id, pasos, resumen?, revisar?, alTerminar }`. Cada paso es `{ clave, etiqueta, pregunta, ejemplo?, validar?, opciones? }`; `validar` devuelve `{ valor }` o `{ error }`.
2. Las reglas de negocio (qué fecha o monto es válido) van en `src/natillera/reglas.js` como funciones puras con su prueba, no dentro del flujo: así la Mini App y el bot validan exactamente igual.
3. `alTerminar` se llama una sola vez al confirmar. Si lanza un error, el flujo sigue donde estaba para reintentar; por eso lo que no se puede repetir (crear algo en el servicio externo) no debe quedar seguido de un paso que pueda fallar y relanzar.
4. Registra el flujo con `motor.registrar(def)` en `crearBot` y arráncalo con `motor.iniciar(ctx, id)`.
5. Todo lo que escribió una persona y se muestra con `parse_mode: 'HTML'` pasa por `escaparHTML`.

### La Mini App

- Es HTML, CSS y JS sin compilar en `telegram/miniapp/`, sobre los tokens y componentes del design system; importa las reglas de `../src/natillera/reglas.js`.
- Se abre desde un **botón del teclado** (`Keyboard().webApp`), porque es la única forma en que `Telegram.WebApp.sendData` le devuelve los datos al bot. Abierta así, `initData` llega vacío: para saber si corre dentro de Telegram usa `platform` y `sendData`, no `initData`.
- Lo que manda (`{ tipo, v, datos }`) se vuelve a validar en el bot con las mismas reglas: la Mini App es comodidad, no la fuente de verdad.
- Sin `MINIAPP_URL`, `/crear` pregunta todo en el chat con el motor de flujos.

## Telegram tiene límites que cambian el diseño

- **El bot no puede escribirle primero a nadie** (SUP-003): solo responde a quien ya le escribió. Por eso la invitación es un **enlace profundo** `https://t.me/<bot>?start=<payload>`; el payload llega en `ctx.match` del comando `/start`. El payload es visible y lo puede copiar cualquiera: que sea un identificador opaco de la invitación, nunca datos de la natillera ni algo que dé permisos por sí solo.
- **Avisos del sistema** (cobro hecho, mora, liquidación, #6): el bot los pide cada pocos segundos (los de staging a la web, los de pago a la API de pagos) y solo llegan a quien ya abrió el chat con el bot: guarda su `chat.id` al unirse.
- Mensajes de máximo 4.096 caracteres; botones con teclados en línea (`InlineKeyboard`) en vez de pedir que escriban comandos largos.

## Textos

Resumen de la voz y tono (léela completa si escribes mensajes):
- Tuteo con el nombre al inicio, primero el dato, máximo 3 líneas antes del botón.
- La plata siempre ubicada: "La plata la guarda Financiera Aliada, no una persona."
- Cero tecnicismos: nada de grant, wallet, token, Interledger, transacción. Di billetera, cobro, cuota, autorizar.
- Sin culpa: "quedó pendiente", nunca "debes" ni "moroso"; nunca expongas a alguien ante el grupo (los avisos de mora van por privado).
- Un emoji como máximo y ninguno en mora o error.
- Las funciones que arman textos tienen prueba (líneas máximas, palabras prohibidas), como `start.test.js`.
