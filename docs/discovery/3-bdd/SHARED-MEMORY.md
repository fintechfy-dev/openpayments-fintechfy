# 🧠 SHARED MEMORY — BDD 2.0 Natillera 2.0

> Sembrada desde USMD-20261014-natillera-2 (REB-001). Fase 0 saltada con razón. Fases 1 y 2 aprobadas. Fases 1 a 3 aprobadas. Discovery completo (Fases 1 a 5 aprobadas). Hallazgo abierto: regla de redondeo del sobrante de la liquidación.

```yaml
metadata:
  version: '2.0'
  last_updated: '2026-10-14T20:42:28-05:00'
  purpose: Shared memory for skill coordination
  template_source: bdd-2.0/templates/SHARED-MEMORY-INIT.md
  created_at: '2026-10-14T20:00:05-05:00'
project_state:
  current_phase: completado
  current_skill: null
  session_id: 1da0f652-1746-47ad-8aaf-4c494196df88
  started_at: '2026-10-14T20:00:05-05:00'
  last_activity: '2026-10-14T20:42:28-05:00'
  overall_completion: 100
  tesis_id: null
  tier: medium
project_info:
  project_id: natillera-2
  project_name: Natillera 2.0
  description: Natillera sin riesgo de custodia sobre Open Payments; especificación de la rebanada «Primera natillera
    de punta a punta» para la hackathon de Open Payments Medellín (16-17 oct 2026).
  created_at: '2026-10-14T20:00:05-05:00'
  business_objectives:
  - Que el jurado de la hackathon de Open Payments Medellín lleve la propuesta a la ronda final y la premie por
    su aporte a la inclusión financiera (meta de hito IMD).
  - Que un grupo ahorre junto para diciembre sin que nadie pueda tocar el dinero del grupo, viendo siempre lo suyo
    y lo de todos.
  target_users:
  - Participante de la natillera que ahorra para tener su dinero en diciembre
  - Administrador de la natillera (tesorero)
  industry: Ahorro comunitario e inclusión financiera (Colombia)
tesis_phase:
  status: skipped
  skipped_reason: 'Decisión del equipo («Saltarla (Recomendado)»): la meta y su medición ya están acordadas en IMD
    y el plazo es de dos días.'
  tesis_activas: []
  tesis_files: {}
  compilado_en: null
  bdd_compile_version: null
  veredicto: null
  its: null
  its_practico: null
  its_rating: null
  componentes: {}
  colapsos: []
  topes: []
  modo_sesion: null
  conteos: {}
  cobertura: {}
  linea_base: {}
  suites: {}
  hallazgos: {}
tesis_validation:
  all_questions_answered: false
  artifacts_created: false
  memory_updated: false
  user_approved: false
  ready_for_handoff: false
epicas_phase:
  status: completed
  started_at: '2026-10-14T20:00:05-05:00'
  completed_at: '2026-10-14T20:00:05-05:00'
  progress_percent: 100
  answers:
    q1_vision: 'Semilla USMD/IMD: meta de hito del jurado; esencia: ahorrar en grupo sin custodio humano'
    q2_usuarios: 'Semilla USMD: participante y administrador (ahora); operador de la financiera (después)'
    q3_procesos: 'Semilla USMD: armar, unirse, ahorrar cada periodo, recibir la liquidación (+ actividades por decisión
      del equipo)'
    q4_integraciones: 'Independiente, motor después: Open Payments (SDK Node) + Test Wallet + bot de Telegram'
    q5_priorizacion: 'Propuesta VUIFED aprobada con ajuste: «falta la epica para crear actividades, rifas, bazares
      y demas» → EPIC-006 «Dentro del corte»'
    q6_metricas: Etapa alcanzada ante el jurado (0→mínimo 1→objetivo 3, premio a la Inclusión), de IMD
epics_identified:
- epic_id: EPIC-001
  titulo: Armar la natillera
  file_path: epics/EPIC-001-armar-la-natillera/epic.md
  vuifed:
    valor: 8
    usuarios: 8
    impacto: 8
    factibilidad: 8
    esfuerzo: 7
    dependencias: 9
  mvp_score: 8.0
  prioridad: 1
  mvp: true
  dependencias: []
  usmd_ref: ACT-001
  state: mvp_decided
- epic_id: EPIC-002
  titulo: Unirse a la natillera
  file_path: epics/EPIC-002-unirse-a-la-natillera/epic.md
  vuifed:
    valor: 9
    usuarios: 9
    impacto: 9
    factibilidad: 6
    esfuerzo: 5
    dependencias: 6
  mvp_score: 7.75
  prioridad: 1
  mvp: true
  dependencias:
  - EPIC-001
  usmd_ref: ACT-002
  state: mvp_decided
- epic_id: EPIC-003
  titulo: Ahorrar cada periodo
  file_path: epics/EPIC-003-ahorrar-cada-periodo/epic.md
  vuifed:
    valor: 10
    usuarios: 9
    impacto: 10
    factibilidad: 6
    esfuerzo: 5
    dependencias: 5
  mvp_score: 8.1
  prioridad: 1
  mvp: true
  dependencias:
  - EPIC-001
  - EPIC-002
  usmd_ref: ACT-003
  state: mvp_decided
- epic_id: EPIC-004
  titulo: Recibir la liquidación
  file_path: epics/EPIC-004-recibir-la-liquidacion/epic.md
  vuifed:
    valor: 8
    usuarios: 8
    impacto: 8
    factibilidad: 7
    esfuerzo: 6
    dependencias: 5
  mvp_score: 7.45
  prioridad: 2
  mvp: true
  dependencias:
  - EPIC-003
  usmd_ref: ACT-006
  state: mvp_decided
- epic_id: EPIC-005
  titulo: Crédito desde el ahorro
  file_path: epics/EPIC-005-credito-desde-el-ahorro/epic.md
  vuifed:
    valor: 6
    usuarios: 5
    impacto: 6
    factibilidad: 4
    esfuerzo: 3
    dependencias: 4
  mvp_score: 4.95
  prioridad: 4
  mvp: false
  dependencias:
  - EPIC-003
  - EPIC-004
  usmd_ref: ACT-005
  state: mvp_decided
- epic_id: EPIC-006
  titulo: Actividades especiales
  file_path: epics/EPIC-006-actividades-especiales/epic.md
  vuifed:
    valor: 7
    usuarios: 7
    impacto: 7
    factibilidad: 7
    esfuerzo: 5
    dependencias: 5
  mvp_score: 6.8
  prioridad: 2
  mvp: true
  dependencias:
  - EPIC-003
  usmd_ref: ACT-004
  state: mvp_decided
- epic_id: EPIC-007
  titulo: Infraestructura de la hackathon
  file_path: epics/EPIC-007-infraestructura-de-la-hackathon/epic.md
  mvp: true
  origen: completitud
  state: mvp_decided
mvp_calculation:
  team_capacity:
    developers: 3
    sprints_available: 1
    velocity_points_per_sprint: null
  epics_in_mvp:
  - EPIC-001
  - EPIC-002
  - EPIC-003
  - EPIC-004
  - EPIC-006
  - EPIC-007
  epics_out_mvp:
  - EPIC-005
  mvp_rationale: 'Corte de la hackathon: EPIC-001..004 de la semilla USMD + EPIC-006 por decisión del equipo; EPIC-005
    extra si sobra tiempo. Fórmula con Feasibility=(E+D)/2 [interpretación declarada].'
epicas_validation:
  all_questions_answered: true
  artifacts_created: true
  memory_updated: true
  user_approved: true
  ready_for_handoff: true
historias_phase:
  status: completed
  started_at: '2026-10-14T20:23:44-05:00'
  completed_at: '2026-10-14T20:23:44-05:00'
  progress_percent: 100
  current_epic: null
  answers:
    canal_admin: Todo en el bot de Telegram
    arranque: tambien puede definir ademas de cupo y minutos, es cuantas cuotas, por ejemplo si la natillera empieza
      en noviembre y esa es la fecha de inicio  solo se necesitan las cuotas de noviembre y diciembre si pone como
      diciembre como fecha fin, pero es el rango de fecha inicio y fecha fin y con su periodicidad de ahorro
    liquidacion: Automática en la fecha final
    reparto: todo se divide en partes iguales, pero a los morosos se les cobra lo que quedo debiendo
    morosos: Deuda + mora + recordatorio
    cambios_equipo:
    - 'US-013 ampliada: actividades sin premio (bazar, compartir) o sin ganador van al acumulado'
    - 'US-016 nueva: desembolso del crédito a la billetera del solicitante'
    - 'US-017 nueva: mora diaria y recordatorio por Telegram'
stories_identified:
- story_id: US-001
  epic_id: EPIC-001
  titulo: Como Administrador de la natillera (tesorero), quiero crear la natillera en el bot de Telegram con su
    nombre, cuota, fecha de inicio, fecha final, periodicidad, cupo mínimo y porcentaje de mora diario, para que
    el grupo ahorre con reglas claras desde el primer día
  file_path: epics/EPIC-001-armar-la-natillera/stories/US-001-crear-natillera-con-reglas.md
  prioridad_en_epic: 1
  complejidad: Media
  dependencias: []
  en_corte: true
  invest: validado
  estado: criteria_complete
  origen: USMD T05, T06, T07 (+ T04 nombre) · respuestas del equipo sobre arranque, número de cuotas y mora
- story_id: US-002
  epic_id: EPIC-001
  titulo: Como Administrador de la natillera (tesorero), quiero que al crear la natillera se abra una billetera
    del grupo a nombre de la financiera, sin que yo tenga acceso directo al dinero, para que nadie del grupo, ni
    siquiera yo, pueda tocar el dinero por fuera de las reglas
  file_path: epics/EPIC-001-armar-la-natillera/stories/US-002-billetera-del-grupo-sin-acceso.md
  prioridad_en_epic: 1
  complejidad: Media
  dependencias:
  - US-001
  en_corte: true
  invest: validado
  estado: criteria_complete
  origen: USMD T03 · PDF E-07 · IMD AD3 (no toca el dinero)
- story_id: US-003
  epic_id: EPIC-001
  titulo: Como Administrador de la natillera (tesorero), quiero obtener un enlace de invitación de la natillera
    para compartirlo en el chat de mi grupo, para que cada persona se una por su cuenta sin que yo tenga que inscribirla
    a mano
  file_path: epics/EPIC-001-armar-la-natillera/stories/US-003-enlace-de-invitacion.md
  prioridad_en_epic: 2
  complejidad: Baja
  dependencias:
  - US-001
  en_corte: true
  invest: validado
  estado: criteria_complete
  origen: USMD R02 (lado del administrador, paso 3)
- story_id: US-004
  epic_id: EPIC-002
  titulo: Como Participante de la natillera que ahorra para tener su dinero en diciembre, quiero entrar a la natillera
    desde el enlace y ver su cuota, su periodicidad, sus fechas y cuántas cuotas son antes de aceptar, para decidir
    si me uno sabiendo exactamente a qué me comprometo
  file_path: epics/EPIC-002-unirse-a-la-natillera/stories/US-004-unirse-desde-el-enlace.md
  prioridad_en_epic: 1
  complejidad: Baja
  dependencias:
  - US-003
  en_corte: true
  invest: validado
  estado: criteria_complete
  origen: USMD R02 (lado del participante) + T15
- story_id: US-005
  epic_id: EPIC-002
  titulo: Como Participante de la natillera que ahorra para tener su dinero en diciembre, quiero registrar mi billetera
    y autorizar una sola vez el cobro automático de mi cuota con Open Payments, para ahorrar cada periodo sin tener
    que pagar a mano ni entregar efectivo
  file_path: epics/EPIC-002-unirse-a-la-natillera/stories/US-005-autorizar-cobro-automatico.md
  prioridad_en_epic: 1
  complejidad: Alta
  dependencias:
  - US-004
  en_corte: true
  invest: validado
  estado: criteria_complete
  origen: USMD T14 (nota del equipo) · PDF E-09
- story_id: US-006
  epic_id: EPIC-003
  titulo: Como Administrador de la natillera (tesorero), quiero que la natillera arranque sola cuando se complete
    el cupo mínimo de participantes con cobro autorizado, y se cobre la primera cuota a todos, para empezar a ahorrar
    sin perseguir a nadie
  file_path: epics/EPIC-003-ahorrar-cada-periodo/stories/US-006-arranque-con-cupo-minimo.md
  prioridad_en_epic: 1
  complejidad: Media
  dependencias:
  - US-005
  en_corte: true
  invest: validado
  estado: criteria_complete
  origen: USMD T16, T17 · PDF E-10
- story_id: US-007
  epic_id: EPIC-003
  titulo: Como Participante de la natillera que ahorra para tener su dinero en diciembre, quiero que mi cuota se
    debite automáticamente de mi billetera hacia la billetera del grupo en cada periodo, para ahorrar con disciplina
    sin depender de acordarme
  file_path: epics/EPIC-003-ahorrar-cada-periodo/stories/US-007-debito-automatico-de-cuota.md
  prioridad_en_epic: 1
  complejidad: Alta
  dependencias:
  - US-006
  en_corte: true
  invest: validado
  estado: criteria_complete
  origen: USMD T19, T20 · PDF E-12 · respuestas del equipo sobre morosos
- story_id: US-008
  epic_id: EPIC-003
  titulo: Como Participante de la natillera que ahorra para tener su dinero en diciembre, quiero ver en el bot,
    después de cada cobro, mi aporte acumulado y el total de la natillera, para confiar en que mi dinero está ahí
    sin preguntarle a nadie
  file_path: epics/EPIC-003-ahorrar-cada-periodo/stories/US-008-ver-aporte-y-total.md
  prioridad_en_epic: 2
  complejidad: Baja
  dependencias:
  - US-007
  en_corte: true
  invest: validado
  estado: criteria_complete
  origen: USMD T21, T22 · IMD PA1
- story_id: US-009
  epic_id: EPIC-004
  titulo: Como Participante de la natillera que ahorra para tener su dinero en diciembre, quiero recibir automáticamente
    en mi billetera, en la fecha final, mi parte del total de la natillera, para tener mi dinero en diciembre sin
    depender del organizador
  file_path: epics/EPIC-004-recibir-la-liquidacion/stories/US-009-liquidacion-automatica.md
  prioridad_en_epic: 1
  complejidad: Alta
  dependencias:
  - US-007
  en_corte: true
  invest: validado
  estado: criteria_complete
  origen: USMD T36, T35 · PDF E-16 · respuestas del equipo (automática; partes iguales con descuento a morosos con
    su mora)
- story_id: US-010
  epic_id: EPIC-006
  titulo: Como Administrador de la natillera (tesorero), quiero crear una actividad (rifa, bazar u otra) con su
    descripción, fechas, valor por participante y premio, para sumar utilidad al grupo como en la natillera de siempre
  file_path: epics/EPIC-006-actividades-especiales/stories/US-010-crear-actividad.md
  prioridad_en_epic: 1
  complejidad: Media
  dependencias:
  - US-006
  en_corte: true
  invest: validado
  estado: criteria_complete
  origen: USMD T25, T26 · PDF E-11
- story_id: US-011
  epic_id: EPIC-006
  titulo: Como Participante de la natillera que ahorra para tener su dinero en diciembre, quiero dar permiso en
    el bot para que se cobre mi parte de la actividad, para participar sin entregar efectivo a nadie
  file_path: epics/EPIC-006-actividades-especiales/stories/US-011-pagar-parte-de-actividad.md
  prioridad_en_epic: 1
  complejidad: Media
  dependencias:
  - US-010
  en_corte: true
  invest: validado
  estado: criteria_complete
  origen: USMD T27, T28 · PDF E-13
- story_id: US-012
  epic_id: EPIC-006
  titulo: Como Administrador de la natillera (tesorero), quiero indicar al ganador de la actividad, confirmarlo
    y que la natillera le pague el premio sin superar lo recaudado, avisando a todos, para que el premio sea transparente
    y nadie dude de quién ganó
  file_path: epics/EPIC-006-actividades-especiales/stories/US-012-ordenar-premio-al-ganador.md
  prioridad_en_epic: 2
  complejidad: Media
  dependencias:
  - US-011
  en_corte: true
  invest: validado
  estado: criteria_complete
  origen: USMD T29, T30, R06 · notas del equipo del paso 14
- story_id: US-013
  epic_id: EPIC-006
  titulo: Como Administrador de la natillera (tesorero), quiero cerrar una actividad sin premio o sin ganador, para
    que todo lo recaudado quede acumulado en la natillera y llegue a la liquidación
  file_path: epics/EPIC-006-actividades-especiales/stories/US-013-actividad-sin-premio-o-sin-ganador-acumula.md
  prioridad_en_epic: 3
  complejidad: Baja
  dependencias:
  - US-011
  en_corte: true
  invest: validado
  estado: criteria_complete
  origen: USMD T32 (nota del equipo) · ampliada por el equipo en la Fase 2 (bazar, compartir)
- story_id: US-014
  epic_id: EPIC-005
  titulo: Como Participante de la natillera que ahorra para tener su dinero en diciembre, quiero pedir un préstamo
    a la financiera después de cumplir un número de pagos, para acceder a crédito gracias a mi constancia de ahorro
  file_path: epics/EPIC-005-credito-desde-el-ahorro/stories/US-014-pedir-prestamo.md
  prioridad_en_epic: 1
  complejidad: Alta
  dependencias:
  - US-007
  en_corte: false
  invest: validado
  estado: validated
  origen: USMD T33 · PDF E-15
- story_id: US-016
  epic_id: EPIC-005
  titulo: Como Participante de la natillera que ahorra para tener su dinero en diciembre, quiero recibir en mi billetera
    personal el valor del préstamo aprobado, para usar el dinero del crédito sin intermediarios
  file_path: epics/EPIC-005-credito-desde-el-ahorro/stories/US-016-desembolso-del-credito.md
  prioridad_en_epic: 2
  complejidad: Media
  dependencias:
  - US-014
  en_corte: false
  invest: validado
  estado: validated
  origen: Agregada por el equipo en la Fase 2 · PDF E-15
- story_id: US-017
  epic_id: EPIC-003
  titulo: Como Participante de la natillera que ahorra para tener su dinero en diciembre, quiero recibir cada día
    por Telegram un recordatorio con lo que debo, incluida la mora diaria, para ponerme al día antes de que se me
    descuente en la liquidación
  file_path: epics/EPIC-003-ahorrar-cada-periodo/stories/US-017-mora-diaria-y-recordatorio.md
  prioridad_en_epic: 2
  complejidad: Media
  dependencias:
  - US-007
  en_corte: true
  invest: validado
  estado: criteria_complete
  origen: USMD T20, T23 · PDF E-12 · respuesta del equipo («Deuda + mora + recordatorio»)
- story_id: US-015
  epic_id: EPIC-005
  titulo: Como Operador de la financiera que custodia y presta, quiero que lo que el participante no pague del préstamo
    se descuente de su parte en la liquidación, para recuperar el crédito con el fondo de la natillera
  file_path: epics/EPIC-005-credito-desde-el-ahorro/stories/US-015-descuento-de-prestamo-impago.md
  prioridad_en_epic: 2
  complejidad: Media
  dependencias:
  - US-009
  - US-014
  en_corte: false
  invest: validado
  estado: validated
  origen: USMD T34 · PDF E-15, E-16
- story_id: US-001-CFG
  epic_id: EPIC-001
  titulo: Como Equipo de la hackathon que opera la demo, quiero configurar los límites de la cuota, el porcentaje
    de mora máximo, los reintentos de cobro y el modo demo (minutos por periodo y por «día» de mora), para que la
    natillera respete reglas del sistema y la demo corra en minutos
  file_path: epics/EPIC-001-armar-la-natillera/stories/US-001-CFG-parametros-y-modo-demo.md
  origen: analisis_completitud
  en_corte: true
  estado: criteria_complete
- story_id: US-002-SEC
  epic_id: EPIC-001
  titulo: Como Equipo de la hackathon que opera la demo, quiero guardar las llaves privadas, los tokens de Open
    Payments y el token del bot fuera del repositorio público y fuera del chat, para cumplir la regla del repositorio
    público sin exponer el dinero de prueba ni el bot
  file_path: epics/EPIC-001-armar-la-natillera/stories/US-002-SEC-secretos-fuera-del-repositorio.md
  origen: analisis_completitud
  en_corte: true
  estado: criteria_complete
- story_id: US-005-INT
  epic_id: EPIC-002
  titulo: Como Participante de la natillera que ahorra para tener su dinero en diciembre, quiero volver al bot automáticamente
    después de aprobar el permiso en mi billetera, para quedar validado sin pasos manuales
  file_path: epics/EPIC-002-unirse-a-la-natillera/stories/US-005-INT-retorno-de-la-autorizacion.md
  origen: analisis_completitud
  en_corte: true
  estado: criteria_complete
- story_id: US-007-INT
  epic_id: EPIC-003
  titulo: Como Equipo de la hackathon que opera la demo, quiero tener un token vigente del permiso de cada participante
    antes de cada cobro recurrente, para que ningún cobro falle por un token vencido
  file_path: epics/EPIC-003-ahorrar-cada-periodo/stories/US-007-INT-token-vigente-para-cada-cobro.md
  origen: analisis_completitud
  en_corte: true
  estado: criteria_complete
- story_id: US-007-RPT
  epic_id: EPIC-003
  titulo: Como Equipo de la hackathon que opera la demo, quiero mostrar al jurado el registro de cada pago con sus
    cuatro etapas, para demostrar en la demo un flujo de pago real de punta a punta
  file_path: epics/EPIC-003-ahorrar-cada-periodo/stories/US-007-RPT-registro-de-pagos-para-el-jurado.md
  origen: analisis_completitud
  en_corte: true
  estado: criteria_complete
- story_id: US-018-TST
  epic_id: EPIC-007
  titulo: 'Como Equipo de la hackathon que opera la demo, quiero tener un guion de demo con billeteras de prueba
    preparadas: 3 participantes con fondos y uno sin fondos, para mostrar en 5 minutos el ciclo completo, la mora
    y la liquidación sin improvisar'
  file_path: epics/EPIC-007-infraestructura-de-la-hackathon/stories/US-018-TST-guion-de-demo-con-billeteras.md
  origen: analisis_completitud
  en_corte: true
  estado: criteria_complete
- story_id: US-019-MNT
  epic_id: EPIC-007
  titulo: Como Equipo de la hackathon que opera la demo, quiero entregar el repositorio con AI_USAGE.md, los prompts
    usados y un README para correr la demo, para cumplir los requisitos mínimos de evaluación del evento
  file_path: epics/EPIC-007-infraestructura-de-la-hackathon/stories/US-019-MNT-entregables-del-repositorio.md
  origen: analisis_completitud
  en_corte: true
  estado: criteria_complete
- story_id: US-007-MON
  epic_id: EPIC-003
  titulo: Como Equipo de la hackathon que opera la demo, quiero enterarme de inmediato si el programador de cobros
    se detiene o un cobro no se ejecuta a tiempo, para corregirlo antes de que arruine la demo
  file_path: epics/EPIC-003-ahorrar-cada-periodo/stories/US-007-MON-vigilar-el-programador-de-cobros.md
  origen: analisis_completitud
  en_corte: true
  estado: criteria_complete
- story_id: US-007-BCK
  epic_id: EPIC-003
  titulo: Como Equipo de la hackathon que opera la demo, quiero que el estado de natilleras, permisos, cobros y
    deudas sobreviva a un reinicio del bot, para seguir donde íbamos sin perder datos ni cobrar dos veces
  file_path: epics/EPIC-003-ahorrar-cada-periodo/stories/US-007-BCK-estado-persistente-sin-doble-cobro.md
  origen: analisis_completitud
  en_corte: true
  estado: criteria_complete
- story_id: US-012-AUD
  epic_id: EPIC-006
  titulo: 'Como Participante de la natillera que ahorra para tener su dinero en diciembre, quiero ver una bitácora
    de lo que hizo el administrador: crear la natillera, crear actividades, elegir ganadores y cerrar actividades,
    para confiar en que nadie hizo nada a escondidas'
  file_path: epics/EPIC-006-actividades-especiales/stories/US-012-AUD-bitacora-de-acciones-del-administrador.md
  origen: analisis_completitud
  en_corte: true
  estado: criteria_complete
historias_validation:
  all_questions_answered: true
  artifacts_created: true
  memory_updated: true
  user_approved: true
  ready_for_handoff: true
criterios_phase:
  status: completed
  started_at: '2026-10-14T20:31:14-05:00'
  completed_at: '2026-10-14T20:31:14-05:00'
  progress_percent: 100
  current_story: null
  answers:
    sobrante_liquidacion: A todos por igual
    cupo_minimo_minimo: 3 personas
    limites_cuota: Configurables, sin fijar
    dia_de_mora_demo: Configurable
criteria_defined:
- story_id: US-001
  criteria_count: 19
  categories:
    escenarios_exito: 5
    validaciones_reglas: 6
    manejo_errores: 4
    requisitos_ux: 2
    casos_edge: 2
  smart_validated: true
- story_id: US-002
  criteria_count: 10
  categories:
    escenarios_exito: 3
    validaciones_reglas: 4
    manejo_errores: 1
    requisitos_ux: 1
    casos_edge: 1
  smart_validated: true
- story_id: US-003
  criteria_count: 8
  categories:
    escenarios_exito: 2
    validaciones_reglas: 2
    manejo_errores: 2
    requisitos_ux: 1
    casos_edge: 1
  smart_validated: true
- story_id: US-004
  criteria_count: 8
  categories:
    escenarios_exito: 4
    validaciones_reglas: 1
    manejo_errores: 1
    requisitos_ux: 1
    casos_edge: 1
  smart_validated: true
- story_id: US-005
  criteria_count: 12
  categories:
    escenarios_exito: 4
    validaciones_reglas: 3
    manejo_errores: 3
    requisitos_ux: 1
    casos_edge: 1
  smart_validated: true
- story_id: US-006
  criteria_count: 8
  categories:
    escenarios_exito: 3
    validaciones_reglas: 2
    manejo_errores: 1
    requisitos_ux: 1
    casos_edge: 1
  smart_validated: true
- story_id: US-007
  criteria_count: 10
  categories:
    escenarios_exito: 2
    validaciones_reglas: 3
    manejo_errores: 2
    requisitos_ux: 1
    casos_edge: 2
  smart_validated: true
- story_id: US-008
  criteria_count: 9
  categories:
    escenarios_exito: 3
    validaciones_reglas: 3
    manejo_errores: 1
    requisitos_ux: 1
    casos_edge: 1
  smart_validated: true
- story_id: US-009
  criteria_count: 14
  categories:
    escenarios_exito: 7
    validaciones_reglas: 3
    manejo_errores: 1
    requisitos_ux: 1
    casos_edge: 2
  smart_validated: true
- story_id: US-010
  criteria_count: 9
  categories:
    escenarios_exito: 2
    validaciones_reglas: 4
    manejo_errores: 1
    requisitos_ux: 1
    casos_edge: 1
  smart_validated: true
- story_id: US-011
  criteria_count: 7
  categories:
    escenarios_exito: 3
    validaciones_reglas: 1
    manejo_errores: 1
    requisitos_ux: 1
    casos_edge: 1
  smart_validated: true
- story_id: US-012
  criteria_count: 11
  categories:
    escenarios_exito: 4
    validaciones_reglas: 3
    manejo_errores: 2
    requisitos_ux: 1
    casos_edge: 1
  smart_validated: true
- story_id: US-013
  criteria_count: 8
  categories:
    escenarios_exito: 3
    validaciones_reglas: 2
    manejo_errores: 1
    requisitos_ux: 1
    casos_edge: 1
  smart_validated: true
- story_id: US-017
  criteria_count: 8
  categories:
    escenarios_exito: 2
    validaciones_reglas: 3
    manejo_errores: 1
    requisitos_ux: 1
    casos_edge: 1
  smart_validated: true
criterios_validation:
  all_questions_answered: true
  artifacts_created: true
  memory_updated: true
  user_approved: true
  ready_for_handoff: true
  all_stories_refined: true
  criteria_created: 141
  smart_validated: true
completitud_phase:
  status: completed
  started_at: '2026-10-14T20:37:55-05:00'
  completed_at: '2026-10-14T20:37:55-05:00'
  progress_percent: 100
  answers:
    decision: Críticas e importantes
gaps_identified:
- story_id: US-001-CFG
  epic_id: EPIC-001
  area: configuracion
  criticidad: critico
  file_path: epics/EPIC-001-armar-la-natillera/stories/US-001-CFG-parametros-y-modo-demo.md
  en_corte: true
- story_id: US-002-SEC
  epic_id: EPIC-001
  area: seguridad
  criticidad: critico
  file_path: epics/EPIC-001-armar-la-natillera/stories/US-002-SEC-secretos-fuera-del-repositorio.md
  en_corte: true
- story_id: US-005-INT
  epic_id: EPIC-002
  area: integraciones
  criticidad: critico
  file_path: epics/EPIC-002-unirse-a-la-natillera/stories/US-005-INT-retorno-de-la-autorizacion.md
  en_corte: true
- story_id: US-007-INT
  epic_id: EPIC-003
  area: integraciones
  criticidad: critico
  file_path: epics/EPIC-003-ahorrar-cada-periodo/stories/US-007-INT-token-vigente-para-cada-cobro.md
  en_corte: true
- story_id: US-007-RPT
  epic_id: EPIC-003
  area: reportes
  criticidad: critico
  file_path: epics/EPIC-003-ahorrar-cada-periodo/stories/US-007-RPT-registro-de-pagos-para-el-jurado.md
  en_corte: true
- story_id: US-018-TST
  epic_id: EPIC-007
  area: testing
  criticidad: critico
  file_path: epics/EPIC-007-infraestructura-de-la-hackathon/stories/US-018-TST-guion-de-demo-con-billeteras.md
  en_corte: true
- story_id: US-019-MNT
  epic_id: EPIC-007
  area: mantenimiento
  criticidad: critico
  file_path: epics/EPIC-007-infraestructura-de-la-hackathon/stories/US-019-MNT-entregables-del-repositorio.md
  en_corte: true
- story_id: US-007-MON
  epic_id: EPIC-003
  area: monitoreo
  criticidad: importante
  file_path: epics/EPIC-003-ahorrar-cada-periodo/stories/US-007-MON-vigilar-el-programador-de-cobros.md
  en_corte: true
- story_id: US-007-BCK
  epic_id: EPIC-003
  area: backup
  criticidad: importante
  file_path: epics/EPIC-003-ahorrar-cada-periodo/stories/US-007-BCK-estado-persistente-sin-doble-cobro.md
  en_corte: true
- story_id: US-012-AUD
  epic_id: EPIC-006
  area: auditoria
  criticidad: importante
  file_path: epics/EPIC-006-actividades-especiales/stories/US-012-AUD-bitacora-de-acciones-del-administrador.md
  en_corte: true
lifecycle_coverage:
  configuracion: 100
  usuarios: 100
  seguridad: 100
  auditoria: 100
  monitoreo: 100
  integraciones: 100
  mantenimiento: 100
  reportes: 100
  backup: 100
  testing: 100
completitud_validation:
  all_questions_answered: true
  artifacts_created: true
  memory_updated: true
  user_approved: true
  ready_for_handoff: true
gherkin_phase:
  status: completed
  started_at: '2026-10-14T20:42:28-05:00'
  completed_at: '2026-10-14T20:42:28-05:00'
  progress_percent: 100
features_generated:
- epic_id: EPIC-001
  file_path: features/epic_001_armar_la_natillera.feature
  scenarios: 19
  language: es
  parser: 'gherkin-official 29.0.0: OK'
- epic_id: EPIC-002
  file_path: features/epic_002_unirse_a_la_natillera.feature
  scenarios: 10
  language: es
  parser: 'gherkin-official 29.0.0: OK'
- epic_id: EPIC-003
  file_path: features/epic_003_ahorrar_cada_periodo.feature
  scenarios: 24
  language: es
  parser: 'gherkin-official 29.0.0: OK'
- epic_id: EPIC-004
  file_path: features/epic_004_recibir_la_liquidacion.feature
  scenarios: 6
  language: es
  parser: 'gherkin-official 29.0.0: OK'
- epic_id: EPIC-006
  file_path: features/epic_006_actividades_especiales.feature
  scenarios: 15
  language: es
  parser: 'gherkin-official 29.0.0: OK'
- epic_id: EPIC-007
  file_path: features/epic_007_infraestructura_de_la_hackathon.feature
  scenarios: 4
  language: es
  parser: 'gherkin-official 29.0.0: OK'
gherkin_validation:
  all_features_generated: true
  artifacts_created: true
  memory_updated: true
  user_approved: true
  ready_for_handoff: true
handoff_history:
- from: bdd-epic-discovery
  to: bdd-story-generation
  fecha: '2026-10-14'
  viaja: 6 épicas (5 en el corte, 1 extra), alcance y riesgos
- from: bdd-story-generation
  to: bdd-criteria-definition
  fecha: '2026-10-14'
  viaja: 17 historias (14 en el corte, 3 extra de crédito); criterios solo para las 14 del corte («Sí, commit y
    criterios»). Corrige el conteo «13 y 4» del commit de la Fase 2.
- from: bdd-criteria-definition
  to: bdd-lifecycle-analysis
  fecha: '2026-10-14'
  viaja: 14 historias del corte con 141 criterios SMART; 5 supuestos aprobados («Aprobados»)
- from: bdd-lifecycle-analysis
  to: bdd-gherkin-generation
  fecha: '2026-10-14'
  viaja: 24 historias en el corte (14 de producto + 10 de completitud) con criterios YAML; orden de recorte aprobado
- from: bdd-gherkin-generation
  to: completado
  fecha: '2026-10-14'
  viaja: '6 features en español, 78 escenarios, 24 historias del corte; hallazgo abierto: regla de redondeo del
    sobrante'
user_decisions:
- fecha: '2026-10-14'
  decision: Importar la semilla USMD
  verbatim: Sí, importar
- fecha: '2026-10-14'
  decision: Saltar la Fase 0 TESIS
  verbatim: Saltarla (Recomendado)
- fecha: '2026-10-14'
  decision: Construir sin el motor en la hackathon
  verbatim: Independiente, motor después
- fecha: '2026-10-14'
  decision: 'Capacidad: 3 personas programan'
  verbatim: '3'
- fecha: '2026-10-14'
  decision: Agregar épica de actividades especiales
  verbatim: falta la epica para crear actividades, rifas, bazares y demas
- fecha: '2026-10-14'
  decision: EPIC-006 dentro del corte de la hackathon
  verbatim: Dentro del corte
  nota: Amplía REB-001 de USMD (excluía ACT-004) y contradice AD2 ahora-no de IMD; se gobierna con el checkpoint
    del viernes 15:00
- fecha: '2026-10-14'
  decision: Morosos en el corte
  verbatim: Deuda + mora + recordatorio
- fecha: '2026-10-14'
  decision: Ampliar US-013 y crear US-016
  verbatim: (esta historia debe de cubrir tambien actividades que no son rifas ...) / (debe de haber una historia
    para desembolsar el valor del credito ...)
- fecha: '2026-10-14'
  decision: Criterios solo para las historias del corte
  verbatim: Sí, commit y criterios
- fecha: '2026-10-14'
  decision: Reglas para criterios
  verbatim: A todos por igual · 3 personas · Configurables, sin fijar · Configurable
- fecha: '2026-10-14'
  decision: Las 10 historias de completitud al corte
  verbatim: Críticas e importantes
  nota: El corte pasa de 14 a 24 historias; riesgo de tiempo R-04 sube
- fecha: '2026-10-14'
  decision: Aprobar completitud y orden de recorte
  verbatim: Aprobado
- fecha: '2026-10-14'
  decision: Aprobar el Gherkin y cerrar el descubrimiento
  verbatim: Sí, commit y cerrar
cross_validation_log: []
alerts:
- fecha: '2026-10-14'
  fase: gherkin
  hallazgo: Falta una regla de redondeo para el sobrante de la liquidación cuando no se divide exacto entre los
    participantes (p. ej. 10 / 3).
  estado: abierto
global_metrics:
  discovery_duration_minutes: 0
  artifacts_generated:
    epics_count: 7
    stories_count: 27
    stories_original: 17
    stories_completitud: 10
    criteria_count: 141
    gaps_count: 10
    features_count: 6
    scenarios_count: 78
  quality_metrics:
    stories_invest_validated: 0%
    criteria_smart_validated: 0%
    lifecycle_coverage: 0%
    gherkin_syntax_valid: 100% (parser oficial gherkin-official 29.0.0, 6/6 archivos)
  interactions:
    total_questions_asked: 0
    total_user_responses: 0
discovery_quality_score:
  version: '1.0'
  last_calculated: null
  phase_completed: 0
  components:
    vuifed_score:
      value: 0
      weight: 0.15
      contribution: 0
    invest_coverage:
      value: 0
      weight: 0.2
      contribution: 0
    smart_coverage:
      value: 0
      weight: 0.25
      contribution: 0
    lifecycle_coverage:
      value: 0
      weight: 0.25
      contribution: 0
    gherkin_quality:
      value: 0
      weight: 0.15
      contribution: 0
  dqs_total: 0
  rating: Not calculated (correr /bdd-validate; no se escribe a mano)
export_history:
  last_export: null
  exports: []
seed_ingestion:
  source: user-story-mapping-discovery/sessions/USMD-20261014-natillera-2/bdd-seed.yaml
  source_framework: USMD
  rebanada: REB-001
  importado: true
  confirmacion: Sí, importar
  tide_constraint: null
  nota: Sin techo de apetito (verdad de SUD); las 9 horas viajan como riesgo R-04.
  usados:
  - project_context → project-context.md
  - epics_seed → EPIC-001..004
  - out_of_scope → mvp-scope.md
  - known_risks → risk-analysis.md
  - acceptance_anchor → ancla de criterios (Fase 3)
supuestos_aprobados:
- Actividades siguen el mismo proceso de mora que la cuota (US-011)
- Mora simple, sin capitalizar (US-017)
- Recalcular sobre el saldo real si un deudor queda en 0 y no alcanza (US-009, V-05)
- La deuda solo se recupera al liquidar; «ya tengo el dinero» fuera (US-007)
- Si lo recaudado no alcanza el premio, se paga lo recaudado; el resto después queda fuera (US-012)
lifecycle_coverage_nota: 100 = área analizada y con su hueco cubierto por una historia de completitud o por historias
  existentes (usuarios). No es una medición de calidad.
orden_de_recorte_viernes_15h:
- EPIC-006 actividades especiales
- US-017 mora diaria y recordatorio
- US-012-AUD bitácora
- US-007-MON monitoreo
features_nota: 'EPIC-005 (crédito, extra) sin feature: sus historias no tienen criterios porque quedan fuera del
  corte.'
```
