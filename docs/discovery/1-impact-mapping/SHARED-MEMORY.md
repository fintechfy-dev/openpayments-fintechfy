# SHARED MEMORY — Natillera 2.0

> Modo previsto: taller (el equipo se reúne antes del viernes 2026-10-16) · Triaje: PROCEDER, IM-PROD · Metas: completada y confirmada · Taller: completado · Mapa: BIEN FORMADO · Destino: mapa gobernante, acuerdo alcanzado · Sesión IMD cerrada; sigue USMD.
> Sin métricas inventadas ni acuerdos atribuidos a terceros. USMD y BDD 2.0 pendientes de sus traspasos.

```yaml
metadata:
  version: "1.0"
  framework: "impact-mapping-discovery"
  purpose: "Shared memory for IMD skill coordination"
  created_at: "2026-10-14T09:17:28-05:00"
  last_updated: "2026-10-14T11:53:39-05:00"

session:
  session_id: "IMD-20261014-natillera-2"
  current_phase: "completado"      # triaje | metas | taller | mapa | destino | completado
  # dispatch por formula (patron CVC §9.1): skill = imd-{current_phase},
  # bloque = {current_phase}_phase. Sin tabla de mapeo.

# =============================================================================
# FASE 0 — TRIAJE
# =============================================================================
triaje_phase:
  status: "completed"
  decision: "PROCEDER"
  arquetipo: "IM-PROD"
  derivar_a: null
  candidato_verbatim: "Ok quiero hacer un nuevo proceso de descubrimiento de negocio para una iniciativa que se llama Natillera 2.0"
  candidato_fuente: "encargo.md (F-00) + Natillera 2.pdf (F-01)"
  trigger_verbatim: "Es una iniciativa para proponer en una hackathon de open payments, pero que queremos que sea un producto propio sobre el motor"
  respuestas_registradas:
  - id: P-02
    texto: "¿Por qué trabajar Natillera 2.0 ahora? ¿Qué está empujando la iniciativa?"
    opciones:
    - "Hay un interesado (financiera, aliado o cliente)"
    - "Producto propio sobre el motor"
    - "La temporada (natillera 2027)"
    - "Explorar la idea"
    respuesta: "Es una iniciativa para proponer en una hackathon de open payments, pero que queremos que sea un producto propio sobre el motor"
    estado: respondida
    respuesta_interpretada: "Dos impulsos: una hackathon de open payments como vitrina inmediata y la intención de convertirlo en producto propio sobre el motor financiero."
    fuente: "Respuesta libre del usuario en la conversación (opción Otro)"
  - id: P-03
    texto: "¿Qué decisión concreta tienen que tomar y que este descubrimiento debería ayudar a tomar?"
    opciones:
    - "El corte de la hackathon"
    - "El alcance del producto"
    - "Las dos, en orden"
    - "Ninguna todavía"
    respuesta: "Las dos, en orden"
    estado: respondida
    respuesta_interpretada: "Primero el corte de la hackathon, elegido para que sea también la primera entrega del producto sobre el motor."
    fuente: "Respuesta explícita del usuario en la conversación"
  - id: P-03b
    texto: "¿Quién toma la decisión del corte? ¿Cuándo hay que tenerla?"
    respuesta_quien: "El equipo de la hackathon"
    respuesta_cuando_verbatim: "Hoy es MIercoles y la hackathon comienza el viernes"
    estado: respondida
    respuesta_interpretada: "Decide el equipo inscrito en la hackathon. Fecha límite: inicio de la hackathon el viernes 2026-10-16 (hoy miércoles 2026-10-14)."
    fuente: "Respuesta del usuario en la conversación"
  - id: P-04
    texto: "¿El equipo de la hackathon puede reunirse 2 o 3 horas antes del viernes para acordar el corte, o lo trabajamos tú y yo y luego se lo llevas?"
    opciones:
    - "Nos reunimos antes"
    - "Tú y yo, y lo llevo"
    - "Lo vemos en la hackathon"
    respuesta: "Nos reunimos antes"
    estado: respondida
    respuesta_interpretada: "Hay grupo real: el equipo se reúne antes del viernes. La AI prepara la sesión y el usuario la facilita (§6: la AI no facilita el taller en vivo)."
    fuente: "Respuesta explícita del usuario en la conversación"
  - id: P-05
    texto: "¿Qué número debería mover esta iniciativa y quién lo tiene?"
    opciones:
    - "Los criterios del jurado"
    - "Un número del producto"
    - "No hay número"
    - "No sé"
    respuesta: "Los criterios del jurado"
    estado: respondida
    respuesta_interpretada: "La métrica inmediata es la evaluación del jurado de la hackathon según sus criterios. La rúbrica no se ha aportado todavía: insumo pendiente para Metas (en_espera_insumo, dueño: usuario)."
    fuente: "Respuesta explícita del usuario en la conversación"
  - id: P-05b
    texto: "¿Para qué se usa la reunión del equipo?"
    opciones:
    - "Enfocar la entrega"
    - "Fijar la visión"
    - "Revisar la solución"
    respuesta: "Enfocar la entrega"
    estado: respondida
    fuente: "Respuesta explícita del usuario en la conversación"
  - id: P-06
    texto: "Steelman: el PDF ya define la solución; falta rebanar (USMD) y especificar (BDD); un mapa de impacto sería un póster. ¿Qué le respondes?"
    respuesta_verbatim: "Ninguna, queremos tener un mapa claro de ejecucion del negocio que llevamos, la solucion que proponemos usando los criterios de evaluacion de la hackathon y el tiempo disponble, aca mas informacion sobre la hackthon https://interledger.org/es/hackathon/2026-hackathon-medellin/"
    estado: respondida
    respuesta_interpretada: "No alega desacuerdo en el equipo. Pide un mapa que conecte la solución propuesta con los criterios del jurado y con el tiempo disponible, para elegir qué ejecutar."
    fuente: "Respuesta libre del usuario en la conversación"
  - id: P-07
    texto: "¿Qué roles van a estar en la reunión del equipo (son de 4 a 5 personas)?"
    respuesta: ["Negocio y producto", "Desarrollo de pagos", "Frontend y experiencia", "Pitch y diseño"]
    estado: respondida
    respuesta_interpretada: "Hay decisor (negocio y producto, con el equipo como dueño de la decisión) y técnicos (pagos, frontend)."
    fuente: "Respuesta explícita del usuario en la conversación"
  decision_pendiente:
    que: "Qué corte del ciclo de Natillera 2.0 llevar a la hackathon de open payments, elegido para que sea también la primera entrega del producto sobre el motor."
    quien_rol: "Equipo de la hackathon"
    fecha_limite: "2026-10-16 (inicio de la hackathon)"
  modo_previsto: "taller"
  roles_previstos: ["Negocio y producto", "Desarrollo de pagos", "Frontend y experiencia", "Pitch y diseño"]
  contexto_uso: "enfocar_entrega"
  destino_previsto: "sin_decidir"
  destino_nota: "El usuario pidió continuar en USMD y BDD 2.0. IMD no emite usmd-seed en v1; el camino sancionado es la excavación confirmada desde USMD. Se cierra en Fase 4."
  steelman: "pierde por poco: el PDF trae la solución completa, pero no cabe en 9 horas; falta elegir qué fragmento mueve los criterios del jurado"
  riesgos_abiertos:
  - "VH-01: regla de código dentro del evento vs. usar el motor propio ya construido; preguntar a la organización"
  pregunta_activa: null
triaje_validation:
  card_creada: true
  confirmada_por_usuario: true
  ready_for_handoff: true

# =============================================================================
# FASE 1 — METAS  (metas reales + medicion 5-tuple + degenerada + hito candidato)
# =============================================================================
metas_phase:
  status: "completed"
  subfase_actual: null
  meta_borrador: "Que el jurado de la hackathon de Open Payments Medellín lleve nuestra propuesta a la ronda final y la premie por su aporte a la inclusión financiera."
  degenerada_aplicada: true
  insumo_rubrica: "Resuelto sin pedirlo al usuario: los ocho criterios del jurado se tomaron de la página oficial (H-05, F-03). No tienen pesos publicados."
  respuestas_registradas:
  - id: M-01
    texto: "Si Natillera 2.0 existe y funciona perfecto, ¿qué cambia en la vida de la gente?"
    opciones:
    - "Vuelven a ahorrar juntos: grupos sin miedo a que el organizador se quede con la plata"
    - "Ahorran con disciplina: cobro automático y acompañamiento del grupo, también sin acceso a banca"
    - "Acceden a crédito justo: historial de ahorro para pedir un préstamo formal en vez del gota a gota"
    - "Las tres, en ese orden"
    respuesta: "Las tres, en ese orden"
    estado: respondida
    respuesta_interpretada: "Cadena de efectos en el usuario: confianza para ahorrar en grupo → disciplina de ahorro → acceso a crédito formal. El contraste con el gota a gota lo propuso el facilitador en la opción."
    fuente: "Respuesta explícita del usuario en la conversación"
  - id: M-02
    texto: "Si la gente vuelve a ahorrar junta, con disciplina y con acceso a crédito, ¿qué gana tu organización con eso?"
    opciones:
    - "Un producto con ingresos"
    - "Clientes para la financiera"
    - "Vitrina del motor"
    - "Varias de estas"
    respuesta: "Clientes para la financiera"
    estado: respondida
    respuesta_interpretada: "El efecto de negocio buscado es que la financiera que opera sobre el motor gane ahorradores y origine crédito de bajo riesgo respaldado por el ahorro. Ingresos propios y vitrina del motor no fueron elegidos."
    fuente: "Respuesta explícita del usuario en la conversación"
  - id: M-03
    texto: "El documento dice que una «empresa financiera» custodia el dinero y presta. En la vida real, ¿quién sería esa financiera?"
    opciones:
    - "Somos nosotros"
    - "Un aliado concreto"
    - "Cualquier cliente del motor"
    - "Aún no se sabe"
    respuesta: "Aún no se sabe"
    estado: respondida
    respuesta_interpretada: "La financiera no está identificada: en la hackathon será simulada y para el producto está por definir. Cierra parcialmente V-02; el beneficiario de la meta de negocio es un rol sin entidad concreta."
    fuente: "Respuesta explícita del usuario en la conversación"
  - id: M-04
    texto: "¿Para qué existe, en el fondo, esta iniciativa? (misión)"
    opciones:
    - "Inclusión financiera"
    - "Confianza en el ahorro comunitario"
    - "Productos financieros para comunidades"
    respuesta: "SON LAS TRES"
    estado: respondida
    respuesta_interpretada: "La misión integra las tres; el facilitador la sintetizó en un enunciado único confirmado en M-05."
    fuente: "Respuesta libre del usuario en la conversación"
  - id: M-05
    texto: "¿Esta jerarquía dice lo que quieres que cambie?"
    respuesta: "Sí, así está bien"
    estado: respondida
    alternativas_descartadas:
    - "Cualquier premio vale (no atar la meta a inclusión)"
    - "El hito es el producto (primera natillera real), con el jurado como restricción"
    fuente: "Respuesta explícita del usuario en la conversación"
  jerarquia:
    mision: "Que cualquier comunidad pueda ahorrar en grupo y acceder a crédito formal de forma segura, devolviéndole la confianza a la natillera a quienes hoy están fuera del sistema financiero."
    meta_negocio: "Que la financiera que opere Natillera 2.0 sume ahorradores constantes que después tomen crédito formal respaldado por su ahorro."
  meta_hito_enunciado: "Que el jurado de la hackathon de Open Payments Medellín lleve nuestra propuesta a la ronda final y la premie por su aporte a la inclusión financiera."
  prohibiciones: {solucion: no, actividad: no, verbo_sin_escala: no, vanidad_sin_puente: no, restriccion_diseno: no}
  prohibiciones_fallidas_inicial: []
  porques_subidos: 3
  degenerada:
    pregunta_hecha: true
    atajo_nombrado: "Demo de humo: pantallas bonitas con pagos simulados y un pitch emotivo."
    que_lo_impide: "La demo ejecuta pagos reales en la Test Wallet de Open Payments con el flujo completo (solicitud, autorización, ejecución y finalización) y el código pasa la revisión de los mentores (H-06, F-03)."
    atajos_no_elegidos_como_principal:
    - "Un pago genérico contado como natillera (guarda: el corte es un tramo real del ciclo)"
    - "Prometer en el pitch lo que la demo no muestra (guarda: lo no mostrado se presenta como hoja de ruta)"
    fuente: "M-06, respuesta explícita del usuario"
  medicion:
    escala: "Etapa alcanzada en la evaluación de la hackathon: 0 sin entrega válida · 1 evaluado en ronda 1 con flujo de pago real · 2 finalista (top 12, ronda 2) · 3 premio"
    medidor: "Anuncios oficiales de la organización: finalistas 14:30 y ganadores 16:30 del 2026-10-17 (F-04)"
    benchmark:
      valor: 0
      fuente: "Estado del equipo declarado por el usuario: inscrito, sin entrega"
      fecha: "2026-10-14"
    hueco_tasa_base: "Cuántos equipos compiten: sin dato; solo se sabe que pasan 12 a la ronda 2 (F-03)"
    minimo_aceptable: 1
    minimo_aceptable_texto: "Entrega válida antes de las 11:00 del 2026-10-17, con el flujo de pago real completo"
    objetivo:
      valor: 3
      texto: "Premio a la Inclusión (Puntored)"
      plazo: "2026-10-17"
    fuente: "M-07, respuesta explícita del usuario («Sí, así»)"
  puente_negocio:
    pregunta: "Si ganan el premio y nada más se mueve (no aparece una financiera, lo construido no sirve para el producto), ¿estarían contentos?"
    respuesta: "Sí, basta el premio"
    interpretacion: "El premio es éxito suficiente del hito; no es un proxy que deba arrastrar otro número. La reutilización como primera entrega del producto (P-03) queda como preferencia de desempate al elegir el corte, no como condición de éxito."
    fuente: "M-08, respuesta explícita del usuario"
  contrafactual:
    respuesta: "Funciona pero sin historia"
    texto: "Sin corte decidido, el proponente estima nivel 1: algo de pago funciona, pero el jurado no ve la natillera ni la inclusión. Estimación, no tasa medida. El hito aporta lo que suba de 1 a 2-3, y eso depende de que el jurado entienda problema, inclusión e impacto."
    fuente: "M-09, respuesta explícita del usuario"
  benchmark_medido: true
  benchmark_hueco: {dato: "cuántos equipos compiten", quien_mide_rol: "Equipo de la hackathon (se sabrá en el evento)", plazo: "2026-10-16"}
  metas_candidatas: 1
  convergencia_tecnica: null
  hito_candidato: "Un tramo real del ciclo de la natillera con un pago Open Payments de punta a punta en la Test Wallet, contado en 5 minutos como una historia de inclusión financiera."
  lint_parcial_2026_10_14: "MAL FORMADO por IMV-000 (falta hito), IMV-007, IMV-016, IMV-017, IMV-019, IMV-020: todo corresponde a la Fase 2; la sección meta_hito no tiene hallazgos."
metas_validation:
  medicion_completa: true
  cv_meta_001: true
  cv_meta_002: true
  cv_meta_003: true
  confirmada_por_usuario: true
  ready_for_handoff: true

# =============================================================================
# FASE 2 — TALLER  (esqueleto -> divergencia -> convergencia)
# =============================================================================
taller_phase:
  status: "completed"
  modo: "taller"
  modo_razon: "Grupo real de dos personas reunido el 2026-10-14; el proponente facilitó y transmitió por chat; el asistente formuló preguntas y registró."
  asistentes_roles: ["Proponente — negocio y producto (decisor)", "Integrante del equipo de la hackathon"]
  asistentes_nota: "Dos personas (P1 William Sierra, P2 Juan Rafael Sierra); cada una respondió desde las cuatro perspectivas: negocio y producto, pagos, frontend y pitch."
  decisor_presente: true
  tecnico_presente: true
  ausentes_relevantes: []
  ausentes_nota: "Declarado «Ninguno relevante». En el cazador de ausentes se descartaron mentores técnicos y votantes de la comunidad. Si el equipo inscrito tiene más integrantes, conocen el corte antes del viernes."
  actores_crudos: 8          # jurado, participante, administrador, financiera + off-stage: regulación, competencia, billeteras; (participante que recomienda = participante)
  impactos_crudos: 12
  entregables_pedidos: 4     # natillera con billeteras · chat de Telegram · pitch · demo con pagos reales y tiempo acelerado
  parking: 2
  convergencia_tecnica: "dot_voting"
  votos: {AD1: 2, J2: 1, PA1: 1, FI3: 1, PA2: 1, J1: 0, PA4: 0, AD2: 0, AD3: 0}
  ahora: ["AD1", "PA1", "FI3"]
  ahora_no: ["J1", "J2", "PA2", "PA3", "PA4", "AD2", "AD3", "FI1", "FI2"]
  disenso: "nadie disintió"
  tension_registrada: "El contrafactual de Metas dice que lo que sube de 1 a 3 es la historia; el corte elegido es solo mecanismo y J1/J2 quedaron en AHORA-NO. El equipo la conoció y no disintió."
  vocabulario: "participante = persona que ahorra en la natillera; P1 y P2 = el equipo"
  crudo: "taller-crudo.md"
taller_validation:
  cv_taller_001: true
  cv_taller_002: true
  cv_taller_003: true
  divergencia_corrida: true
  convergencia_corrida: true
  confirmado_por_usuario: true
  ready_for_handoff: true

# =============================================================================
# FASE 3 — MAPA  (mapa.yaml linteado + brief)
# =============================================================================
mapa_phase:
  status: "completed"
  mapa_file: "mapa.yaml"
  lint_veredicto: "MAPA BIEN FORMADO"     # copiado de imd_lint.py --json
  lint_errores: []                         # copiado de imd_lint.py --json (hallazgos)
  lint_iteraciones: 1
  sin_medir: ["IMP-001", "IMP-002", "IMP-003", "IMP-004", "IMP-005", "IMP-006", "IMP-007", "IMP-008", "IMP-009", "IMP-010", "IMP-011", "IMP-012"]
  actores: 7
  impactos: 12
  impactos_obstruye: 1
  entregables: 6
  hito_impactos: 3
  hito_entregables: 5
  aprender: 1
  escapes_declarados: []
  completados_fuera_del_taller: "supuestos marcados [fuera del taller] en mapa.yaml, ENT-005 (aprender) y clasificaciones; propuestos por el facilitador y aprobados por el equipo («Aprobamos», «Sí, entra»)"
  canal_participante: "Chat de Telegram (elección del equipo)"
  brief: "brief.md"
mapa_validation:
  cv_mapa_001: true
  cv_mapa_002: true
  cv_mapa_003: true
  cv_mapa_004: true
  lint_verde: true
  confirmado_por_usuario: true
  ready_for_handoff: true

# =============================================================================
# FASE 4 — DESTINO  (documento de destino + oferta del bridge)
# =============================================================================
destino_phase:
  status: "completed"
  acuerdo_alcanzado: true
  roles_que_acordaron: ["Proponente — negocio y producto (decisor)", "Integrante del equipo de la hackathon"]
  no_se_pronunciaron: []
  integrantes_ausentes: "El equipo inscrito tiene más integrantes; según el proponente, «william y juan rafael toman toda la desicion en este punto». Conocen el corte antes del viernes."
  disenso: []
  nadie_disintio: true
  decision_estado: "tomada"
  decision_resultado: "Corte AHORA: AD1 (IMP-007), PA1 (IMP-003), FI3 (IMP-012) con ENT-001..ENT-005; pitch ENT-006 obligatorio"
  destino_tipo: "mapa_gobernante"
  confirmado_por_rol: "Proponente — negocio y producto (decisor)"
  fecha: "2026-10-14"
  mapa_se_descarta: false
  checkpoints: 4                # el de las 15:00 del viernes lo agregó el equipo por su sospecha
  puente_tesis: "no_aplica"
  siguiente_framework: "USMD (excavación confirmada desde esta sesión; IMD no emite usmd-seed en v1), luego BDD 2.0"
  ahora_no_dueno: "Los dos (proponente e integrante)"
  sospecha_final: "no alcanzo el tiempo y no revisamos bien el alcance o las implicaciones"
  lint_final: "MAPA BIEN FORMADO"     # copiado de imd_lint.py --json tras cerrar acuerdo y destino
destino_validation:
  cv_dest_001: true
  cv_dest_002: true
  cv_dest_003: true
  cv_dest_004: true
  destino_confirmado: true
  sesion_cerrada: true
  ready_for_handoff: true

handoff_history:
- de: mapa
  a: destino
  fecha: "2026-10-14"
  viaja: "mapa.yaml BIEN FORMADO, brief.md"
- de: destino
  a: usmd
  fecha: "2026-10-14"
  viaja: "opt-in pedido por el usuario en el encargo; sin usmd-seed (no existe en IMD v1); USMD excava esta sesión con confirmación"
- de: triaje
  a: metas
  fecha: "2026-10-14"
  viaja: "candidato y trigger verbatim, decisión pendiente (corte de la hackathon, equipo, 2026-10-16), roles previstos, arquetipo IM-PROD, H-01..H-10 y vacíos V/VH de fuentes.md"
- de: metas
  a: taller
  fecha: "2026-10-14"
  viaja: "jerarquía, meta_hito con medición completa, degenerada, contrafactual e hito candidato (escritos en mapa.yaml); preferencia de desempate por reutilización como primera entrega del producto"
- de: taller
  a: mapa
  fecha: "2026-10-14"
  viaja: "taller-crudo.md: 12 impactos de 4 actores + 3 off-stage, votos, AHORA AD1/PA1/FI3, AHORA-NO el resto, nadie disintió, parking, tensión con el contrafactual"

continuidad:
  encargo: "encargo.md"
  fuentes: "fuentes.md"
  frameworks_solicitados:
  - impact-mapping-discovery
  - user-story-mapping-discovery
  - bdd-2.0
  rama_git: "feature/natillera-2-discovery"
```
