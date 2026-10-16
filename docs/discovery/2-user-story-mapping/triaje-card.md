# Triaje USMD — Natillera 2.0

> Sesión: USMD-20261014-natillera-2 · Fecha: 2026-10-14 · Modo previsto: **taller**, con las dos personas que deciden por el equipo de la hackathon.
> Patrón de triaje heredado de SINAPSIS/EDF/OHD/DPE/PREDIO/CVC/IMD/DDO. Aguas abajo de [IMD-20261014-natillera-2](../../../impact-mapping-discovery/sessions/IMD-20261014-natillera-2/).

## El candidato, verbatim

> usa estos tres frameworks de descubrimiento en orden para empezar a analisar y formar las especificaciones funcionales de esta iniciativa, si tienes preguntas ven conmigo usando los lineamientos de cada framework

## El trigger — ¿por qué ahora?

> Es una iniciativa para proponer en una hackathon de open payments, pero que queremos que sea un producto propio sobre el motor

## Las siete respuestas

| # | Pregunta | Respuesta |
|---|---|---|
| 1 | ¿Qué se quiere mapear? (verbatim) | El encargo de arriba: Natillera 2.0, con el PDF de la iniciativa como detalle. |
| 2 | ¿Por qué ahora? | Hackathon de Open Payments en Medellín (16 y 17 de octubre de 2026) y la intención de hacerla producto propio. Tomado del triaje IMD (P-02). |
| 3 | 🧪 ¿Qué decisión pendiente informaría el mapa? | Qué rebanada del recorrido se construye en las 9 horas de la hackathon para lograr AD1, PA1 y FI3, y qué queda para las rebanadas siguientes del producto. La toman las dos personas que deciden por el equipo, antes del 2026-10-16. |
| 4 | 🧪 ¿La meta está acordada? | B: viene de IMD, con acuerdo alcanzado y sin disenso. Que el jurado lleve la propuesta a la final y la premie por inclusión financiera. |
| 5 | ¿Qué existe hoy? | A: nada. Es un producto nuevo; el PDF se titula «Prototipo». |
| 6 | 🥊 Steelman: ¿por qué esto NO necesita un mapa? | «IMD ya eligió los 5 entregables y el PDF describe el flujo completo: vayan directo a BDD 2.0.» Respuesta del equipo: «Las dos». Los 5 entregables no son un recorrido, y faltan las costuras de punta a punta recortadas a 9 horas. Además hay que ver el recorrido completo para saber qué queda en las rebanadas siguientes. |
| 7 | ¿Quiénes estarían en el taller? ¿Alguien conoce al usuario? | Proponente (negocio y producto, decisor) e integrante del equipo. Los dos han estado en natilleras reales. Evidencia excavable: el PDF de la iniciativa, el mapa de IMD y las reglas de la hackathon. |

## Decisión: PROCEDER

Hay una decisión pendiente con dueño y fecha. Impact Mapping eligió qué cambios de conducta perseguir: el administrador opera sin cuaderno, el participante ahorra por débito automático y la financiera ofrece la cuenta Natillera. Pero no eligió el recorrido que los hace visibles. Esa elección es la que hay que tomar antes del viernes.

La meta no está en disputa. Viene de IMD con acuerdo alcanzado, así que no corresponde derivar a IMD.

El steelman pierde. Los cinco entregables de IMD son piezas, no un recorrido. Nadie ha comprobado todavía que crear la natillera, invitar, validar la billetera, autorizar el débito, cobrar y ver el saldo se puedan contar de punta a punta, ni que quepan en 9 horas. El equipo sospecha justamente eso: «no alcanzo el tiempo y no revisamos bien el alcance». Ir directo a BDD especificaría piezas sueltas y repetiría ese riesgo. Además, el equipo quiere ver el recorrido completo de la natillera para ordenar las rebanadas del producto que vienen después.

Que los dos conozcan natilleras reales reduce el riesgo de imaginar el recorrido. Aun así, el mapa del después se etiqueta como hipótesis hasta que lo caminen participantes reales.

## Arquetipo: USM-VERDE

Vigilar: es un recorrido imaginado sobre un producto que no existe. Todo es hipótesis y se etiqueta. Hay que cuidar además que los pasos no nombren módulos del sistema («motor», «billetera»): deben nombrar lo que hace la persona.

## Modo previsto: taller · Tipo de mapa: despues

## Semilla de IMD

No hay `usmd-seed.yaml`, porque IMD no lo emite en v1. El usuario autorizó traer de la sesión IMD la meta, los usuarios del corte y los tres impactos como anclas de outcome («Sí, importar»). Cada dato importado lleva su procedencia. Los cinco entregables viajan solo como contexto, no como pasos. El recorrido, las historias, las rebanadas y el acuerdo de este taller viajan vacíos: los produce USMD.

## Derivaciones consideradas

| Señal | Destino |
|---|---|
| Falta acordar la meta entre voces en conflicto | `/imd-discovery` — no aplica: la meta viene acordada de IMD |
| Historias identificadas que solo necesitan redacción/criterios/Gherkin | `/bdd-discovery` — vendrá después, sobre la rebanada elegida |
| Piden falsadores / instrumentación / línea base | `/bdd-tesis` — no se pidieron |
| Idea cruda con apetito fijo que moldear | `/sud-discovery` — el apetito lo fija el evento (9 horas) y ya hay corte de IMD |
| Nadie sabe dónde termina un dominio y empieza otro | `/ddo-discovery` — no aplica |
| Producto de crédito contra el motor | `/cvc-discovery` — los préstamos quedan fuera del corte; se mencionan para el producto |
| Validar demanda de un negocio | `/lean-discovery` — no se pidió |
| Journey de EXPERIENCIA (emociones, canales, dispositivos) | fuera del repo — no se pidió |
