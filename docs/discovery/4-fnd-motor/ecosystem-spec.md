# Natillera 2.0 — especificación vigente al 15/10/2026

Natillera 2.0 es el ahorro en grupo de siempre (familia, amigos, compañeros de trabajo) sin que nadie custodie el
dinero ajeno. Cada participante autoriza **una vez** un permiso de pago recurrente de Open Payments desde su billetera.
El sistema le cobra la cuota en cada periodo y el dinero queda en una cuenta del grupo que custodia una financiera. En
diciembre todo se reparte, y la cuenta de la natillera termina en **cero**: la financiera no cobra ni paga por custodiar
(AVL Q2), y gana con los ahorradores constantes y con el crédito.

Fuente: el documento maestro `Natillera 2.pdf` (citado E-xx en `fnd-session.md`), el mapa de impacto acordado
(`IMD-20261014-natillera-2`) y las decisiones del equipo registradas pregunta por pregunta en `fnd-session.md`.

| Contrato | Template | Responsabilidad |
|---|---|---|
| Natillera (cuenta colectiva) | `natillera-cuenta` 1.0.0 | Cuenta validados, arranca por cupo, lleva el calendario de cobros, suma por deltas (cuotas, deuda con su mora, actividades), reserva y paga premios, liquida en dos rondas y cierra en 0 |
| Participación | `natillera-participacion` 1.0.0 | Permiso de pago, cobro de cada periodo, mora diaria, pago de la deuda por Telegram, su parte en la liquidación y el reembolso si no hubo cupo |
| Crédito desde el ahorro | `natillera-credito-ahorro` 1.0.0 | Préstamo de la financiera (hasta N × cuota, tras Y pagos), cuota francesa, pagos aparte y descuento en la liquidación si está en mora |
| Obligación de actividad | `natillera-obligacion-actividad` 1.0.0 | La cuenta por pagar de cada participante en una rifa, bazar o compartir, con castigo diario después de su fecha de pago |
| Actividad | `natillera-actividad` 1.0.0 | Recaudo, premio al ganador que indica el administrador o todo al acumulado |

Los cinco se conectan con **26 reglas declarativas**: nadie crea contratos de integración, e instalar el ecosistema
basta. El mapa está en `topology-diagram.md`, que es una proyección generada.

## El ciclo de una natillera

**Arranque.** El administrador crea la natillera con su cuota, sus fechas, la periodicidad, el cupo mínimo, la mora
diaria y los días de espera. Invita por Telegram, y cada invitado aprueba el permiso de su billetera. El día de inicio,
si hay al menos tantos validados como el cupo, la natillera pide la primera cuota a todos. Cuando el cupo de personas
paga, queda **ACTIVA**. Si pasan los días de espera sin cupo, devuelve todo, también la mora pagada, y cierra en 0. Quien
nunca pagó cierra sin mover dinero.

**Cada periodo.** La natillera abre el periodo y cada participación pide su cuota al riel. Si no hay fondos, la persona
pasa a **MORA**: recibe un recordatorio diario con su deuda más la mora, y cuando tiene el dinero lo avisa por Telegram
para que el sistema cobre deuda + mora y la regrese a ACTIVA. Toda cuota, deuda y mora pagada entra a la cuenta del grupo.

**Actividades.** Con la natillera activa, el administrador crea una actividad. A cada participante le nace su cuenta
por pagar (una sola por persona y actividad) y la paga por Telegram. Si no paga a tiempo, queda en alerta con castigo
diario, y esa deuda se suma a su participación. Lo recaudado entra a la cuenta. Si la actividad tiene premio y el
administrador indica al ganador, el premio sale de la cuenta hacia su billetera. Si lo recaudado no alcanza, se paga lo
que hay y el resto con cada recaudo nuevo. Sin premio o sin ganador, todo va al acumulado.

**Liquidación (fecha final).** Se hace en dos rondas:
1. Cada participación recibe la parte igual (saldo ÷ validados, al centavo hacia abajo). Le descuentan, en el orden
   del documento (E-16) y cada uno con tope en lo que queda: actividades pendientes, cuotas en mora con su mora, y la
   deuda total de un préstamo en mora. Esto último salda ese crédito.
2. Lo descontado a los morosos se reparte por igual entre todos. Los centavos que no alcanzan para todos van al último
   en reportar, así que la suma de los pagos es exactamente el saldo y la cuenta cierra en 0.

Una actividad abierta se cierra como está: sin ganador va al acumulado, y un premio parcial queda en lo pagado.

**Préstamo.** Tras Y pagos, el participante recibe un aviso con su monto máximo (N × cuota). La financiera otorga un
préstamo a la vez por participación. Se desembolsa a la billetera, causa interés por los días transcurridos y se paga
aparte; lo pagado de más queda a favor del participante. Si está en mora al liquidar, se descuenta de su parte.

## Integración y reloj

- **El dinero se mueve con llamadas a la API del tenant**: `apis/open-payments.api.json`, con las operaciones cobrar,
  pagar y desembolsar. La URL, la credencial y el modo (mock o real) los pone el tenant al instalarla; ningún secreto
  viaja en los templates. Para la demo, esa API debe estar en modo real contra el testnet de Interledger (ENT-005):
  en mock el sistema funciona, pero no se mueve dinero.
- **Avisos al bot de Telegram** (destino lógico `bot-natillera`): permiso rechazado, mora y recordatorios, préstamo
  disponible, pagos y reembolsos fallidos, premio pagado, natillera activa o cerrada.
- **Reloj.** Los triggers programados corren a diario a las 06:00 (America/Bogota). Las fechas del motor van por día, y
  un contrato nunca procesa una fecha anterior a la última que procesó. Para acelerar la demo, los programados se
  disparan con la fecha deseada por la vía interna (scheduler) o con elevación de administrador.
- **Visibilidad.** Públicos: lo que dispara una persona o el backend del tenant (autorizar, rechazar, pagar deuda,
  autorizar pago de actividad, indicar ganador, cerrar actividad, pago de préstamo recibido, reintentar premio).
  `system`: las respuestas del riel, para que nadie fabrique por API un pago confirmado. `private`: el resto.

## Evidencia y límites

- `FndValidator validate-template` da OK en los 31 templates. La suite `FullyQualifiedName~Natillera2` está en verde
  (estados, reglas, cascadas y fórmulas), con evidencia en `tdd.last_run`. El DQS-F lo escribe `FndValidator score`
  en `dqs-f-report.json`.
- Las fórmulas del CEM se prueban con el parser real contra oráculos calculados a mano. La cascada de liquidación
  completa da 200.000 · 200.000 · 100.000 y cierra en 0.
- El ciclo entre contratos está probado en Lean (`fsv/FSV/Ecosystems/Natillera2/Topology.lean`): el grafo de eventos es
  acíclico y toda cascada termina en 4 saltos o menos.
- **Reglas del motor que este ecosistema descubrió** (detalle en `fnd-session.md`, C1–C8):
  - una cadena de template no puede volver a empezar, así que los reintentos son triggers aparte;
  - el fallo de una llamada solo trae el motivo;
  - las fechas solo se comparan con > y <;
  - un trigger corre todas sus funciones en orden, sobre el estado que deja la anterior;
  - `Subtract` no baja de 0 en dinero ni en enteros.
- **Riesgos aceptados** (auditoría 6.5):
  - la respuesta de un cobro que llegue después de iniciado un reembolso se rechaza. El riel responde en segundos y
    el reembolso ocurre a los 5 días o más;
  - un premio cuyo pago falla queda reservado hasta que el administrador lo reintenta;
  - las validaciones de rango del documento (cuota mínima y máxima, inicio a un mes, fin a un año, actividades solo
    con la natillera activa y antes de su cierre) las hace el bot.
- **Alcance.** El crédito sirve a impactos que el mapa marcó «ahora no» (IMP-010/011): se incluyó por decisión del
  equipo («Los 5»), y en la hackathon conviene mostrarlo como extra.
