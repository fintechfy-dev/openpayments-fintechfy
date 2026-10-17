# Mapa de integración: bot ↔ staging

**Para Estiven.** Qué llamar en el servicio externo de staging, en qué momento del bot y con qué datos. La guía general está en [`../integracion/README.md`](../integracion/README.md). La web tiene su propio mapa en [`../web/INTEGRACION.md`](../web/INTEGRACION.md).

## Cómo se reparte

- **El bot** crea los contratos, ejecuta las acciones de los participantes y del administrador, y recibe los avisos.
- **La web** guarda la lista de natilleras, participantes, actividades y solicitudes, porque staging no lista nada. Cada vez que el bot crea algo, **le avisa a la web** (sección 3).
- **El bot no guarda el estado** de la natillera: lo lee de staging. En su SQLite guarda solo lo que necesita para llamar: id de Telegram ↔ `ParticipacionId` ↔ `contractId`, y los `contractId` de la natillera y de las actividades.

## Antes de empezar

Variables nuevas en `telegram/.env` (en `.env.example` sin valores):

| Variable | Qué es | Quién la da |
|---|---|---|
| `SERVICIO_EXTERNO_URL` | URL de staging | Willy |
| `SERVICIO_EXTERNO_TOKEN` | Token de acceso (JWT de la organización) | Willy |
| `DIAS_ESPERA_CUPO`, `PAGOS_PARA_PRESTAMO`, `MULTIPLO_PRESTAMO` | Reglas que el bot pone al crear cada natillera (US-001-CFG) | El equipo |
| `WEB_INDICE_URL` y `WEB_INDICE_API_KEY` | Dónde avisarle a la web y con qué llave | Johan |
| `AVISOS_PUERTO` | Solo para avisos por webhook: puerto local detrás de un túnel https. Se registra con `npm run registrar-avisos -- https://<túnel>/avisos`, que guarda un secreto por evento en `telegram/data/avisos-secretos.json`. Sin puerto, el bot usa el flujo en vivo | El equipo |

**Contrastado con el OpenAPI del ecosistema** (`GET /api/ecosystems/FND-20261015-natillera-2/openapi`, 16 de octubre):

- **El token debe ser un JWT de Clerk con la organización activa.** Uno con `org_role: null` lee, pero toda escritura (crear contratos, ejecutar acciones) responde **403**.
- **La entrega de un webhook trae solo los datos del evento, sin su nombre**, y hay eventos con los mismos campos (`AutorizacionRechazada` y `CobroDeudaFallo`). Por eso el bot registra una URL por evento: `/avisos/<Evento>`.
- **El flujo en vivo manda cascadas** (`cascade_executed`, `cascade_failed`) cuya forma no está documentada; el bot busca adentro los eventos que conoce. Verificarlo con la primera cascada real.
- **Una acción rechazada** llega como `400` con `detail`, o como `200` con todas sus funciones en `preconditionFailed` y el motivo en `summary`.
- `total` y `montoMaximoPrestamo` llegan como texto. `PrestamoDesembolsado` trae `participanteId` (el id de Telegram), así que ese aviso sí llega aunque el bot no conozca el `creditoId`.

## Qué ya hace el bot (rama `feature/telegram-5-integracion-staging`)

| Fila | Estado |
|---|---|
| 1. Crear natillera | ✅ `src/externo/crear-natillera.js`: contrato, registro en SQLite y aviso 3.1 a la web (3 intentos; si fallan, el cuerpo queda en el log para cargarlo a mano). Solo mensual (#58) |
| 6. `PagarDeuda` y 8. `AutorizarPago` | ✅ Botones de los avisos de mora y de actividad (`bot/comandos/cobros.js`); solo actúan para quien es dueño de la participación |
| Sección 2, avisos | ✅ `src/avisos/`: webhook firmado (una URL por evento) o flujo en vivo, y el mensaje de cada evento. **Verificar la forma de la cascada con la primera real** (`avisosDeCascada`) |
| 2 y 3.2. Unirse | ✅ `bot/flujos/unirse.js` y `externo/unirse.js` (rama `feature/telegram-16-unirse`): el enlace `t.me/<bot>?start=<código>` sale al crear la natillera y con `/invitar`; muestra las reglas leídas de staging, pide la billetera y crea `natillera-participacion` (las reglas se copian del estado de la natillera; la mora ya viene en fracción). Avisa a la web y al administrador |
| 3. `ConfirmarAutorizacion` | ✅ **Con la API de pagos** (`PAGOS_URL`, `src/externo/pagos.js`): «Autorizar el cobro» pide en `POST /api/permisos` un permiso `recurrente` para la `WalletParticipante` de staging, con tope total de cuota × cuotas más 50 % de margen (mora y actividades; la API no usa intervalo), y `vuelta` = `t.me/<bot>?start=permiso_{permisoId}`. La persona lo aprueba en su billetera; al volver (o con «Ya aprobé»), `GET /api/permisos/{id}` lo termina y, si quedó `aprobado`, el bot dispara `ConfirmarAutorizacion` con `GrantId` = el `grantId`. **Sin `PAGOS_URL`**, sigue el permiso de prueba (`grant-prueba-<participación>`), anunciado como tal. ⏳ Probado con una API falsa; la de Azure responde 503 hasta que le configuren `OP_WALLET_GRUPO` y `OP_WALLET_FINANCIERA` |
| 4. `RechazarAutorizacion` | ⏳ Sin uso todavía: «Ahora no» deja la participación pendiente y se puede autorizar después con el mismo enlace. Lo usará el permiso real cuando la billetera falle |
| 5. «Mi natillera» | ✅ En el chat (`bot/comandos/mi-natillera.js`): `/mi_natillera` lee la natillera y la participación en staging y responde un mensaje por natillera según el estado, con «Autorizar el cobro (prueba)» si falta y «Ya tengo la plata» si hay cuota pendiente. El administrador ve también las que administra sin ahorrar. ⏳ La Mini App sigue con datos de ejemplo: no puede llamar a staging (expondría el token) y necesita una ruta del bot que valide el `initData` |
| Panel del administrador | ✅ `/administrar` (`bot/comandos/administrar.js` y `miniapp/admin/`): lee en staging cada natillera que administra la persona y la participación de cada quien, y abre la Mini App con esos datos en el fragmento del enlace (`src/natillera/panel.js`). El bot guarda el nombre de Telegram al unirse; a los que se unieron antes se lo pide a Telegram (`getChat`) la primera vez |
| 7, 9, 10, 12. Actividades | ⏳ Faltan los flujos del administrador |
| 11 y 3.4. Préstamo | ✅ `bot/flujos/prestamo.js` y `natillera/prestamo.js`: `/prestamo`, `/start prestamo`, el botón del aviso `ElegibleParaPrestamo` y el de «Mi natillera». Revisa en staging que se pueda (natillera `ACTIVA`, participación `ACTIVA`, `CuotasPagadas` ≥ `PagosParaPrestamo`, sin `DeudaPrestamoEnMora`, una solicitud a la vez), pregunta monto (hasta `MultiploPrestamo` × `ValorCuota`) y plazo (hasta los meses que le quedan a la natillera, máximo 12), guarda la solicitud en SQLite y avisa a la web (3.4). **Acuerdo pendiente con la web:** al aprobar, usar el `solicitudId` como `CreditoId`; así `DesembolsoFallo` y `CreditoEnMora` (que solo traen `creditoId`) le llegan a quien lo pidió. Sin eso, solo llega `PrestamoDesembolsado` (trae `participanteId`). Si la financiera no aprueba, el bot no se entera: la persona no puede pedir otro |

Todas las llamadas a staging llevan `Authorization: Bearer <SERVICIO_EXTERNO_TOKEN>` y `Content-Type: application/json`.

**Formato de los parámetros:** cada uno va tipado, `{ "type": "Text", "value": "..." }`. Los tipos son `Text`, `Currency` (número), `Integer`, `Percentage` (**fracción: 1 % = 0.01**) y `Date` (`AAAA-MM-DD`).

**Ojo con las acciones:** un `200` en `POST .../triggers` no garantiza que la acción corrió. Revisa `results[]` de la respuesta: si todas traen `preconditionFailed`, `requiredStateFailed` o `hasInvalidTransition`, fue rechazada; muéstrale al usuario el motivo que viene ahí.

## 1. Lo que el bot le pide a staging

| # | Momento en el bot | Historia | Llamada | Parámetros | Después |
|---|---|---|---|---|---|
| 1 | El administrador confirma «Crear natillera» (el enganche `crearNatillera` de `flujos/crear.js`) | US-001 | `POST /api/contracts` con `natillera-cuenta` | `NatilleraId` (lo genera el bot), `NombreNatillera`, `ValorCuota`, `FechaInicio`, `FechaFinal`, `PeriodicidadMeses` = 1, `CupoMinimo`, `PorcentajeMoraDiaria`, `DiasEsperaCupo`, `PagosParaPrestamo`, `MultiploPrestamo` (los tres últimos, de la configuración del bot, US-001-CFG) | Guarda el `contractId` y avisa a la web (3.1) |
| 2 | Un invitado acepta y registra su billetera | US-004, US-005 | `POST /api/contracts` con `natillera-participacion` | `ParticipacionId` (lo genera el bot), `NatilleraId`, `ParticipanteId` (id de Telegram), `WalletParticipante`, y copiados de la natillera: `ValorCuota`, `NumeroCuotas` (léelo del estado de la cuenta), `PorcentajeMoraDiaria`, `PagosParaPrestamo`, `MultiploPrestamo`, `FechaInicio` | Guarda el `contractId` y avisa a la web (3.2) |
| 3 | Vuelve de aprobar el permiso en su billetera | US-005-INT | `POST /api/contracts/{participación}/triggers` → `ConfirmarAutorizacion` | `PermisoAprobado` = 1, `BilleteraVerificada` = 1, `GrantId` (el `grantId` de `GET /api/permisos/{id}` en la API de pagos; **sin `PAGOS_URL`, un valor de prueba** como `grant-prueba-ana`) | La participación queda `VALIDADA` |
| 4 | No aprobó el permiso | US-005 | `POST .../{participación}/triggers` → `RechazarAutorizacion` | `Motivo` | — |
| 5 | «Mi natillera» (la Mini App) | US-008 | `GET /api/contracts/{participación}` y `GET /api/contracts/{natillera}` | Leer `currentStateRaw`. Participación: `TotalAportado`, `CuotasPagadas`, `NumeroCuotas`, `DeudaCuotas`, `MoraAcumulada`, `EstadoParticipacion`. Natillera: `SaldoNatillera`, `PeriodoActual`, `FechaProximoCobro`, `EstadoNatillera`. El nombre del estado viene en `currentStateLabels` | — |
| 6 | El moroso avisa que ya tiene el dinero | US-017 | `POST .../{participación}/triggers` → `PagarDeuda` | Ninguno | Staging cobra deuda más mora |
| 7 | El administrador crea una actividad | US-010 | `POST /api/contracts` con `natillera-actividad` | `ActividadId` (lo genera el bot), `NatilleraId`, `Descripcion`, `ValorPorParticipante`, `Premio` (0 si no hay), `NumeroParticipantes`, `CastigoMoraDiario`, `FechaActividad`, `FechaPago` | Staging crea solo la obligación de cada participante. Con el `correlationId` de la respuesta, `GET /api/contracts/correlation/{correlationId}` trae los contratos que tocó la cascada, entre ellos esas obligaciones (**verificarlo en la primera prueba**). Guarda sus `contractId` y avisa a la web (3.3) |
| 8 | Un participante paga su parte | US-011 | `POST .../{su obligación}/triggers` → `AutorizarPago` | Ninguno | Staging cobra |
| 9 | El administrador indica al ganador | US-012 | `POST .../{actividad}/triggers` → `IndicarGanador` | `GanadorParticipacionId`, `WalletGanador`, `GanadorConfirmado` = 1 | Staging paga el premio |
| 10 | La actividad no tiene premio o no hubo ganador | US-013 | `POST .../{actividad}/triggers` → `CerrarSinPremioOSinGanador` | Ninguno | Todo va al acumulado |
| 11 | El participante pide un préstamo | US-014 | **Nada en staging**: no tiene solicitudes | — | Avisa a la web (3.4); la financiera decide allá |
| 12 | Falló el pago de un premio y el administrador reintenta | — | `POST .../{natillera}/triggers` → `ReintentarPagoPremio` | `ActividadId`, `MontoPremio`, `GanadorParticipacionId`, `WalletGanador` | — |

**Lo que el bot no dispara por su cuenta:** arrancar, abrir periodos, causar mora, liquidar. Son acciones del reloj, privadas en staging (rol admin). Para probar y para la demo, el equipo las dispara desde su chat con `/reloj` (`bot/comandos/reloj.js`), con la fecha simulada en `CurrentDate`; `/reloj auto` da un paso por minuto.

### Ejemplo listo para probar: crear una natillera

```json
POST {SERVICIO_EXTERNO_URL}/api/contracts
{
  "templateName": "natillera-cuenta",
  "parameters": {
    "NatilleraId": { "type": "Text", "value": "NAT-PRUEBA-01" },
    "NombreNatillera": { "type": "Text", "value": "Natillera de prueba" },
    "ValorCuota": { "type": "Currency", "value": 100000 },
    "FechaInicio": { "type": "Date", "value": "2026-11-01" },
    "FechaFinal": { "type": "Date", "value": "2026-12-20" },
    "PeriodicidadMeses": { "type": "Integer", "value": 1 },
    "CupoMinimo": { "type": "Integer", "value": 3 },
    "PorcentajeMoraDiaria": { "type": "Percentage", "value": 0.01 },
    "DiasEsperaCupo": { "type": "Integer", "value": 5 },
    "PagosParaPrestamo": { "type": "Integer", "value": 1 },
    "MultiploPrestamo": { "type": "Integer", "value": 2 }
  }
}
```

Responde `201` con el `contractId`. Una billetera de prueba se ve así: `https://ilp.interledger-test.dev/natillera-ana`.

## 2. Lo que staging le avisa al bot

Hay dos formas de recibir los avisos:

- **Webhooks**, si el bot tiene una URL pública HTTPS. `npm run registrar-avisos -- https://<bot>/avisos` llama a `POST /api/webhooks` una vez por evento, con `{ "url": "https://<bot>/avisos/<Evento>", "events": ["<Evento>"] }`, porque la entrega no trae el nombre del evento. Cada respuesta trae su `signingSecret` **una sola vez**: el script los guarda en `telegram/data/avisos-secretos.json`. Cada aviso llega con el encabezado `X-Motor-Signature: t=<unix>,v1=<hmac>`; compara `v1` con el HMAC-SHA256 de `"{t}.{cuerpo}"` usando ese secreto, descarta lo que no coincida y responde 2xx rápido.
- **Flujo en vivo**, si el bot corre en una laptop sin URL pública: `GET /api/events/stream` con el mismo token. Llegan las cascadas a medida que ocurren y el bot filtra los eventos que le sirven.

Los avisos traen `natilleraId`, `participacionId`, `actividadId` o `creditoId`, nunca el id de Telegram: el bot lo busca en su SQLite.

| Evento | A quién | Datos que trae | Historia |
|---|---|---|---|
| `NatilleraActivada` | Todo el grupo | `natilleraId` | US-006 |
| `NatilleraCerradaSinCupo` | Todo el grupo | `natilleraId`, `fechaCierre` | — |
| `CuotaPagada` | El participante | `participacionId`, `periodo`, `monto` | US-008 |
| `AutorizacionRechazada` | El participante | `participacionId`, `motivo` | US-005 |
| `EntradaEnMora` | El participante | `participacionId`, `deudaCuotas` | US-017 |
| `RecordatorioMora` | El participante, cada día | `deudaCuotas`, `moraAcumulada`, `total` | US-017 |
| `SalidaDeMora` | El participante | `participacionId` | US-017 |
| `CobroDeudaFallo` | El participante | `motivo` | US-017 |
| `RecordatorioObligacion` | El participante | `actividadId`, `deudaObligacion`, `castigoAcumulado`, `total` | US-011 |
| `CobroObligacionFallo` | El participante | `actividadId`, `motivo` | US-011 |
| `PremioPagadoAlGanador`, `PremioCompletado` | Todo el grupo | `natilleraId` o `actividadId`, `monto` o `premio` | US-012 |
| `ActividadAcumulada` | Todo el grupo | `actividadId`, `recaudado` | US-013 |
| `PagoPremioFallo` | El administrador | `motivo` | US-012 |
| `ElegibleParaPrestamo` | El participante | `participacionId`, `montoMaximoPrestamo` | US-014 |
| `PrestamoDesembolsado` | El participante | `creditoId`, `capital` | US-016 |
| `DesembolsoFallo`, `CreditoEnMora` | El participante | `creditoId`, `motivo` o `saldoVencido` | US-016 |
| `ParticipacionLiquidada` | El participante | `participacionId`, `monto` | US-009 |
| `PagoLiquidacionFallo`, `ReembolsoFallo` | El participante | `motivo` | US-009 |
| `ParticipacionReembolsada` | El participante | `monto` | — |
| `NatilleraCerrada` | Todo el grupo | `natilleraId`, `fechaCierre` | US-009 |

## 3. Lo que el bot le avisa a la web

Con `X-Api-Key: <WEB_INDICE_API_KEY>`. Si la llamada falla, se reintenta: la web ignora los repetidos por id.

| # | Ruta en la web | Cuándo | Cuerpo |
|---|---|---|---|
| 3.1 | `POST {WEB_INDICE_URL}/api/indice/natilleras` | Después de crear la natillera | `natilleraId`, `contractId`, `nombre`, `administrador` (`telegramId`, `nombre`), `creadaEn` |
| 3.2 | `POST {WEB_INDICE_URL}/api/indice/participaciones` | Después de crear la participación | `natilleraId`, `participacionId`, `contractId`, `nombre`, `telegramId`, `billetera` |
| 3.3 | `POST {WEB_INDICE_URL}/api/indice/actividades` | Después de crear la actividad | `natilleraId`, `actividadId`, `contractId`, `descripcion`, `obligaciones` (`participacionId`, `contractId`) |
| 3.4 | `POST {WEB_INDICE_URL}/api/indice/solicitudes` | El participante pide un préstamo | `solicitudId`, `natilleraId`, `participacionId`, `montoMaximo`, `montoSolicitado`, `plazoMeses`, `fechaSolicitud` |

## Orden para probar hoy

1. **Crear la natillera** desde el bot y ver su contrato con `GET /api/contracts/{contractId}`.
2. **Unir a tres participantes de prueba** y confirmarles el permiso con un `GrantId` de prueba. La natillera debe contar 3 en `ParticipantesValidados`.
3. **Pedirle a Willy que dispare `Iniciar`** con la fecha simulada (#57) y ver llegar `CuotaPagada` al bot. Mientras la API de pagos de staging siga en modo de prueba (#55), los cobros se dan por hechos sin mover dinero real: así se prueba el ciclo completo ya.
4. **Abrir «Mi natillera»** y ver el aporte.
5. **Seguir con mora, actividades y préstamo.**
