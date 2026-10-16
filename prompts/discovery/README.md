# Prompts del discovery

El diseño previo al evento (`docs/discovery/`) se hizo con Claude Code guiado por **tres sistemas de descubrimiento**. Los prompts de esa etapa salen de esos sistemas: cada uno define las fases y las preguntas que la IA le hace al equipo, el equipo responde y aprueba cada fase, y la IA redacta los documentos con esas respuestas.

Se usaron en cadena; cada sistema siembra al siguiente:

| Orden | Sistema | Ficha | Lo que produjo |
|---|---|---|---|
| 1 | Impact Mapping Discovery (IMD) | [impact-mapping.md](impact-mapping.md) | La meta acordada y el camino más corto hacia ella |
| 2 | User Story Mapping Discovery (USMD) | [user-story-mapping.md](user-story-mapping.md) | El viaje del usuario y la rebanada que se construye |
| 3 | BDD 2.0 | [bdd.md](bdd.md) | Épicas, historias, criterios y escenarios Gherkin |

Los prompts de código escritos durante la hackathon no van aquí: van en `prompts/<frente>-<tema>.md`, como pide la política de IA (ver [`../README.md`](../README.md)).
