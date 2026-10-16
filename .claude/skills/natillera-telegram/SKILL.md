---
name: natillera-telegram
description: Cómo construir y cambiar el bot de Telegram de Natillera 2.0 (carpeta telegram/, Node 24 + grammY) siguiendo cómo ya está hecho - comandos como Composer, configuración validada al arrancar, guardia que bloquea secretos, pruebas sin red y textos con la voz del design system. Úsala siempre que toques algo dentro de telegram/, agregues un comando o un flujo (crear natillera, invitación por enlace, unirse, autorizar el cobro, ver aportes, mora, préstamo), escribas un mensaje del bot o revises un PR del frente Telegram, aunque el pedido no diga "grammY".
---

# Bot de Telegram de Natillera 2.0

El bot es la cara del producto para los participantes y el administrador. **No mueve dinero ni guarda el estado de las natilleras: pide y muestra.** Las reglas de dinero las aplica el servicio externo y los pagos los hace `pagos/`. El plan y las decisiones del esqueleto están en `telegram/docs/plan-esqueleto.md`; léelo antes de cambiar algo de la arquitectura.

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
| `src/formato.js` | `formatoCOP` y porcentajes, iguales a los del design system |

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

## Telegram tiene límites que cambian el diseño

- **El bot no puede escribirle primero a nadie** (SUP-003): solo responde a quien ya le escribió. Por eso la invitación es un **enlace profundo** `https://t.me/<bot>?start=<payload>`; el payload llega en `ctx.match` del comando `/start`. El payload es visible y lo puede copiar cualquiera: que sea un identificador opaco de la invitación, nunca datos de la natillera ni algo que dé permisos por sí solo.
- **Avisos del sistema** (cobro hecho, mora, liquidación, #6) solo llegan a quien ya abrió el chat con el bot: guarda su `chat.id` al unirse.
- Mensajes de máximo 4.096 caracteres; botones con teclados en línea (`InlineKeyboard`) en vez de pedir que escriban comandos largos.

## Textos

Resumen de la voz y tono (léela completa si escribes mensajes):
- Tuteo con el nombre al inicio, primero el dato, máximo 3 líneas antes del botón.
- La plata siempre ubicada: "La plata la guarda Financiera Aliada, no una persona."
- Cero tecnicismos: nada de grant, wallet, token, Interledger, transacción. Di billetera, cobro, cuota, autorizar.
- Sin culpa: "quedó pendiente", nunca "debes" ni "moroso"; nunca expongas a alguien ante el grupo (los avisos de mora van por privado).
- Un emoji como máximo y ninguno en mora o error.
- Las funciones que arman textos tienen prueba (líneas máximas, palabras prohibidas), como `start.test.js`.
