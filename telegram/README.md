# Frente Telegram

El bot donde los integrantes de la natillera y su administrador hacen todo: crear la natillera, invitar, unirse, autorizar el cobro, ver sus aportes, recibir recordatorios de mora, pagar actividades y pedir préstamos.

**Issues:** [frente: telegram](https://github.com/fintechfy-dev/openpayments-fintechfy/issues?q=is%3Aopen+label%3A%22frente%3A+telegram%22). Empieza por #7 (esqueleto).

## Mensajes e imágenes

Los textos del bot siguen la [voz y tono](../design-system/docs/voz-y-tono.md) del design system. El avatar es `design-system/assets/logos/kit/05_avatar/avatar_verde_oscuro_512px.png`, y las tarjetas-imagen salen de `TarjetaAporte`, `TarjetaBienvenida` y `TarjetaCredito` con los colores de `design-system/tokens/tokens.resolved.json`.

## Contratos

- **Con el servicio externo de lógica financiera:** crea y consulta natilleras, participantes y préstamos. El contrato se escribe en [`../integracion/README.md`](../integracion/README.md) (#5).
- **Con el servicio de pagos:** inicia el permiso interactivo de cada participante y recibe la vuelta después de que aprueba en su billetera (US-005, US-005-INT). Ver [`../pagos/README.md`](../pagos/README.md) (#4).
- **Avisos:** cobro hecho, permiso rechazado, mora, préstamo y liquidación (#6). _Por definir: webhook del bot o consulta periódica._

El bot no mueve dinero: eso pasa en el servicio de pagos.

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

**Mini App:** el formulario está en [`miniapp/`](miniapp/) y necesita una dirección https (GitHub Pages o un túnel). Cómo publicarla y las decisiones: [`docs/crear-natillera.md`](docs/crear-natillera.md).

Solo puede correr una copia del bot por token: si sale `409: Conflict`, hay otra abierta.

**Pruebas:** `npm test` (no necesitan token ni conexión).

**Plan, decisiones y avance del esqueleto:** [`docs/plan-esqueleto.md`](docs/plan-esqueleto.md). **Crear la natillera (#13):** [`docs/crear-natillera.md`](docs/crear-natillera.md).
