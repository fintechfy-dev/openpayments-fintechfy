@README.md

## Al trabajar en `pagos/`

- **El código de esta carpeta lo escribe el equipo, no Claude** (`.claude/rules/ia-y-prompts.md`): los mentores lo revisan línea por línea. Claude explica el SDK, revisa y sugiere en el chat, con la skill `natillera-open-payments`. Si la persona escribió algo con ayuda de IA, que quede declarado con precisión en `AI_USAGE.md`.
- La documentación de la carpeta (este README y las notas `.md`) sí se puede escribir y se mantiene al día.

## Qué mantener al día

- **Cuando aparezca el código:** sección "Estructura" (archivo por archivo), "Cómo correrlo" (hoy `_Por completar en #4_`), variables en `.env.example` y en una tabla del README.
- **Cuando se definan las rutas del permiso interactivo** (bot → pagos): "Lo que necesita el bot" aquí, el mapa de `telegram/INTEGRACION.md` y el flujo en `docs/arquitectura.md`.
- **Si cambia el contrato con el servicio externo** (`/cobrar-cuota`, `/cobrar`, `/pagar`, `/desembolsar`): la tabla de este README e `integracion/README.md`.
- **Cuando haya un pago real de punta a punta:** "Cómo usa Open Payments" del README raíz y la evidencia en `docs/checklist-entrega.md` (`b-op`, `b-primer-pago`, `b-evidencia`).
