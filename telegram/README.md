# Frente Telegram

El bot donde los integrantes de la natillera y su administrador hacen todo: crear la natillera, invitar, unirse, autorizar el cobro, ver sus aportes, recibir recordatorios de mora, pagar actividades y pedir préstamos.

**Issues:** [frente: telegram](https://github.com/fintechfy-dev/openpayments-fintechfy/issues?q=is%3Aopen+label%3A%22frente%3A+telegram%22). Empieza por #7 (esqueleto).

## Mensajes e imágenes

Los textos del bot siguen la [voz y tono](../design-system/docs/voz-y-tono.md) del design system. El avatar es `design-system/assets/logos/avatar-telegram.svg` (exportado a PNG de 512×512), y las tarjetas-imagen salen de `TarjetaAporte` y `TarjetaBienvenida` con los colores de `design-system/tokens/tokens.resolved.json`.

## Contratos

- **Con el servicio externo de lógica financiera:** crea y consulta natilleras, participantes y préstamos. El contrato se escribe en [`../integracion/README.md`](../integracion/README.md) (#5).
- **Con el servicio de pagos:** inicia el permiso interactivo de cada participante y recibe la vuelta después de que aprueba en su billetera (US-005, US-005-INT). Ver [`../pagos/README.md`](../pagos/README.md) (#4).
- **Avisos:** cobro hecho, permiso rechazado, mora, préstamo y liquidación (#6). _Por definir: webhook del bot o consulta periódica._

El bot no mueve dinero: eso pasa en el servicio de pagos.

## Cómo correrlo

_Por completar en #7: lenguaje, instalación, variables de `.env` (el token del bot va ahí) y comando para arrancarlo._
