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
| Por validar | `nt-badge--neutro` | reloj | Se unió, pero aún no verifica su billetera ni autoriza el cobro (`PENDIENTE_VALIDACION` en el servicio externo) |
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

## Crédito

El préstamo lo da la financiera, no la natillera. La solicitud se ve en la web de la financiera y en el bot; la vida del préstamo viene del servicio externo de lógica financiera.

| Estado | Badge | Ícono | Cuándo | Del servicio externo |
| --- | --- | --- | --- | --- |
| Solicitado | `nt-badge--neutro` | reloj | El participante lo pidió; la financiera no ha respondido | — |
| Aprobado | `nt-badge--info` | check | La financiera lo aprobó | — |
| No aprobado | `nt-badge--neutro` | punto | La financiera no lo aprobó. Neutro, nunca rojo | — |
| Por desembolsar | `nt-badge--info` | reloj | Aprobado, esperando que llegue a la billetera | `DESEMBOLSO_PENDIENTE` |
| Al día | `nt-badge--exito` | check | Desembolsado y con las cuotas al día | `ACTIVO` |
| En mora | `nt-badge--aviso` | reloj | Tiene una cuota del préstamo vencida | `MORA` |
| Pagado | `nt-badge--celebra` | premio | Saldado por completo | `PAGADO` |
| Descontado al liquidar | `nt-badge--neutro` | cuota | La deuda se descontó de su parte en la liquidación | `PAGADO` vía descuento |

Generar: `Natillera.badge("credito", "en_mora")`. El ícono propio del crédito es `credito` (mano con moneda), para encabezados y botones de "Pedir préstamo".

## Reglas

- Verde (`exito`) y rojo (`error`) nunca se distinguen solo por color: el ícono y la palabra cambian siempre.
- En mensajes a participantes, "Fallido" se dice "quedó pendiente" y "En mora" se dice "tienes una cuota pendiente". Las palabras técnicas son para el panel y el administrador.
- Etapas de un pago (panel del jurado): **Solicitud → Autorización → Ejecución → Finalización**, con `LineaTiempoPago`.
