# LineaTiempoPago

Recorrido de un pago por sus 4 etapas Open Payments: **Solicitud, Autorización, Ejecución, Finalización**.

- Lista ordenada `nt-linea`; cada etapa `nt-linea__paso` con `--hecho`, `--actual` o `--fallido` (sin modificador = pendiente).
- Partes: `nt-linea__marca` (ícono check/alerta/reloj), `nt-linea__titulo`, `nt-linea__detalle` o `nt-linea__motivo` (para fallidos, siempre con el motivo en palabras simples), `nt-linea__hora`.
- Para el jurado se muestran los nombres técnicos de las etapas; para participantes, resume en una frase ("Tu cuota se cobró el 15 de oct").
