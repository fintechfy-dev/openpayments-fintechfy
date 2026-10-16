# SolicitudesCredito

Pantalla de la web donde la financiera ve las solicitudes de préstamo y las aprueba o no (issue #10, US-014). Escritorio, sobre `Tabla`.

- Una fila por solicitud: participante y su natillera, su historial de ahorro (cuotas al día y máximo que puede pedir, N × cuota), monto pedido, cuota mensual con plazo y tasa, estado (`Natillera.badge("credito", …)`) y acciones.
- Acciones solo mientras está **Solicitado**: `nt-btn--primario nt-btn--sm` "Aprobar" y `nt-btn--secundario nt-btn--sm` "No aprobar". Nunca "Rechazar" en rojo: no aprobar no es un error.
- Si el participante tiene cuotas pendientes en la natillera, se dice en la columna de ahorro ("1 pendiente"), en palabras, sin badge rojo.
- Montos, cuota y máximo vienen del servicio externo de lógica financiera; la web no los calcula.
