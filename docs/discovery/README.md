# Discovery de Natillera 2.0

Diseño hecho **antes** de la hackathon (14 y 15 de octubre de 2026). Son documentos de diseño, no código.

Se leen en este orden; cada etapa siembra la siguiente.

| Carpeta | Qué es | Empezar por |
|---|---|---|
| [1-impact-mapping](1-impact-mapping/) | Mapa de impacto: la meta (premio a la Inclusión), los actores, los impactos y el camino más corto | `brief.md`, `mapa.yaml`, `destino.md` |
| [2-user-story-mapping](2-user-story-mapping/) | Mapa de historias: el viaje del usuario y la rebanada «Primera natillera de punta a punta» | `mapa-historias.yaml` |
| [3-bdd](3-bdd/) | Especificación: 7 épicas, historias con sus criterios y escenarios Gherkin | `mvp-scope.md`, `epics/`, `features/` |
| [4-logica-financiera](4-logica-financiera/) | Las reglas de dinero que aplica el servicio externo de lógica financiera, y el contrato con el que pide los pagos | `especificacion-funcional.md` |

La fuente original de todo es [`../fuente/Natillera 2.pdf`](../fuente/).

El plan vigente es el [plan de trabajo](../plan-de-trabajo.md): manda sobre estos documentos cuando difieren (por ejemplo, el crédito pasó de extra a núcleo y el trabajo se reparte en tres frentes). Las rutas que aparecen dentro de estos archivos (`bdd-2.0/...`, `impact-mapping-discovery/...`) son las del repositorio donde se hizo el discovery.
