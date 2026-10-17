# ProgresoAhorro

Muestra cuánto va del ahorro. Dos formas: barra continua (dinero) y cuotas segmentadas (n de N).

- Barra: `nt-progreso__pista` > `nt-progreso__barra` con `width:%`; añade `role="progressbar"` y `aria-valuenow`.
- Cuotas: `nt-cuotas` con `--n` = número de cuotas; cada una `nt-cuota` + `--pagada`, `--mora` o `--hoy` (la próxima).
- El avance siempre se escribe también en texto ("3/12 pagadas"); la `pista` es decorativa.
