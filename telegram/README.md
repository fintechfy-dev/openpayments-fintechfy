# Frente Telegram

El bot donde los integrantes de la natillera y su administrador hacen todo: crear la natillera, invitar, unirse, autorizar el cobro, ver sus aportes, recibir recordatorios de mora, pagar actividades y pedir préstamos.

**Issues:** [frente: telegram](https://github.com/fintechfy-dev/openpayments-fintechfy/issues?q=is%3Aopen+label%3A%22frente%3A+telegram%22). Empieza por #7 (esqueleto).

## Mensajes e imágenes

Los textos del bot siguen la [voz y tono](../design-system/docs/voz-y-tono.md) del design system. El avatar es `design-system/assets/logos/kit/05_avatar/avatar_verde_oscuro_512px.png`, y las tarjetas-imagen salen de `TarjetaAporte`, `TarjetaBienvenida` y `TarjetaCredito` con los colores de `design-system/tokens/tokens.resolved.json`.

## Contratos

- **Con el servicio externo de lógica financiera:** crea los contratos y ejecuta las acciones. Cada llamada está en [`INTEGRACION.md`](INTEGRACION.md).
- **Con la API de pagos (`pagos/`):** pide el permiso de cada participante y lo termina cuando vuelve al chat después de aprobarlo en su billetera (US-005, US-005-INT). **Pendiente:** hoy autoriza con un permiso de prueba. Ver [`INTEGRACION.md`](INTEGRACION.md) y [`../pagos/API.md`](../pagos/API.md) (#4).
- **Avisos:** mora, préstamo, ventas y liquidación vienen de staging, que se los entrega a la web; el cobro hecho o fallido lo avisa la API de pagos (#6). El bot le pide los suyos a cada una cada pocos segundos: no necesita dirección pública. Los de pago ya llegan (`src/avisos/pagos.js`). **Pendiente (#6):** los de staging. Mientras tanto, el bot vigila el estado de sus natilleras en staging y avisa cuando arrancan, liquidan o cierran, y cuando alguien entra o sale de mora (`src/avisos/estados.js`). Lo que falta está en [`INTEGRACION.md`](INTEGRACION.md).

El bot no mueve dinero: eso pasa en la API de pagos (`pagos/`), lo único que habla con Open Payments.

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
6. `/crear` (o el botón de la bienvenida) arma la natillera: con `MINIAPP_URL` ofrece el formulario de la Mini App o responder en el chat; sin ella, pregunta en el chat con botones. Las respuestas sobreviven a un reinicio del bot y `/cancelar` deja todo como estaba. Las sesiones quedan en `telegram/data/bot.db` (ignorada por git). Con `SERVICIO_EXTERNO_URL` crea la natillera en staging, la registra, le avisa a la web y entrega el enlace de invitación; sin ella termina en una vista previa.

7. `/mi_natillera` responde en el chat con lo que hay en staging: cuánto lleva, la próxima cuota o cuántos faltan para arrancar, y el botón que le toca. Sin `SERVICIO_EXTERNO_URL` abre la Mini App. El botón **Mi natillera** junto al cuadro de texto abre siempre la Mini App, que por ahora muestra datos de ejemplo: es uno solo para todos los chats, así que no puede llevar los datos de cada persona en el enlace.
8. `/administrar` es el panel del administrador: abre la Mini App `miniapp/admin/` con cada natillera que administra (nombre y fecha de creación para distinguirlas), quién falta por autorizar, cómo va el arranque y el enlace para compartir. Los datos los lee el bot de staging y viajan en el fragmento del enlace (`#d=...`), que no sale del teléfono; para refrescarlos se vuelve a escribir `/administrar`. Sin `MINIAPP_URL` responde en el chat, un mensaje por natillera. `/invitar` pregunta de cuál natillera si administras varias.
9. `/prestamo` (o «Pedir préstamo» en «Mi natillera», en la Mini App o en el aviso de que ya puede pedirlo) revisa en staging si la persona puede pedir un préstamo, pregunta monto y plazo, y le pasa la solicitud a la web, donde Financiera Aliada decide.
10. `/reloj` (solo en el chat del equipo, no se anuncia) mueve el tiempo de una natillera en staging con fechas simuladas (`CurrentDate`): `iniciar`, `periodo`, `cupo`, `mora`, `liquidar`, `estado`, y `auto <natillera> [segundos]`, que da un paso cada minuto (una cuota mensual por minuto) hasta liquidar. Las acciones del reloj son privadas en staging: el token tiene que tener rol admin. `/reloj` sin nada muestra la ayuda.
11. Con `PAGOS_URL` (y su llave y las de Open Payments, ver `.env.example`), «Autorizar el cobro» es real: el bot pide el permiso a la API de pagos (`pagos/API.md`), da el botón «Abrir mi billetera» y, cuando la persona vuelve con `/start permiso_<id>` o toca «Ya aprobé», confirma la autorización en staging con el permiso aprobado. Sin `PAGOS_URL`, el permiso es de prueba y el bot lo dice.

**Mini App:** está en [`miniapp/`](miniapp/): el formulario de crear en `miniapp/` y «Mi natillera» en `miniapp/natillera/`. Se publica en GitHub Pages (`MINIAPP_URL`). Cómo publicarla: [`docs/crear-natillera.md`](docs/crear-natillera.md); la pantalla del participante: [`docs/mi-natillera.md`](docs/mi-natillera.md).

Solo puede correr una copia del bot por token: si sale `409: Conflict`, hay otra abierta.

**Pruebas:** `npm test` (no necesitan token ni conexión).

**Plan, decisiones y avance del esqueleto:** [`docs/plan-esqueleto.md`](docs/plan-esqueleto.md). **Crear la natillera (#13):** [`docs/crear-natillera.md`](docs/crear-natillera.md). **Mi natillera (#26):** [`docs/mi-natillera.md`](docs/mi-natillera.md).
