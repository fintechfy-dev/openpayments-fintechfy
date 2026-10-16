# Frente Telegram

El bot donde los integrantes de la natillera y su administrador hacen todo: crear la natillera, invitar, unirse, autorizar el cobro, ver sus aportes, recibir recordatorios de mora, pagar actividades y pedir préstamos.

**Issues:** [frente: telegram](https://github.com/fintechfy-dev/openpayments-fintechfy/issues?q=is%3Aopen+label%3A%22frente%3A+telegram%22). Empieza por #7 (esqueleto).

## Contratos

- **Con el servicio externo de lógica financiera:** crea y consulta natilleras, participantes y préstamos. El contrato se escribe en [`../integracion/README.md`](../integracion/README.md) (#5).
- **Con el servicio de pagos:** inicia el permiso interactivo de cada participante y recibe la vuelta después de que aprueba en su billetera (US-005, US-005-INT). Ver [`../pagos/README.md`](../pagos/README.md) (#4).
- **Avisos:** cobro hecho, permiso rechazado, mora, préstamo y liquidación (#6). _Por definir: webhook del bot o consulta periódica._

El bot no mueve dinero: eso pasa en el servicio de pagos.

## Cómo correrlo

Node.js 24 o más nuevo y [grammY](https://grammy.dev). Todo se corre **dentro de esta carpeta**.

1. Crea un bot con [@BotFather](https://t.me/BotFather) (`/newbot`) y copia el token. No lo pegues en ningún chat.
2. Crea `telegram/.env` con el token (el archivo está en `.gitignore`):
   ```
   BOT_TOKEN=<tu token>
   ```
   _La lista completa de variables llega en `.env.example` con la tarea 2 del [plan](docs/plan-esqueleto.md)._
3. Instala y arranca:
   ```bash
   cd telegram
   npm install
   npm start        # o npm run dev para reiniciar al guardar
   ```
4. Escríbele `/start` al bot. En la terminal queda el id del chat, que sirve como `TEAM_CHAT_ID`.

Solo puede correr una copia del bot por token: si sale `409: Conflict`, hay otra abierta.

**Pruebas:** `npm test` (no necesitan token ni conexión).

**Plan, decisiones y avance del esqueleto:** [`docs/plan-esqueleto.md`](docs/plan-esqueleto.md).
