# Frente Telegram

El bot donde los integrantes de la natillera y su administrador hacen todo: crear la natillera, invitar, unirse, autorizar el cobro, ver sus aportes, recibir recordatorios de mora, pagar actividades y pedir préstamos.

**Issues:** [frente: telegram](https://github.com/fintechfy-dev/openpayments-fintechfy/issues?q=is%3Aopen+label%3A%22frente%3A+telegram%22). Empieza por #7 (esqueleto).

## Contratos

- **Con el motor:** crea y consulta natilleras y participantes. El contrato se escribe en [`../motor/README.md`](../motor/README.md) (#5).
- **Con el servicio de pagos:** inicia el permiso interactivo de cada participante y recibe la vuelta después de que aprueba en su billetera (US-005, US-005-INT). Ver [`../pagos/README.md`](../pagos/README.md) (#4).
- **Avisos del motor:** cobro hecho, permiso rechazado, mora, préstamo y liquidación (#6). _Por definir: webhook del bot o consulta periódica._

El bot no mueve dinero: lo hacen el motor y el servicio de pagos.

## Cómo correrlo

_Por completar en #7: lenguaje, instalación, variables de `.env` (el token del bot va ahí) y comando para arrancarlo._
