---
name: natillera-open-payments
description: Conocimiento de Open Payments (Interledger) para Natillera 2.0 - permisos GNAP, el cobro recurrente con un solo permiso, el permiso de un solo uso de la compra, incoming payment, quote, outgoing payment, las 4 etapas que mira el jurado, la Test Wallet y las 6 operaciones que el servicio externo le pide al backend de la web. Úsala cuando alguien pregunte cómo funciona un pago, un grant o la autorización de la billetera, cuando se diseñe o revise el código de Open Payments (web/src/lib/open-payments/, web/src/app/api/open-payments/, web/src/app/api/permisos/), la vuelta del permiso al bot (US-005, US-005-INT) o el registro de pagos, o cuando falle un pago en la Test Wallet. En ese código explica y revisa, pero no lo escribe: la política de IA de la hackathon pide que el equipo lo escriba.
---

# Open Payments en Natillera 2.0

## Primero, la regla de la hackathon

**El código de Open Payments lo escribe el equipo.** Desde el 16 de octubre vive en el backend de la web: el módulo `web/src/lib/open-payments/` y las rutas `web/src/app/api/open-payments/` y `web/src/app/api/permisos/`. La especificación está en `pagos/README.md`. La política de IA lo pone como ejemplo de código con poca o ninguna IA y los mentores lo revisan línea por línea (`.claude/rules/ia-y-prompts.md`); la guardia de edición (`.claude/hooks/guardia-edicion.mjs`) niega escribir en esas carpetas. Ahí, Claude:
- **Sí:** explica conceptos y la API, responde dudas, revisa el código que escribió el equipo, ayuda a leer un error del SDK, propone pruebas o pasos para depurar.
- **No:** escribe esos archivos ni entrega bloques de código listos para pegar. Si se lo piden, recuerda la regla y ofrece explicar el paso o revisar lo que escriban. Si el equipo decide usar IA de todos modos, que quede declarado con precisión en `AI_USAGE.md`.

Fuera de esas carpetas (bot, pantallas de la web, integración) puede escribir código que **consume** los pagos por su contrato.

## Las piezas

- **Wallet address** (payment pointer): URL pública de una billetera (`https://ilp.interledger-test.dev/<nombre>`). `GET` sobre ella da `authServer`, `resourceServer`, `assetCode` y `assetScale`. El SDK no los busca solo: por cada billetera se llama `walletAddress.get` y se pasan a mano.
- **Authorization server (GNAP):** emite permisos (*grants*). Los de `incoming-payment` y `quote` no piden interacción. **Todo permiso de `outgoing-payment` lo aprueba el dueño de la billetera**, también los de la billetera del grupo y de la financiera.
- **Resource server:** donde se crean `incoming-payment`, `quote` y `outgoing-payment` con el token del permiso.
- **Llaves de desarrollador** (*Key ID* y `private.key` de la billetera del grupo): solo identifican a la app y firman las solicitudes. No dan permiso para gastar de ninguna billetera.
- **Test Wallet:** `wallet.interledger-test.dev`, con saldo de práctica. Maneja pesos colombianos (COP, dos decimales): todas las billeteras de la demo pueden ir en COP y no hay conversión.

## El permiso recurrente (al unirse, US-005)

1. El bot pide `POST /api/permisos` con `tipo: "recurrente"` y el tope en `monto`.
2. El backend pide un permiso de `outgoing-payment` sobre la billetera del participante con `limits.debitAmount` = ese tope e `interact.finish` (`method: 'redirect'`, la URI de la vuelta y un nonce). **Sin `interval`:** con intervalo, el tope es por intervalo, la billetera rechaza un cobro que por sí solo lo supere (deuda con mora, una actividad cara) y el intervalo corre en tiempo real mientras la demo adelanta fechas. El tope total cubre las cuotas, la mora y las actividades; una cuota por periodo ya la garantiza staging.
3. La persona aprueba en su billetera y vuelve a `GET /api/permisos/{permisoId}/retorno`:
   - con `interact_ref` y `hash`: se verifica el hash (SHA-256 del nonce de la app, el nonce de la billetera, `interact_ref` y la URL del servidor de permisos, en base64), se continúa el permiso y se guardan sus tokens;
   - con `result=grant_rejected` o `grant_invalid`, sin hash: se marca rechazado.
   En los dos casos redirige a `https://t.me/<bot>?start=permiso_<permisoId>`. Los nonces y la URL del servidor de permisos se guardan en la base para sobrevivir un reinicio.

Esto es el riesgo SUP-001 (issue #3): **probar primero dos cobros con el mismo permiso**. El laboratorio previo solo llegó a que la Test Wallet aprobara uno; nunca cobró con él. Plan B: un permiso de un solo uso por cuota.

## Un pago (por ejemplo, la cuota del periodo)

Staging llama `POST /api/open-payments/cobrar-cuota`. El backend:

1. Pide un permiso sin interacción y crea un `incoming-payment` en la billetera del grupo.
2. Pide un permiso sin interacción y crea un `quote` en el servidor del participante con `receiver` = ese incoming payment, justo antes de pagar (vence a los 5 minutos).
3. Crea el `outgoing-payment` con el token del permiso recurrente. Si el token venció (dura 10 minutos), lo rota antes, con un candado por permiso: la rotación anula el token anterior.
4. Consulta el **incoming payment** hasta que esté completo (`completed` o `receivedAmount`), unos 20 segundos; el outgoing payment solo tiene estado de fallido. Si no se confirma a tiempo, responde 5xx y sigue consultando por detrás.
5. Responde `{ "periodo", "monto" }` con el monto **exacto** pedido, en pesos.

## Premios, liquidación, reembolsos y préstamos (#67)

Salen de la billetera del grupo (`/pagar`) o de la financiera (`/desembolsar`). **Necesitan un permiso de `outgoing-payment` que su dueño aprueba una vez antes de la demo**, sin intervalo ni receptor y con un tope que cubra la demo. El backend guarda sus tokens y los rota. Sin ese paso fallan aunque las llaves estén bien.

## La compra (permiso de un solo uso)

Tope igual al valor completo, sin intervalo y sin receptor fijo, en la moneda de quien paga: cubre dos pagos a dos destinos, al vendedor (`/pagar-con-permiso`) y la comisión a la billetera del grupo (`/aportar-con-permiso`), que suman exactamente el valor. El enlace de aprobación puede vencer a los 10 minutos, antes de los 15 que cuenta el bot.

## Las 4 etapas que mira el jurado

La demo debe mostrar un pago real con **Solicitud → Autorización → Ejecución → Finalización** (registro en la web, US-007-RPT):

| Etapa | Qué pasó en Open Payments |
|---|---|
| Solicitud | Llegó la llamada de staging y se creó el incoming payment |
| Autorización | Hay un permiso aprobado y vigente, con su token |
| Ejecución | Se creó el quote y el outgoing payment |
| Finalización | El incoming payment quedó completo (o el pago falló) |

Un fallo se reporta con la etapa donde ocurrió y un motivo en palabras simples ("Fondos insuficientes", "Autorización vencida", "Billetera no encontrada", "Límite de la autorización alcanzado"). Al terminar cada pago el backend agrega un aviso `PagoCompletado` o `PagoFallido` para el bot: staging no avisa «cobro hecho».

## El contrato con el servicio externo

El servicio externo de lógica financiera llama seis operaciones en `https://<web>/api/open-payments/` (`docs/discovery/4-logica-financiera/apis/open-payments.api.json`), con `X-Api-Key`: `/cobrar-cuota`, `/cobrar`, `/pagar`, `/desembolsar`, `/pagar-con-permiso` y `/aportar-con-permiso`. Las seis tienen que responder, porque el modo de prueba o real es de toda la API. Reintenta ante 5xx, `429` o sin respuesta, así que el backend es idempotente por ruta más cuerpo completo, guarda solo los éxitos y responde `503` (nunca `409`) mientras un pago sigue en curso. `pagos/README.md` es el documento vivo; si el contrato cambia, se cambia ahí y en ese JSON en el mismo PR.

## Secretos

La llave privada de la billetera del grupo, su Key ID, su wallet address y la `X-Api-Key` del riel van solo en el `.env` del backend de la web, nunca en el repo ni en un log. Los tokens de los permisos van en la base del backend: no en logs, ni en mensajes del bot, ni en el registro que ve el jurado (ahí va el id del recurso, no el token). El `grantId` que recibe staging es un id propio del backend, no el de Open Payments.

## Documentación

- Conceptos y flujo: https://openpayments.dev (sección de grants y del flujo de un pago).
- SDK de Node: el README de `@interledger/open-payments` (`npm view @interledger/open-payments readme`) y sus tipos. Antes de usar una función, verifica su firma en la versión instalada.
- Extensión de VS Code «Open Payments SDK Snippets» (`op-grant-op`, `op-quote-create`, `op-op-create`): útil para que el equipo escriba el código a mano.
- El laboratorio `playground/open-payments-lab` del servicio externo es código previo al evento: se lee como referencia, no se copia.
