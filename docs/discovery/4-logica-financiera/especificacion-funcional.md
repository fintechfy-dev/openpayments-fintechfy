# Natillera 2.0 — lógica financiera

Especificación funcional de las reglas de dinero de la natillera. Las aplica un **servicio externo de lógica financiera** (como un n8n que contiene la lógica financiera), que no forma parte de esta hackathon: el proyecto lo llama por API. Lo que se construye en el evento es lo que lo usa: el bot, la web y los pagos de Open Payments.

**Versión 0.2.0** (16 de octubre de 2026): suma las ventas entre participantes, con su devolución.

Natillera 2.0 es el ahorro en grupo de siempre (familia, amigos, compañeros de trabajo) sin que nadie custodie el dinero ajeno. Cada participante autoriza **una vez** un permiso de pago recurrente de Open Payments desde su billetera. El sistema le cobra la cuota en cada periodo y el dinero queda en una cuenta del grupo que custodia una financiera. En diciembre todo se reparte y la cuenta de la natillera termina en **cero**: la financiera no cobra ni paga por custodiar, y gana con los ahorradores constantes y con el crédito.

## Las piezas de la lógica

| Pieza | Qué lleva |
|---|---|
| Natillera (cuenta colectiva) | Cuenta a los validados, arranca por cupo, lleva el calendario de cobros, suma cuotas, deudas con su mora, actividades y comisiones de ventas, reserva y paga premios, liquida en dos rondas y cierra en 0 |
| Participación | Permiso de pago, cobro de cada periodo, mora diaria, pago de la deuda por Telegram, sus deudas por comisiones y devoluciones, su parte en la liquidación y el reembolso si no hubo cupo |
| Crédito desde el ahorro | Préstamo de la financiera (hasta N × cuota, tras Y pagos), cuota francesa, pagos aparte y descuento en la liquidación si está en mora |
| Obligación de actividad | Lo que cada participante debe pagar en una rifa, bazar o compartir, con castigo diario después de su fecha de pago |
| Actividad | Recaudo y premio al ganador que indica el administrador, o todo al acumulado |
| Venta | Una compra entre participantes con un permiso de un solo uso: paga al vendedor y lleva la comisión a la natillera |
| Devolución | La devolución de una compra con dos llaves (vendedor y administrador), el pago de vuelta y, si el vendedor no paga, su deuda |

El catálogo de productos (publicar, fotos, búsqueda, tope de 3 por persona, retiro) no mueve dinero: vive en el bot, no en el servicio externo.

## El ciclo de una natillera

**Arranque.** El administrador crea la natillera con su cuota, sus fechas, la periodicidad, el cupo mínimo, la mora diaria, los días de espera y, desde la 0.2.0, el porcentaje de comisión de las ventas (5 % por omisión) y el plazo de devolución (8 días por omisión). Invita por Telegram, y cada invitado aprueba el permiso de su billetera. El día de inicio, si hay al menos tantos validados como el cupo, la natillera pide la primera cuota a todos. Cuando el cupo de personas paga, queda **ACTIVA**. Si pasan los días de espera sin cupo, devuelve todo, también la mora pagada, y cierra en 0. Quien nunca pagó cierra sin mover dinero.

**Cada periodo.** La natillera abre el periodo y cada participación pide su cuota. Si no hay fondos, la persona pasa a **MORA**: recibe un recordatorio diario con su deuda más la mora, y cuando tiene el dinero lo avisa por Telegram para que se cobre deuda más mora y vuelva a ACTIVA. Toda cuota, deuda y mora pagada entra a la cuenta del grupo.

**Actividades.** Con la natillera activa, el administrador crea una actividad. A cada participante le nace su cuenta por pagar (una sola por persona y actividad) y la paga por Telegram. Si no paga a tiempo, queda en alerta con castigo diario, y esa deuda se suma a su participación. Lo recaudado entra a la cuenta. Si la actividad tiene premio y el administrador indica al ganador, el premio sale de la cuenta hacia su billetera. Si lo recaudado no alcanza, se paga lo que hay y el resto con cada recaudo nuevo. Sin premio o sin ganador, todo va al acumulado.

**Liquidación (fecha final).** No empieza mientras haya ventas con pagos en curso. Se hace en dos rondas:

1. Cada participación recibe la parte igual (saldo ÷ validados, al centavo hacia abajo). Le descuentan, en este orden y cada uno con tope en lo que queda: actividades pendientes, cuotas en mora con su mora, comisiones de ventas pendientes, la deuda total de un préstamo en mora (lo que salda ese crédito) y sus devoluciones en deuda.
2. Lo descontado a los morosos se reparte por igual entre todos. Los centavos que no alcanzan para todos van al último en reportar, así que la suma de los pagos es exactamente el saldo y la cuenta cierra en 0.

Si hay devoluciones en deuda, la natillera pasa primero por **PREPARANDO_LIQUIDACION**: cobra esas deudas a prorrata de la parte de cada vendedor y el reparto ocurre al día siguiente. Lo que le corresponde a un comprador por una devolución se le suma **completo**, después de sus propios descuentos.

Una actividad abierta se cierra como está: sin ganador va al acumulado, y un premio parcial queda en lo pagado. Las ventas que siguen esperando autorización se cancelan, y las confirmadas se cierran.

**Préstamo.** Tras Y pagos, el participante recibe un aviso con su monto máximo (N × cuota). La financiera otorga un préstamo a la vez por participación. Se desembolsa a la billetera, causa interés por los días transcurridos y se paga aparte; lo pagado de más queda a favor del participante. Si está en mora al liquidar, se descuenta de su parte. Por decisión del equipo (16 de octubre), el crédito entra al núcleo de la hackathon.

## Ventas entre participantes

Cualquier participante validado, también el administrador y también quien está en mora, puede vender y comprar dentro de su natillera mientras esté activa.

**La compra.** El comprador toca «Comprar». La natillera calcula la comisión con **su** porcentaje (al centavo hacia abajo; el vendedor absorbe el residuo, así que los dos pagos suman exactamente el valor). El comprador aprueba en su billetera **un solo permiso de un solo uso** por el valor completo, y con ese permiso:

1. se le paga al vendedor el valor menos la comisión, de billetera a billetera;
2. se lleva la comisión a la cuenta de la natillera, que la reparte entre todos en la liquidación.

Si el comprador no aprueba en 15 minutos, niega o el pago al vendedor falla, la compra se cancela sin mover dinero. Si el pago al vendedor sale pero la comisión no, la compra queda **a medias**: la comisión se vuelve deuda del comprador, se le descuenta en la liquidación y se reparte entre todos.

**La devolución.** Dentro del plazo (8 días por omisión, el último día incluido), el comprador puede pedirla con un motivo. Deciden dos llaves: el vendedor y el administrador (si el vendedor es el administrador, basta una). Un sí y un no la deja pendiente; quien negó puede aprobar después; una aprobación no se retira. Tres días antes de la fecha final se recuerda una vez a quien no ha decidido, y si llega la liquidación se cierra como está.

Si se aprueba:

- la natillera le devuelve la comisión al comprador desde la cuenta del grupo;
- el vendedor aprueba un permiso de un solo uso por lo que recibió y se le paga al comprador. Si no lo aprueba en 15 minutos o no tiene fondos, queda **en deuda**: puede pagarla antes de la fecha final, o se le cobra a prorrata de su parte en la liquidación y el comprador lo recibe en la suya.

Una compra a medias no admite devolución.

## Cómo se conecta con lo que construimos

- **Pagos.** El servicio externo mueve el dinero llamando a los **pagos de Open Payments** del proyecto, que viven en el backend de la web, con el contrato [`apis/open-payments.api.json`](apis/open-payments.api.json): `cobrar-cuota`, `cobrar`, `pagar`, `desembolsar` y, desde la 0.2.0, `pagar-con-permiso` y `aportar-con-permiso`. Para la demo, los pagos van contra la Test Wallet de Interledger con dinero real de prueba.
- **Avisos al bot de Telegram,** a través de la web: permiso rechazado, mora y recordatorios, préstamo disponible, pagos y reembolsos fallidos, premio pagado, natillera activa o cerrada y, desde la 0.2.0, todo el recorrido de una venta y de una devolución.
- **Reloj.** Los cálculos programados corren a diario a las 06:00 (hora de Bogotá). Para acelerar la demo se pueden disparar con la fecha deseada.

## Límites aceptados

- La respuesta de un cobro que llegue después de iniciado un reembolso se rechaza. El cobro responde en segundos y el reembolso ocurre a los 5 días o más.
- Un premio cuyo pago falla queda reservado hasta que el administrador lo reintenta.
- Las validaciones de rango (cuota mínima y máxima, inicio a un mes, fin a un año, actividades solo con la natillera activa y antes de su cierre) las hace el bot.
- El servicio externo no sabe quién llama: el bot valida quién compra y quién vota una devolución.
- Una compra en el filo de la liquidación se rechaza: el bot no ofrece «Comprar» desde el día anterior a la fecha final.
- Los 15 minutos de cada permiso de un solo uso los cuenta el bot.
- Una natillera creada antes de la 0.2.0 no puede vender: no tiene porcentaje de comisión.
