# Plan de trabajo

Actualizado el viernes 16 de octubre a las 19:30. Los pagos de Open Payments viven en una API aparte, en `pagos/`, publicada en Azure (PR #71); la web se despliega en Azure y recibe los avisos de staging; entra la versión 0.2.0 del servicio externo, con ventas entre participantes.

## La meta

Que el jurado lleve Natillera 2.0 a la ronda final y la premie por su aporte a la inclusión financiera (Premio Puntored). El mínimo aceptable es una entrega válida con **un pago real de Open Payments de punta a punta**: solicitud, autorización, ejecución y finalización.

## Cómo está armado

```mermaid
flowchart LR
  P["Integrantes y administrador"] -->|chat| BOT["telegram/<br/>Bot"]
  F["Financiera y administrador"] --> WEB["web/<br/>Página + backend<br/>(Azure)"]
  BOT -->|contratos y acciones| EXT[("Servicio externo<br/>de lógica financiera")]
  WEB -->|estado, búsqueda, créditos| EXT
  EXT -->|avisos| WEB
  BOT -->|índice · pide avisos| WEB
  EXT -->|cobrar-cuota · cobrar · pagar · desembolsar ·<br/>pagar-con-permiso · aportar-con-permiso| PAG["pagos/<br/>API de pagos<br/>(Azure)"]
  BOT -->|permisos · avisos de pago| PAG
  WEB -->|registro de pagos| PAG
  PAG -->|firma y paga| OP["Open Payments<br/>Test Wallet"]
```

- **El servicio externo de lógica financiera** aplica las reglas de dinero: cupo y arranque, cobro de cada periodo, mora, actividades, crédito, ventas y liquidación. Es como un n8n que contiene la lógica financiera: no forma parte de esta hackathon y el proyecto solo lo llama por API. Sus reglas están en la [especificación funcional](discovery/4-logica-financiera/especificacion-funcional.md).
- **La API de pagos** (`pagos/`, en `https://natillera-pagos.azurewebsites.net`) es lo único que habla con Open Payments y el corazón de lo que evalúa el jurado. La escribió Claude Code y así se declara; el equipo tiene que poder explicar cada paso del pago.
- **El backend de la web** recibe los avisos de staging, guarda lo que staging no tiene y muestra el registro de la API de pagos.
- **El bot** crea los contratos y ejecuta las acciones de cada persona. No mueve dinero.

## Quién lleva qué

| Quién | Qué | Mapa | Issues |
|---|---|---|---|
| **Estiven** | Bot: contratos, acciones, permisos con la API de pagos, avisos (los de staging desde la web y los de pago desde la API), Mini Apps | [`telegram/INTEGRACION.md`](../telegram/INTEGRACION.md) | [frente: telegram](https://github.com/fintechfy-dev/openpayments-fintechfy/issues?q=is%3Aopen+label%3A%22frente%3A+telegram%22) |
| **Johan** | Web y su backend: pantallas, índice, avisos de staging, `/pagos` con el registro de la API de pagos y despliegue en Azure | [`web/INTEGRACION.md`](../web/INTEGRACION.md) | [frente: web](https://github.com/fintechfy-dev/openpayments-fintechfy/issues?q=is%3Aopen+label%3A%22frente%3A+web%22) |
| **Willy** | Staging (versión 0.2.0, token, destino de avisos, reloj de la demo) y la API de pagos: su configuración en Azure, el #3 en la Test Wallet, los permisos del grupo y de la financiera, y la conexión de staging con ella | [`integracion/README.md`](../integracion/README.md) y [`pagos/API.md`](../pagos/API.md) | #3, #4, #55, #56, #57, #65, #66, #67 |
| **Juan Rafael** | Por asignar | — | — |

## Orden de trabajo

| Cuándo | Qué |
|---|---|
| **Ahora** | Willy: cargar en la API de pagos `BOT_USUARIO`, `OP_WALLET_GRUPO` y `OP_WALLET_FINANCIERA` (hoy `/api/salud` responde 503) y hacer el **#3** en la Test Wallet: dos cobros con un mismo permiso recurrente y dos pagos con un mismo permiso de un solo uso. Confirmar la 0.2.0 en el tenant (#66) y el token (#65). Johan: web en Azure (#68) con el índice y los avisos. Estiven: permisos con la API de pagos y avisos de las dos fuentes |
| **20:00 · punto de control** | ¿La 0.2.0 está instalada y hay capacidad para la compra? Si las dos respuestas son sí, entran las ventas (solo la compra). Se recomienda dejar las devoluciones fuera de la demo |
| **20:00 a medianoche** | Avisos a través de la web, permisos del bot con su vuelta al chat y `/pagos` con el registro. Antes del modo real, los dueños aprueban una vez los permisos `grupo` y `financiera` (#67). Después Willy configura en staging la dirección de la API de pagos, su llave y los encabezados `X-OP-*`, y la pasa a modo real (#55) |
| **Medianoche · punto de control** | **Un cobro real de punta a punta disparado desde staging** |
| **Madrugada** | La compra, si se aprobó a las 20:00 |
| **Sábado 06:00** | Corre el reloj real de staging: crear las natilleras de la demo después de esta hora |
| **Sábado 08:00 · punto de control** | Si todavía no hay flujo real, pasar al plan de respaldo: la lógica en modo de prueba más un pago real aparte, declarado como tal |
| **Sábado 08:00 a 10:30** | Guion de demo con 4 billeteras (US-018-TST), video del pago completo, `AI_USAGE.md` y prompts |
| **Sábado 10:30 a 11:00** | Congelar y entregar: #11 |

## Riesgos abiertos

| Riesgo | Qué hacer | Issue |
|---|---|---|
| El cobro recurrente con un solo permiso nunca se probó cobrando de verdad, y un intervalo correría en tiempo real mientras la demo adelanta fechas | Probarlo primero; para la demo, permiso sin intervalo con un tope total que alcance para cuotas, mora y actividades; plan B, un permiso de un solo uso por cuota | #3 |
| La API de pagos solo se probó con un Open Payments falso (32 pruebas) y le falta configuración en Azure | Cargar la configuración y hacer el #3 antes de medianoche | #3, #4 |
| Los permisos de la billetera del grupo y de la financiera no están aprobados cuando staging pasa a modo real: fallan premios, liquidaciones y préstamos | Sus dueños los aprueban una vez antes; la API guarda y renueva los tokens | #67 |
| Staging y el bot mandan llaves de Open Payments distintas: el permiso queda atado a la del bot y la API responde 422 | Usar la misma billetera cliente y la misma llave en los dos | #55 |
| La llave privada que staging manda como encabezado fijo se puede leer con cualquier token de la organización | Es de una billetera de prueba: rotarla después del evento | #55 |
| El token de staging vence en plena demo | Willy define la duración y quién lo renueva | #65 |
| La 0.2.0 no está en el tenant, o la natillera se creó antes de actualizarlo (queda sellada en su versión) | Comprobarlo antes de las 20:00; crear las natilleras de la demo después | #66 |
| La web se reinicia y pierde el índice o los avisos | Base persistente en Azure y una sola copia corriendo | #68 |
| El reloj real de las 06:00 corre sobre las natilleras de prueba | Crear las de la demo después; Willy limpia antes las de prueba | #57 |
| El bot escucha el flujo en vivo de staging, que no trae los avisos (solo cascadas entre contratos, sin datos) | Cambiar la fuente: los de staging se los pide a la web y los de pago a la API de pagos | #6 |
| Límites de la puerta de staging: 5 escrituras y 20 lecturas por segundo por dirección IP del servidor que llama (la web o el bot) | Guardar las lecturas unos segundos, traer varias con la búsqueda y no refrescar en bucle | #53 |
| Un secreto subido al repo público | `.env` desde el primer commit y rotar la clave si pasa | US-002-SEC |
