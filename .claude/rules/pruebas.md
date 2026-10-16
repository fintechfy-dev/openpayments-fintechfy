# Regla: pruebas

Con 9 horas no hay cobertura del 90%: hay que probar lo que, si falla, le cuesta dinero o confianza a un participante o hace caer la demo.

- **Siempre con prueba:** cálculos de dinero y formato (`formatoCOP`, cuotas, mora, liquidación que muestra la UI), validación de entradas en el servidor (Server Actions, comandos del bot), mapeo de estados, y cualquier regla que se declare "una sola vez".
- **Un test que no falla cuando rompes el comportamiento no prueba nada.** Antes de darlo por bueno, rompe a propósito la línea que protege y míralo fallar.
- **Paridad entre copias:** si una lógica existe en dos lenguajes (por ejemplo `bundle.js` del design system y `web/src/lib/natillera.ts`), una prueba compara las dos. Sin esa prueba, divergen en silencio.
- **Lo visual se prueba mirando**: `npm run capturas` en `web/` (360, 768, 1024 y 1280 px, claro y oscuro) y revisar las imágenes, no solo el reporte de scroll.
- **El flujo de pago real** (solicitud, autorización, ejecución y finalización en la Test Wallet) se prueba a mano y se guarda la evidencia (captura o video): es lo mínimo para una entrega válida y ningún pipeline lo cubre.
- Si una prueba falla y no la tocaste, compárala contra `develop` limpio antes de depurarla como propia.
