# Guía del taller — Natillera 2.0

> Modo: **taller** · Miércoles 14 de octubre de 2026, 2 horas · Facilita: el proponente (negocio y producto).
> Preparada por el asistente a partir de la Fase 1. El asistente no estará en la sala: no propone actores ni impactos; ordena lo que el equipo produzca.

[✅ Triaje] → [✅ Metas] → [🔄 Taller] → [⏳ Mapa] → [⏳ Destino]

## Para qué es esta reunión

El equipo tiene que salir con **un corte acordado**: qué parte de la natillera construye en las 9 horas de la hackathon y muestra en 5 minutos. El corte sale de un mapa de impacto: meta → quién tiene que actuar distinto → qué haríamos para que pase. No sale del orden del PDF.

El producto de la noche es el **acuerdo**, no el dibujo. Por eso cada idea se anota con el rol de quien la dijo, los votos se cuentan y, al final, se pregunta en voz alta quién no está de acuerdo.

## La meta (se lee al abrir y queda a la vista)

> **Que el jurado de la hackathon de Open Payments Medellín lleve nuestra propuesta a la ronda final y la premie por su aporte a la inclusión financiera.**

| Etapa | Qué significa |
|---|---|
| 0 | Sin entrega válida (hoy) |
| 1 | Evaluados en la ronda 1 con un pago real de punta a punta — **el mínimo** |
| 2 | Finalistas: entre los 12 que pasan a la ronda 2 |
| 3 | Premio — **el objetivo es el de Inclusión**, sábado 17 de octubre |

El atajo prohibido es la **demo de humo**. El pago tiene que ocurrir de verdad en la Test Wallet, con las cuatro etapas que exige el jurado: solicitud, autorización, ejecución y finalización.

Lo que sabemos sin hacer nada: sin corte decidido, el equipo llegaría a la etapa 1, con un pago que funciona pero sin que el jurado vea la natillera. Lo que sube de 1 a 3 es que el jurado entienda el problema, la inclusión y el impacto.

## Las reglas del juego (dos minutos al abrir)

- Hablamos de **personas que actúan distinto**, no de pantallas. Si alguien propone una función, se pregunta «¿la conducta de quién cambia?» y la función va al parking.
- Roles, no nombres: «el ahorrador que ya estuvo en una natillera y lo robaron», no «doña Marta».
- Todo se anota con quién lo dijo (negocio, pagos, frontend, pitch).
- Una discusión sobre cómo construir algo se estaciona en el **parking**. Se retoma al final.

## Agenda (120 minutos)

| Bloque | Minutos | Qué sale |
|---|---|---|
| Apertura: meta, reglas y restricciones | 0–10 | Meta leída en voz alta; restricciones a la vista |
| M1 · Esqueleto | 10–25 | El camino que el equipo ya tiene en la cabeza, expuesto |
| M2 · Divergencia | 25–75 | Río, contribuyentes, contaminadores, rondas por actor |
| M3 · Convergencia | 75–110 | Ejes, votación, ahora / ahora-no, disenso |
| Cierre y captura | 110–120 | Foto del tablero y hoja de captura completa |

Con 2 horas, la divergencia queda en su mínimo (50 minutos). Si se alarga, se recorta la ronda por actor de los menos cercanos a la meta, no la convergencia ni el disenso.

## Restricciones que el equipo debe ver (no son decisiones)

| Restricción | Fuente |
|---|---|
| 9 horas de construcción: viernes 10:30–14:00 y 15:00–17:30; sábado 08:00–11:00 | Cronograma oficial |
| Todo el código se escribe durante el evento | Requisitos de participación |
| Demo con registro del flujo de pago: solicitud, autorización, ejecución, finalización | Entrega y evaluación |
| 5 minutos entre presentación y demo, por ronda | Entrega y evaluación |
| Repositorio público con todo integrado a la rama principal, `AI_USAGE.md` y los prompts usados | Entrega y política de IA |
| Pregunta abierta: ¿usar el motor propio, ya construido, cuenta como código previo? | Sin respuesta; escribir a hackathon@interledger.org |

Los ocho criterios del jurado, sin pesos: definición del problema · uso de Open Payments · experiencia del usuario · calidad técnica · presentación · inclusión · innovación · impacto.

---

## M1 · Esqueleto (15 min)

1. **¿Qué solución trae cada uno en la cabeza?** Que cada rol diga en una frase qué cree que hay que construir. Se anota tal cual como «llegó pedido». No se discute.
2. **Si eso existe y funciona, ¿la conducta de quién cambia, y cómo?** Hay que llegar a un rol y un verbo. Si nadie puede nombrar el rol, eso ya es un hallazgo y se anota.
3. **Y si ese rol hace eso, ¿cómo nos mueve de la etapa 1 a la 3?** Lo que el equipo responda se anota como **supuesto**, no como certeza.

## M2 · Divergencia (50 min)

**El río (5 min).** Se olvida el producto un momento. ¿Cuál es el camino que lleva a la meta? Se dibuja en tres o cuatro pasos, de izquierda a derecha. Ejemplo de otro caso, solo para entender la forma: «descubrir el concierto → decidir → comprar la entrada → asistir».

**Contribuyentes (10 min).** ¿Quiénes alimentan ese río? Quién trae gente, quién decide, quién paga, quién opera, quién recomienda. Cada uno, por rol. Si sale «los usuarios», se pregunta: ¿qué usuario, en qué momento?

**Contaminadores directos (10 min) — obligatorio.** ¿Quién ensucia el río desde adentro? Roles cuya conducta de hoy hace que la meta no se mueva. Esta ronda casi siempre se salta, y un mapa donde nadie estorba es un mapa falso. Si de verdad nadie estorba, se escribe por qué.

**Contaminadores del aire (5 min).** ¿Quién afecta la meta sin tocar el río? Regulación, competencia, una plataforma de la que dependemos, una regla del evento.

**Rondas por actor (20 min).** Se empieza por el actor más cercano a la meta y se avanza hacia los lejanos, unos 4 minutos por actor. Para cada uno: ¿qué tendría que **empezar**, **dejar**, **hacer distinto** o qué tenemos que **impedir** que haga? Luego tres preguntas de sondeo: ¿cuán distinto? ¿ya lo hace hoy? ¿cómo lo notaríamos? Para los impactos importantes se pregunta además qué estamos suponiendo: que quieren, que pueden, que alcanza.

**Cazador de ausentes (al cierre de la divergencia).** Solo **después** de que el equipo haya nombrado sus actores, se revisa la chuleta del final por si falta algún rol que aparece en las fuentes. Si el equipo lo descarta, se anota que lo descartó y por qué.

## M3 · Convergencia (35 min)

1. **Ejes (10 min).** Cada impacto se pone en dos ejes: ¿**ayuda u obstruye** a la meta? ¿Puede pasar **pronto** (antes del sábado a las 11:00) o **tarde**? Los que ayudan y pueden pasar pronto son los candidatos naturales al corte. Los que obstruyen y pasan pronto son lo primero que hay que neutralizar.
2. **Votación (10 min).** Votación por puntos: **3 puntos por persona**, repartidos como quiera entre los impactos (puede poner varios en uno). Se anota cuántos puntos puso cada rol en cada impacto.
3. **Ahora / ahora-no (10 min).** Con el resultado, el equipo decide qué impactos entran al corte (AHORA) y cuáles quedan en el mapa para el producto (AHORA-NO). Con 9 horas, un corte de más de 2 o 3 impactos rara vez es el camino más corto. Si todo queda en AHORA, no se eligió nada.
4. **Desempate.** Si dos impactos empatan ante el jurado, gana el que deja código reutilizable como primera entrega del producto.
5. **Disenso (5 min).** El facilitador pregunta en voz alta: «¿Alguien no está de acuerdo con este corte?». Se anota tal cual, con el rol. Si nadie disiente, se escribe «nadie disintió», que no es lo mismo que no haber preguntado.

## Parking

Las soluciones que aparezcan durante la noche se anotan aquí con quién las dijo. Al final, cada una se cuelga de un impacto concreto o se queda aparcada. Una solución sin impacto no entra al mapa.

---

## Hoja de captura (lo que me tienes que traer)

Sirve una foto del tablero más esta hoja llena, o un mensaje con lo mismo. Lo que no se anote no va a estar en el mapa.

```text
ASISTENTES (rol) ............ decisor: ......  técnico: ......
HORA REAL: inicio ...... fin ......

ESQUELETO
- llegó pedido: "........" (dijo: rol)
- conducta: [rol] → "........" (dijo: rol)
- puente a la meta / supuesto: "........" (dijo: rol)

RÍO: paso 1 → paso 2 → paso 3 → paso 4

CONTRIBUYENTES:         [rol] "..." (dijo: rol)
CONTAMINADORES DIRECTOS: [rol] "..." (dijo: rol)   ← o "nadie, porque ..."
CONTAMINADORES DEL AIRE: [rol] "..." (dijo: rol)

RONDAS POR ACTOR
[actor]
  - empezar / dejar / hacer distinto / impedir: "..." (dijo: rol)
    cuán distinto: ...   ¿ya lo hace?: ...   supuesto: ...

PARKING: "..." (dijo: rol) → cuelga de [impacto] / aparcada

CONVERGENCIA
ejes: [impacto] ayuda|obstruye · pronto|tarde
votos (3 por persona): [impacto]: negocio _ · pagos _ · frontend _ · pitch _
AHORA: ...        AHORA-NO: ...
DISENSO: "..." (rol)   |   nadie disintió
```

---

## Chuleta del facilitador — solo para el cazador de ausentes

**No se lee al comienzo.** Son roles que aparecen en las fuentes. No son actores mientras el equipo no los nombre o los acepte.

| Rol | Dónde aparece |
|---|---|
| Quien crea y administra la natillera | PDF (E-05 a E-08) |
| Quien es invitado y participa | PDF (E-08 a E-13) |
| La empresa financiera que custodia y presta (no identificada) | PDF (E-04, E-15) y Metas (M-03) |
| El ganador de un premio de actividad | PDF (E-14) |
| El jurado de la ronda 1 y el panel de la ronda 2 (con representantes de cada premio) | Página de evaluación |
| Los mentores técnicos que revisan el repositorio a las 11:00 | Página de evaluación |
| Los participantes que votan el premio de la comunidad | Página principal del evento |
| Los proveedores de billetera compatibles con Open Payments (en el evento, la Test Wallet) | Página de herramientas |

## Después de la reunión

Con la captura, el asistente escribe el taller crudo (`taller-crudo.md`), estructura el mapa, lo pasa por el linter y cierra Impact Mapping. Luego vienen USMD, que arma el recorrido y rebana el corte, y BDD 2.0, que especifica la rebanada elegida. Así el equipo llega el viernes a las 10:30 con el corte especificado, sin haber escrito una línea de código antes del evento.
