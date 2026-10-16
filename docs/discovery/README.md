# Discovery de Natillera 2.0

Diseño hecho **antes** de la hackathon (14 y 15 de octubre de 2026). Son documentos de diseño, no el código del evento. La carpeta `4-fnd-motor` incluye además código y plantillas del motor financiero generados en ese discovery; no forman parte de la solución de la hackathon.

Se leen en este orden; cada etapa siembra la siguiente.

| Carpeta | Qué es | Empezar por |
|---|---|---|
| [1-impact-mapping](1-impact-mapping/) | Mapa de impacto: la meta (premio a la Inclusión), los actores, los impactos y el camino más corto | `brief.md`, `mapa.yaml`, `destino.md` |
| [2-user-story-mapping](2-user-story-mapping/) | Mapa de historias: el viaje del usuario y la rebanada «Primera natillera de punta a punta» | `mapa-historias.yaml` |
| [3-bdd](3-bdd/) | Especificación: 7 épicas, 24 historias en el corte, 141 criterios y 78 escenarios Gherkin | `mvp-scope.md`, `epics/`, `features/` |
| [4-fnd-motor](4-fnd-motor/) | Discovery financiero sobre el motor: contratos, reglas y plantillas del producto | `fnd-session.md`, `ecosystem-spec.md` |

La fuente original de todo es [`../fuente/Natillera 2.pdf`](../fuente/).

Las rutas que aparecen dentro de estos archivos (`bdd-2.0/...`, `impact-mapping-discovery/...`) son las del repositorio donde se hizo el discovery; aquí cada sesión vive en su carpeta numerada.
