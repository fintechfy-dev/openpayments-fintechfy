# TarjetaAporte

Tarjeta-imagen (PNG) que el bot envía después de cada cuota: tu aporte, cuotas pagadas y total del grupo.

- Renderiza este HTML a 1080×(alto) con Playwright/Puppeteer (`deviceScaleFactor: 2` sobre 540px) y envíala con `sendPhoto`; el texto del mensaje repite los datos para lectores de pantalla.
- Datos: nombre de la natillera, fecha del cobro, aporte acumulado, cuotas n/N, total del grupo, custodio.
- Siempre en tema claro (se ve en cualquier chat). El pie de custodia es obligatorio.
