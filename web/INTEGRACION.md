# Mapa de integración: web ↔ staging

**Para Johan.** La web es la página de la financiera y del administrador, y además el **backend** del sistema. Este mapa dice qué llamar en el servicio externo de staging desde cada pantalla y qué rutas recibe la web de staging, del bot y del navegador de los participantes. Actualizado el 16 de octubre a las 17:30 con la versión 0.2.0 (ventas) y con las decisiones de hoy: los pagos en la web, el despliegue en Azure y los avisos a través de la web. La guía general está en [`../integracion/README.md`](../integracion/README.md); el bot tiene su mapa en [`../telegram/INTEGRACION.md`](../telegram/INTEGRACION.md).

## Qué hace el backend de la web

1. **Lee staging** desde el servidor, para las pantallas.
2. **Guarda el índice**: lo que staging no tiene (nombres, ids de Telegram, la cola de solicitudes de crédito y las ventas). Se lo manda el bot.
3. **Tiene los pagos de Open Payments**: staging le pide cobrar y pagar, y el bot le pide permisos. La especificación completa está en [`../pagos/README.md`](../pagos/README.md). El código va en su propio módulo, `src/lib/open-payments/` (no en `src/lib/pagos.ts`, que es la lógica de la pantalla), escrito con poca IA. Esas carpetas están protegidas: la guardia de Claude Code no deja que la IA las escriba.
4. **Recibe los avisos de staging** y se los entrega al bot cuando este los pide, junto con sus propios avisos de pago.
5. **Aprueba los préstamos**: al aprobar, crea el contrato de crédito en staging.

## Antes de empezar

| Variable | Qué es | Quién la da |
|---|---|---|
| `SERVICIO_URL` | Dirección de staging | Willy |
| `SERVICIO_API_KEY` | El **token de staging**. Se manda como `Authorization: Bearer <token>`, no como `X-Api-Key`. Vence: Willy dice cuánto dura | Willy |
| `WEB_API_KEY` | Llave con la que llama el bot (`X-Api-Key`). En el bot se llama `WEB_INDICE_API_KEY`. Compártela con Estiven por canal privado | Johan |
| `RIEL_API_KEY` | Llave con la que staging llama a `/api/open-payments/*` (`X-Api-Key`). Willy la carga en el tenant | Johan y Willy |
| `AVISOS_SECRETO` | Secreto de firma de los avisos de staging | Willy |
| `OP_WALLET_ADDRESS`, `OP_KEY_ID`, `OP_PRIVATE_KEY` | Billetera del grupo y sus llaves de desarrollador, para firmar con el SDK de Open Payments | Willy o quien prepare las billeteras de prueba |
| `BILLETERA_FINANCIERA` | Billetera de la financiera, de donde salen los préstamos. Basta la dirección: no necesita llaves propias | Igual |
| `BOT_USUARIO` | Usuario del bot, para el enlace `https://t.me/<bot>` de la vuelta del permiso (o se saca con `getMe` usando `TELEGRAM_BOT_TOKEN`) | Estiven |
| `TASA_MENSUAL` | Tasa mensual de los préstamos de la financiera, como fracción (por ejemplo 0.02). Nadie más la entrega: ni la solicitud del bot ni staging | La financiera (el equipo la define) |

Todas van en `web/.env.example`, sin valores. Los tokens de los permisos (los de los participantes y los de la billetera del grupo y la financiera, #67) no van en variables: van en la base.

- **La capa `src/lib/servicio/` todavía habla con rutas provisionales y `X-Api-Key`.** Hay que cambiar `http.ts` para que mande `Authorization: Bearer <SERVICIO_API_KEY>` y use las rutas de staging (`/api/contracts/...`). Todo sigue en el servidor: el token nunca llega al navegador.
- **Base persistente:** el índice, los avisos, los tokens de los permisos y las llaves de idempotencia de los pagos tienen que sobrevivir un reinicio durante la demo. Una base SQLite en un volumen persistente de Azure, con una sola copia de la app corriendo (#68).
- **Despliegue en Azure** con dirección pública HTTPS fija (#68). La necesitan staging (pagos y avisos) y el celular de cada participante (la vuelta del permiso).
- **`src/proxy.ts`:** hoy exige sesión en todo `/api/*`. Hay que excluir las rutas de máquina, que se protegen con su propia llave o firma: `/api/open-payments/*`, `/api/indice/*`, `/api/avisos` y `/api/permisos` **con y sin subruta** (`GET /api/avisos` y `POST /api/permisos` no llevan nada después). Si no se excluyen, staging y el bot reciben 401. La vuelta del permiso es pública: la abre el navegador del participante.
- **ESLint (`eslint.config.mjs`)** solo deja leer `process.env` en `src/lib/servicio/`, `src/lib/sesion/` y `src/proxy.ts`. El módulo de Open Payments y las rutas nuevas también necesitan llaves: agrega sus carpetas a esa excepción (o lee todo en un módulo de configuración del servidor y agrégalo a ella). No quites la regla: es la que impide que una llave llegue al navegador.
- **`scripts/revisar-entrega.mjs`:** el chequeo `b-op` ya acepta el código de Open Payments en `web/src/lib/open-payments/` y en sus rutas.

**Formato de los parámetros al escribir en staging:** `{ "type": "Text", "value": "..." }`. Los tipos son `Text`, `Currency`, `Integer`, `Percentage` (**fracción: 1 % = 0.01**) y `Date` (`AAAA-MM-DD`).

**Para leer:** usa siempre `currentStateRaw` (valores sin formato). El nombre de cada estado viene listo en `currentStateLabels`. La proyección `currentState` es texto formateado para mostrar: no sirve para calcular.

**Límites de staging:** 20 lecturas y 5 escrituras por segundo desde la dirección IP del servidor de la web. Una pantalla que hace un `GET` por natillera y otro por participación se pasa rápido: guarda las lecturas unos segundos o trae varias de una vez con `POST /api/contracts/search` y su lista de `concepts`.

**Crear el contrato de crédito no tiene llave de idempotencia** (solo las acciones la tienen). Si la llamada se cae por tiempo, busca primero por `CreditoId` con `POST /api/contracts/search` antes de reintentar, para no crear dos créditos.

## 1. Las rutas que recibe la web

**De staging:**

| Ruta | Protección | Qué hace |
|---|---|---|
| `POST /api/open-payments/cobrar-cuota`, `/cobrar`, `/pagar`, `/desembolsar`, `/pagar-con-permiso`, `/aportar-con-permiso` | `X-Api-Key` = `RIEL_API_KEY` | Los pagos. Campos, respuestas e idempotencia en [`../pagos/README.md`](../pagos/README.md) |
| `POST /api/avisos/staging` | Firma `X-Motor-Signature` | Recibe los avisos del destino `bot-natillera` |

**Del bot** (todas con `X-Api-Key` = `WEB_API_KEY`):

| Ruta | Qué hace |
|---|---|
| `POST /api/indice/natilleras` | `natilleraId`, `contractId`, `nombre`, `administrador` (`telegramId`, `nombre`), `creadaEn` |
| `POST /api/indice/participaciones` | `natilleraId`, `participacionId`, `contractId`, `nombre`, `telegramId`, `billetera` |
| `POST /api/indice/actividades` | `natilleraId`, `actividadId`, `contractId`, `descripcion`, `obligaciones` (`participacionId`, `contractId`) |
| `POST /api/indice/solicitudes` | `solicitudId`, `natilleraId`, `participacionId`, `montoMaximo`, `montoSolicitado`, `plazoMeses`, `fechaSolicitud` |
| `POST /api/indice/ventas` | Si entran las ventas: `natilleraId`, `ventaId`, `contractId`, `productoId`, `descripcionProducto`, `compradorParticipacionId`, `vendedorParticipacionId`, `valor`, `comision`, `creadaEn` |
| `GET /api/avisos?desde=<cursor>` | Los avisos nuevos: `{ "id", "evento", "contractId", "templateName", "datos", "recibido" }` |
| `POST /api/permisos`, `GET /api/permisos/{permisoId}` y, opcional, `POST /api/permisos/{permisoId}/cancelar` | Los permisos de pago (ver [`../pagos/README.md`](../pagos/README.md)) |

Las rutas del índice **no duplican por id**: el bot puede reintentar.

**Del navegador del participante (pública):** `GET /api/permisos/{permisoId}/retorno`. Llega con `interact_ref` y `hash` si aprobó, o con `result=grant_rejected` o `result=grant_invalid` si no. Termina o marca el permiso y en los dos casos redirige al chat del bot (ver [`../pagos/README.md`](../pagos/README.md)).


## 2. Los avisos de staging

1. Willy da de alta el destino `bot-natillera` apuntando a `https://<web>/api/avisos/staging` y te pasa el secreto (`AVISOS_SECRETO`, empieza por `whsec_`).
2. Cada aviso llega con el encabezado `X-Motor-Signature: t=<unix>,v1=<hmac>`. Calcula el HMAC-SHA256 de `"{t}." + cuerpo crudo` (en UTF-8) usando como llave el secreto **completo, con el `whsec_`, como texto UTF-8**, y compáralo en **hexadecimal en minúsculas** con `v1`, en tiempo constante. No uses librerías de «Standard Webhooks» o Svix: firman distinto. Descarta el aviso si no coincide o si `t` tiene más de 5 minutos.
3. El cuerpo trae `id` (`evt_…`), `type`, `createdAt`, `correlationId`, `contractId`, `templateName`, `origin`, `tenantId` y `data`. Pasa `type` a `evento` y `data` a `datos`. En los avisos de un crédito (`DesembolsoFallo`, `CreditoEnMora`), agrega a `datos` el `participanteId` que guardaste al aprobarlo: solo traen `creditoId`, y el bot no lo conoce.
4. **Descarta repetidos por `id`** (también llega en el encabezado `X-Motor-Event-Id`): staging reenvía el mismo aviso si tardas más de 10 segundos o respondes 5xx, y Willy puede reenviarlo a mano. Guárdalo con un número creciente y responde 2xx de inmediato.
5. Agrega a la misma lista tus propios avisos de pago, `PagoCompletado` y `PagoFallido`, al terminar cada pago de Open Payments: staging no avisa «cobro hecho» (ver [`../pagos/README.md`](../pagos/README.md)).
6. El bot los pide con `GET /api/avisos?desde=<cursor>`. Los avisos también alimentan la bitácora y el registro de pagos.

La lista de avisos y a quién va cada uno está en [`../telegram/INTEGRACION.md`](../telegram/INTEGRACION.md).

## 3. Cada pantalla contra staging

Las funciones de `Servicio` (`tipos.ts`) no cambian; cambia de dónde sacan los datos. Para listar, sirven el índice o la búsqueda de staging (`GET /api/contracts` con `templateName`, o `POST /api/contracts/search`).

| Pantalla | Función | Llamadas a staging | Campos de `currentStateRaw` |
|---|---|---|---|
| `/natilleras` | `listarNatilleras` | Por cada natillera, `GET /api/contracts/{contractId}`. Para contar en mora, el `GET` de sus participaciones | `NombreNatillera`, `EstadoNatillera`, `ValorCuota`, `PeriodicidadMeses`, `FechaInicio`, `FechaFinal`, `NumeroCuotas`, `PeriodoActual`, `CupoMinimo`, `ParticipantesValidados`, `SaldoNatillera`, `FechaProximoCobro` |
| `/natilleras/[id]` | `obtenerNatillera` | La natillera más el `GET` de cada participación | Natillera: `PorcentajeMoraDiaria` y, con la 0.2.0, `PorcentajeComision`, `PlazoDevolucionDias`, `ComisionesVentas`, `ComisionesPorCobrar`, `ComisionesEnTransito`, `OperacionesVentasEnCurso`, `DevolucionesEnDeuda`. Participante: `EstadoParticipacion`, `WalletParticipante`, `CuotasPagadas`, `TotalAportado`, `DeudaCuotas` + `MoraAcumulada` (= `deuda`) y, con la 0.2.0, `DeudaComisiones`, `DeudaDevoluciones`, `DevolucionesPorRecibir`, `AsignadoDevoluciones` |
| `/creditos` | `listarSolicitudesCredito` | La cola del índice más el `GET` de la participación | `CuotasPagadas`, `NumeroCuotas`. `tasaMensualPct` sale de `TASA_MENSUAL`, y la cuota mensual la calcula la web (cuota fija, sistema francés): staging no la simula antes de aprobar |
| Aprobar o no | `responderSolicitud` | **Aprobar:** `POST /api/contracts` con `natillera-credito-ahorro` (`CreditoId`, `ParticipacionId`, `ParticipanteId`, `NatilleraId`, `WalletParticipante`, `Capital`, `TasaMensual` = `TASA_MENSUAL` como `Percentage`, `PlazoMeses`, `FechaInicio`). Guarda el `contractId`. Staging pide el desembolso a `/api/open-payments/desembolsar` y avisa al bot. **No aprobar:** solo se marca en el índice | Después, del crédito: `CuotaMensual`, `EstadoCredito`, `SaldoTotal` |
| `/pagos` | `listarPagos` | El registro propio de los pagos, unido a `GET /api/contracts/{contractId}/events` de participaciones, natillera, créditos, obligaciones y ventas | Ver «Las cuatro etapas» |
| `/bitacora` | `listarBitacora` | `GET /api/contracts/{contractId}/events` de la natillera, sus actividades y sus ventas | Creación, actividades, ganador indicado, cierre sin premio, ventas y liquidación |

El flujo en vivo de staging (`/api/events/stream`) solo trae cascadas entre contratos, sin datos: para refrescar `/pagos`, usa los avisos que ya llegan a la web o consulta cada pocos segundos.

### Las cuatro etapas de un pago en `/pagos`

| Etapa | De dónde sale |
|---|---|
| Solicitud | La llamada de staging a `/api/open-payments/*`, o el evento `…Solicitado`: `CobroCuotaSolicitado`, `CobroDeudaSolicitado`, `CobroObligacionSolicitado`, `PagoLiquidacionSolicitado`, `DesembolsoSolicitado`, `ReembolsoSolicitado`, `PremioOrdenado`, y con la 0.2.0 `PagoVendedorSolicitado`, `PagoComisionSolicitado`, `PagoDevolucionSolicitado`, `PagoDeudaDevolucionSolicitado`, `DevolucionComisionSolicitada` |
| Autorización | El permiso: el `GrantId` de la participación (recurrente), o `GrantIdCompra` de la venta y `GrantIdDevolucion` de la devolución (de un solo uso) |
| Ejecución | El registro propio de los pagos: el *quote* y el *outgoing payment*, con sus ids |
| Finalización | El evento de éxito (`CuotaPagada`, `DeudaPagada`, `ObligacionPagada`, `ParticipacionLiquidada`, `PrestamoDesembolsado`, `ParticipacionReembolsada`, `PremioPagadoAlGanador`, `VentaConfirmada`, `DevolucionPagada`, `DeudaDevolucionSaldada`, `ComisionDevuelta`) o el de fallo (`…Fallo`, `CompraCancelada`, `ComisionPendienteRegistrada`) |

Para el jurado, la venta es el flujo de un solo uso más limpio para mostrar las cuatro etapas, si entra a la demo.

## Los estados

| Máquina | Valores |
|---|---|
| `EstadoNatillera` | 0 CREADA · 1 INICIADA · 2 ACTIVA · 3 LIQUIDANDO · 4 REEMBOLSANDO · 5 CERRADA · 6 CERRADA_SIN_CUPO · 7 PREPARANDO_LIQUIDACION |
| `EstadoParticipacion` | 0 PENDIENTE_VALIDACION · 1 VALIDADA · 2 ACTIVA · 3 MORA · 4 EN_LIQUIDACION · 5 EN_REEMBOLSO · 6 LIQUIDADA · 7 REEMBOLSADA |
| `EstadoCredito` | 0 DESEMBOLSO_PENDIENTE · 1 ACTIVO · 2 MORA · 3 PAGADO |
| `EstadoActividad` | 0 RECAUDANDO · 1 PREMIO_PARCIAL · 2 ACUMULADA · 3 PREMIO_PAGADO |
| `EstadoObligacion` | 0 PENDIENTE · 1 ALERTA · 2 PAGADA · 3 DESCONTADA |
| `EstadoVenta` | 0 AUTORIZANDO · 1 PAGANDO_VENDEDOR · 2 PAGANDO_COMISION · 3 CONFIRMADA · 4 COMISION_PENDIENTE · 5 EN_DEVOLUCION · 6 CERRADA · 7 CANCELADA |
| `EstadoDevolucion` | 0 PENDIENTE · 1 APROBADA · 2 DEVOLVIENDO · 3 EN_DEUDA · 4 PAGANDO_DEUDA · 5 COBRO_EN_LIQUIDACION · 6 DEVUELTA · 7 DEVUELTA_EN_LIQUIDACION · 8 NO_RECUPERADA · 9 NO_PROCEDIO · 10 CERRADA_AL_LIQUIDAR |

**Periodicidad:** `PeriodicidadMeses` = 1 es «mensual». Quincenal no existe en staging.

## Orden para probar hoy

1. **Desplegar en Azure** con la base persistente y ajustar `proxy.ts` (#68).
2. **Cambiar `src/lib/servicio/`** a staging con el token (#65) y ver `/natilleras` con la natillera de prueba que cree Estiven (en su mapa hay un ejemplo listo).
3. **Armar el índice y la recepción de avisos**, y entregarle a Estiven la dirección de la web (en el bot, `WEB_INDICE_URL` y `PAGOS_URL`) y la llave (en el bot, `WEB_INDICE_API_KEY`).
4. **Los pagos:** primero la prueba del #3; después `/api/open-payments/cobrar-cuota`, los permisos y su vuelta. Mientras no estén, las 6 rutas responden simulado y marcado.
5. **Los permisos de la billetera del grupo y de la financiera** (#67), aprobados una vez por su dueño, **antes** de que Willy pase la API de pagos a modo real.
6. **`/pagos` y `/bitacora`** desde los eventos y el registro de pagos.
7. **Aprobar un préstamo** y ver el contrato de crédito en staging.
