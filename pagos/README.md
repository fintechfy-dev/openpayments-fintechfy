# Pagos con Open Payments

Lo único del sistema que habla con Open Payments, y lo que más mira el jurado: un pago de punta a punta con solicitud, autorización, ejecución y finalización.

**Es una API propia en esta carpeta**, en Node con el SDK oficial [`@interledger/open-payments`](https://github.com/interledger/open-payments-node), publicada en Azure en **`https://natillera-pagos.azurewebsites.net`** (decisión del 16 de octubre en la tarde, PR #71). La escribió Claude Code y así se declara en `AI_USAGE.md` y en `prompts/pagos-api-open-payments.md`. Los mentores la revisan línea por línea: el equipo tiene que poder explicar cada paso.

- **Cómo usarla** (rutas, llaves de Open Payments, errores y Azure): [`API.md`](API.md).
- **Este documento:** cómo funciona un pago en Open Payments y el contrato con staging.
- **Issues:** #3 (probar primero), #4 (la API) y #67 (los permisos de las billeteras del grupo y de la financiera).

## Cómo se conecta con Open Payments

1. En la [Interledger Test Wallet](https://wallet.interledger-test.dev), la **billetera cliente** de la app tiene sus *Developer Keys*: el *Key ID* y `private.key`. **La API no las guarda:** llegan en cada llamada (`X-OP-Wallet-Address`, `X-OP-Key-Id`, `X-OP-Private-Key`) desde el bot y desde staging, que tienen que mandar **la misma** llave.
2. Con el SDK, `createAuthenticatedClient({ walletAddressUrl, keyId, privateKey })`. El SDK firma cada solicitud, pero **no encuentra los servidores solo**: por cada billetera hay que llamar `client.walletAddress.get({ url })` y pasar a mano su `authServer` a los permisos y su `resourceServer` a los cobros, cotizaciones y pagos.
3. **Las llaves solo identifican a la app; no dan permiso para gastar.** Para pagar desde cualquier billetera, incluida la del grupo, hace falta un permiso de pago saliente sobre esa billetera, y ese permiso **siempre** lo aprueba su dueño en la Test Wallet. Un solo par de llaves sirve para pedir los permisos de todas las billeteras.
4. **Un pago** son entre 5 y 7 solicitudes encadenadas:
   - un permiso sin interacción y un *incoming payment* en el servidor de quien recibe;
   - un permiso sin interacción y una cotización (*quote*) en el de quien paga, justo antes de pagar (vence a los 5 minutos);
   - el *outgoing payment* con el token del permiso de pago saliente de quien paga (el único permiso interactivo);
   - y consultar hasta que termine, porque Open Payments no avisa. **Se consulta el *incoming payment*** (`completed` o `receivedAmount`): el pago saliente no tiene un estado de completado, solo de fallido.
5. **Billeteras de la demo:** la del grupo (`OP_WALLET_GRUPO`, custodia), la de la financiera (`OP_WALLET_FINANCIERA`, préstamos) y la de cada participante. Los montos van siempre en pesos, la moneda de la billetera del grupo. Una billetera en euros o en dólares también sirve: la cotización de Open Payments convierte con la tasa de su proveedor (detalle en «Monedas» de [`API.md`](API.md)).

El laboratorio `playground/open-payments-lab` del servicio externo es código previo al evento: se leyó como referencia del flujo y su código no se copió.

## Antes de la demo: los permisos de la billetera del grupo y de la financiera (#67)

`/pagar` (premios, liquidación, reembolsos, comisión devuelta) sale de la billetera del grupo y `/desembolsar` de la de la financiera. Sus permisos se piden con `POST /api/permisos` de tipo `grupo` y `financiera` (sin `wallet`: usan `OP_WALLET_GRUPO` y `OP_WALLET_FINANCIERA`), con un tope que cubra toda la demo, y **su dueño los aprueba una vez** en la Test Wallet. Como no llevan `vuelta`, después de aprobar el navegador muestra una página para cerrar la ventana. **Falta un paso:** el permiso se termina cuando alguien consulta `GET /api/permisos/{permisoId}` con `X-Api-Key` = `API_KEY_CLIENTES` y **las mismas** llaves `X-OP-*` que usa staging, hasta que responda `aprobado`; solo ahí la API guarda sus tokens. Antes de cada pago, la API revisa el token y lo rota si le quedan menos de 3 minutos (vencen a los 10). Sin este paso, esas dos operaciones responden `403`.

## Lo que llama staging

`POST https://natillera-pagos.azurewebsites.net/api/open-payments/<operación>`, con `X-Api-Key` = `API_KEY_STAGING` y los tres encabezados `X-OP-*` (o los mismos datos en el cuerpo, ver [`API.md`](API.md)). Willy configura como dirección base `https://natillera-pagos.azurewebsites.net/api/open-payments`. El cuerpo es JSON con estos campos exactos:

| Cuando | Ruta | Llega | Permiso que usa | Responder 2xx con |
|---|---|---|---|---|
| Cuota del periodo | `/cobrar-cuota` | `grantId`, `walletOrigen`, `monto`, `referencia` (participación), `periodo` | Recurrente del participante | `{ "periodo": n, "monto": m }` |
| Deuda más mora | `/cobrar` | `grantId`, `walletOrigen`, `monto`, `referencia` (participación) | Recurrente del participante | `{ "monto": m }` |
| Parte de una actividad | `/cobrar` | `walletOrigen`, `monto`, `referencia` (actividad). **Sin `grantId`** | El recurrente, buscado por `walletOrigen` | `{ "monto": m }` |
| Premio de una actividad | `/pagar` | `walletDestino`, `monto`, `referencia` (actividad), `origen` (natillera) | Permiso `grupo` | `{ "monto": m }` |
| Liquidación o reembolso | `/pagar` | `walletDestino`, `monto`, `referencia` (participación). **Sin `origen`** | Permiso `grupo` | `{ "monto": m }` |
| Comisión devuelta (devolución) | `/pagar` | `walletDestino` (comprador), `monto`, `referencia` (venta), `origen` (natillera) | Permiso `grupo` | `{ "monto": m }` |
| Préstamo | `/desembolsar` | `walletDestino`, `monto` (capital), `referencia` (crédito) | Permiso `financiera` | `{ "monto": m }` |
| Compra: al vendedor | `/pagar-con-permiso` | `grantId`, `walletOrigen` (comprador), `walletDestino` (vendedor), `monto` (valor menos comisión), `referencia` (venta) | De un solo uso del comprador | `{ "monto": m }` |
| Compra: comisión | `/aportar-con-permiso` | `grantId` (el mismo), `walletOrigen` (comprador), `natilleraId` (**sin `walletDestino`**: va a la billetera del grupo), `monto` (comisión), `referencia` (venta) | El mismo de un solo uso | `{ "monto": m }` |
| Devolución o su deuda | `/pagar-con-permiso` | `grantId`, `walletOrigen` (vendedor), `walletDestino` (comprador), `monto`, `referencia` (venta) | De un solo uso del vendedor, uno por intento | `{ "monto": m }` |

## Reglas que pone staging

- **El monto de la respuesta tiene que ser exactamente el pedido, en pesos.** Si no coincide, staging rechaza la confirmación y la venta o la devolución queda atascada sin aviso de fallo.
- **Fallo:** cualquier respuesta que no sea 2xx, o ninguna respuesta en 30 segundos. Staging no lee el cuerpo de un error, solo ve `http-<código>`; por eso cada código de la API dice algo por sí solo (tabla en [`API.md`](API.md)).
- **Staging reintenta a los 2, 10 y 60 segundos** (solo ante un 5xx, un `429` o sin respuesta; un error 4xx distinto de `429` es definitivo). Por eso la API es idempotente:
  - La llave es la ruta más el cuerpo completo **sin las llaves de Open Payments** (`grantId`, billeteras o `natilleraId`, `monto`, `referencia` y `periodo`), y vale 5 minutos.
  - Mientras el pago siga en curso, el reintento recibe un `503`. Nunca un `409`: sería un fallo definitivo.
  - **Solo se guarda la respuesta de un pago exitoso.** Un fallo no se guarda: si el participante recarga y vuelve a intentar con el mismo cuerpo (por ejemplo `PagarDeuda` después de quedarse sin fondos), se intenta de nuevo.
  - **No basta con la referencia sola.** La misma `referencia` viaja en varias llamadas legítimas: una venta la usa en el pago al vendedor, la comisión, la devolución y su deuda, y la deuda de cuotas la repite mes a mes.
- **Tiempo:** si en unos 20 segundos el *incoming payment* no se confirma, la API responde `503` y sigue consultando por detrás hasta 3 minutos, y un reintento recibe el resultado. **Pero los reintentos de staging terminan unos 90 segundos después de la primera llamada:** si el pago se confirma más tarde, staging ya lo dio por fallido aunque el dinero se movió (el bot sí recibe `PagoCompletado`). Para la demo, Willy alarga la escalera con `"gobierno": { "reintentosSegundos": [2, 10, 60, 120] }`.
- **El cortacircuitos de staging.** Cada respuesta que no sea 2xx suma a una racha de fallos de la API de pagos, también los `503` de los reintentos y los 4xx como `402`, `403` o `422`. Con 5 seguidos, staging la marca «enferma»: deja de reintentar, cierra como fallidas las llamadas en cola y falla cada llamada nueva con el motivo «directiva-enferma», hasta que un administrador la reactive. Un cobro lento ya suma 4 (el `503` y tres reintentos) y cinco permisos de prueba suman 5 `403`. Para la demo, Willy lo apaga o lo sube con `PATCH /api/integraciones/apis/open-payments` y `"gobierno": { "enfermaTrasFallosConsecutivos": 0 }` (el 0 lo apaga), y si se dispara, la reactiva con `"estado": "Activa"`.
- **Rotación del token** de un permiso: con un candado por permiso. La rotación anula el token anterior, así que dos rotaciones al mismo tiempo se pisan.
- **Las 6 rutas tienen que responder**, porque el modo de prueba o real es de toda la API de staging. Lo que no se alcance a demostrar (por ejemplo desembolsar o las devoluciones) se pone en `OPERACIONES_SIMULADAS`: responde un 2xx sin mover dinero, marcado como simulado en el registro y en el aviso.

## Permisos para el bot

Con `X-Api-Key` = `API_KEY_CLIENTES` y los tres encabezados `X-OP-*`:

| Ruta | Para qué |
|---|---|
| `POST /api/permisos` | Pide un permiso. Cuerpo: `tipo` (`recurrente` o `un-solo-uso`), `wallet`, `monto` (el tope del permiso, en pesos), `referencia` y `vuelta` (`https://t.me/<usuario_del_bot>?start=permiso_{permisoId}`, con `{permisoId}` tal cual: la API lo reemplaza). Responde `201 { "permisoId", "urlAprobacion" }` |
| `GET /api/permisos/{permisoId}` | Estado: `{ "estado", "grantId", "motivo" }`. Con las llaves, la primera vez después de la vuelta termina el permiso |
| `POST /api/permisos/{permisoId}/cancelar` | Opcional: cuando alguien se retira |

**La vuelta (pública, la abre el navegador del participante):** `GET /api/permisos/{permisoId}/retorno`. Como el navegador no tiene las llaves, la vuelta **no termina el permiso**:

- **Si aprobó:** llega con `interact_ref` y `hash`. Verifica el `hash` (SHA-256 del nonce de la app, el nonce que devolvió la billetera, `interact_ref` y la URL del servidor de permisos, en base64) y deja el permiso «aprobando».
- **Si rechazó o algo falló:** llega con `result=grant_rejected` o `result=grant_invalid`, **sin** hash (o con un hash que no coincide). Marca el permiso como `rechazado`.

En los dos casos redirige a la **`vuelta`** del permiso, que para el bot es su chat con `/start permiso_<permisoId>`. Sin `vuelta` (como en `grupo` y `financiera`), muestra una página para cerrar la ventana. El bot recibe ese `/start` y consulta `GET /api/permisos/{permisoId}` con las llaves: ahí la API continúa el permiso, guarda sus tokens y responde `aprobado` (o `rechazado` con su `motivo`).

**Los tipos de permiso** (todos de pago saliente, todos sin intervalo, con el tope total en `monto`):

- **Recurrente** (cuotas, deuda y actividades). Con intervalo, el tope sería el máximo **por intervalo**, y la billetera rechazaría cualquier cobro que por sí solo lo supere: la deuda con mora o una actividad más cara que la cuota fallarían siempre. Además, el intervalo correría en tiempo real mientras la demo adelanta las fechas. Por eso el tope total alcanza para todas las cuotas más la mora y las actividades; una cuota por periodo ya la garantiza staging.
- **De un solo uso** (compra y devolución): tope igual al valor completo, **sin receptor fijo**, porque en la compra cubre dos pagos a dos destinos (vendedor y comisión). Va en la moneda de la billetera de quien paga (si no es pesos, se cotiza y se le suma la mitad de margen), y los dos pagos tienen que sumar exactamente el valor.
- **`grupo` y `financiera`:** los de #67, arriba.

El enlace de aprobación puede vencer antes de los 15 minutos que cuenta el bot en una compra (en el servidor de la Test Wallet el valor por omisión es de 10). Si vence, el participante ya no puede aprobar y la compra se cancela a los 15 minutos, sin mover dinero.

El `grantId` que recibe staging es un **id propio de la API**, no el de Open Payments. Los tokens de cada permiso quedan en el almacén de la API, atados a la huella de la llave que lo pidió: si el bot o staging mandan otra llave, la API responde `422`.

## Dónde vive cada secreto

| Secreto | Dónde |
|---|---|
| Llaves de Open Payments (billetera cliente, Key ID y llave privada) | `.env` del bot y configuración de staging. Viajan en cada llamada; la API no las guarda |
| Tokens de los permisos | Almacén de la API (Azure Table Storage), nunca en logs |
| `API_KEY_STAGING` | Configuración de la App Service y credencial del tenant (la carga Willy) |
| `API_KEY_CLIENTES` | Configuración de la App Service y `.env` del bot y de la web |
| Token de staging | Bot y web; nunca en el navegador |
| Secreto de firma de los avisos de staging | `.env` de la web |
| Llaves de los participantes | No existen en el sistema: cada persona aprueba en su propia billetera |

## Registro para el jurado y avisos de pago

Cada pago queda registrado con sus cuatro etapas: solicitud (llega la llamada de staging), autorización (el permiso aprobado), ejecución (el *incoming payment*, la *quote* y el *outgoing payment*, con sus ids) y finalización (*incoming payment* completo, o fallido). Solo esta API conoce la ejecución: la pantalla `/pagos` de la web la lee con `GET /api/registro`.

Staging no avisa «cobro hecho». Por eso, al terminar cada pago, la API agrega un aviso `PagoCompletado` o `PagoFallido` con `{ tipo, referencia, monto, periodo?, motivo?, simulado? }`, y el bot los lee en `GET /api/avisos?desde=<cursor>`, con su propio cursor. El `tipo` puede ser `cuota`, `deuda`, `actividad`, `premio`, `liquidacion`, `desembolso`, `venta` o `comision`. Hay casos que comparten ruta y no se distinguen por el cuerpo, así que se rotulan como el de la demo: una comisión devuelta sale como `premio`, un reembolso como `liquidacion` y una devolución como `venta`.

## Lo primero: el #3

Probar en la red real, antes de construir encima:

1. **Dos cobros con el mismo permiso recurrente, sin intervalo y con tope total.**
2. **Dos pagos seguidos con el mismo permiso de un solo uso:** el de la venta, al vendedor y a la natillera.

Si el recurrente no funciona, el plan B es un permiso de un solo uso por cuota. El laboratorio solo llegó a que la Test Wallet aceptara y aprobara un permiso recurrente: nunca cobró con él. La API pasa sus pruebas con un Open Payments falso; falta el pago real de punta a punta en la Test Wallet.
