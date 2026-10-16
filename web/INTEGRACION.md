# Mapa de integración: web ↔ staging

**Para Johan.** Qué llamar en el servicio externo de staging desde cada pantalla y qué rutas nuevas recibe la web del bot. La guía general está en [`../integracion/README.md`](../integracion/README.md). El bot tiene su propio mapa en [`../telegram/INTEGRACION.md`](../telegram/INTEGRACION.md).

## Cómo se reparte

- **La web guarda la lista** de natilleras, participantes, actividades y solicitudes de crédito, porque staging no lista nada. El bot le avisa cada vez que crea algo (sección 1).
- **La web lee el estado y la historia** directo de staging, desde el servidor (sección 2).
- **La web aprueba los préstamos:** al aprobar, crea el contrato de crédito en staging.
- Lo que staging no guarda lo pone el índice: nombres de las personas, administrador y billetera del grupo.

## Antes de empezar

- **La capa `src/lib/servicio/` ya no habla con un puente:** habla directo con staging. Cambia `SERVICIO_URL` y `SERVICIO_API_KEY` por `SERVICIO_EXTERNO_URL` y `SERVICIO_EXTERNO_TOKEN`, que te da Willy, con el encabezado `Authorization: Bearer <token>`. Todo sigue en el servidor: el token nunca llega al navegador, como ya garantizan `server-only` y la regla de ESLint.
- **Índice persistente:** SQLite o un archivo JSON en el servidor, que aguante un reinicio durante la demo.
- **Nueva variable** `WEB_INDICE_API_KEY`, la llave con la que llama el bot. Compártela con Estiven por canal privado.

**Formato de los parámetros al escribir en staging:** `{ "type": "Text", "value": "..." }`. Los tipos son `Text`, `Currency`, `Integer`, `Percentage` (**fracción: 1 % = 0.01**) y `Date` (`AAAA-MM-DD`).

**Para leer:** usa siempre `currentStateRaw` (valores sin formato). El nombre de cada estado viene listo en `currentStateLabels`. La proyección `currentState` es texto formateado para mostrar: no sirve para calcular.

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
- **Triggers:** 51 de 71 son privados («requiere rol admin»). La web no ejecuta triggers; los públicos son los del participante (`ConfirmarAutorizacion`, `PagarDeuda`, `PagoRecibido`, `AutorizarPago`…).

## 1. Lo que la web recibe del bot (rutas nuevas)

Todas con `X-Api-Key: <WEB_INDICE_API_KEY>` y **sin duplicar por id**, porque el bot puede reintentar.

| Ruta | Cuerpo | Alimenta |
|---|---|---|
| `POST /api/indice/natilleras` | `natilleraId`, `contractId`, `nombre`, `administrador` (`telegramId`, `nombre`), `creadaEn` | `/natilleras` |
| `POST /api/indice/participaciones` | `natilleraId`, `participacionId`, `contractId`, `nombre`, `telegramId`, `billetera` | detalle de la natillera, pagos |
| `POST /api/indice/actividades` | `natilleraId`, `actividadId`, `contractId`, `descripcion`, `obligaciones` (`participacionId`, `contractId`) | bitácora, pagos de actividades |
| `POST /api/indice/solicitudes` | `solicitudId`, `natilleraId`, `participacionId`, `montoMaximo`, `montoSolicitado`, `plazoMeses`, `fechaSolicitud` | `/creditos` (#10) |

## 2. Cada pantalla contra staging

Las funciones de `Servicio` (`tipos.ts`) no cambian; cambia de dónde sacan los datos.

| Pantalla | Función | Llamadas a staging | Campos de `currentStateRaw` |
|---|---|---|---|
| `/natilleras` | `listarNatilleras` | Por cada natillera del índice, `GET /api/contracts/{contractId}`. Para contar en mora, el `GET` de sus participaciones | `NombreNatillera`, `EstadoNatillera`, `ValorCuota`, `PeriodicidadMeses`, `FechaInicio`, `FechaFinal`, `NumeroCuotas`, `PeriodoActual`, `CupoMinimo`, `ParticipantesValidados`, `SaldoNatillera`, `FechaProximoCobro` |
| `/natilleras/[id]` | `obtenerNatillera` | La natillera más el `GET` de cada participación | Natillera: `PorcentajeMoraDiaria`. Participante: `EstadoParticipacion`, `WalletParticipante`, `CuotasPagadas`, `TotalAportado`, `DeudaCuotas` + `MoraAcumulada` (= `deuda`) |
| `/creditos` | `listarSolicitudesCredito` | La cola del índice más el `GET` de la participación | `CuotasPagadas`, `NumeroCuotas` |
| Aprobar o no | `responderSolicitud` | **Aprobar:** `POST /api/contracts` con `natillera-credito-ahorro` (`CreditoId`, `ParticipacionId`, `ParticipanteId`, `NatilleraId`, `WalletParticipante`, `Capital`, `TasaMensual`, `PlazoMeses`, `FechaInicio`). Guarda el `contractId`. Staging pide el desembolso y avisa al bot. **No aprobar:** solo se marca en el índice | Después, del crédito: `CuotaMensual`, `EstadoCredito`, `SaldoTotal` |
| `/pagos` | `listarPagos` | `GET /api/contracts/{contractId}/events` de cada participación, natillera, crédito y obligación | Ver «Las cuatro etapas» abajo |
| `/bitacora` | `listarBitacora` | `GET /api/contracts/{contractId}/events` de la natillera y de sus actividades | La creación de la natillera, las actividades creadas, el ganador indicado, el cierre sin premio y la liquidación |

**Opcional:** `GET /api/events/stream` (flujo en vivo) para refrescar `/pagos` cuando ocurre algo, en vez de consultar cada 3 segundos.

### Las cuatro etapas de un pago en `/pagos`

| Etapa | De dónde sale |
|---|---|
| Solicitud | El evento `…Solicitado`: `CobroCuotaSolicitado`, `CobroDeudaSolicitado`, `CobroObligacionSolicitado`, `PagoLiquidacionSolicitado`, `DesembolsoSolicitado`, `ReembolsoSolicitado`, `PremioOrdenado` |
| Autorización | El permiso del participante: el `GrantId` de su participación |
| Ejecución | El detalle del servicio de pagos (#4): quote y pago saliente. Mientras no exista, se muestra pendiente |
| Finalización | El evento de éxito (`CuotaPagada`, `DeudaPagada`, `ObligacionPagada`, `ParticipacionLiquidada`, `PrestamoDesembolsado`, `ParticipacionReembolsada`, `PremioPagadoAlGanador`) o el de fallo (`…Fallo`) |

## Los estados

| Máquina | Valores |
|---|---|
| `EstadoNatillera` | 0 CREADA · 1 INICIADA · 2 ACTIVA · 3 LIQUIDANDO · 4 REEMBOLSANDO · 5 CERRADA · 6 CERRADA_SIN_CUPO |
| `EstadoParticipacion` | 0 PENDIENTE_VALIDACION · 1 VALIDADA · 2 ACTIVA · 3 MORA · 4 EN_LIQUIDACION · 5 EN_REEMBOLSO · 6 LIQUIDADA · 7 REEMBOLSADA |
| `EstadoCredito` | 0 DESEMBOLSO_PENDIENTE · 1 ACTIVO · 2 MORA · 3 PAGADO |
| `EstadoActividad` | 0 RECAUDANDO · 1 PREMIO_PARCIAL · 2 ACUMULADA · 3 PREMIO_PAGADO |
| `EstadoObligacion` | 0 PENDIENTE · 1 ALERTA · 2 PAGADA · 3 DESCONTADA |

**Periodicidad:** `PeriodicidadMeses` = 1 es «mensual». Quincenal no existe en staging.

## Orden para probar hoy

1. **Cambiar `src/lib/servicio/`** a staging con el token.
2. **Armar el índice** con sus cuatro rutas y cargarle a mano la natillera de prueba que cree Estiven o Willy. En [`../telegram/INTEGRACION.md`](../telegram/INTEGRACION.md) hay un ejemplo listo para crearla.
3. **Ver `/natilleras` y su detalle** con datos reales de staging.
4. **`/pagos` y `/bitacora`** desde los eventos.
5. **Aprobar un préstamo** y ver el contrato de crédito en staging.
