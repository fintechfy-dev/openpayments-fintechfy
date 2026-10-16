# Pagos con Open Payments

Lo único del sistema que habla con Open Payments, y lo que más mira el jurado: un pago de punta a punta con solicitud, autorización, ejecución y finalización.

**Vive en el backend de la web** (decisión del 16 de octubre; lo construye Johan):

- Las rutas, en `web/src/app/api/open-payments/` y `web/src/app/api/permisos/`.
- La lógica de Open Payments, en su propio módulo, `web/src/lib/open-payments/`. Ojo: ya existe `web/src/lib/pagos.ts`, que es la lógica de la pantalla del registro; no se mezclan.
- La política de IA pone este servicio como ejemplo de código escrito **con poca o ninguna IA**. Esas carpetas están protegidas: la guardia de Claude Code no deja que la IA las escriba. Escríbanlo a mano, entiéndanlo línea por línea y declárenlo así en `AI_USAGE.md`, porque los mentores lo revisan.

Esta carpeta guarda la especificación. **Issues:** #3 (probar primero), #4 (el servicio) y #67 (los permisos de las billeteras del grupo y de la financiera).

## Cómo se conecta con Open Payments

1. En la [Interledger Test Wallet](https://wallet.interledger-test.dev), la **billetera del grupo** (a nombre de la financiera) es la billetera cliente de la app. En *Settings → Developer Keys* se generan sus llaves: el *Key ID* y `private.key`. Van solo en el `.env` del backend de la web.
2. Con el SDK oficial [`@interledger/open-payments`](https://github.com/interledger/open-payments-node), `createAuthenticatedClient({ walletAddressUrl, keyId, privateKey })`. El SDK firma cada solicitud, pero **no encuentra los servidores solo**: por cada billetera hay que llamar `client.walletAddress.get({ url })` y pasar a mano su `authServer` a los permisos y su `resourceServer` a los cobros, cotizaciones y pagos.
3. **Las llaves solo identifican a la app; no dan permiso para gastar.** Para pagar desde cualquier billetera, incluida la del grupo, hace falta un permiso de pago saliente sobre esa billetera, y ese permiso **siempre** lo aprueba su dueño en la Test Wallet. Un solo par de llaves sirve para pedir los permisos de todas las billeteras: la del grupo, la de la financiera y la de cada participante.
4. **Un pago** son entre 5 y 7 solicitudes encadenadas:
   - un permiso sin interacción y un *incoming payment* en el servidor de quien recibe;
   - un permiso sin interacción y una cotización (*quote*) en el de quien paga, justo antes de pagar (vence a los 5 minutos);
   - el *outgoing payment* con el token del permiso de pago saliente de quien paga (el único permiso interactivo);
   - y consultar hasta que termine, porque Open Payments no avisa. **Se consulta el *incoming payment*** (`completed` o `receivedAmount`): el pago saliente no tiene un estado de completado, solo de fallido. Si el *incoming payment* se creó sin monto, hay que completarlo a mano cuando llega lo cotizado.
5. **Billeteras de la demo:** la del grupo (custodia), la de la financiera (préstamos) y la de cada participante. La Test Wallet maneja pesos colombianos (COP, con dos decimales), así que todas pueden ir en COP y no hay conversión.

La extensión de VS Code «Open Payments SDK Snippets» trae los fragmentos de cada paso: `op-grant-op`, `op-quote-create`, `op-op-create`. El laboratorio `playground/open-payments-lab` del servicio externo es código previo al evento: se puede leer como referencia, pero no se copia.

## Antes de la demo: los permisos de la billetera del grupo y de la financiera (#67)

`/pagar` (premios, liquidación, reembolsos, comisión devuelta) sale de la billetera del grupo y `/desembolsar` de la de la financiera. Para cada una:

1. El backend pide un permiso de pago saliente sobre esa billetera, sin intervalo ni receptor y con un tope que cubra toda la demo.
2. El dueño de esa cuenta lo aprueba **una vez** en la Test Wallet.
3. El backend guarda el token de acceso, la URL de gestión y la de continuación en su base persistente, y rota el token antes de cada pago (vence a los 10 minutos).

Sin este paso, esas dos operaciones fallan aunque las llaves estén bien.

## Lo que llama staging

En `POST https://<web>/api/open-payments/<operación>`, con el encabezado `X-Api-Key` que Willy carga en el tenant. Willy configura como dirección base `https://<web>/api/open-payments`. El cuerpo es JSON con estos campos exactos:

| Cuando | Ruta | Llega | Permiso que usa | Responder 2xx con |
|---|---|---|---|---|
| Cuota del periodo | `/cobrar-cuota` | `grantId`, `walletOrigen`, `monto`, `referencia` (participación), `periodo` | Recurrente del participante | `{ "periodo": n, "monto": m }` |
| Deuda más mora | `/cobrar` | `grantId`, `walletOrigen`, `monto`, `referencia` (participación) | Recurrente del participante | `{ "monto": m }` |
| Parte de una actividad | `/cobrar` | `walletOrigen`, `monto`, `referencia` (actividad). **Sin `grantId`** | El recurrente, buscado por `walletOrigen` | `{ "monto": m }` |
| Premio de una actividad | `/pagar` | `walletDestino`, `monto`, `referencia` (actividad), `origen` (natillera) | Permiso de la billetera del grupo | `{ "monto": m }` |
| Liquidación o reembolso | `/pagar` | `walletDestino`, `monto`, `referencia` (participación). **Sin `origen`** | Permiso de la billetera del grupo | `{ "monto": m }` |
| Comisión devuelta (devolución) | `/pagar` | `walletDestino` (comprador), `monto`, `referencia` (venta), `origen` (natillera) | Permiso de la billetera del grupo | `{ "monto": m }` |
| Préstamo | `/desembolsar` | `walletDestino`, `monto` (capital), `referencia` (crédito) | Permiso de la billetera de la financiera | `{ "monto": m }` |
| Compra: al vendedor | `/pagar-con-permiso` | `grantId`, `walletOrigen` (comprador), `walletDestino` (vendedor), `monto` (valor menos comisión), `referencia` (venta) | De un solo uso del comprador | `{ "monto": m }` |
| Compra: comisión | `/aportar-con-permiso` | `grantId` (el mismo), `walletOrigen` (comprador), `natilleraId` (**sin `walletDestino`**: va a la billetera del grupo), `monto` (comisión), `referencia` (venta) | El mismo de un solo uso | `{ "monto": m }` |
| Devolución o su deuda | `/pagar-con-permiso` | `grantId`, `walletOrigen` (vendedor), `walletDestino` (comprador), `monto`, `referencia` (venta) | De un solo uso del vendedor, uno por intento | `{ "monto": m }` |

## Reglas que pone staging

- **El monto de la respuesta tiene que ser exactamente el pedido, en pesos.** Si no coincide, staging rechaza la confirmación y la venta o la devolución queda atascada sin aviso de fallo.
- **Fallo:** cualquier respuesta que no sea 2xx, o ninguna respuesta en 30 segundos. El motivo le llega al participante.
- **Staging reintenta a los 2, 10 y 60 segundos** (solo ante un 5xx, un `429` o sin respuesta; un error 4xx distinto de `429` es definitivo). Por eso el servicio tiene que ser idempotente:
  - La llave es la ruta más el cuerpo completo (`grantId`, billeteras o `natilleraId`, `monto`, `referencia` y `periodo`), y vale por unos 5 minutos.
  - Mientras el pago siga en curso, el reintento recibe un `503`. Nunca un `409`: sería un fallo definitivo.
  - **Solo se guarda la respuesta de un pago exitoso.** Un fallo no se guarda: si el participante recarga y vuelve a intentar con el mismo cuerpo (por ejemplo `PagarDeuda` después de quedarse sin fondos), hay que intentar de nuevo, no devolver el fallo viejo.
  - **No basta con la referencia sola.** La misma `referencia` viaja en varias llamadas legítimas: una venta la usa en el pago al vendedor, la comisión, la devolución y su deuda, y la deuda de cuotas la repite mes a mes.
- **Tiempo:** consultar el *incoming payment* hasta unos 20 segundos. Si todavía no se confirma, responder un error 5xx y seguir consultando por detrás: el reintento recibirá el resultado.
- **Rotación del token** de un permiso: con un candado por permiso. La rotación anula el token anterior, así que dos rotaciones al mismo tiempo se pisan.
- **Las 6 rutas tienen que responder**, porque el modo de prueba o real es de toda la API. Lo que no se alcance a demostrar (por ejemplo desembolsar o las devoluciones) responde un 2xx simulado, marcado como tal en el registro y en `AI_USAGE.md`.

## Permisos para el bot

Con el encabezado `X-Api-Key: <WEB_API_KEY>`:

| Ruta | Para qué |
|---|---|
| `POST /api/permisos` | Pide un permiso. Cuerpo: `tipo` (`recurrente` o `un-solo-uso`), `wallet`, `monto` (el valor del permiso, en pesos) y `referencia`. Responde `{ "permisoId", "urlAprobacion" }` |
| `GET /api/permisos/{permisoId}` | Estado: `{ "estado": "pendiente" \| "aprobado" \| "rechazado", "grantId" }` |
| `POST /api/permisos/{permisoId}/cancelar` | Opcional: cuando alguien se retira |

**La vuelta (pública, la abre el navegador del participante):** `GET /api/permisos/{permisoId}/retorno`. Llega de dos formas:

- **Si aprobó:** con `interact_ref` y `hash`. Se verifica el `hash` (SHA-256 del nonce de la app, el nonce que devolvió la billetera, `interact_ref` y la URL del servidor de permisos, en base64), se continúa el permiso y se guardan sus tokens.
- **Si rechazó o algo falló:** con `result=grant_rejected` o `result=grant_invalid`, **sin** hash. Se marca el permiso como `rechazado` y no se intenta continuar.

En los dos casos, al final **redirige a `https://t.me/<bot>?start=permiso_<permisoId>`**. Así el participante vuelve al chat, el bot recibe el `/start` y consulta el estado. Para poder verificar el hash aunque la web se reinicie, cada permiso pendiente guarda en la base el nonce de la app, el nonce de la billetera y la URL del servidor de permisos. Los pagos nunca le hablan a staging; solo le responden.

**Los dos tipos de permiso** (los dos de pago saliente, aprobados por el participante):

- **Recurrente** (cuotas, deuda y actividades). Con intervalo, el tope es el máximo **por intervalo**, y la billetera rechaza cualquier cobro que por sí solo lo supere: si el tope fuera la cuota, la deuda con mora o una actividad más cara que la cuota fallarían siempre. Además, el intervalo corre en tiempo real mientras la demo adelanta las fechas. **Para la demo: sin intervalo, con un tope total** que alcance para todas las cuotas más la mora y las actividades. Una cuota por periodo ya la garantiza staging, que solo pide una por periodo. El bot manda ese total en `monto`.
- **De un solo uso** (compra y devolución): tope igual al valor completo, **sin intervalo y sin receptor fijo**, porque en la compra cubre dos pagos a dos destinos (vendedor y comisión). Va en la moneda de la billetera de quien paga, y los dos pagos tienen que sumar exactamente el valor. Si el segundo pago llega después de 10 minutos, se rota el token.

El enlace de aprobación puede vencer antes de los 15 minutos que cuenta el bot (en el servidor de la Test Wallet el valor por omisión es de 10). Si vence, el participante ya no puede aprobar y la compra se cancela a los 15 minutos, sin mover dinero.

El `grantId` que recibe staging es un **id propio del backend**, no el de Open Payments. Los tokens de cada permiso (acceso, gestión y continuación) quedan guardados en la base del backend bajo ese id, y cada rotación reemplaza el token y la URL de gestión.

## Dónde vive cada secreto

| Secreto | Dónde |
|---|---|
| Llave privada de la billetera del grupo, su Key ID y su wallet address | Solo en el `.env` del backend de la web |
| Tokens de los permisos: los de los participantes y los de la billetera del grupo y la financiera | Base de datos del backend de la web |
| `X-Api-Key` del riel | `.env` de la web y credencial del tenant (la carga Willy) |
| Llave del bot para llamar a la web | `.env` de la web (`WEB_API_KEY`) y del bot (`WEB_INDICE_API_KEY`) |
| Token de staging | Bot y web; nunca en el navegador |
| Secreto de firma de los avisos | `.env` de la web |
| Llaves de los participantes | No existen en el sistema: cada persona aprueba en su propia billetera |

## Registro para el jurado y avisos de pago

Cada pago queda registrado con sus cuatro etapas: solicitud (llega la llamada de staging), autorización (el permiso aprobado), ejecución (*quote* y *outgoing payment*, con sus ids) y finalización (*incoming payment* completo, o fallido). Solo este servicio conoce la ejecución; la pantalla `/pagos` de la web lo lee directamente, porque vive en la misma aplicación.

Staging no avisa «cobro hecho». Por eso, al terminar cada pago, el backend agrega a la lista de avisos del bot un `PagoCompletado` o un `PagoFallido`, con el tipo de pago (`cuota`, `deuda`, `actividad`, `premio`, `liquidacion`, `reembolso`, `desembolso`, `venta`, `comision` o `devolucion`), la `referencia`, el `monto` y, en las cuotas, el `periodo`.

## Lo primero: el #3

Probar en la red real, antes de construir encima:

1. **Dos cobros con el mismo permiso recurrente, sin intervalo y con tope total.**
2. **Dos pagos seguidos con el mismo permiso de un solo uso:** el de la venta, al vendedor y a la natillera.

Si el recurrente no funciona, el plan B es un permiso de un solo uso por cuota. El laboratorio solo llegó a que la Test Wallet aceptara y aprobara un permiso recurrente: nunca cobró con él.
