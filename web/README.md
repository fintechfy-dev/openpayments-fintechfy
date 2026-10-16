# Frente Web

La página de la financiera y del administrador: gestionar las natilleras, ver las solicitudes de crédito, el registro de pagos que se le muestra al jurado y la bitácora del administrador.

**Issues:** [frente: web](https://github.com/fintechfy-dev/openpayments-fintechfy/issues?q=is%3Aopen+label%3A%22frente%3A+web%22). Empieza por #8 (esqueleto) y #9 (ver y gestionar natilleras).

| Pantalla | Issue | Prioridad |
|---|---|---|
| Natilleras: lista y detalle | #9 | núcleo |
| Solicitudes de crédito de la financiera | #10 | núcleo |
| Registro de pagos con sus cuatro etapas (para el jurado) | US-007-RPT | núcleo |
| Bitácora del administrador | US-012-AUD | recorte 3 |

## Estilos

La página usa el [design system](../design-system/): carga `design-system/tokens/tokens.css`, `design-system/components/bundle.css` y `bundle.js`, y arma las pantallas con los componentes `PanelJurado`, `Tabla`, `BadgeEstado`, `LineaTiempoPago`, `SolicitudesCredito` (#10) y `TarjetaCredito`. Montos siempre con `Natillera.formatoCOP`.

## Contratos

- **Con el servicio externo de lógica financiera:** todo lo que muestra la página sale de ahí. El contrato se escribe en [`../integracion/README.md`](../integracion/README.md) (#5).
- La web no mueve dinero.

## Cómo correrlo

_Por completar en #8: stack, instalación, variables de `.env` y comando para arrancarla._
