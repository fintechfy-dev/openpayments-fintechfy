# TarjetaCredito

Resumen del préstamo de un participante: tarjeta-imagen que envía el bot (`/prestamo` y después de cada pago) y detalle en la web. Mismo formato que `TarjetaAporte`, 540px de ancho.

- Encabezado sobre `marca-fondo` con texto blanco, ícono `credito`, quién presta (siempre la financiera) y el badge del estado (`Natillera.badge("credito", …)`).
- Datos: lo que falta por pagar (`nt-dato__valor`) y la próxima cuota con su fecha. Avance con `nt-cuotas`; una cuota vencida usa `nt-cuota--mora`.
- Pie en `secundario-suave`: recuerda que el préstamo va aparte del ahorro y qué pasa si una cuota queda pendiente (se descuenta en la liquidación, US-015).
- En mora: el badge cambia a **En mora** y el pie dice el monto pendiente, sin culpar (ver Voz y tono).
