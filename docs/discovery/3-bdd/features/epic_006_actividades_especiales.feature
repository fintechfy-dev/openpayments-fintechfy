# language: es
# Generado en la Fase 5 de BDD 2.0 (sesión natillera-2) desde los criterios YAML de las Fases 3 y 4.
@epic_id:EPIC-006 @domain:ahorro_comunitario @milestone:hackathon-open-payments-2026 @integration:telegram,open-payments,test-wallet
Característica: Actividades especiales
  Rifas, bazares y compartires que suben la utilidad del grupo, con premios que la natillera paga sin superar lo recaudado.
  Primera épica a recortar en el checkpoint del viernes a las 15:00 si el equipo va atrasado.

  Como administrador de la natillera
  Quiero crear actividades, cobrarlas y pagar sus premios de forma transparente
  Para sumar utilidad al grupo como en la natillera de siempre, sin tocar el dinero

  Antecedentes:
    Dado que la natillera "Natillera Los Primos" está "Activa" con "Ana", "Beto" y el administrador
    Y la billetera del grupo tiene saldo de las cuotas

  # =============================================
  # ESCENARIOS DE DISCOVERY INICIAL
  # =============================================

  # --- Historia US-010: Crear la actividad ---

  @story_id:US-010 @origin:discovery_inicial @priority:1 @complexity:medium @smoke
  Escenario: El administrador crea una rifa con premio
    Cuando el administrador crea la actividad "Rifa de diciembre" con valor de 20 por participante, premio de 50 y castigo de mora diario de 1 %
    Entonces el bot muestra un resumen y pide confirmar
    Cuando el administrador confirma
    Entonces el bot avisa a los 3 participantes el valor de 20 y la fecha de pago

  @story_id:US-010 @origin:discovery_inicial @priority:1 @complexity:medium @data_driven @error_handling
  Esquema del escenario: El premio debe estar entre 0 y menos de lo que se puede recaudar
    Cuando el administrador crea una actividad con valor de 20 por participante y premio de <premio>
    Entonces <resultado>

    Ejemplos:
      | premio | resultado                                              |
      | 0      | se crea como actividad sin premio                      |
      | 50     | se crea con premio de 50                               |
      | 60     | el bot la rechaza y muestra el rango de 0 a menos de 60 |
      | 70     | el bot la rechaza y muestra el rango de 0 a menos de 60 |

  @story_id:US-010 @origin:discovery_inicial @priority:2 @complexity:low @error_handling
  Escenario: Solo el administrador crea actividades
    Cuando "Ana" intenta crear una actividad
    Entonces el bot le dice que solo el administrador puede crear actividades

  @story_id:US-010 @origin:discovery_inicial @priority:2 @complexity:low @boundary
  Escenario: La actividad no puede terminar después de la natillera
    Cuando el administrador crea una actividad con fecha final posterior a la fecha final de la natillera
    Entonces el bot rechaza la fecha y muestra la fecha máxima permitida

  # --- Historia US-011: Pagar su parte ---

  @story_id:US-011 @origin:discovery_inicial @priority:1 @complexity:medium @smoke @integration_test
  Escenario: El participante autoriza y paga su parte de la actividad
    Dado que existe la actividad "Rifa de diciembre" con valor de 20 por participante
    Cuando llega la fecha de pago
    Entonces el bot avisa a "Ana" el nombre de la actividad, el valor de 20 y un botón para autorizar
    Cuando "Ana" autoriza el cobro en su billetera
    Entonces se cobran 20 a "Ana" hacia la billetera del grupo, asociados a "Ana" y a "Rifa de diciembre"
    Y el bot le confirma el pago

  @story_id:US-011 @origin:discovery_inicial @priority:1 @complexity:medium @error_handling
  Escenario: Sin fondos, el participante queda en alerta con deuda y mora
    Dado que existe la actividad "Rifa de diciembre" con valor de 20 y castigo de mora diario de 1 %
    Y "Beto" no tiene fondos
    Cuando llega la fecha de pago
    Entonces "Beto" queda en "alerta" en "Rifa de diciembre" con una deuda de 20
    Y cada día se suma el castigo de mora y el bot le envía un recordatorio
    # Supuesto 1 aprobado: la actividad sigue el mismo proceso de mora que la cuota.

  @story_id:US-011 @origin:discovery_inicial @priority:2 @complexity:low @boundary
  Escenario: Cada participante paga su parte una sola vez
    Dado que "Ana" ya pagó su parte de "Rifa de diciembre"
    Cuando se intenta cobrarle otra vez
    Entonces no se cobra nada

  # --- Historia US-012: Ganador y premio ---

  @story_id:US-012 @origin:discovery_inicial @priority:2 @complexity:medium @smoke @integration_test
  Escenario: El administrador indica al ganador y la natillera paga el premio
    Dado que "Rifa de diciembre" tiene premio de 50 y recaudó 60
    Cuando el administrador elige a "Ana" como ganadora
    Entonces el bot pide confirmar mostrando "Ana" y el monto de 50
    Cuando el administrador confirma
    Entonces la natillera paga 50 a la billetera personal de "Ana"
    Y el bot avisa a todos que "Ana" ganó y recibió 50

  @story_id:US-012 @origin:discovery_inicial @priority:2 @complexity:medium @error_handling
  Escenario: Si lo recaudado no alcanza, se paga lo recaudado
    Dado que "Rifa de diciembre" tiene premio de 50 y recaudó 40 porque "Beto" no pagó
    Cuando el administrador elige a "Ana" como ganadora y confirma
    Entonces la natillera paga 40 a "Ana"
    Y el bot le avisa a "Ana" que se pagó lo recaudado
    # Supuesto 5 aprobado: pagar el resto cuando lleguen los pagos pendientes queda fuera del corte.

  @story_id:US-012 @origin:discovery_inicial @priority:2 @complexity:low @error_handling @data_driven
  Esquema del escenario: El administrador no controla el monto ni el destino del premio
    Cuando el administrador intenta <accion>
    Entonces el bot lo impide

    Ejemplos:
      | accion                                             |
      | elegir como ganador a alguien que no es participante |
      | cambiar el monto del premio al pagarlo              |
      | enviar el premio a una billetera distinta a la del ganador |

  @story_id:US-012 @origin:discovery_inicial @priority:3 @complexity:low @boundary
  Escenario: Cancelar en la confirmación no paga nada
    Cuando el administrador elige a "Ana" como ganadora y cancela en la confirmación
    Entonces no se paga ningún premio

  # --- Historia US-013: Actividad sin premio o sin ganador ---

  @story_id:US-013 @origin:discovery_inicial @priority:3 @complexity:low @smoke @data_driven
  Esquema del escenario: Lo recaudado queda acumulado para la liquidación
    Dado que "<actividad>" recaudó 60 y <condicion>
    Cuando el administrador la cierra <cierre>
    Entonces los 60 quedan acumulados en la billetera del grupo y suman a la base de la liquidación
    Y el bot avisa a todos lo acumulado y el nuevo total de la natillera

    Ejemplos:
      | actividad          | condicion       | cierre        |
      | Bazar navideño     | no tiene premio | como terminada |
      | Rifa de diciembre  | tiene premio    | sin ganador    |

  @story_id:US-013 @origin:discovery_inicial @priority:3 @complexity:low @error_handling
  Escenario: Una actividad que ya pagó premio no se puede cerrar sin ganador
    Dado que "Rifa de diciembre" ya pagó su premio a "Ana"
    Cuando el administrador intenta cerrarla sin ganador
    Entonces el bot lo impide

  # =============================================
  # ESCENARIOS DE ANALISIS DE COMPLETITUD
  # =============================================

  # --- Historia US-012-AUD: Bitácora de acciones del administrador ---

  @story_id:US-012-AUD @origin:analisis_completitud @area:auditoria @priority:3 @complexity:low @smoke
  Escenario: Cualquier participante consulta la bitácora del administrador
    Dado que el administrador creó "Rifa de diciembre" y eligió a "Ana" como ganadora
    Cuando "Beto" consulta la bitácora en el bot
    Entonces ve primero las acciones más recientes con fecha, hora, acción y valores
    Y las acciones automáticas aparecen distinguidas de las del administrador

  @story_id:US-012-AUD @origin:analisis_completitud @area:auditoria @priority:3 @complexity:low @error_handling
  Escenario: Una acción que no se puede registrar no se ejecuta
    Dado que la bitácora no está disponible
    Cuando el administrador intenta crear una actividad
    Entonces la actividad no se crea
    Y el bot le explica que no se pudo registrar la acción
