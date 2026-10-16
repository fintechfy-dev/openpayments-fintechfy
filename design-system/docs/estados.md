# Estados del producto

Cada estado tiene variante de color, ícono y palabra (`Natillera.ESTADOS`). Nunca muestres un estado solo con color.

## Natillera

| Estado | Badge | Ícono | Cuándo |
| --- | --- | --- | --- |
| Creada | `nt-badge--neutro` | punto | El admin la configuró; faltan personas o autorizaciones |
| Iniciada | `nt-badge--info` | calendario | Mínimo 3 personas autorizadas; esperando la primera cuota |
| Activa | `nt-badge--exito` | check | Cobrando cuotas |
| Liquidando | `nt-badge--celebra` | premio | Pagando a cada billetera en diciembre |
| Cerrada | `nt-badge--neutro` | candado | Todo pagado; solo lectura |

## Participante

| Estado | Badge | Ícono | Cuándo |
| --- | --- | --- | --- |
| Validado | `nt-badge--info` | check | Billetera verificada y cobro autorizado |
| Activo | `nt-badge--exito` | cuota | Al día con sus cuotas |
| En mora | `nt-badge--aviso` | reloj | Tiene al menos una cuota sin cobrar. Naranja, no rojo: es un atraso, no una falta |
| Liquidado | `nt-badge--celebra` | premio | Recibió su liquidación |

## Pago

| Estado | Badge | Ícono | Cuándo |
| --- | --- | --- | --- |
| Pendiente | `nt-badge--neutro` | reloj | Solicitud creada, esperando |
| Autorizado | `nt-badge--info` | candado | Permiso vigente, en ejecución |
| Completado | `nt-badge--exito` | check | Recibido en la billetera de la natillera |
| Fallido | `nt-badge--error` | alerta | No se pudo ejecutar; siempre con motivo |

## Reglas

- Verde (`exito`) y rojo (`error`) nunca se distinguen solo por color: el ícono y la palabra cambian siempre.
- En mensajes a participantes, "Fallido" se dice "quedó pendiente" y "En mora" se dice "tienes una cuota pendiente". Las palabras técnicas son para el panel y el administrador.
- Etapas de un pago (panel del jurado): **Solicitud → Autorización → Ejecución → Finalización**, con `LineaTiempoPago`.
