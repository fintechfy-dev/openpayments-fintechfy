# language: es
# Generado en la Fase 5 de BDD 2.0 (sesión natillera-2) desde los criterios YAML de la Fase 4.
@epic_id:EPIC-007 @domain:ahorro_comunitario @milestone:hackathon-open-payments-2026 @criticality:high
Característica: Infraestructura de la hackathon
  Lo que la hackathon exige para evaluar la entrega y para que la demo de 5 minutos salga.

  Como equipo de la hackathon que opera la demo
  Quiero un guion probado y un repositorio que cumpla los requisitos del evento
  Para que la entrega sea válida y la demo muestre el ciclo completo con pagos reales

  Antecedentes:
    Dado que la entrega cierra el sábado "2026-10-17" a las 11:00

  # --- Historia US-018-TST: Guion de demo con billeteras ---

  @story_id:US-018-TST @origin:analisis_completitud @area:testing @priority:1 @complexity:low @smoke
  Escenario: El guion recorre el ciclo completo en 5 minutos con pagos reales
    Dado que hay 4 billeteras de prueba con saldo recargado: el administrador, "Ana" y "Beto" con fondos y "Carla" sin fondos
    Y el modo demo está activado
    Cuando el equipo ensaya el guion completo
    Entonces el ensayo recorre crear, invitar, autorizar, arrancar, cobrar, mora, actividad y liquidación
    Y todos los pagos del ensayo son reales en la Test Wallet
    Y el ensayo termina en 5 minutos o menos

  @story_id:US-018-TST @origin:analisis_completitud @area:testing @priority:1 @complexity:low @error_handling
  Escenario: Plan B si falla la red durante el pitch
    Dado que la red falla durante el pitch
    Cuando el equipo pasa al plan B
    Entonces muestra el registro de una corrida previa
    Y la presenta como grabación

  # --- Historia US-019-MNT: Entregables del repositorio ---

  @story_id:US-019-MNT @origin:analisis_completitud @area:mantenimiento @priority:1 @complexity:low @smoke
  Escenario: El repositorio cumple los requisitos de evaluación
    Cuando se revisa el repositorio público a las 10:30 del sábado
    Entonces tiene AI_USAGE.md en la raíz con herramientas, usos y partes del proyecto
    Y tiene los prompts usados en la carpeta prompts o al final de AI_USAGE.md
    Y tiene un README que empieza explicando la natillera y dice cómo correr la demo y cargar los secretos
    Y todas las ramas están integradas en la rama principal

  @story_id:US-019-MNT @origin:analisis_completitud @area:mantenimiento @priority:1 @complexity:low @boundary
  Escenario: Lo que no está en el repositorio no cuenta
    Dado que una parte del código solo existe en una computadora local
    Cuando se cierra la entrega a las 11:00
    Entonces esa parte no forma parte de lo evaluado
