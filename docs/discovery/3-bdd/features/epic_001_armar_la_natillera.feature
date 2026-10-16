# language: es
# Generado en la Fase 5 de BDD 2.0 (sesión natillera-2) desde los criterios YAML de las Fases 3 y 4.
@epic_id:EPIC-001 @domain:ahorro_comunitario @milestone:hackathon-open-payments-2026 @integration:telegram,open-payments
Característica: Armar la natillera
  El administrador crea la natillera con sus reglas y una billetera del grupo que nadie del grupo puede mover.

  Como administrador de la natillera
  Quiero crear la natillera con sus reglas y su billetera del grupo
  Para que el grupo ahorre con reglas claras y sin el riesgo del organizador que guarda el dinero

  Antecedentes:
    Dado que el bot de Telegram de la natillera está operativo
    Y la configuración del sistema define cuota mínima, cuota máxima y porcentaje de mora diario máximo

  # =============================================
  # ESCENARIOS DE DISCOVERY INICIAL
  # =============================================

  # --- Historia US-001: Crear la natillera con sus reglas ---

  @story_id:US-001 @origin:discovery_inicial @priority:1 @complexity:medium @smoke
  Escenario: El administrador crea una natillera mensual de noviembre a diciembre
    Dado que soy un usuario del bot sin natilleras creadas
    Cuando creo la natillera "Natillera Los Primos" con cuota de 100, inicio "2026-11-01", final "2026-12-01", periodicidad mensual, cupo mínimo 3 y mora diaria de 1 %
    Entonces el bot me muestra un resumen con todos los valores y 2 cuotas
    Y el bot me ofrece confirmar o corregir un campo
    Cuando confirmo la creación
    Entonces la natillera "Natillera Los Primos" queda en estado "Creada"
    Y quedo registrado como su administrador

  @story_id:US-001 @origin:discovery_inicial @priority:1 @complexity:medium @data_driven
  Esquema del escenario: El número de cuotas sale del rango de fechas y de la periodicidad
    Dado que estoy creando una natillera con periodicidad mensual
    Cuando fijo la fecha de inicio "<inicio>" y la fecha final "<final>"
    Entonces el resumen muestra <cuotas> cuotas

    Ejemplos:
      | inicio     | final      | cuotas |
      | 2026-11-01 | 2026-12-01 | 2      |
      | 2026-11-01 | 2027-01-01 | 3      |
      | 2026-11-10 | 2026-12-01 | 1      |

  @story_id:US-001 @origin:discovery_inicial @priority:1 @complexity:medium @error_handling @data_driven
  Esquema del escenario: El bot rechaza reglas inválidas sin perder lo ya respondido
    Dado que estoy creando una natillera y ya respondí el nombre y la cuota
    Cuando respondo "<campo>" con un valor que <incumple>
    Entonces el bot rechaza el valor explicando que <regla>
    Y conservo los datos que ya respondí

    Ejemplos:
      | campo          | incumple                                   | regla                                                  |
      | nombre         | ya existe en el sistema                    | el nombre debe ser único                               |
      | cuota          | está por debajo del mínimo configurado     | la cuota debe estar entre el mínimo y el máximo        |
      | fecha de inicio| cae a más de 1 mes de hoy                  | la fecha de inicio debe caer a no más de 1 mes de hoy  |
      | fecha final    | cae a más de 1 año de la fecha de inicio   | la fecha final debe caer a no más de 1 año del inicio  |
      | cupo mínimo    | es 2                                       | el cupo mínimo es de 3 personas contando al administrador |
      | mora diaria    | supera el máximo configurado               | la mora diaria no puede superar el máximo configurado  |

  @story_id:US-001 @origin:discovery_inicial @priority:2 @complexity:low @boundary
  Escenario: Abandonar la creación a mitad no deja ninguna natillera
    Dado que estoy creando una natillera y respondí 3 de las 7 preguntas
    Cuando dejo de responder y salgo del flujo
    Entonces no existe ninguna natillera creada a mi nombre

  # --- Historia US-002: Billetera del grupo sin acceso del administrador ---

  @story_id:US-002 @origin:discovery_inicial @priority:1 @complexity:medium @smoke @integration_test
  Escenario: Crear la natillera abre su billetera del grupo a nombre de la financiera
    Cuando confirmo la creación de la natillera "Natillera Los Primos"
    Entonces se crea una billetera del grupo en la Test Wallet a nombre de la financiera simulada
    Y el bot me muestra solo el identificador de esa billetera
    Y el bot me explica que el dinero lo custodia la financiera y que yo no puedo moverlo

  @story_id:US-002 @origin:discovery_inicial @priority:1 @complexity:medium @error_handling
  Escenario: Nadie del grupo puede sacar dinero de la billetera del grupo
    Dado que la natillera "Natillera Los Primos" tiene saldo en su billetera del grupo
    Cuando el administrador le pide al bot sacar dinero de la billetera del grupo
    Entonces el bot responde que no es posible
    Y explica que el dinero solo sale en los premios de actividades y en la liquidación
    Y no se inicia ningún pago desde la billetera del grupo

  @story_id:US-002 @origin:discovery_inicial @priority:1 @complexity:medium
  Escenario: Cada pago que entra queda asociado a quien lo hizo
    Dado que la natillera "Natillera Los Primos" está "Activa"
    Cuando entra a la billetera del grupo la cuota del periodo 1 de "Ana"
    Entonces el pago queda asociado a "Ana" con el concepto "cuota del periodo 1"

  @story_id:US-002 @origin:discovery_inicial @priority:2 @complexity:low @error_handling
  Escenario: Si no se puede crear la billetera, no se crea la natillera
    Dado que la Test Wallet no responde
    Cuando confirmo la creación de una natillera
    Entonces la natillera no queda creada
    Y el bot me pide reintentar

  @story_id:US-002 @origin:discovery_inicial @priority:3 @complexity:low @boundary
  Escenario: Dos natilleras nunca comparten billetera del grupo
    Dado que existen las natilleras "Natillera Los Primos" y "Natillera Oficina"
    Entonces cada una tiene una billetera del grupo distinta

  # --- Historia US-003: Enlace de invitación ---

  @story_id:US-003 @origin:discovery_inicial @priority:2 @complexity:low @smoke
  Escenario: El administrador obtiene el enlace para compartir en su grupo
    Dado que la natillera "Natillera Los Primos" está "Creada"
    Cuando pido el enlace de invitación
    Entonces el bot me entrega un enlace único que abre el bot en "Natillera Los Primos"
    Y me sugiere un texto de invitación listo para pegar en el chat del grupo

  @story_id:US-003 @origin:discovery_inicial @priority:2 @complexity:low
  Escenario: El administrador ve el avance de las invitaciones
    Dado que compartí el enlace y tres personas lo abrieron
    Cuando consulto las invitaciones
    Entonces veo quién abrió el enlace, quién aceptó y quién quedó validado

  @story_id:US-003 @origin:discovery_inicial @priority:2 @complexity:low @error_handling
  Escenario: El enlace de una natillera ya iniciada no admite participantes
    Dado que la natillera "Natillera Los Primos" está "Activa"
    Cuando una persona abre su enlace de invitación
    Entonces el bot le dice que la natillera ya no recibe participantes

  @story_id:US-003 @origin:discovery_inicial @priority:3 @complexity:low @boundary
  Escenario: Abrir el enlace dos veces no duplica la inscripción
    Dado que "Ana" ya está inscrita en "Natillera Los Primos"
    Cuando "Ana" abre de nuevo el enlace de invitación
    Entonces "Ana" sigue inscrita una sola vez

  # =============================================
  # ESCENARIOS DE ANALISIS DE COMPLETITUD
  # =============================================

  # --- Historia US-001-CFG: Parámetros y modo demo ---

  @story_id:US-001-CFG @origin:analisis_completitud @area:configuracion @priority:1 @complexity:low @smoke
  Escenario: El modo demo cuenta las fechas en minutos
    Dado que el modo demo está activado con periodos de 2 minutos
    Cuando creo una natillera de 3 cuotas que arranca en el minuto 0
    Entonces los cobros quedan programados en los minutos 0, 2 y 4

  @story_id:US-001-CFG @origin:analisis_completitud @area:configuracion @priority:1 @complexity:low @error_handling
  Escenario: La aplicación no arranca si falta un parámetro obligatorio
    Dado que la configuración no define la cuota máxima
    Cuando se inicia la aplicación
    Entonces la aplicación no arranca
    Y el mensaje de error nombra el parámetro "cuota máxima"

  @story_id:US-001-CFG @origin:analisis_completitud @area:configuracion @priority:2 @complexity:low @boundary
  Escenario: Cambiar la configuración no altera natilleras ya creadas
    Dado que la natillera "Natillera Los Primos" se creó con periodos de 2 minutos
    Cuando el equipo cambia la configuración a periodos de 5 minutos
    Entonces "Natillera Los Primos" sigue cobrando cada 2 minutos

  # --- Historia US-002-SEC: Secretos fuera del repositorio ---

  @story_id:US-002-SEC @origin:analisis_completitud @area:seguridad @priority:1 @complexity:low @smoke
  Escenario: Los secretos se cargan fuera del repositorio público
    Dado que las llaves de Open Payments y el token del bot están en variables de entorno
    Cuando se inicia la aplicación
    Entonces la aplicación arranca usando esos secretos
    Y el repositorio solo contiene un archivo de ejemplo con los nombres de las variables, sin valores

  @story_id:US-002-SEC @origin:analisis_completitud @area:seguridad @priority:1 @complexity:low @error_handling
  Escenario: Falta un secreto al arrancar
    Dado que no está definida la variable del token del bot
    Cuando se inicia la aplicación
    Entonces la aplicación se detiene con un mensaje que nombra la variable faltante
    Y el mensaje no muestra ningún valor secreto

  @story_id:US-002-SEC @origin:analisis_completitud @area:seguridad @priority:1 @complexity:low @boundary
  Escenario: El historial del repositorio no contiene secretos
    Cuando se revisan todos los commits del repositorio público antes de la entrega
    Entonces ningún commit contiene llaves, tokens ni credenciales
