# language: es
# Generado en la Fase 5 de BDD 2.0 (sesión natillera-2) desde los criterios YAML de las Fases 3 y 4.
@epic_id:EPIC-003 @domain:ahorro_comunitario @milestone:hackathon-open-payments-2026 @integration:telegram,open-payments,test-wallet @criticality:high
Característica: Ahorrar cada periodo
  La natillera arranca con el cupo mínimo, cobra sola cada periodo y cada participante ve su aporte y el total.

  Como participante de la natillera que ahorra para tener su dinero en diciembre
  Quiero que mi cuota se cobre sola y ver siempre lo mío y lo de todos
  Para ahorrar con disciplina y confiar en que mi dinero está ahí

  Antecedentes:
    Dado que existe la natillera "Natillera Los Primos" con cuota de 100, 2 cuotas, cupo mínimo 3 y mora diaria de 1 %
    Y el modo demo está activado con periodos de 2 minutos y días de mora de 1 minuto
    Y "Ana", "Beto" y el administrador están validados con su permiso de cobro

  # =============================================
  # ESCENARIOS DE DISCOVERY INICIAL
  # =============================================

  # --- Historia US-006: Arranque con el cupo mínimo ---

  @story_id:US-006 @origin:discovery_inicial @priority:1 @complexity:medium @smoke @integration_test
  Escenario: La natillera arranca sola y cobra la primera cuota a todos
    Cuando llega la fecha de inicio
    Entonces la natillera pasa a "Iniciada" y cobra la primera cuota a los 3 validados
    Y como los 3 pagan, la natillera pasa a "Activa" y los 3 quedan "Activo"
    Y el bot avisa a todos que arrancó con 3 participantes, que se recaudaron 300 y la fecha del siguiente cobro

  @story_id:US-006 @origin:discovery_inicial @priority:1 @complexity:medium @error_handling
  Escenario: Quien no tiene fondos en la primera cuota queda en mora
    Dado que "Beto" no tiene fondos en su billetera
    Y "Carla" también está validada
    Cuando llega la fecha de inicio
    Entonces la natillera pasa a "Activa" porque 3 participantes pagaron
    Y "Beto" queda en "Mora" con una deuda de 100

  @story_id:US-006 @origin:discovery_inicial @priority:2 @complexity:medium @boundary
  Escenario: Si menos del cupo paga la primera cuota, la natillera queda iniciada
    Dado que "Ana" y "Beto" no tienen fondos
    Cuando llega la fecha de inicio
    Entonces la natillera queda en "Iniciada"
    # La devolución por cupo incompleto queda fuera del corte (declarado en la Fase 3).

  # --- Historia US-007: Débito automático de la cuota ---

  @story_id:US-007 @origin:discovery_inicial @priority:1 @complexity:high @smoke @integration_test
  Escenario: La cuota se cobra sola y deja registro de las cuatro etapas
    Dado que la natillera está "Activa"
    Cuando llega la fecha de cobro del periodo 2
    Entonces se cobran 100 de la billetera de cada participante activo con su permiso
    Y cada pago se acredita en la billetera del grupo asociado a su participante
    Y cada cobro registra participante, periodo, monto, fecha y las etapas solicitud, autorización, ejecución y finalización

  @story_id:US-007 @origin:discovery_inicial @priority:1 @complexity:high @error_handling
  Escenario: Un cobro sin fondos deja al participante en mora con su deuda
    Dado que la natillera está "Activa" y "Beto" no tiene fondos
    Cuando llega la fecha de cobro del periodo 2
    Entonces "Beto" pasa a "Mora"
    Y se registra una deuda de 100 a nombre de "Beto" por el periodo 2

  @story_id:US-007 @origin:discovery_inicial @priority:1 @complexity:high @error_handling
  Escenario: Si el proveedor falla, se reintenta dentro del mismo periodo
    Dado que la configuración permite 3 reintentos por cobro
    Y el proveedor de la billetera de "Ana" falla en el primer intento
    Cuando llega la fecha de cobro del periodo 2
    Entonces el cobro de "Ana" se reintenta dentro del mismo periodo hasta 3 veces
    Y si el último intento falla, se trata como cobro fallido

  @story_id:US-007 @origin:discovery_inicial @priority:1 @complexity:medium @boundary @data_driven
  Esquema del escenario: Reglas que impiden cobros de más
    Dado que la natillera está "Activa"
    Cuando <situacion>
    Entonces <resultado>

    Ejemplos:
      | situacion                                               | resultado                                         |
      | se intenta cobrar a "Ana" por segunda vez el periodo 2  | no se cobra nada                                  |
      | pasa la fecha final y se intenta un cobro               | no se cobra nada                                  |
      | "Ana" revocó su permiso y llega su fecha de cobro       | el cobro falla y se trata como falta de fondos    |

  # --- Historia US-008: Ver su aporte y el total ---

  @story_id:US-008 @origin:discovery_inicial @priority:2 @complexity:low @smoke
  Escenario: El participante recibe su aporte y el total después de cada cobro
    Dado que "Ana" pagó las cuotas de los periodos 1 y 2
    Cuando termina el cobro del periodo 2
    Entonces en menos de 30 segundos el bot le envía a "Ana" su aporte de 200, 2 de 2 cuotas pagadas y el total de la natillera
    Y el total coincide con el saldo registrado de la billetera del grupo

  @story_id:US-008 @origin:discovery_inicial @priority:2 @complexity:low
  Escenario: El participante consulta su estado cuando quiere
    Dado que "Beto" tiene una deuda de 100 con 2 de mora
    Cuando "Beto" consulta su estado en el bot
    Entonces ve su aporte, su deuda de 100, la mora de 2 y el total de la natillera
    Y no ve el detalle individual de los demás participantes

  @story_id:US-008 @origin:discovery_inicial @priority:3 @complexity:low @error_handling
  Escenario: Si no se puede consultar el saldo, se muestra la última cifra confirmada
    Dado que la billetera del grupo no responde
    Cuando "Ana" consulta su estado
    Entonces el bot le dice que no pudo consultar el saldo
    Y le muestra la última cifra confirmada con su hora

  @story_id:US-008 @origin:discovery_inicial @priority:3 @complexity:low @boundary
  Escenario: Antes del primer cobro el aporte es cero
    Dado que la natillera todavía no hizo ningún cobro
    Cuando "Ana" consulta su estado
    Entonces ve un aporte de 0 y la fecha del primer cobro

  # --- Historia US-017: Mora diaria y recordatorio ---

  @story_id:US-017 @origin:discovery_inicial @priority:2 @complexity:medium @smoke
  Escenario: Cada día de mora se suma la mora y llega un recordatorio
    Dado que "Beto" tiene una deuda de 100 por el periodo 2
    Cuando pasan 2 días de mora
    Entonces la mora de "Beto" es de 2
    Y cada día el bot le envía un recordatorio con la deuda de 100, la mora y el total destacado
    Y el recordatorio le avisa que se descontará en la liquidación

  @story_id:US-017 @origin:discovery_inicial @priority:2 @complexity:medium @data_driven
  Esquema del escenario: La mora es simple, sin mora sobre la mora
    Dado que "Beto" debe <deuda> con una mora diaria de <tasa> %
    Cuando pasan <dias> días de mora
    Entonces la mora acumulada de "Beto" es <mora>

    Ejemplos:
      | deuda | tasa | dias | mora |
      | 100   | 1    | 1    | 1    |
      | 100   | 1    | 10   | 10   |
      | 200   | 2    | 3    | 12   |
      | 100   | 0    | 5    | 0    |

  @story_id:US-017 @origin:discovery_inicial @priority:3 @complexity:low @error_handling
  Escenario: Un recordatorio que no se entrega no afecta el cálculo
    Dado que "Beto" está en mora
    Y el recordatorio de hoy no se pudo entregar
    Cuando pasa el siguiente día de mora
    Entonces la mora acumulada incluye ambos días
    Y el bot vuelve a enviar el recordatorio

  @story_id:US-017 @origin:discovery_inicial @priority:3 @complexity:low @boundary
  Escenario: La mora y los recordatorios se detienen al liquidar
    Dado que "Beto" está en mora
    Cuando la natillera se liquida
    Entonces no se suma más mora a "Beto"
    Y no recibe más recordatorios

  # =============================================
  # ESCENARIOS DE ANALISIS DE COMPLETITUD
  # =============================================

  # --- Historia US-007-INT: Token vigente para cada cobro ---

  @story_id:US-007-INT @origin:analisis_completitud @area:integraciones @priority:1 @complexity:high @smoke @integration_test
  Escenario: Un token vencido se renueva antes de cobrar
    Dado que el token del permiso de "Ana" está vencido
    Cuando llega la fecha de cobro del periodo 2
    Entonces el token se renueva con el mecanismo del permiso
    Y la cuota de "Ana" se cobra con el token renovado

  @story_id:US-007-INT @origin:analisis_completitud @area:integraciones @priority:1 @complexity:high @error_handling
  Escenario: Si la renovación falla, el participante no queda en mora
    Dado que el token del permiso de "Ana" está vencido y su renovación falla en todos los reintentos
    Cuando llega la fecha de cobro del periodo 2
    Entonces no se registra deuda ni mora a nombre de "Ana"
    Y el equipo recibe una alerta
    Y el bot le pide a "Ana" volver a autorizar

  # --- Historia US-007-RPT: Registro de pagos para el jurado ---

  @story_id:US-007-RPT @origin:analisis_completitud @area:reportes @priority:1 @complexity:medium @smoke
  Escenario: La vista del registro muestra las cuatro etapas de cada pago
    Dado que se ejecutaron los cobros de los periodos 1 y 2
    Cuando el equipo abre la vista del registro de pagos
    Entonces ve primero los pagos más recientes
    Y por cada pago ve participante, monto, hora y el estado de solicitud, autorización, ejecución y finalización
    Y cada estado corresponde a una respuesta real de Open Payments

  @story_id:US-007-RPT @origin:analisis_completitud @area:reportes @priority:1 @complexity:low @error_handling
  Escenario: Un pago fallido muestra en qué etapa falló
    Dado que el cobro de "Beto" del periodo 2 falló por falta de fondos
    Cuando el equipo abre la vista del registro de pagos
    Entonces el pago de "Beto" aparece con la etapa en que falló y el motivo

  # --- Historia US-007-MON: Vigilar el programador de cobros ---

  @story_id:US-007-MON @origin:analisis_completitud @area:monitoreo @priority:2 @complexity:low @smoke
  Escenario: El equipo recibe una alerta si un cobro no se ejecuta a tiempo
    Dado que el cobro del periodo 2 debía ejecutarse en el minuto 2
    Cuando pasa su ventana sin ejecutarse
    Entonces el chat de Telegram del equipo recibe una alerta con la natillera, el cobro y la hora esperada

  @story_id:US-007-MON @origin:analisis_completitud @area:monitoreo @priority:3 @complexity:low @boundary
  Escenario: No hay alertas por cobros después de la fecha final
    Dado que la natillera llegó a su fecha final
    Entonces no se generan alertas por cobros de periodos posteriores

  # --- Historia US-007-BCK: Estado persistente sin doble cobro ---

  @story_id:US-007-BCK @origin:analisis_completitud @area:backup @priority:2 @complexity:medium @smoke
  Escenario: Tras un reinicio la natillera sigue donde iba
    Dado que la natillera está "Activa" con el periodo 1 cobrado
    Cuando la aplicación se reinicia
    Entonces recupera la natillera, sus participantes, permisos, cobros y deudas
    Y el cobro del periodo 2 se ejecuta una sola vez

  @story_id:US-007-BCK @origin:analisis_completitud @area:backup @priority:2 @complexity:medium @error_handling
  Escenario: Un segundo intento con el mismo identificador de cobro no cobra
    Dado que el cobro de "Ana" del periodo 2 ya se ejecutó
    Cuando se reintenta el cobro con el mismo identificador de participante y periodo
    Entonces no se cobra nada

  @story_id:US-007-BCK @origin:analisis_completitud @area:backup @priority:2 @complexity:medium @boundary
  Escenario: Si el estado no se puede leer, no se cobra nada
    Dado que el estado guardado no se puede leer al arrancar
    Cuando se inicia la aplicación
    Entonces no se ejecuta ningún cobro
    Y el equipo recibe una alerta
