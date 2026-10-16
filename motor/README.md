# Frente Motor

El motor financiero guarda el estado de las natilleras y aplica las reglas: cupo y arranque, cobro de cada periodo, mora diaria, actividades, crédito y liquidación.

**El motor ya existía antes del evento.** Se usa como servicio y su código **no** entra a este repositorio (#2). Aquí va solo lo nuevo:

- la configuración del tenant de la natillera y cómo cargarle las plantillas;
- el código o los scripts que lo llaman;
- el contrato que usan el bot y la web.

Las plantillas de la natillera se generaron en el discovery, también antes del evento: están en [`../docs/discovery/4-fnd-motor/templates`](../docs/discovery/4-fnd-motor/templates) y se declaran así en `AI_USAGE.md`.

**Issues:** [frente: motor](https://github.com/fintechfy-dev/openpayments-fintechfy/issues?q=is%3Aopen+label%3A%22frente%3A+motor%22). Empieza por #2 y #5. El servicio de Open Payments (#4) también es de este frente y vive en [`../pagos/`](../pagos/).

## Contratos

- **Hacia el servicio de pagos:** la integración `open-payments` del motor llama `cobrar-cuota`, `cobrar`, `pagar` y `desembolsar` ([contrato](../docs/discovery/4-fnd-motor/apis/open-payments.api.json)). En #5 se apunta a la URL del servicio de pagos.
- **Para el bot y la web:** _por completar en #5: dirección del motor en la demo, cómo se autentican y las operaciones que usan._
- **Avisos al bot:** _por completar en #6._

## Dónde corre

_Por decidir en #5: una laptop o la nube. Cada sala del jurado usa una sola laptop, así que el video de la demo es el respaldo._
