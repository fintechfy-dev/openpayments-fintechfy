# language: es
# Generado en la Fase 5 de BDD 2.0 (sesión natillera-2) desde los criterios YAML de las Fases 3 y 4.
@epic_id:EPIC-002 @domain:ahorro_comunitario @milestone:hackathon-open-payments-2026 @integration:telegram,open-payments,test-wallet
Característica: Unirse a la natillera
  El participante llega por el enlace, conoce las reglas y autoriza una sola vez el cobro automático de su cuota.

  Como participante de la natillera que ahorra para tener su dinero en diciembre
  Quiero unirme desde el enlace y autorizar una sola vez el cobro de mi cuota
  Para ahorrar cada periodo sin pagar a mano ni entregar efectivo

  Antecedentes:
    Dado que existe la natillera "Natillera Los Primos" en estado "Creada" con cuota de 100, 2 cuotas mensuales, cupo mínimo 3 y mora diaria de 1 %
    Y su administrador compartió el enlace de invitación

  # =============================================
  # ESCENARIOS DE DISCOVERY INICIAL
  # =============================================

  # --- Historia US-004: Unirse desde el enlace ---

  @story_id:US-004 @origin:discovery_inicial @priority:1 @complexity:low @smoke
  Escenario: El participante revisa las reglas y acepta
    Cuando "Ana" abre el enlace de invitación
    Entonces el bot le muestra en un solo mensaje el nombre, la cuota, la periodicidad, las fechas, 2 cuotas, el cupo mínimo y la mora diaria
    Y le muestra que aportará 200 en total
    Y le dice que el dinero lo custodia la financiera, no el administrador
    Cuando "Ana" acepta
    Entonces "Ana" queda inscrita y pasa al registro de su billetera
    Y el administrador ve que "Ana" aceptó

  @story_id:US-004 @origin:discovery_inicial @priority:1 @complexity:low
  Escenario: El administrador se une a su propia natillera por el mismo camino
    Cuando el administrador abre el enlace de su natillera y acepta
    Entonces el administrador queda inscrito también como participante

  @story_id:US-004 @origin:discovery_inicial @priority:2 @complexity:low @error_handling
  Escenario: Quien rechaza puede volver mientras la natillera siga creada
    Cuando "Beto" abre el enlace y rechaza
    Entonces "Beto" no queda inscrito
    Cuando "Beto" vuelve a abrir el enlace mientras la natillera sigue "Creada"
    Entonces el bot le muestra de nuevo las reglas para aceptar o rechazar

  @story_id:US-004 @origin:discovery_inicial @priority:3 @complexity:low @boundary
  Escenario: Todavía se puede unir aunque ya se alcanzó el cupo
    Dado que ya hay 3 participantes validados y la natillera no ha iniciado
    Cuando "Carla" abre el enlace y acepta
    Entonces "Carla" queda inscrita

  # --- Historia US-005: Autorizar una sola vez el cobro automático ---

  @story_id:US-005 @origin:discovery_inicial @priority:1 @complexity:high @smoke @integration_test
  Escenario: El participante autoriza una sola vez el cobro recurrente
    Dado que "Ana" aceptó la natillera
    Cuando "Ana" entrega la dirección de su billetera de Open Payments
    Entonces el sistema verifica la dirección
    Y solicita un permiso de pago recurrente de 100 por periodo mensual con un tope total de 200
    Y el bot le explica qué autoriza: 100 por cuota, cada mes, hasta el "2026-12-01"
    Cuando "Ana" aprueba el permiso en su billetera
    Entonces "Ana" queda en estado "Validado"
    Y el bot se lo confirma

  @story_id:US-005 @origin:discovery_inicial @priority:1 @complexity:high @error_handling @data_driven
  Esquema del escenario: El participante no queda validado si algo falla
    Dado que "Ana" aceptó la natillera
    Cuando <situacion>
    Entonces "Ana" no queda validada
    Y el bot <respuesta>

    Ejemplos:
      | situacion                                                   | respuesta                                             |
      | "Ana" entrega una dirección que no es de Open Payments      | le pide otra y le explica el formato esperado         |
      | "Ana" rechaza el permiso en su billetera                    | le ofrece reintentar                                  |
      | el proveedor de la billetera de "Ana" no responde           | le avisa y le permite reintentar                      |
      | la billetera de "Ana" maneja una moneda distinta a la de la natillera | le dice que en esta versión no se puede validar |

  @story_id:US-005 @origin:discovery_inicial @priority:1 @complexity:high @boundary
  Escenario: El permiso nunca autoriza más de una cuota por periodo
    Dado que "Ana" quedó validada con su permiso
    Entonces el permiso no permite cobrar más de 100 en un mismo periodo
    Y no permite cobrar más de 200 en total

  # =============================================
  # ESCENARIOS DE ANALISIS DE COMPLETITUD
  # =============================================

  # --- Historia US-005-INT: Retorno de la autorización ---

  @story_id:US-005-INT @origin:analisis_completitud @area:integraciones @priority:1 @complexity:medium @smoke @integration_test
  Escenario: Al aprobar en la billetera, el participante vuelve al bot ya validado
    Dado que "Ana" tiene una solicitud de permiso pendiente
    Cuando "Ana" aprueba el permiso en su billetera
    Entonces la aplicación recibe el retorno de la autorización y completa el permiso
    Y "Ana" queda "Validado"
    Y el bot avisa a "Ana" y al administrador

  @story_id:US-005-INT @origin:analisis_completitud @area:integraciones @priority:1 @complexity:medium @error_handling
  Escenario: Un retorno que no corresponde a una solicitud pendiente se ignora
    Dado que "Beto" no tiene ninguna solicitud de permiso pendiente
    Cuando llega un retorno de autorización a nombre de "Beto"
    Entonces "Beto" no queda validado
    Y no se crea ningún permiso

  @story_id:US-005-INT @origin:analisis_completitud @area:integraciones @priority:2 @complexity:medium @boundary
  Escenario: Aprobar dos veces cuenta como un solo permiso
    Dado que "Ana" ya quedó validada
    Cuando llega un segundo retorno de aprobación de "Ana"
    Entonces "Ana" sigue teniendo un solo permiso
