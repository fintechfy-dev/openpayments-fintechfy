# Integración con el servicio externo de lógica financiera

Las reglas de dinero de la natillera (cupo y arranque, cobro de cada periodo, mora diaria, actividades, crédito y liquidación) las aplica un **servicio externo de lógica financiera**, como un n8n que contiene la lógica financiera. No forma parte de esta hackathon: el proyecto lo llama por API, igual que usaría cualquier plataforma externa.

Esta carpeta es del **Frente Pagos** y guarda lo nuevo que conecta el proyecto con ese servicio: la configuración, el código que lo llama y el contrato que usan el bot y la web.

Las reglas que aplica el servicio están en la [especificación funcional](../docs/discovery/4-logica-financiera/especificacion-funcional.md).

**Issues:** #5 (conectar con el servicio externo) y #6 (avisos al bot).

## Contratos

- **El servicio externo → el servicio de pagos:** pide `cobrar-cuota`, `cobrar`, `pagar` y `desembolsar` ([contrato](../docs/discovery/4-logica-financiera/apis/open-payments.api.json)). En #5 se le indica la URL del servicio de pagos y su `X-Api-Key`.
- **El bot y la web → el servicio externo:** _por completar en #5: dirección del servicio en la demo, cómo se autentican y las operaciones que usan._
- **El servicio externo → el bot (avisos):** _por completar en #6._

## Dónde corre en la demo

_Por decidir en #5. Cada sala del jurado usa una sola laptop, así que el video de la demo es el respaldo._
