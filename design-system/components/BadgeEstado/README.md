# BadgeEstado

Píldora que nombra el estado de una natillera, un participante o un pago. Siempre ícono + palabra: nunca solo color.

- Generar: `Natillera.badge("pago", "fallido")` o marcado `<span class="nt-badge nt-badge--error"><svg class="nt-ico">…</svg>Fallido</span>`.
- Variantes: `neutro`, `info`, `exito`, `aviso`, `error`, `celebra` (ver la sección Estados para el mapa completo).
- **En mora** usa `aviso` (naranja), nunca `error`: es un atraso de una persona, no una falla.
- Texto en mayúscula inicial ("En mora"), sin puntos.
