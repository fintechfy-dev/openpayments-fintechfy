# Frente Pagos: servicio de Open Payments

Lo único del sistema que habla con Open Payments, y lo que más mira el jurado: un pago de punta a punta con solicitud, autorización, ejecución y finalización. El frente también lleva la [integración con el servicio externo de lógica financiera](../integracion/).

**Issues:** [frente: pagos](https://github.com/fintechfy-dev/openpayments-fintechfy/issues?q=is%3Aopen+label%3A%22frente%3A+pagos%22). Empieza por #3 (probar el cobro recurrente con un solo permiso) y #4 (el servicio).

## Lo que pide el servicio externo

Contrato en [`open-payments.api.json`](../docs/discovery/4-logica-financiera/apis/open-payments.api.json), verificado el 16 de octubre contra lo que hay en staging. Autenticación con el encabezado `X-Api-Key`. El cuerpo es JSON con estos campos exactos:

| Cuando | Ruta | Llega | Responder 2xx con |
|---|---|---|---|
| Cuota del periodo | `POST /cobrar-cuota` | `grantId`, `walletOrigen`, `monto`, `referencia` (participación), `periodo` | `{ "periodo": n, "monto": m }` |
| Deuda más mora | `POST /cobrar` | `grantId`, `walletOrigen`, `monto`, `referencia` (participación) | `{ "monto": m }` |
| Parte de una actividad | `POST /cobrar` | `walletOrigen`, `monto`, `referencia` (actividad). **Sin `grantId`** | `{ "monto": m }` |
| Premio de una actividad | `POST /pagar` | `walletDestino`, `monto`, `referencia` (actividad), `origen` (natillera) | `{ "monto": m }` |
| Liquidación o reembolso | `POST /pagar` | `walletDestino`, `monto`, `referencia` (participación). **Sin `origen`** | `{ "monto": m }` |
| Préstamo | `POST /desembolsar` | `walletDestino`, `monto` (capital), `referencia` (crédito) | `{ "monto": m }` |

**Reglas que pone el servicio externo:**

- Cualquier respuesta que no sea 2xx, o ninguna respuesta en 30 segundos, cuenta como pago fallido; el motivo le llega al participante.
- Si falla, **reintenta a los 2, 10 y 60 segundos**. El servicio tiene que ser idempotente: la misma `referencia` (con el mismo `periodo` en las cuotas) nunca cobra dos veces (US-007-BCK).
- El servicio tiene que tener una **URL pública HTTPS** alcanzable desde staging. En staging esa URL hoy es un ejemplo (`natillera-bff.example`) y hay que configurarla (ver [integración](../integracion/README.md), diferencia 6).

**Dos huecos que resuelve este servicio:**

- La parte de una actividad llega sin `grantId`: se busca el permiso del participante por su `walletOrigen`.
- La liquidación y el reembolso llegan sin `origen`: el servicio tiene que saber de qué billetera del grupo sale el pago. Para la demo alcanza con una sola billetera del grupo. Los préstamos salen de la billetera de la financiera.

**El registro para el jurado** (las cuatro etapas: solicitud, autorización, ejecución y finalización) vive aquí, porque el servicio externo solo ve la solicitud y el resultado. La pantalla `/pagos` de la web lo lee a través del puente.

## Lo que necesita el bot

Iniciar el **permiso interactivo** de cada participante (un permiso de pago saliente con tope e intervalo) y recibir la vuelta cuando lo aprueba en su billetera. _Las rutas se definen en #4._

## Recomendaciones

- Node.js con el SDK oficial [`@interledger/open-payments`](https://github.com/interledger/open-payments-node) y la extensión de VS Code «Open Payments SDK Snippets» (`op-grant-op`, `op-quote-create`, `op-op-create`).
- La política de IA pone este servicio como ejemplo de archivo **con poca o ninguna IA**: escríbanlo a mano y entiéndanlo línea por línea, porque los mentores lo revisan.
- Las claves de la billetera (identificador de la clave y clave privada) y la `X-Api-Key` van en `.env`, nunca en el repo.

## Cómo correrlo

_Por completar en #4._
