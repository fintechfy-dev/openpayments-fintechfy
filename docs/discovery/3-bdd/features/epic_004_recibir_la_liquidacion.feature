# language: es
# Generado en la Fase 5 de BDD 2.0 (sesión natillera-2) desde los criterios YAML de la Fase 3.
@epic_id:EPIC-004 @domain:ahorro_comunitario @milestone:hackathon-open-payments-2026 @integration:telegram,open-payments,test-wallet @criticality:high
Característica: Recibir la liquidación
  En la fecha final la natillera cierra sola y paga a cada participante su parte, descontando lo que quedó debiendo.

  Como participante de la natillera que ahorra para tener su dinero en diciembre
  Quiero recibir automáticamente mi parte en mi billetera en la fecha final
  Para tener mi dinero en diciembre sin depender del organizador

  Antecedentes:
    Dado que existe la natillera "Natillera Los Primos" con cuota de 100, 2 cuotas y mora diaria de 1 %
    Y sus participantes son "Ana", "Beto" y el administrador

  # --- Historia US-009: Liquidación automática ---

  @story_id:US-009 @origin:discovery_inicial @priority:1 @complexity:high @smoke @integration_test
  Escenario: Liquidación sin deudas
    Dado que los 3 participantes pagaron las 2 cuotas y la billetera del grupo tiene 600
    Cuando llega la fecha final
    Entonces la liquidación arranca sola
    Y cada participante recibe 200 en su billetera personal
    Y la natillera pasa a "Cerrada" y los participantes a "Liquidados"
    Y el bot envía a cada uno su detalle: parte, descuentos, sobrante y valor pagado

  @story_id:US-009 @origin:discovery_inicial @priority:1 @complexity:high @data_driven
  Esquema del escenario: Liquidación con un participante que quedó debiendo
    Dado que "Beto" dejó de pagar una cuota y acumuló <mora> de mora
    Y la billetera del grupo tiene 500
    Cuando llega la fecha final
    Entonces la base de reparto es 600 y la parte de cada uno es 200
    Y "Beto" recibe <beto>, "Ana" recibe <ana> y el administrador recibe <admin>
    Y lo pagado en total es <total>, que no supera los 500 de la billetera

    Ejemplos:
      | mora | beto | ana | admin | total |
      | 9    | 94   | 203 | 203   | 500   |
      | 0    | 100  | 200 | 200   | 500   |
    # El sobrante (la mora) se reparte por igual entre todos: 9 / 3 = 3 para cada uno.
    # Falta una regla de redondeo para sobrantes que no se dividen exacto (hallazgo de la Fase 5).

  @story_id:US-009 @origin:discovery_inicial @priority:1 @complexity:high @boundary
  Escenario: Un deudor nunca recibe un valor negativo
    Dado que "Beto" no pagó ninguna cuota y acumuló 30 de mora
    Y la billetera del grupo tiene 400
    Cuando llega la fecha final
    Entonces "Beto" recibe 0
    Y "Ana" y el administrador reciben 200 cada uno

  @story_id:US-009 @origin:discovery_inicial @priority:1 @complexity:high @boundary
  Escenario: Nunca se paga más de lo que hay en la billetera del grupo
    Dado que un cobro de "Ana" falló por un problema del token, sin generarle deuda
    Y la billetera del grupo tiene 500
    Cuando llega la fecha final
    Entonces las partes se recalculan sobre los 500 del saldo real
    Y lo pagado en total no supera 500
    # Regla derivada en la Fase 3 (supuesto 3, aprobado): responde al vacío V-05 del documento.

  @story_id:US-009 @origin:discovery_inicial @priority:1 @complexity:medium @error_handling
  Escenario: Si un pago de liquidación falla, la natillera no se cierra
    Dado que la billetera personal de "Ana" no responde al pagarle su parte
    Cuando llega la fecha final
    Entonces el pago a "Ana" se reintenta
    Y si sigue fallando queda pendiente y se le avisa a "Ana"
    Y la natillera no pasa a "Cerrada" hasta pagarle

  @story_id:US-009 @origin:discovery_inicial @priority:1 @complexity:low @error_handling
  Escenario: El administrador no puede adelantar ni modificar la liquidación
    Dado que todavía no llega la fecha final
    Cuando el administrador pide liquidar la natillera
    Entonces el bot responde que la liquidación es automática en la fecha final
    Y no se paga nada
