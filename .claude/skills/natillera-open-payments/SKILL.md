---
name: natillera-open-payments
description: Conocimiento de Open Payments (Interledger) para Natillera 2.0 y de su API de pagos (pagos/) - permisos GNAP, el permiso recurrente con tope total, el de un solo uso de la compra, los de la billetera del grupo y de la financiera, incoming payment, quote, outgoing payment, las 4 etapas que mira el jurado, la Test Wallet, las llaves que llegan en cada llamada y las 6 operaciones que llama staging. Úsala cuando alguien pregunte cómo funciona un pago, un permiso o la autorización de la billetera, cuando se escriba, cambie o revise la API de pagos (pagos/), la vuelta del permiso al bot (US-005, US-005-INT) o el registro de pagos, o cuando falle un pago en la Test Wallet.
---

# Open Payments en Natillera 2.0

## Primero, la regla de la hackathon

**La API de pagos (`pagos/`) la escribe Claude y se declara con precisión** (decisión del equipo del 16 de octubre en la tarde; `.claude/rules/ia-y-prompts.md`). La política pone el servicio de Open Payments como ejemplo de código con poca IA y los mentores lo revisan línea por línea. Por eso, cada cambio en `pagos/`:

- se registra en `prompts/pagos-*.md` (el prompt real) y en la fila de `pagos/` de `AI_USAGE.md`;
- se explica al equipo paso por paso: quien presenta tiene que poder contar qué pide cada llamada y por qué;
- llega con sus pruebas (`cd pagos && npm test`, con un Open Payments falso) y, antes de la demo, con un pago real en la Test Wallet.

La guía de la API es `pagos/API.md` (rutas, llaves, errores, Azure); el contrato con staging, `pagos/README.md`. Si cambian, se cambian en el mismo PR, junto con `docs/discovery/4-logica-financiera/apis/open-payments.api.json` si cambia lo que manda staging.

## Las piezas

- **Wallet address** (payment pointer): URL pública de una billetera (`https://ilp.interledger-test.dev/<nombre>`). `GET` sobre ella da `authServer`, `resourceServer`, `assetCode` y `assetScale`. El SDK no los busca solo: por cada billetera se llama `walletAddress.get` y se pasan a mano.
- **Authorization server (GNAP):** emite permisos (*grants*). Los de `incoming-payment` y `quote` no piden interacción. **Todo permiso de `outgoing-payment` lo aprueba el dueño de la billetera**, también los de la billetera del grupo y de la financiera.
- **Resource server:** donde se crean `incoming-payment`, `quote` y `outgoing-payment` con el token del permiso.
- **Llaves de desarrollador** (*Key ID* y `private.key` de la billetera cliente de la app): solo identifican a la app y firman las solicitudes. No dan permiso para gastar de ninguna billetera. **La API no las guarda:** llegan en cada llamada (`X-OP-Wallet-Address`, `X-OP-Key-Id`, `X-OP-Private-Key` en base64) desde el bot y desde staging, que tienen que mandar **la misma** llave: el token de cada permiso queda atado a ella (si no coincide, `422`).
- **Test Wallet:** `wallet.interledger-test.dev`, con saldo de práctica. Maneja pesos colombianos (COP, dos decimales): todas las billeteras de la demo pueden ir en COP y no hay conversión.

## Los permisos (US-005)

El bot los pide con `POST /api/permisos` (`tipo`, `wallet`, `monto`, `referencia` y `vuelta`, la dirección https de su chat: `https://t.me/<bot>?start=permiso_{permisoId}`, con `{permisoId}` tal cual). **Ninguno lleva intervalo:** el tope es total y va en `monto`. Con intervalo, el tope sería por intervalo, la billetera rechazaría un cobro que por sí solo lo supere (deuda con mora, una actividad cara) y el intervalo correría en tiempo real mientras la demo adelanta fechas.

- `recurrente`: cuotas, deuda y actividades. El tope alcanza para todas las cuotas más la mora y las actividades; una cuota por periodo ya la garantiza staging.
- `un-solo-uso`: compra y devolución. Tope igual al valor completo, sin receptor fijo: en la compra cubre dos pagos a dos destinos (vendedor y comisión) que suman exactamente el valor.
- `grupo` y `financiera` (#67): las billeteras de donde salen premios, liquidación y préstamos. Su dueño los aprueba **una vez** antes de la demo, y después alguien los termina con `GET /api/permisos/{id}` y las mismas llaves `X-OP-*` que usa staging; sin eso, esas operaciones responden `403` aunque las llaves estén bien.

**La vuelta** (`GET /api/permisos/{id}/retorno`) la abre el navegador del participante, que no tiene las llaves: solo verifica el `hash` (SHA-256 del nonce de la app, el de la billetera, `interact_ref` y la URL del servidor de permisos, en base64), o marca el rechazo si llega `result=grant_rejected` o `grant_invalid`, y redirige a la `vuelta` del permiso (sin `vuelta`, muestra una página para cerrar la ventana). El permiso se termina cuando el bot consulta `GET /api/permisos/{id}` con las llaves. El enlace de aprobación puede vencer a los 10 minutos, antes de los 15 que cuenta el bot en una compra.

Esto es el riesgo SUP-001 (issue #3): **probar dos cobros con el mismo permiso recurrente y dos pagos con el mismo de un solo uso**, en la red real. El laboratorio previo solo llegó a que la Test Wallet aprobara un permiso; nunca cobró con él. Plan B: un permiso de un solo uso por cuota.

## Un pago (por ejemplo, la cuota del periodo)

Staging llama `POST /api/open-payments/cobrar-cuota`. La API:

1. Pide un permiso sin interacción y crea un `incoming-payment` en la billetera del grupo.
2. Pide un permiso sin interacción y crea un `quote` en el servidor del participante con `receiver` = ese incoming payment, justo antes de pagar (vence a los 5 minutos).
3. Crea el `outgoing-payment` con el token del permiso recurrente. Antes, revisa el token: si le quedan menos de 3 minutos (dura 10), lo rota, con un candado por permiso, porque la rotación anula el token anterior.
4. Consulta el **incoming payment** hasta que esté completo; el outgoing payment solo tiene estado de fallido. Si no se confirma en unos 20 segundos, responde `503` y sigue consultando por detrás.
5. Responde `{ "periodo", "monto" }` con el monto **exacto** pedido, en pesos.

Staging solo ve `http-<código>` de un error, así que cada código dice algo por sí solo (tabla en `pagos/API.md`) y reintenta solo ante `5xx`, `429` o sin respuesta. La idempotencia es por ruta más cuerpo, sin las llaves; responde `503` (nunca `409`) mientras el pago sigue y guarda solo los éxitos.

**Cortacircuitos de staging:** cada respuesta que no sea 2xx (también los `503` de los reintentos) suma a una racha; con 5 seguidas, staging deja de llamar la API para todos hasta que un administrador la reactive. Los reintentos de staging terminan unos 90 segundos después de la primera llamada, antes de los 3 minutos que espera la API. Por eso conviene responder rápido y no devolver errores que se pueden evitar (detalle en `pagos/README.md`).

## Las 4 etapas que mira el jurado

La demo debe mostrar un pago real con **Solicitud → Autorización → Ejecución → Finalización**. La API las guarda y la web las muestra con `GET /api/registro` (US-007-RPT):

| Etapa | Qué pasó en Open Payments |
|---|---|
| Solicitud | Llegó la llamada de staging |
| Autorización | Hay un permiso aprobado y vigente, con su token |
| Ejecución | Se crearon el incoming payment, el quote y el outgoing payment |
| Finalización | El incoming payment quedó completo (o el pago falló) |

Un fallo se reporta con la etapa donde ocurrió y un motivo en palabras simples ("Fondos insuficientes", "Autorización vencida", "Billetera no encontrada", "Límite de la autorización alcanzado"). Al terminar cada pago la API agrega un aviso `PagoCompletado` o `PagoFallido`, que el bot lee en `GET /api/avisos`: staging no avisa «cobro hecho».

## Secretos

`API_KEY_STAGING`, `API_KEY_CLIENTES` y la conexión al almacén viven en la configuración de la App Service, nunca en el repo. Las llaves de Open Payments viven en el `.env` del bot y en la configuración de staging, y viajan en cada llamada. Los tokens de los permisos quedan en el almacén de la API: no van en logs, ni en mensajes del bot, ni en el registro que ve el jurado (ahí va el id del recurso, no el token). El `grantId` que recibe staging es un id propio de la API, no el de Open Payments.

## Documentación

- Conceptos y flujo: https://openpayments.dev (sección de grants y del flujo de un pago).
- SDK de Node: el README de `@interledger/open-payments` (`npm view @interledger/open-payments readme`) y sus tipos. Antes de usar una función, verifica su firma en la versión instalada (`pagos/node_modules/@interledger/open-payments`).
- Extensión de VS Code «Open Payments SDK Snippets» (`op-grant-op`, `op-quote-create`, `op-op-create`): sirve para explicarle cada paso al equipo.
- El laboratorio `playground/open-payments-lab` del servicio externo es código previo al evento: se lee como referencia, no se copia.
