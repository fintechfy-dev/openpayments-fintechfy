# Mapa de integración: web ↔ staging

**Para Johan.** La web es la página de la financiera y del administrador, y además el **backend** del bot: guarda el índice y le entrega los avisos de staging. Este mapa dice qué llamar en el servicio externo de staging desde cada pantalla, qué rutas recibe la web de staging y del bot, y qué lee de la API de pagos. Actualizado el 16 de octubre a las 19:30 con la versión 0.2.0 (ventas) y con las decisiones de hoy: la API de pagos aparte en `pagos/` (PR #71), el despliegue de la web en Azure y los avisos de staging a través de la web. La guía general está en [`../integracion/README.md`](../integracion/README.md); el bot tiene su mapa en [`../telegram/INTEGRACION.md`](../telegram/INTEGRACION.md).

## Qué hace el backend de la web

1. **Lee staging** desde el servidor, para las pantallas.
2. **Guarda el índice**: lo que staging no tiene (nombres, ids de Telegram, la cola de solicitudes de crédito y las ventas). Se lo manda el bot.
3. **Muestra los pagos de la API de pagos**: la pantalla `/pagos` lee `GET {PAGOS_URL}/api/registro`, cada pago con sus cuatro etapas. La web **no tiene código de Open Payments**: los pagos y los permisos viven en `pagos/`, publicada en `https://natillera-pagos.azurewebsites.net` (ver [`../pagos/API.md`](../pagos/API.md)).
4. **Recibe los avisos de staging** y se los entrega al bot cuando este los pide. Los avisos de pago (`PagoCompletado`, `PagoFallido`) no pasan por la web: el bot se los pide a la API de pagos.
5. **Aprueba los préstamos**: al aprobar, crea el contrato de crédito en staging.

## Antes de empezar

| Variable en el código (`web/.env.example`) | Nombre en la primera versión de este mapa | Qué es | Quién la da |
|---|---|---|---|
| `SERVICIO_EXTERNO_URL` | `SERVICIO_URL` | Dirección de staging: `https://sandbox-staging.corebank.ai` | Willy |
| `SERVICIO_EXTERNO_TOKEN` | `SERVICIO_API_KEY` | El **token de staging** (con `org_role: "admin"` para crear contratos). Se manda como `Authorization: Bearer <token>`. Vence: Willy dice cuánto dura | Willy |
| `WEB_INDICE_API_KEY` | `WEB_API_KEY` | Llave con la que llama el bot (`X-Api-Key`); en el bot se llama igual. Compártela con Estiven por canal privado | Johan |
| — (pendiente) | `AVISOS_SECRETO` | Secreto de firma de los avisos de staging (sección 2, aún no construida) | Willy |
| `PAGOS_URL` | `PAGOS_URL` | Dirección de la API de pagos: `https://natillera-pagos.azurewebsites.net` | Willy |
| `PAGOS_API_KEY` | `PAGOS_API_KEY` | La `API_KEY_CLIENTES` de la API de pagos, para leer `/api/registro` (`X-Api-Key`). Por canal privado | Willy |
| `CREDITO_TASA_MENSUAL` | `TASA_MENSUAL` | Tasa mensual de los préstamos de la financiera, **en porcentaje** (`2` = 2 %; la web la pasa a fracción al crear el contrato). Nadie más la entrega: ni la solicitud del bot ni staging | La financiera (el equipo la define) |

Todas van en `web/.env.example`, sin valores. El código ya usa los nombres de la primera columna (#53); si el equipo prefiere los de la segunda, se cambian en `web/src/lib/servicio/index.ts`, `web/src/lib/indice/index.ts` y `web/.env.example`.

- **Hecho en #53:** `src/lib/servicio/` ya habla con staging (`staging.ts`, `Authorization: Bearer`, `/api/contracts/...` y `/api/contracts/table`) y con la API de pagos (`pagos-api.ts`); el cliente provisional y los datos de prueba se quitaron.
- **Base persistente:** el índice y los avisos tienen que sobrevivir un reinicio durante la demo. Una base SQLite en un volumen persistente de Azure, con una sola copia de la app corriendo (#68).
- **Despliegue en Azure** con dirección pública HTTPS fija (#68). La necesitan staging (para entregar los avisos) y el bot (para el índice y los avisos).
- **`src/proxy.ts`:** hoy exige sesión en todo `/api/*`. Hay que excluir las rutas de máquina, que se protegen con su propia llave o firma: `/api/indice/*` y `/api/avisos` **con y sin subruta** (`GET /api/avisos` no lleva nada después; `POST /api/avisos/staging` sí). Si no se excluyen, staging y el bot reciben 401.
- **ESLint (`eslint.config.mjs`)** solo deja leer `process.env` en `src/lib/servicio/`, `src/lib/sesion/` y `src/proxy.ts`. Las rutas nuevas (`WEB_API_KEY`, `AVISOS_SECRETO`) y la lectura del registro de pagos (`PAGOS_API_KEY`) también necesitan llaves: agrega sus carpetas a esa excepción (o lee todo en un módulo de configuración del servidor y agrégalo a ella). No quites la regla: es la que impide que una llave llegue al navegador.

**Formato de los parámetros al escribir en staging:** `{ "type": "Text", "value": "..." }`. Los tipos son `Text`, `Currency`, `Integer`, `Percentage` (**fracción: 1 % = 0.01**) y `Date` (`AAAA-MM-DD`).

**Para leer:** usa siempre `currentStateRaw` (valores sin formato). El nombre de cada estado viene listo en `currentStateLabels`. La proyección `currentState` es texto formateado para mostrar: no sirve para calcular.

**Límites de staging:** 20 lecturas y 5 escrituras por segundo desde la dirección IP del servidor de la web. Una pantalla que hace un `GET` por natillera y otro por participación se pasa rápido: guarda las lecturas unos segundos o trae varias de una vez con `POST /api/contracts/search` y su lista de `concepts`.

**Crear el contrato de crédito no tiene llave de idempotencia** (solo las acciones la tienen). Si la llamada se cae por tiempo, busca primero por `CreditoId` con `POST /api/contracts/search` antes de reintentar, para no crear dos créditos.

### Lo que confirma la especificación (16 oct, 17:00)

La especificación OpenAPI del ecosistema está en [`../integracion/FND-20261015-natillera-2.openapi.json`](../integracion/FND-20261015-natillera-2.openapi.json). Se contrastó contra staging con el JWT del equipo:

- **URL base:** `https://sandbox-staging.corebank.ai`, sin prefijo. `GET /api/contracts/{id}` responde; un id que no existe da 404 `application/problem+json` (`title`, `status`, `detail`, `instance`).
- **`currentStateRaw`** trae cada concepto como `{ type, value, assigned }`. Una fecha sin valor llega como `value: null`; **una fecha con valor llega como `"2026-11-01T00:00:00"`** (medianoche sin zona), no como `AAAA-MM-DD`. `fechaStaging` la pasa a mediodía de Bogotá.
- **Crear contratos exige un JWT con `org_role: "admin"`**; con uno sin rol, `POST /api/contracts` da 403 sin cuerpo. `GET` funciona con los dos.
- **Verificado con un contrato vivo** (`natillera-cuenta` `0650899a-5af5-46ee-bc3b-0f21da6fce9e` y `natillera-participacion` `30acc57f-279e-4024-9e38-d4e01fe9e429`, nombre «Prueba web #53», datos de prueba): existen todos los conceptos que lee la web, incluido `NumeroCuotas` en la cuenta (lo calcula el motor: 6 de nov. a abr.). `currentStateLabels` trae `EstadoNatillera: "CREADA"` y `EstadoParticipacion: "PENDIENTE_VALIDACION"`. `crearServicioStaging` contra esos dos contratos devuelve la natillera y su participante bien mapeados.
- **Eventos:** `GET /api/contracts/{id}/events` → `{ contractId, templateName, totalEvents, events: [{ sequenceNumber, occurredAt, type, functionName, trigger, changes: [{ concept, previousValue, newValue }], parameters, correlationId, actorId }] }`. Los `changes` vienen en formato para mostrar (`"$50.000,00"`): para montos, leer el estado. `parameters` llega como texto JSON (`'{"type": "Integer", "value": 1}'`). `actorId` es el usuario del JWT que pidió la acción, o `null` si la disparó el motor (cascada o respuesta de un pago); con el JWT compartido del equipo, toda acción pedida sale a nombre del administrador. La cascada (`GET /api/contracts/correlation/{id}`) trae los mismos eventos agrupados en `contracts[].events[]`.
- **Cada acción deja un evento `StateChanged`** con `functionName` y sus cambios; **los eventos de negocio** (`ParticipanteValidado`, `CobroCuotaSolicitado`…) **no salen en `/events`**, solo en la respuesta del trigger y en los webhooks. Por eso `/pagos` y `/bitacora` se arman por función y cambios. Visto en la participación de prueba: `ConfirmarAutorizacion` (con `GrantId` de prueba) disparó solo `RegistrarValidado` en la cuenta; `CobrarCuota` (periodo 1) y, 3 s después y sin actor, `PrimeraCuotaCobrada` (disparador `CuotaCobrada`, `MontoCobrado` 50000).
- **Por verificar:** esa cuota quedó cobrada sin que exista `pagos/`. O el sandbox simula la respuesta del cobro o hay otra URL de pagos configurada: no es un pago de Open Payments y no sirve de evidencia para el jurado.
- `GET /api/correlations/recent` da 404 en ese host, aunque la especificación lo declara.
- **API de pagos** (`pagos/API.md`, contrato en `https://natillera-pagos.azurewebsites.net/api/openapi.json`): con `PAGOS_URL` y `PAGOS_API_KEY` (= `API_KEY_CLIENTES`) en `web/.env.local`, `/pagos` sale de `GET /api/registro` (las 4 etapas con el permiso, la cotización y el pago saliente) y muestra el estado de `GET /api/salud`; los pagos simulados llevan la marca «Simulado». Sin ellas, `/pagos` se arma con los eventos de staging como antes (`lib/servicio/pagos-api.ts`, `registro-pagos.ts`). El 16 oct a las 19:00, `/api/salud` respondía que faltan `OP_WALLET_GRUPO` y `OP_WALLET_FINANCIERA` (#67).
- **Listado de contratos (no está en la especificación):** `GET /api/contracts/table?templateName=<plantilla>&concepts=<A,B,…>&skip=0&take=100` → `{ items: [{ contractId, createdAt, concepts: { A: "texto" }, conceptLabels, eventCount }], totalCount, hasMore }`. Responde con el JWT admin para `natillera-cuenta`, `natillera-participacion`, `natillera-actividad` y `natillera-credito-ahorro`. Con ella el **superadmin (la financiera)** ve todas las natilleras del motor aunque el bot no las haya avisado. El índice sigue poniendo lo que el motor no guarda: el administrador de cada natillera (sin él sale «Sin registrar» y ningún administrador la ve), el nombre de cada persona (sin él sale «Telegram <id>») y la billetera del grupo. Si la tabla falla, la web sigue solo con el índice (`lib/servicio/tabla-staging.ts`).
- **Triggers:** 51 de 71 son privados («requiere rol admin»). La web no ejecuta triggers; los públicos son los del participante (`ConfirmarAutorizacion`, `PagarDeuda`, `PagoRecibido`, `AutorizarPago`…).

## 1. Las rutas que recibe la web

**De staging:**

| Ruta | Protección | Qué hace |
|---|---|---|
| `POST /api/avisos/staging` | Firma `X-Motor-Signature` | Recibe los avisos del destino `bot-natillera` |

**Del bot** (todas con `X-Api-Key` = `WEB_API_KEY`):

| Ruta | Qué hace |
|---|---|
| `POST /api/indice/natilleras` | `natilleraId`, `contractId`, `nombre`, `administrador` (`telegramId`, `nombre`), `creadaEn` |
| `POST /api/indice/participaciones` | `natilleraId`, `participacionId`, `contractId`, `nombre`, `telegramId`, `billetera` |
| `POST /api/indice/actividades` | `natilleraId`, `actividadId`, `contractId`, `descripcion`, `obligaciones` (`participacionId`, `contractId`) |
| `POST /api/indice/solicitudes` | `solicitudId`, `natilleraId`, `participacionId`, `montoMaximo`, `montoSolicitado`, `plazoMeses`, `fechaSolicitud` |
| `POST /api/indice/ventas` | Si entran las ventas: `natilleraId`, `ventaId`, `contractId`, `productoId`, `descripcionProducto`, `compradorParticipacionId`, `vendedorParticipacionId`, `valor`, `comision`, `creadaEn` |
| `GET /api/avisos?desde=<cursor>` | Los avisos nuevos de staging: `{ "id", "evento", "contractId", "templateName", "datos", "recibido" }` |

Las rutas del índice **no duplican por id**: el bot puede reintentar.


## 2. Los avisos de staging

1. Willy da de alta el destino `bot-natillera` apuntando a `https://<web>/api/avisos/staging` y te pasa el secreto (`AVISOS_SECRETO`, empieza por `whsec_`).
2. Cada aviso llega con el encabezado `X-Motor-Signature: t=<unix>,v1=<hmac>`. Calcula el HMAC-SHA256 de `"{t}." + cuerpo crudo` (en UTF-8) usando como llave el secreto **completo, con el `whsec_`, como texto UTF-8**, y compáralo en **hexadecimal en minúsculas** con `v1`, en tiempo constante. No uses librerías de «Standard Webhooks» o Svix: firman distinto. Descarta el aviso si no coincide o si `t` tiene más de 5 minutos.
3. El cuerpo trae `id` (`evt_…`), `type`, `createdAt`, `correlationId`, `contractId`, `templateName`, `origin`, `tenantId` y `data`. Pasa `type` a `evento` y `data` a `datos`. En los avisos de un crédito (`DesembolsoFallo`, `CreditoEnMora`), agrega a `datos` el `participanteId` que guardaste al aprobarlo: solo traen `creditoId`, y el bot no lo conoce.
4. **Descarta repetidos por `id`** (también llega en el encabezado `X-Motor-Event-Id`): staging reenvía el mismo aviso si tardas más de 10 segundos o respondes 5xx, y Willy puede reenviarlo a mano. Guárdalo con un número creciente y responde 2xx de inmediato.
5. El bot los pide con `GET /api/avisos?desde=<cursor>`. Los avisos también sirven para refrescar la bitácora.

Los avisos de pago (`PagoCompletado` y `PagoFallido`) no pasan por aquí: staging no avisa «cobro hecho», los genera la API de pagos al terminar cada pago y el bot se los pide a ella.

La lista de avisos y a quién va cada uno está en [`../telegram/INTEGRACION.md`](../telegram/INTEGRACION.md).

## 3. Cada pantalla contra staging

Las funciones de `Servicio` no cambian; cambia de dónde sacan los datos. Para el registro de la API de pagos, `tipos.ts` sí cambia: `TipoPago` necesita `venta` y `comision` (un reembolso llega como `liquidacion`) y `Pago` necesita `simulado`. Para listar, sirven el índice o la búsqueda de staging (`GET /api/contracts` con `templateName`, o `POST /api/contracts/search`).

| Pantalla | Función | Llamadas a staging | Campos de `currentStateRaw` |
|---|---|---|---|
| `/natilleras` | `listarNatilleras` | Por cada natillera, `GET /api/contracts/{contractId}`. Para contar en mora, el `GET` de sus participaciones | `NombreNatillera`, `EstadoNatillera`, `ValorCuota`, `PeriodicidadMeses`, `FechaInicio`, `FechaFinal`, `NumeroCuotas`, `PeriodoActual`, `CupoMinimo`, `ParticipantesValidados`, `SaldoNatillera`, `FechaProximoCobro` |
| `/natilleras/[id]` | `obtenerNatillera` | La natillera más el `GET` de cada participación | Natillera: `PorcentajeMoraDiaria` y, con la 0.2.0, `PorcentajeComision`, `PlazoDevolucionDias`, `ComisionesVentas`, `ComisionesPorCobrar`, `ComisionesEnTransito`, `OperacionesVentasEnCurso`, `DevolucionesEnDeuda`. Participante: `EstadoParticipacion`, `WalletParticipante`, `CuotasPagadas`, `TotalAportado`, `DeudaCuotas` + `MoraAcumulada` (= `deuda`) y, con la 0.2.0, `DeudaComisiones`, `DeudaDevoluciones`, `DevolucionesPorRecibir`, `AsignadoDevoluciones` |
| `/creditos` | `listarSolicitudesCredito` | La cola del índice más el `GET` de la participación | `CuotasPagadas`, `NumeroCuotas`. `tasaMensualPct` sale de `TASA_MENSUAL`, y la cuota mensual la calcula la web (cuota fija, sistema francés): staging no la simula antes de aprobar |
| Aprobar o no | `responderSolicitud` | **Aprobar:** `POST /api/contracts` con `natillera-credito-ahorro` (`CreditoId`, `ParticipacionId`, `ParticipanteId`, `NatilleraId`, `WalletParticipante`, `Capital`, `TasaMensual` = `TASA_MENSUAL` como `Percentage`, `PlazoMeses`, `FechaInicio`). Guarda el `contractId`. Staging pide el desembolso a la API de pagos (`/desembolsar`) y avisa al bot. **No aprobar:** solo se marca en el índice | Después, del crédito: `CuotaMensual`, `EstadoCredito`, `SaldoTotal` |
| `/pagos` | `listarPagos` | `GET {PAGOS_URL}/api/registro` de la API de pagos (con `X-Api-Key` = `PAGOS_API_KEY`): cada pago con sus etapas. Para el contexto, `GET /api/contracts/{contractId}/events` de participaciones, natillera, créditos, obligaciones y ventas | Ver «Las cuatro etapas» |
| `/bitacora` | `listarBitacora` | `GET /api/contracts/{contractId}/events` de la natillera, sus actividades y sus ventas | Creación, actividades, ganador indicado, cierre sin premio, ventas y liquidación |

El flujo en vivo de staging (`/api/events/stream`) solo trae cascadas entre contratos, sin datos: para refrescar `/pagos`, consulta `/api/registro` cada pocos segundos, como ya hace la pantalla.

### Las cuatro etapas de un pago en `/pagos`

| Etapa | De dónde sale |
|---|---|
| Solicitud | La etapa `solicitud` del registro (la llamada de staging a la API de pagos), o el evento `…Solicitado`: `CobroCuotaSolicitado`, `CobroDeudaSolicitado`, `CobroObligacionSolicitado`, `PagoLiquidacionSolicitado`, `DesembolsoSolicitado`, `ReembolsoSolicitado`, `PremioOrdenado`, y con la 0.2.0 `PagoVendedorSolicitado`, `PagoComisionSolicitado`, `PagoDevolucionSolicitado`, `PagoDeudaDevolucionSolicitado`, `DevolucionComisionSolicitada` |
| Autorización | La etapa `autorizacion` del registro. En staging, el permiso: el `GrantId` de la participación (recurrente), o `GrantIdCompra` de la venta y `GrantIdDevolucion` de la devolución (de un solo uso) |
| Ejecución | La etapa `ejecucion` del registro: los ids del cobro, la cotización y el pago saliente |
| Finalización | La etapa `finalizacion` del registro, o en staging el evento de éxito (`CuotaPagada`, `DeudaPagada`, `ObligacionPagada`, `ParticipacionLiquidada`, `PrestamoDesembolsado`, `ParticipacionReembolsada`, `PremioPagadoAlGanador`, `VentaConfirmada`, `DevolucionPagada`, `DeudaDevolucionSaldada`, `ComisionDevuelta`) o el de fallo (`…Fallo`, `CompraCancelada`, `ComisionPendienteRegistrada`) |

Un pago con `simulado` se muestra marcado como simulado: en la demo tiene que verse qué es real y qué no. Para el jurado, la venta es el flujo de un solo uso más limpio para mostrar las cuatro etapas, si entra a la demo.

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
3. **Armar el índice y la recepción de avisos**, y entregarle a Estiven la dirección de la web (en el bot, `WEB_INDICE_URL`) y la llave (en el bot, `WEB_INDICE_API_KEY`).
4. **`/pagos` con el registro de la API de pagos** (`GET {PAGOS_URL}/api/registro`). Mientras no haya pagos reales, muestra los simulados, marcados como tales.
5. **`/bitacora`** desde los eventos de staging.
6. **Aprobar un préstamo** y ver el contrato de crédito en staging.
