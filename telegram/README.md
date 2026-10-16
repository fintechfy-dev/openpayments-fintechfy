# Frente Telegram

El bot donde los integrantes de la natillera y su administrador hacen todo: crear la natillera, invitar, unirse, autorizar el cobro, ver sus aportes, recibir recordatorios de mora, pagar actividades y pedir préstamos.

**Issues:** [frente: telegram](https://github.com/fintechfy-dev/openpayments-fintechfy/issues?q=is%3Aopen+label%3A%22frente%3A+telegram%22). Empieza por #7 (esqueleto).

## Mensajes e imágenes

Los textos del bot siguen la [voz y tono](../design-system/docs/voz-y-tono.md) del design system. El avatar es `design-system/assets/logos/kit/05_avatar/avatar_verde_oscuro_512px.png`, y las tarjetas-imagen salen de `TarjetaAporte`, `TarjetaBienvenida` y `TarjetaCredito` con los colores de `design-system/tokens/tokens.resolved.json`.

## Contratos

- **Con el servicio externo de lógica financiera:** crea los contratos y ejecuta las acciones. Cada llamada está en [`INTEGRACION.md`](INTEGRACION.md).
- **Con la web, donde viven los pagos:** pide el permiso de cada participante y lo recibe cuando vuelve al chat después de aprobarlo en su billetera (US-005, US-005-INT). Ver [`INTEGRACION.md`](INTEGRACION.md) y [`../pagos/README.md`](../pagos/README.md) (#4).
- **Avisos:** mora, préstamo, ventas y liquidación vienen de staging; el cobro hecho o fallido lo agrega la web al terminar cada pago (#6). Todos llegan a la web y el bot se los pide cada pocos segundos: el bot no necesita dirección pública.

El bot no mueve dinero: eso pasa en los pagos de Open Payments, que viven en el backend de la web.

## Cómo correrlo

Node.js 24 o más nuevo y [grammY](https://grammy.dev). Todo se corre **dentro de esta carpeta**.

1. Crea un bot con [@BotFather](https://t.me/BotFather) (`/newbot`) y copia el token. No lo pegues en ningún chat.
2. Copia `.env.example` a `.env` (el `.env` está en `.gitignore`) y llénalo. Son obligatorias `BOT_TOKEN`, `TEAM_CHAT_ID`, `CUOTA_MIN`, `CUOTA_MAX` y `MORA_DIARIA_MAX_PCT`; si falta alguna o está mal, el bot no arranca y lista todos los errores, sin mostrar los valores.
   ```powershell
   Copy-Item .env.example .env   # solo si todavía no tienes .env: lo sobrescribe
   ```
3. Instala y arranca:
   ```bash
   cd telegram
   npm install
   npm start        # o npm run dev para reiniciar al guardar
   ```
4. Escríbele `/start` al bot. En la terminal queda el id del chat, que sirve como `TEAM_CHAT_ID`.
5. En el chat del equipo, `/diag` muestra la configuración en uso y cuántas sesiones hay guardadas. En cualquier otro chat no responde.
6. `/crear` (o el botón de la bienvenida) arma la natillera: con `MINIAPP_URL` ofrece el formulario de la Mini App o responder en el chat; sin ella, pregunta en el chat con botones. Las respuestas sobreviven a un reinicio del bot y `/cancelar` deja todo como estaba. Las sesiones quedan en `telegram/data/bot.db` (ignorada por git). Por ahora termina en una vista previa: crear de verdad espera el contrato de #5.

7. `/mi_natillera` (o el botón **Mi natillera** junto al cuadro de texto) responde en el chat con lo que hay en staging: cuánto lleva, la próxima cuota o cuántos faltan para arrancar, y el botón que le toca. Sin `SERVICIO_EXTERNO_URL` abre la Mini App, que muestra datos de ejemplo.
8. `/administrar` es el panel del administrador: abre la Mini App `miniapp/admin/` con cada natillera que administra (nombre y fecha de creación para distinguirlas), quién falta por autorizar, cómo va el arranque y el enlace para compartir. Los datos los lee el bot de staging y viajan en el fragmento del enlace (`#d=...`), que no sale del teléfono; para refrescarlos se vuelve a escribir `/administrar`. Sin `MINIAPP_URL` responde en el chat, un mensaje por natillera. `/invitar` pregunta de cuál natillera si administras varias.

**Mini App:** está en [`miniapp/`](miniapp/): el formulario de crear en `miniapp/` y «Mi natillera» en `miniapp/natillera/`. Se publica en GitHub Pages (`MINIAPP_URL`). Cómo publicarla: [`docs/crear-natillera.md`](docs/crear-natillera.md); la pantalla del participante: [`docs/mi-natillera.md`](docs/mi-natillera.md).

Solo puede correr una copia del bot por token: si sale `409: Conflict`, hay otra abierta.

**Pruebas:** `npm test` (no necesitan token ni conexión).

**Plan, decisiones y avance del esqueleto:** [`docs/plan-esqueleto.md`](docs/plan-esqueleto.md). **Crear la natillera (#13):** [`docs/crear-natillera.md`](docs/crear-natillera.md). **Mi natillera (#26):** [`docs/mi-natillera.md`](docs/mi-natillera.md).
