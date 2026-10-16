# Triaje IMD — Natillera 2.0

> Sesión: IMD-20261014-natillera-2 · Fecha: 2026-10-14 · Modo previsto: **taller** (el equipo se reúne antes del viernes; la AI prepara y estructura, el usuario facilita).
> Patrón de triaje heredado de SINAPSIS/EDF/OHD/DPE/PREDIO/CVC.

## El candidato, verbatim

> Ok quiero hacer un nuevo proceso de descubrimiento de negocio para una iniciativa que se llama Natillera 2.0

El detalle de la iniciativa está en el PDF «Natillera 2.0 · Prototipo» (F-01), resumido en [fuentes.md](fuentes.md).

## El trigger — ¿por qué ahora?

> Es una iniciativa para proponer en una hackathon de open payments, pero que queremos que sea un producto propio sobre el motor

## Las siete respuestas

| # | Pregunta | Respuesta |
|---|---|---|
| 1 | ¿Qué se quiere mapear? (verbatim) | El candidato de arriba, con el PDF como detalle. |
| 2 | ¿Por qué ahora? | Hackathon de Open Payments (Medellín, 16 y 17 de octubre de 2026) y la intención de que sea un producto propio sobre el motor. |
| 3 | 🧪 ¿Qué decisión pendiente informaría el mapa, quién la toma y para cuándo? | Las dos decisiones, en orden: primero el corte de la hackathon, elegido para que sea también la primera entrega del producto. La toma el equipo de la hackathon antes del viernes 16 de octubre de 2026. |
| 4 | 🧪 ¿Hay un grupo humano real que deba estar en una sala? | Sí. El equipo se reúne antes del viernes. |
| 5 | ¿Hay una métrica con dueño? | Los criterios del jurado (H-05). Son ocho y no tienen pesos publicados. |
| 5b | Contexto de uso y destino | Enfocar la entrega. El destino queda sin decidir y se cierra en la Fase 4; el usuario ya pidió seguir con USMD y BDD 2.0. |
| 6 | 🥊 Steelman: ¿por qué esto NO necesita un mapa? | «Ninguna, queremos tener un mapa claro de ejecucion del negocio que llevamos, la solucion que proponemos usando los criterios de evaluacion de la hackathon y el tiempo disponble» |
| 7 | ¿Quiénes estarían en el taller, por rol? | Negocio y producto · Desarrollo de pagos · Frontend y experiencia · Pitch y diseño. |

## Decisión: PROCEDER

Hay una decisión pendiente real, con dueño y fecha. El equipo de la hackathon tiene que elegir antes del viernes qué parte del ciclo de la natillera construye y muestra. La idea es que esa misma parte sea la primera entrega del producto. Sin esa decisión el mapa sería un póster; con ella, el mapa la informa.

El steelman decía que la solución ya está escrita y solo falta rebanarla. Pierde, aunque por poco. El PDF describe el producto completo: creación, invitaciones, cobro periódico, mora, actividades, premios, préstamos y liquidación. La hackathon da 9 horas de construcción y 5 minutos de presentación con demo. Lo que no está decidido es qué fragmento de ese ciclo mueve más los criterios del jurado. Esa elección, que conecta meta, actores, impactos y entregables posibles, es el camino más corto que produce un mapa de impacto.

No corresponde derivar a la capa TESIS de BDD 2.0. Todavía no hay una meta acordada: el equipo tiene que elegir qué criterios y qué premio persigue. Además, la sesión es con un grupo de cuatro roles, no una apuesta individual. Tampoco corresponde ir directo a USMD, porque el usuario quiere que el corte salga de los criterios del jurado y no del orden del documento.

El riesgo a vigilar es el póster. Las capacidades del PDF entran al mapa como entregables posibles, no como compromisos. Lo que no conecte con un impacto en un actor se queda fuera del corte, aunque esté bien especificado.

## Arquetipo: IM-PROD

Es un producto de software nuevo y sin usuarios todavía.

Vigilar: entregables disfrazados de impactos («crear billetera» no es un cambio de conducta de nadie) y actores inventados. El jurado y los ahorradores son actores reales del corte. La financiera y el motor son actores del producto, y su lugar en el corte de la hackathon está por verse.

## Tiempo disponible

Hoy es miércoles 14 de octubre de 2026 y el hacking empieza el viernes a las 10:30. La reunión del equipo es la única ventana de acuerdo. Lo que viene después en USMD y BDD 2.0 se limita al corte elegido. El resto del ciclo queda registrado como trabajo del producto, sin especificar todavía.

Riesgo abierto: la regla «todo el código debe desarrollarse dentro de los dos días» (H-03) puede chocar con usar el motor propio ya construido (VH-01). Hay que aclararlo con la organización antes del viernes, porque cambia lo que se puede mostrar funcionando.

## Derivaciones consideradas

| Señal | Destino |
|---|---|
| Una meta acordada, un equipo, intención = backlog | `/bdd-tesis` (capa TESIS) — no aplica: la meta no está acordada y hay grupo |
| Piden falsadores / instrumentación / línea base | `/bdd-tesis` — no se pidieron |
| Tesis sobre una sesión BDD que ya existe | `/bdd-tesis attach` — no existe sesión BDD |
| Épicas / historias / Gherkin directo | `/bdd-discovery` — vendrá después, por el pipeline pedido |
| Idea que necesita apetito y moldeo | `/sud-discovery` — el apetito ya lo fija la hackathon (9 horas) |
| Producto de crédito (los préstamos de E-15) | `/cvc-discovery` — fuera del corte de la hackathon; se menciona para el producto |
| Validar demanda de un negocio | `/lean-discovery` — no se pidió |
