# Documentación técnica

Diagramas de arquitectura, maquetas y documentación técnica de Natillera 2.0, en Mermaid (GitHub los dibuja solos).

| Documento | Qué tiene |
|---|---|
| [Arquitectura](arquitectura.md) | Contexto, piezas y contratos entre ellas, despliegue en Azure y los flujos de unirse, cobrar cada cuota, liquidar, prestar y comprar |
| [Maquetas](maquetas.md) | Mapa de pantallas del bot y de la web, y la maqueta de baja fidelidad de cada pantalla con los componentes del design system |
| [Estados y datos](estados-y-datos.md) | Estados de la natillera, la participación, el permiso y el pago, y qué guarda cada pieza |

## Por pieza

| Pieza | Guía | Contrato |
|---|---|---|
| Bot de Telegram | [`telegram/README.md`](../../telegram/README.md) | [`telegram/INTEGRACION.md`](../../telegram/INTEGRACION.md) |
| Web | [`web/README.md`](../../web/README.md) | [`web/INTEGRACION.md`](../../web/INTEGRACION.md) |
| API de pagos | [`pagos/README.md`](../../pagos/README.md) | [`pagos/API.md`](../../pagos/API.md) y su Swagger en `https://natillera-pagos.azurewebsites.net/docs` |
| Servicio externo de lógica financiera | [`integracion/README.md`](../../integracion/README.md) | [Especificación funcional](../discovery/4-logica-financiera/especificacion-funcional.md) |
| Design system | [`design-system/README.md`](../../design-system/README.md) | [Estados](../../design-system/docs/estados.md), [marca](../../design-system/docs/marca.md), [voz y tono](../../design-system/docs/voz-y-tono.md) |

El plan vigente y quién lleva qué: [`docs/plan-de-trabajo.md`](../plan-de-trabajo.md). Las historias, criterios y
escenarios que originaron todo esto: [`docs/discovery/`](../discovery/).
