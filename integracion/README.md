# Integración con el servicio externo (staging)

Guía para conectar el bot, la web y el servicio de pagos con el **servicio externo de lógica financiera** que ya está en staging. Contrastada el 16 de octubre contra su OpenAPI (ecosistema `FND-20261015-natillera-2`: 5 contratos y 26 reglas) y contra la [especificación funcional](../docs/discovery/4-logica-financiera/especificacion-funcional.md).

## Cómo se conecta todo

```mermaid
flowchart LR
  BOT["telegram/<br/>Bot"] --> PUENTE["integracion/<br/>Puente"]
  WEB["web/<br/>Página"] -->|las 6 rutas que ya usa, con X-Api-Key| PUENTE
  PUENTE -->|Bearer JWT| EXT[("Servicio externo<br/>staging")]
  EXT -->|webhooks firmados| PUENTE
  PUENTE -->|avisos| BOT
  EXT -->|cobrar-cuota · cobrar · pagar · desembolsar| PAGOS["pagos/<br/>Servicio de Open Payments"]
  BOT -->|permiso interactivo| PAGOS
  PAGOS --> OP["Open Payments<br/>Test Wallet"]
```

**Regla:** solo el **puente** (`integracion/`) habla con el servicio externo. Guarda el token, traduce las acciones del bot y de la web, recibe los avisos y arma las vistas que el servicio externo no tiene. La web ya llama a seis rutas con `X-Api-Key` (ver abajo): el puente las implementa tal cual y la web solo cambia `SERVICIO_URL`.

## Lo que expone el servicio externo

**Autenticación:** `Authorization: Bearer <JWT>` con el token de la organización del sandbox. Lo comparte Willy por canal privado y va en `integracion/.env`, nunca en el repo.

| Operación | Ruta |
|---|---|
| Crear un contrato | `POST /api/contracts` con `{ "templateName", "parameters" }` → devuelve `contractId` |
| Estado de un contrato | `GET /api/contracts/{contractId}` → leer **`currentStateRaw`** (la otra proyección es solo para mostrar) |
| Ejecutar una acción | `POST /api/contracts/{contractId}/triggers` con `{ "trigger", "parameters" }` |
| Historia de un contrato | `GET /api/contracts/{contractId}/events` |
| Registrar avisos | `POST /api/webhooks` con `{ "url", "events" }` |
| Cascadas recientes | `GET /api/correlations/recent` y `GET /api/contracts/correlation/{correlationId}` |
| Avisos en vivo | `GET /api/events/stream` (SSE) |

Cada parámetro va tipado: `{ "type": "Text", "value": "nat-001" }`. Los tipos son `Text`, `Currency`, `Integer`, `Percentage` y `Date` (`AAAA-MM-DD`).

## Los contratos

| Contrato | Se crea cuando | Parámetros |
|---|---|---|
| `natillera-cuenta` | El administrador crea la natillera en el bot | `NatilleraId`, `NombreNatillera`, `ValorCuota`, `FechaInicio`, `FechaFinal`, `PeriodicidadMeses`, `CupoMinimo`, `PorcentajeMoraDiaria`, `DiasEsperaCupo`, `PagosParaPrestamo`, `MultiploPrestamo` |
| `natillera-participacion` | Un participante se une | `ParticipacionId`, `NatilleraId`, `ParticipanteId` (Telegram), `WalletParticipante`, `ValorCuota`, `NumeroCuotas`, `PorcentajeMoraDiaria`, `PagosParaPrestamo`, `MultiploPrestamo`, `FechaInicio` |
| `natillera-actividad` | El administrador crea una rifa, bazar o compartir | `ActividadId`, `NatilleraId`, `Descripcion`, `ValorPorParticipante`, `Premio`, `NumeroParticipantes`, `CastigoMoraDiario`, `FechaActividad`, `FechaPago` |
| `natillera-credito-ahorro` | La financiera aprueba un préstamo | `CreditoId`, `ParticipacionId`, `ParticipanteId`, `NatilleraId`, `WalletParticipante`, `Capital`, `TasaMensual`, `PlazoMeses`, `FechaInicio` |
| `natillera-obligacion-actividad` | **No se crea a mano:** la crea el servicio externo para cada participante cuando nace una actividad | — |

Las llaves (`NatilleraId`, `ParticipacionId`, `ActividadId`, `CreditoId`) las pone el puente y no cambian. El puente guarda la relación entre cada llave y su `contractId`.

## Las acciones

**Públicas** (el puente las llama con el token normal):

| Acción | Contrato | Cuándo | Parámetros |
|---|---|---|---|
| `ConfirmarAutorizacion` | participación | El participante aprobó el permiso en su billetera | `PermisoAprobado` = 1, `BilleteraVerificada` = 1, `GrantId` |
| `RechazarAutorizacion` | participación | No aprobó o falló la billetera | `Motivo` |
| `PagarDeuda` | participación | El moroso avisa por Telegram que ya tiene el dinero | — |
| `AutorizarPago` | obligación de actividad | El participante paga su parte de la actividad | — |
| `IndicarGanador` | actividad | El administrador indica y confirma al ganador | `GanadorParticipacionId`, `WalletGanador`, `GanadorConfirmado` = 1 |
| `CerrarSinPremioOSinGanador` | actividad | La actividad no tiene premio o no hubo ganador | — |
| `PagoRecibido` | crédito | El participante paga su préstamo | `MontoPago`, `Referencia` |
| `ReintentarPagoPremio` | cuenta | Falló el pago de un premio | `ActividadId`, `MontoPremio`, `GanadorParticipacionId`, `WalletGanador` |

**Del reloj** (requieren rol de administrador): `Iniciar`, `AbrirPeriodo`, `CobrarCuota`, `CausarMoraDiaria`, `VerificarCupo`, `IniciarLiquidacion`, `CausacionDiaria`, `VencimientoCuota`, `VencerSinPago` y `CausarCastigoDiario`, entre otras. El servicio externo las corre solo a las 06:00. Para la demo se disparan a mano con el parámetro `CurrentDate`, que simula la fecha, y un token con rol de administrador (ver diferencia 7).

## El ciclo en llamadas

1. **Crear la natillera:** `POST /api/contracts` con `natillera-cuenta`. Guardar el `contractId`.
2. **Unirse:** `POST /api/contracts` con `natillera-participacion`.
3. **Permiso:** el bot y el servicio de pagos hacen el permiso interactivo; con el `GrantId` el puente llama `ConfirmarAutorizacion`.
4. **Arranque:** `Iniciar` en la fecha de inicio. El servicio externo pide la primera cuota a cada participante (`/cobrar-cuota` del servicio de pagos) y, cuando paga el cupo, la natillera queda activa.
5. **Cada periodo:** `AbrirPeriodo` y otra vez `/cobrar-cuota`.
6. **Mora:** `CausarMoraDiaria` manda el recordatorio. El participante responde, el puente llama `PagarDeuda` y el servicio externo pide `/cobrar`.
7. **Actividad:** `POST /api/contracts` con `natillera-actividad`, cada uno `AutorizarPago`, y `IndicarGanador` paga el premio con `/pagar`.
8. **Crédito:** llega el aviso `ElegibleParaPrestamo`, el bot ofrece el préstamo y la solicitud queda en el puente. Cuando la financiera la aprueba en la web, el puente crea `natillera-credito-ahorro` y el servicio externo pide `/desembolsar`.
9. **Liquidación:** `IniciarLiquidacion` reparte con `/pagar` a cada uno y la natillera cierra en 0.

## Avisos (webhooks)

`POST /api/webhooks` con la URL pública del puente y la lista de eventos. El alta devuelve el `signingSecret` **una sola vez**: guárdalo en `.env`. Cada aviso llega firmado en el encabezado `X-Motor-Signature: t=<unix>,v1=<hmac>`, que es un HMAC-SHA256 de `"{t}.{body}"` con ese secreto. Verifica la firma antes de procesar y responde 2xx.

Los que le interesan al bot: `NatilleraActivada`, `CuotaPagada`, `EntradaEnMora`, `RecordatorioMora`, `SalidaDeMora`, `AutorizacionRechazada`, `ElegibleParaPrestamo`, `PrestamoDesembolsado`, `RecordatorioObligacion`, `PremioPagadoAlGanador`, `ParticipacionLiquidada`, `NatilleraCerrada`, `NatilleraCerradaSinCupo`, y los de fallo (`CobroDeudaFallo`, `PagoLiquidacionFallo`, `PagoPremioFallo`, `DesembolsoFallo`, `ReembolsoFallo`).

La URL tiene que ser HTTPS y alcanzable desde staging. Si no hay URL pública, la alternativa es leer `GET /api/events/stream`.

## Lo que el puente le da a la web

La web no cambia: estas rutas ya existen en `web/src/lib/servicio/http.ts` con sus formas en `tipos.ts`.

| Ruta | Cómo la arma el puente |
|---|---|
| `GET /natilleras` | Con su índice de natilleras y el `currentStateRaw` de cada `natillera-cuenta` |
| `GET /natilleras/{id}` | La cuenta más las participaciones de esa natillera |
| `GET /creditos/solicitudes` | Su propia cola de solicitudes: el servicio externo no tiene solicitudes |
| `POST /creditos/solicitudes/{id}/respuesta` | `aprobar` crea `natillera-credito-ahorro`; `no_aprobar` solo cierra la solicitud |
| `GET /pagos` | El registro del servicio de pagos, donde viven las cuatro etapas, unido al resultado del servicio externo |
| `GET /bitacora` | Lo que registra el puente de las acciones del administrador |

## Diferencias encontradas

| # | Diferencia | Qué hacer |
|---|---|---|
| 1 | El servicio externo pide `Bearer JWT`; la web usa `X-Api-Key` | El puente usa el JWT hacia afuera y conserva la `X-Api-Key` hacia la web |
| 2 | El servicio externo no tiene listas, ni solicitudes de crédito, ni bitácora | Las arma el puente |
| 3 | El servicio externo cuenta la periodicidad en **meses enteros** (`PeriodicidadMeses`); el bot ofrece «quincenal» | Para la demo, solo mensual. Quincenal exige cambiar el servicio externo, fuera de la hackathon |
| 4 | Nombres de las personas, administrador y billetera del grupo no viven en el servicio externo | Los guarda el puente |
| 5 | El OpenAPI sugiere crear los 26 contratos de reglas después de los contratos base; la especificación dice que instalar el ecosistema basta | **Confirmar en staging** antes de crear la primera natillera |
| 6 | En staging la API de pagos apunta a `https://natillera-bff.example`, que no existe, y puede estar en modo de prueba | Configurarla en modo real con la URL pública del servicio de pagos. Sin eso no se mueve dinero real y se cae el criterio de Open Payments |
| 7 | Las acciones del reloj requieren rol de administrador | Para la demo, un token con ese rol o disparar el reloj desde staging |
| 8 | Lo nuevo de ventas y devoluciones no está en staging | No construir contra eso |

## Variables del puente

Propuesta para `integracion/.env` (en el repo solo va `.env.example` sin valores): `SERVICIO_EXTERNO_URL`, `SERVICIO_EXTERNO_TOKEN`, `WEBHOOK_SECRET`, `PUENTE_API_KEY` (la que usa la web) y `TELEGRAM_AVISOS_URL` o la forma en que el bot reciba los avisos.
