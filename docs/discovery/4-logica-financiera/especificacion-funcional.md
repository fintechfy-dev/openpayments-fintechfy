# Natillera 2.0 — lógica financiera

Especificación funcional de las reglas de dinero de la natillera. Las aplica un **servicio externo de lógica financiera** (como un n8n que contiene la lógica financiera), que no forma parte de esta hackathon: el proyecto lo llama por API. Lo que se construye en el evento es lo que lo usa: el bot, la web y el servicio de pagos de Open Payments.

Natillera 2.0 es el ahorro en grupo de siempre (familia, amigos, compañeros de trabajo) sin que nadie custodie el dinero ajeno. Cada participante autoriza **una vez** un permiso de pago recurrente de Open Payments desde su billetera. El sistema le cobra la cuota en cada periodo y el dinero queda en una cuenta del grupo que custodia una financiera. En diciembre todo se reparte y la cuenta de la natillera termina en **cero**: la financiera no cobra ni paga por custodiar, y gana con los ahorradores constantes y con el crédito.

## Las piezas de la lógica

| Pieza | Qué lleva |
|---|---|
| Natillera (cuenta colectiva) | Cuenta a los validados, arranca por cupo, lleva el calendario de cobros, suma cuotas, deudas con su mora y actividades, reserva y paga premios, liquida en dos rondas y cierra en 0 |
| Participación | Permiso de pago, cobro de cada periodo, mora diaria, pago de la deuda por Telegram, su parte en la liquidación y el reembolso si no hubo cupo |
| Crédito desde el ahorro | Préstamo de la financiera (hasta N × cuota, tras Y pagos), cuota francesa, pagos aparte y descuento en la liquidación si está en mora |
| Obligación de actividad | Lo que cada participante debe pagar en una rifa, bazar o compartir, con castigo diario después de su fecha de pago |
| Actividad | Recaudo y premio al ganador que indica el administrador, o todo al acumulado |

## El ciclo de una natillera

**Arranque.** El administrador crea la natillera con su cuota, sus fechas, la periodicidad, el cupo mínimo, la mora diaria y los días de espera. Invita por Telegram, y cada invitado aprueba el permiso de su billetera. El día de inicio, si hay al menos tantos validados como el cupo, la natillera pide la primera cuota a todos. Cuando el cupo de personas paga, queda **ACTIVA**. Si pasan los días de espera sin cupo, devuelve todo, también la mora pagada, y cierra en 0. Quien nunca pagó cierra sin mover dinero.

**Cada periodo.** La natillera abre el periodo y cada participación pide su cuota. Si no hay fondos, la persona pasa a **MORA**: recibe un recordatorio diario con su deuda más la mora, y cuando tiene el dinero lo avisa por Telegram para que se cobre deuda más mora y vuelva a ACTIVA. Toda cuota, deuda y mora pagada entra a la cuenta del grupo.

**Actividades.** Con la natillera activa, el administrador crea una actividad. A cada participante le nace su cuenta por pagar (una sola por persona y actividad) y la paga por Telegram. Si no paga a tiempo, queda en alerta con castigo diario, y esa deuda se suma a su participación. Lo recaudado entra a la cuenta. Si la actividad tiene premio y el administrador indica al ganador, el premio sale de la cuenta hacia su billetera. Si lo recaudado no alcanza, se paga lo que hay y el resto con cada recaudo nuevo. Sin premio o sin ganador, todo va al acumulado.

**Liquidación (fecha final).** Se hace en dos rondas:

1. Cada participación recibe la parte igual (saldo ÷ validados, al centavo hacia abajo). Le descuentan, en este orden y cada uno con tope en lo que queda: actividades pendientes, cuotas en mora con su mora, y la deuda total de un préstamo en mora. Esto último salda ese crédito.
2. Lo descontado a los morosos se reparte por igual entre todos. Los centavos que no alcanzan para todos van al último en reportar, así que la suma de los pagos es exactamente el saldo y la cuenta cierra en 0.

Una actividad abierta se cierra como está: sin ganador va al acumulado, y un premio parcial queda en lo pagado.

**Préstamo.** Tras Y pagos, el participante recibe un aviso con su monto máximo (N × cuota). La financiera otorga un préstamo a la vez por participación. Se desembolsa a la billetera, causa interés por los días transcurridos y se paga aparte; lo pagado de más queda a favor del participante. Si está en mora al liquidar, se descuenta de su parte. Por decisión del equipo (16 de octubre), el crédito entra al núcleo de la hackathon.

## Cómo se conecta con lo que construimos

- **Pagos.** El servicio externo mueve el dinero llamando al **servicio de pagos** del proyecto con el contrato [`apis/open-payments.api.json`](apis/open-payments.api.json): `cobrar-cuota`, `cobrar`, `pagar` y `desembolsar`. Para la demo, el servicio de pagos va contra la Test Wallet de Interledger con pagos reales.
- **Avisos al bot de Telegram:** permiso rechazado, mora y recordatorios, préstamo disponible, pagos y reembolsos fallidos, premio pagado, natillera activa o cerrada.
- **Reloj.** Los cálculos programados corren a diario a las 06:00 (hora de Bogotá). Para acelerar la demo se pueden disparar con la fecha deseada.

## Límites aceptados

- La respuesta de un cobro que llegue después de iniciado un reembolso se rechaza. El cobro responde en segundos y el reembolso ocurre a los 5 días o más.
- Un premio cuyo pago falla queda reservado hasta que el administrador lo reintenta.
- Las validaciones de rango (cuota mínima y máxima, inicio a un mes, fin a un año, actividades solo con la natillera activa y antes de su cierre) las hace el bot.
