# Frente Pagos: servicio de Open Payments

Lo único del sistema que habla con Open Payments, y lo que más mira el jurado: un pago de punta a punta con solicitud, autorización, ejecución y finalización. El frente también lleva la [integración con el servicio externo de lógica financiera](../integracion/).

**Issues:** [frente: pagos](https://github.com/fintechfy-dev/openpayments-fintechfy/issues?q=is%3Aopen+label%3A%22frente%3A+pagos%22). Empieza por #3 (probar el cobro recurrente con un solo permiso) y #4 (el servicio).

## Lo que pide el servicio externo

Contrato en [`open-payments.api.json`](../docs/discovery/4-logica-financiera/apis/open-payments.api.json). Autenticación con el encabezado `X-Api-Key`.

| Operación | Ruta | Qué hace |
|---|---|---|
| cobrar-cuota | `POST /cobrar-cuota` | Cobra la cuota del periodo con el permiso recurrente del participante |
| cobrar | `POST /cobrar` | Cobra deuda más mora u obligaciones de actividades con el mismo permiso |
| pagar | `POST /pagar` | Paga desde la cuenta de la natillera a una billetera (premio, liquidación) |
| desembolsar | `POST /desembolsar` | Desembolsa un préstamo a la billetera del participante |

## Lo que necesita el bot

Iniciar el **permiso interactivo** de cada participante (un permiso de pago saliente con tope e intervalo) y recibir la vuelta cuando lo aprueba en su billetera. _Las rutas se definen en #4._

## Recomendaciones

- Node.js con el SDK oficial [`@interledger/open-payments`](https://github.com/interledger/open-payments-node) y la extensión de VS Code «Open Payments SDK Snippets» (`op-grant-op`, `op-quote-create`, `op-op-create`).
- La política de IA pone este servicio como ejemplo de archivo **con poca o ninguna IA**: escríbanlo a mano y entiéndanlo línea por línea, porque los mentores lo revisan.
- Las claves de la billetera (identificador de la clave y clave privada) y la `X-Api-Key` van en `.env`, nunca en el repo.

## Cómo correrlo

_Por completar en #4._
