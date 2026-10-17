# Mapa de integración: bot ↔ staging

**Para Estiven.** Qué llamar en el servicio externo de staging, en qué momento del bot y con qué datos. Actualizado el 16 de octubre a las 19:30 con la versión 0.2.0 (ventas), con lo que ya hace el bot (PR #64, #69 y #70) y con las decisiones de hoy: la API de pagos aparte en `pagos/` (PR #71) y los avisos de staging a través de la web. La guía general está en [`../integracion/README.md`](../integracion/README.md); la web tiene su mapa en [`../web/INTEGRACION.md`](../web/INTEGRACION.md).

## Cómo se reparte

- **El bot** crea los contratos y ejecuta las acciones de los participantes y del administrador.
- **La web** (en Azure) guarda la lista de lo que staging no tiene y recibe los avisos de staging. El bot le habla para avisarle lo que crea (sección 4) y pedirle esos avisos (sección 3).
- **La API de pagos** (`pagos/`, publicada en `https://natillera-pagos.azurewebsites.net`) tiene los **pagos de Open Payments**. El bot le pide los permisos de pago (sección 2) y los avisos de pago (sección 3).
- **El bot no guarda el estado** de la natillera: lo lee de staging. En su SQLite guarda solo lo que necesita para llamar y para avisar:
  - id de Telegram ↔ `ParticipacionId` ↔ `contractId`;
  - los `contractId` de la natillera y de cada actividad;
  - el catálogo de productos, que vive solo en el bot;
  - por cada venta: `VentaId` ↔ `contractId` de la venta y de la devolución ↔ comprador y vendedor (participación y Telegram). Varios avisos solo traen `ventaId`.

## Antes de empezar

| Variable | Qué es | Quién la da |
|---|---|---|
| `SERVICIO_EXTERNO_URL` | Dirección de staging | Willy |
| `SERVICIO_EXTERNO_TOKEN` | El token de staging: un JWT de Clerk con la organización activa y rol `writer` o `admin` (#65). Va como `Authorization: Bearer <token>`. Con `org_role: null` lee, pero toda escritura responde 403. Vence: Willy dice cuánto dura | Willy |
| `DIAS_ESPERA_CUPO`, `PAGOS_PARA_PRESTAMO`, `MULTIPLO_PRESTAMO` | Reglas que el bot pone al crear cada natillera (US-001-CFG) | El equipo |
| `WEB_INDICE_URL` y `WEB_INDICE_API_KEY` | Dirección pública de la web en Azure y llave del bot (`X-Api-Key`). Sirven para el índice y los avisos de staging | Johan |
| `PAGOS_URL` | La API de pagos: `https://natillera-pagos.azurewebsites.net` | Willy |
| `PAGOS_API_KEY` | La `API_KEY_CLIENTES` de la API de pagos (`X-Api-Key`) | Willy |
| `OP_WALLET_ADDRESS`, `OP_KEY_ID`, `OP_PRIVATE_KEY` | Las llaves de Open Payments: la billetera cliente, su *Key ID* y `private.key` en base64. Viajan en cada llamada a la API de pagos como `X-OP-Wallet-Address`, `X-OP-Key-Id` y `X-OP-Private-Key`; la API no las guarda. Staging tiene que mandar **las mismas** | Willy |
| `AVISOS_PUERTO` | Déjala vacía: `POST /api/webhooks` no existe en la puerta de staging (responde 404) | — |

Los nombres `PAGOS_API_KEY` y `OP_*` son una sugerencia. Van en `src/config.js`, en `listaDeSecretos` (para que el log los tape) y sin valores en `.env.example`.

**Lo que se comprobó contra staging el 16 de octubre** (el OpenAPI del ecosistema, el código del servicio externo y la puerta):

- **El flujo en vivo (`GET /api/events/stream`) existe**, por una entrada directa, pero **no sirve para los avisos**. Solo publica las cascadas entre contratos, `{ "type": "cascade_executed", "sourceEvent", "sourceContractId", "targetContractId", "targetTrigger", "success", … }`, sin los datos del evento, y un aviso que no dispara otro contrato (la mora, por ejemplo) nunca pasa por ahí. Además, `avisosDeCascada` busca el nombre en `type`, `eventType` y parecidos, nunca en `sourceEvent`: con el flujo en vivo, el bot no mostraría ningún aviso.
- **`POST /api/webhooks` no existe en la puerta** (404). Los avisos van al destino `bot-natillera`, que da de alta Willy y apunta a la web. Ese aviso sí trae su nombre (`type`) y sus datos (`data`), y la web se los entrega al bot como `evento` y `datos` (sección 3).
- **Una acción rechazada** llega como `400` con `detail`, o como `200` con todas sus funciones rechazadas y el motivo en `summary`.
- `total` y `montoMaximoPrestamo` llegan como texto.

## Qué ya hace el bot (PR #64, #69 y #70)

| Fila | Estado |
|---|---|
| 1. Crear natillera | ✅ `src/externo/crear-natillera.js`: contrato, registro en SQLite y aviso 4.1 a la web (3 intentos; si fallan, el cuerpo queda en el log para cargarlo a mano). Solo mensual (#58) y la mora como fracción |
| 6. `PagarDeuda` y 8. `AutorizarPago` | ✅ Botones de los avisos de mora y de actividad (`bot/comandos/cobros.js`); solo actúan para quien es dueño de la participación |
| Sección 3, avisos | ⚠️ `src/avisos/` escucha el flujo en vivo o webhooks propios, y ninguno de los dos sirve con staging. Hay que cambiar la fuente: pedirle los avisos a la web. Los mensajes (`mensajes.js`) y `ubicar` se reutilizan, porque cada aviso de la web trae `evento`, `datos` y `contractId` |
| 2 y 4.2. Unirse | ✅ `bot/flujos/unirse.js` y `externo/unirse.js` (PR #69): el enlace `t.me/<bot>?start=<código>` sale al crear la natillera y con `/invitar`; muestra las reglas leídas de staging, pide la billetera y crea `natillera-participacion` (las reglas se copian del estado de la natillera; la mora ya viene en fracción). Avisa a la web y al administrador |
| 3. `ConfirmarAutorizacion` | ✅ **Con permiso de prueba** (`GrantId` = `grant-prueba-<participación>`), anunciado como tal al participante. Lo reemplaza el permiso real cuando el bot se lo pida a la API de pagos (sección 2) |
| 4. `RechazarAutorizacion` | ⏳ Sin uso todavía: «Ahora no» deja la participación pendiente y se puede autorizar después con el mismo enlace. Lo usará el permiso real cuando el participante no apruebe o la billetera falle |
| 5. «Mi natillera» | ✅ En el chat (`bot/comandos/mi-natillera.js`, PR #70): `/mi_natillera` lee la natillera y la participación en staging y responde un mensaje por natillera según el estado, con «Autorizar el cobro (prueba)» si falta y «Ya tengo la plata» si hay cuota pendiente. El administrador ve también las que administra sin ahorrar. ⏳ La Mini App sigue con datos de ejemplo: puede recibir los datos como el panel, en el fragmento del enlace (fila 5) |
| Panel del administrador | ✅ `/administrar` (`bot/comandos/administrar.js` y `miniapp/admin/`, PR #70): lee en staging cada natillera que administra la persona y la participación de cada quien, y abre la Mini App con esos datos en el fragmento del enlace (`src/natillera/panel.js`). El bot guarda el nombre de Telegram al unirse; a los que se unieron antes se lo pide a Telegram (`getChat`) la primera vez |
| 7, 9, 10, 12. Actividades | ⏳ Faltan los flujos del administrador |
| 11. Préstamo | ⏳ Falta el flujo. `PrestamoDesembolsado` trae `participanteId`. `DesembolsoFallo` y `CreditoEnMora` solo traen `creditoId`: la web les agrega el `participanteId` al entregarlos, porque ella creó el crédito |

**Lo que falta en el código del bot:**

- Cambiar la fuente de los avisos: los de staging, pedírselos a la web, y los de pago, a la API de pagos, cada uno con su cursor (sección 3), en vez del flujo en vivo.
- Pedir los permisos reales a la API de pagos (sección 2), con `PAGOS_API_KEY` y los encabezados `X-OP-*`, en vez del `GrantId` de prueba.
- Mandar `Idempotency-Key` en cada `POST .../triggers` (ver «Reglas al llamar a staging»): `src/externo/cliente.js` todavía no la manda.
- Dar por rechazada una acción también cuando todas sus funciones traen `requiredStateFailed` o `hasInvalidTransition`, no solo `preconditionFailed`.
- `comandos/start.js` toma cualquier dato del `/start` como una invitación. Hay que agregar, antes de ese caso, uno para el prefijo `permiso_` (sección 2).

**Formato de los parámetros:** cada uno va tipado, `{ "type": "Text", "value": "..." }`. Los tipos son `Text`, `Currency` (número), `Integer`, `Percentage` (**fracción: 1 % = 0.01**) y `Date` (`AAAA-MM-DD`).

**Reglas al llamar a staging:**

- Un `200` en `POST .../triggers` no garantiza que la acción corrió. Revisa `results[]`: si todas traen `preconditionFailed`, `requiredStateFailed` o `hasInvalidTransition`, fue rechazada; muéstrale al usuario el motivo.
- **`Idempotency-Key`, una por acción lógica:** por ejemplo, derivada del `VentaId` en la compra o del id del botón. Si el usuario toca otra vez, se manda la **misma** llave y staging no repite la acción. Si la primera sigue en curso, responde `409`: trátalo como «ya en curso», no como error.
- **Crear contratos (`POST /api/contracts`) no acepta esa llave.** Si la creación de una natillera, una participación, una actividad o una venta se cae por tiempo, búscala por su id (`NatilleraId`, `ParticipacionId`, …) con `POST /api/contracts/search` antes de reintentar, para no crearla dos veces.
- Las cascadas son asíncronas: lo que nace por una regla (obligación, venta, devolución) no existe todavía cuando vuelve el `200`. Espera su aviso o búscalo con pausas de 1, 2 y 4 segundos.
- La puerta de staging acepta como máximo 5 escrituras por segundo (crear y disparar acciones) desde la dirección IP del bot.

## 1. Lo que el bot le pide a staging

| # | Momento en el bot | Historia | Llamada | Parámetros | Después |
|---|---|---|---|---|---|
| 1 | El administrador confirma «Crear natillera» (el enganche `crearNatillera` de `flujos/crear.js`) | US-001 | `POST /api/contracts` con `natillera-cuenta` | `NatilleraId` (lo genera el bot), `NombreNatillera`, `ValorCuota`, `FechaInicio`, `FechaFinal`, `PeriodicidadMeses` = 1, `CupoMinimo`, `PorcentajeMoraDiaria`, `DiasEsperaCupo`, `PagosParaPrestamo`, `MultiploPrestamo` (los tres últimos de la configuración, US-001-CFG; ver «Cambios que necesita el código del bot»). La mora va como fracción: 2.5 % = 0.025. Con la 0.2.0, opcionales `PorcentajeComision` (0.05) y `PlazoDevolucionDias` (8) | Guarda el `contractId` y avisa a la web (4.1) |
| 2 | Un invitado acepta y registra su billetera | US-004, US-005 | `POST /api/contracts` con `natillera-participacion` | `ParticipacionId` (lo genera el bot), `NatilleraId`, `ParticipanteId` (id de Telegram), `WalletParticipante` y, copiados de la natillera, `ValorCuota`, `NumeroCuotas` (del estado de la cuenta), `PorcentajeMoraDiaria`, `PagosParaPrestamo`, `MultiploPrestamo`, `FechaInicio` | Guarda el `contractId`, avisa a la web (4.2) y pide el permiso recurrente (sección 2) |
| 3 | Vuelve aprobado de su billetera | US-005-INT | `POST /api/contracts/{participación}/triggers` → `ConfirmarAutorizacion` | `PermisoAprobado` = 1, `BilleteraVerificada` = 1, `GrantId` (de la API de pagos; mientras los pagos no existan, uno de prueba como `grant-prueba-ana`) | La participación queda `VALIDADA` |
| 4 | No aprobó el permiso | US-005 | `POST .../{participación}/triggers` → `RechazarAutorizacion` | `Motivo` | — |
| 5 | «Mi natillera» (la Mini App) | US-008 | `GET /api/contracts/{participación}` y `GET /api/contracts/{natillera}` | De `currentStateRaw`. Participación: `TotalAportado`, `CuotasPagadas`, `NumeroCuotas`, `DeudaCuotas`, `MoraAcumulada`, `EstadoParticipacion`. Natillera: `SaldoNatillera`, `PeriodoActual`, `FechaProximoCobro`, `EstadoNatillera`. El nombre del estado viene en `currentStateLabels`. **La Mini App no llama a staging ni al bot:** corre en el celular y el bot no tiene servidor público. Igual que el panel de `/administrar`, el bot lee staging y le pasa los datos en el fragmento del enlace (`#d=...`), que no sale del teléfono; para refrescarlos se vuelve a abrir desde el bot | — |
| 6 | El moroso avisa que ya tiene el dinero | US-017 | `POST .../{participación}/triggers` → `PagarDeuda` | Ninguno | Staging cobra deuda más mora |
| 7 | El administrador crea una actividad | US-010 | `POST /api/contracts` con `natillera-actividad` | `ActividadId` (lo genera el bot), `NatilleraId`, `Descripcion`, `ValorPorParticipante`, `Premio` (0 si no hay), `NumeroParticipantes`, `CastigoMoraDiario`, `FechaActividad`, `FechaPago` | Staging crea la obligación de cada participante. Búscalas, con pausas porque la cascada tarda, con `POST /api/contracts/search` y el cuerpo `{ "templateName": "natillera-obligacion-actividad", "filters": [{ "concept": "ActividadId", "op": "eq", "value": "<ActividadId>" }], "concepts": ["ParticipacionId"] }`. Cada fila trae `contractId` y, en `concepts.ParticipacionId`, de quién es. Guárdalas y avisa a la web (4.3) |
| 8 | Un participante paga su parte | US-011 | `POST .../{su obligación}/triggers` → `AutorizarPago` | Ninguno | Staging cobra |
| 9 | El administrador indica al ganador | US-012 | `POST .../{actividad}/triggers` → `IndicarGanador` | `GanadorParticipacionId`, `WalletGanador`, `GanadorConfirmado` = 1 | Staging paga el premio |
| 10 | La actividad no tiene premio o no hubo ganador | US-013 | `POST .../{actividad}/triggers` → `CerrarSinPremioOSinGanador` | Ninguno | Todo va al acumulado |
| 11 | El participante pide un préstamo | US-014 | **Nada en staging**: no tiene solicitudes | — | Avisa a la web (4.4); la financiera decide allá |
| 12 | Falló el pago de un premio y el administrador reintenta | — | `POST .../{natillera}/triggers` → `ReintentarPagoPremio` | `ActividadId`, `MontoPremio`, `GanadorParticipacionId`, `WalletGanador` | — |

### Ventas (se decide a las 20:00 si entran a la demo)

Antes de construirlas, la natillera tiene que haberse creado **después** de que Willy actualice staging a la 0.2.0 (#66). Cada contrato queda sellado en la versión con la que nació: a una natillera anterior, `SolicitarCompra` le responde 400 «Unknown Trigger».

| # | Momento en el bot | Llamada | Parámetros | Después |
|---|---|---|---|---|
| 13 | El comprador toca «Comprar» | `POST .../{natillera}/triggers` → `SolicitarCompra` | `VentaId` (lo genera el bot), `CompradorParticipacionId`, `VendedorParticipacionId`, `WalletComprador`, `WalletVendedor`, `ProductoId`, `Valor`, `VendedorEsAdministrador` (0/1). **Antes, validar:** que comprador y vendedor son distintos y están validados, que las billeteras salen de tu SQLite y no de lo que escriba el usuario, y que no es el día anterior a la fecha final | Espera el aviso `AutorizacionCompraPendiente` |
| 14 | Llega `AutorizacionCompraPendiente` | Pide a la API de pagos un permiso de **un solo uso** por `valor` (sección 2) | — | Guarda el `contractId` de la venta (viene en el aviso), manda el enlace al comprador y arranca un reloj de 15 minutos. Avisa a la web (4.5) |
| 15 | El comprador vuelve aprobado | `POST .../{venta}/triggers` → `ConfirmarAutorizacionCompra` | `PermisoAprobado` = 1, `GrantId` | Staging paga al vendedor y lleva la comisión a la natillera; llega `VentaConfirmada` |
| 16 | El comprador negó o pasaron 15 minutos | `POST .../{venta}/triggers` → `CancelarCompra` | `Motivo` | Llega `CompraCancelada` |

### Devoluciones (documentadas; se recomienda dejarlas fuera de la demo)

| # | Momento en el bot | Llamada | Parámetros | Después |
|---|---|---|---|---|
| 17 | El comprador pide la devolución | `POST .../{venta}/triggers` → `SolicitarDevolucion` | `Motivo` | Llega `DevolucionPedida` con el `contractId` de la devolución: guárdalo y manda los botones al vendedor y al administrador |
| 18 | Votos | `POST .../{devolución}/triggers` → `AprobarVendedor` o `AprobarAdministrador`, `NegarVendedor` o `NegarAdministrador` | `Motivo` al negar | **Comprueba que quien toca el botón es el vendedor o el administrador.** Si el vendedor es el administrador, basta su voto como administrador |
| 19 | Llega `DevolucionAprobada` | Pide a la API de pagos un permiso de un solo uso del **vendedor** por `montoVendedor` | — | La comisión vuelve sola al comprador. Arranca un reloj de 15 minutos |
| 20 | El vendedor vuelve aprobado | `POST .../{devolución}/triggers` → `AutorizarPagoDevolucion` | `PermisoAprobado` = 1, `GrantId` | Staging paga al comprador |
| 21 | El vendedor no aprobó en 15 minutos o se negó | `POST .../{devolución}/triggers` → `RegistrarNoPagoVendedor` | Ninguno | **Obligatorio**: si no se reporta, la natillera nunca liquida. Queda en deuda |
| 22 | El vendedor en deuda quiere pagar | Nuevo permiso de un solo uso → `AutorizarPagoDeuda` | `PermisoAprobado` = 1, `GrantId` | — |
| 23 | Falló la comisión devuelta y el administrador reintenta | `POST .../{natillera}/triggers` → `ReintentarDevolucionComision` | `VentaId`, `WalletComprador`, `Monto` | — |

**Lo que el bot no dispara:** arrancar, abrir periodos, causar mora, liquidar ni vencer plazos. Son acciones del reloj; en la demo las dispara Willy (#57).

### Ejemplo listo para probar: crear una natillera

```json
POST {SERVICIO_EXTERNO_URL}/api/contracts
Authorization: Bearer {SERVICIO_EXTERNO_TOKEN}

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
    "MultiploPrestamo": { "type": "Integer", "value": 2 },
    "PorcentajeComision": { "type": "Percentage", "value": 0.05 },
    "PlazoDevolucionDias": { "type": "Integer", "value": 8 }
  }
}
```

Responde `201` con el `contractId`. Las dos últimas líneas solo aplican si staging ya tiene la 0.2.0. Una billetera de prueba se ve así: `https://ilp.interledger-test.dev/natillera-ana`.

## 2. Permisos de pago (con la API de pagos)

Todas con `X-Api-Key: <PAGOS_API_KEY>` y los tres encabezados de las llaves de Open Payments: `X-OP-Wallet-Address`, `X-OP-Key-Id` y `X-OP-Private-Key`. La API no guarda esas llaves; el token de cada permiso queda atado a la llave que lo pidió, así que staging tiene que mandar **la misma** (si no coincide, la API responde `422`). El detalle está en [`../pagos/API.md`](../pagos/API.md) y [`../pagos/README.md`](../pagos/README.md).

1. `POST {PAGOS_URL}/api/permisos` con `{ "tipo": "recurrente" | "un-solo-uso", "wallet", "monto", "referencia" }` → `201 { "permisoId", "urlAprobacion" }`. El `monto` es el tope del permiso, en pesos:
   - **Recurrente:** el total que el participante autoriza para toda la natillera, sin intervalo. Tiene que alcanzar para todas las cuotas más la mora y las actividades: por ejemplo, cuota × número de cuotas más un margen. El margen lo define el equipo; el participante lo ve al aprobar.
   - **De un solo uso:** el `valor` completo de la compra, o el `montoVendedor` en la devolución.
2. El bot le manda `urlAprobacion` al participante. Lo aprueba (o lo rechaza) en su billetera de prueba.
3. La billetera devuelve al participante a la API de pagos, que verifica el `hash` y lo redirige al chat con `https://t.me/<bot>?start=permiso_<permisoId>`, haya aprobado o no. El bot recibe ese `/start` por la misma consulta que ya usa con Telegram. **Hay que agregar en `comandos/start.js` un caso para el prefijo `permiso_`**, antes del caso genérico que hoy lo toma como invitación.
4. `GET {PAGOS_URL}/api/permisos/{permisoId}` **con las llaves** → `{ "estado", "grantId", "motivo" }`. Esta consulta es la que termina el permiso: la vuelta no puede, porque el navegador del participante no tiene las llaves.
   - Si está `aprobado`, el bot dispara la acción que corresponda con el `grantId`: `ConfirmarAutorizacion`, `ConfirmarAutorizacionCompra`, `AutorizarPagoDevolucion` o `AutorizarPagoDeuda`.
   - Si está `rechazado`: `RechazarAutorizacion` en la participación, `CancelarCompra` en la venta o `RegistrarNoPagoVendedor` en la devolución, con el `motivo`.

El texto después de `start=` admite como máximo 64 caracteres, solo letras, números, `_` y `-`: el `permisoId` tiene que ser corto. Los 15 minutos de los permisos de un solo uso los cuenta el bot; el enlace de aprobación puede vencer antes (a los 10 minutos), y en ese caso la compra se cancela a los 15.

## 3. Los avisos (los de staging a la web, los de pago a la API de pagos)

Staging no le avisa al bot directamente: le avisa a la web, que verifica la firma y los guarda. El bot los pide cada 3 a 5 segundos (esto reemplaza al flujo en vivo de `src/avisos/`):

`GET {WEB_INDICE_URL}/api/avisos?desde=<cursor>` con `X-Api-Key: <WEB_INDICE_API_KEY>` → una lista de `{ "id", "evento", "contractId", "templateName", "datos", "recibido" }`. Procesa cada aviso y guarda el último `id` como cursor. La web ya descarta los repetidos.

Casi todos los avisos traen `natilleraId`, `participacionId`, `actividadId`, `creditoId` o `ventaId`, y no el id de Telegram: el bot lo busca en su SQLite. Las excepciones son `ElegibleParaPrestamo` y `PrestamoDesembolsado`, que traen `participanteId`, que es el id de Telegram.

**«Cobro hecho» no es un aviso de staging.** `CuotaPagada`, `DeudaPagada` y `ObligacionPagada` no llegan al destino de avisos. Los avisos de pago los genera la API de pagos al terminar cada pago, y el bot los pide aparte, con su propio cursor: `GET {PAGOS_URL}/api/avisos?desde=<cursor>` con `X-Api-Key: <PAGOS_API_KEY>` (sin las llaves de Open Payments). Llegan con la misma forma, `{ "id", "evento", "contractId", "templateName", "datos", "recibido" }`:

| Evento (de la API de pagos) | A quién | Datos que trae |
|---|---|---|
| `PagoCompletado` | El participante (en una cuota, deuda o actividad), el ganador, el comprador o el vendedor, según el tipo | `tipo` (`cuota`, `deuda`, `actividad`, `premio`, `liquidacion`, `desembolso`, `venta` o `comision`), `referencia`, `monto`, en las cuotas `periodo`, y `simulado` si no movió dinero |
| `PagoFallido` | El mismo | Los mismos datos más `motivo` |

Hay casos que comparten ruta y se rotulan como el de la demo: una comisión devuelta llega como `premio`, un reembolso como `liquidacion` y una devolución como `venta`.

**Los avisos de staging:**

| Evento | A quién | Datos que trae | Historia |
|---|---|---|---|
| `NatilleraActivada` | Todo el grupo | `natilleraId` | US-006 |
| `NatilleraCerradaSinCupo` | Todo el grupo | `natilleraId`, `fechaCierre` | — |
| `AutorizacionRechazada` | El participante | `participacionId`, `motivo` | US-005 |
| `EntradaEnMora` | El participante | `participacionId`, `deudaCuotas` | US-017 |
| `RecordatorioMora` | El participante, cada día | `deudaCuotas`, `moraAcumulada`, `total` | US-017 |
| `SalidaDeMora` | El participante | `participacionId` | US-017 |
| `CobroDeudaFallo` | El participante | `motivo` | US-017 |
| `RecordatorioObligacion` | El participante | `actividadId`, `deudaObligacion`, `castigoAcumulado`, `total` | US-011 |
| `CobroObligacionFallo` | El participante | `actividadId`, `motivo` | US-011 |
| `PremioPagadoAlGanador`, `PremioCompletado` | Todo el grupo | `natilleraId` o `actividadId`, `monto` o `premio` | US-012 |
| `ActividadAcumulada` | Todo el grupo | `actividadId`, `recaudado` | US-013 |
| `PremioCerradoEnLiquidacion` | Todo el grupo | `actividadId`, `ganadorParticipacionId`, `premioPagado` | — |
| `PagoPremioFallo` | El administrador | `motivo` | US-012 |
| `ElegibleParaPrestamo` | El participante | `participacionId`, `participanteId` (id de Telegram), `montoMaximoPrestamo` | US-014 |
| `PrestamoDesembolsado` | El participante | `creditoId`, `participanteId` (id de Telegram), `capital` | US-016 |
| `DesembolsoFallo`, `CreditoEnMora` | El participante | `creditoId`, `motivo` o `saldoVencido` | US-016 |
| `ParticipacionLiquidada` | El participante | `participacionId`, `monto` | US-009 |
| `PagoLiquidacionFallo`, `ReembolsoFallo` | El participante | `motivo` | US-009 |
| `ParticipacionReembolsada` | El participante | `monto` | — |
| `NatilleraCerrada` | Todo el grupo | `natilleraId`, `fechaCierre` | US-009 |

**Avisos de ventas** (si entran):

| Evento | A quién | Datos que trae |
|---|---|---|
| `AutorizacionCompraPendiente` | El comprador (pedir el permiso) | `ventaId`, `compradorParticipacionId`, `walletComprador`, `walletVendedor`, `valor`, `comision`, `montoVendedor` y el `contractId` de la venta |
| `CompraCancelada` | El comprador | `ventaId`, `compradorParticipacionId`, `motivo` |
| `VentaConfirmada` | Comprador y vendedor | `ventaId`, `compradorParticipacionId`, `vendedorParticipacionId`, `valor`, `comision`, `montoVendedor` |
| `ComisionPendienteRegistrada` | El comprador | `ventaId`, `compradorParticipacionId`, `comision` (compra a medias) |
| `ComisionPorCobrarRegistrada` | El administrador | `natilleraId`, `ventaId`, `comision` |

**Avisos de devoluciones** (si entran): `DevolucionPedida` (vendedor y administrador; trae el `contractId` de la devolución), `VotoDevolucionRegistrado`, `DevolucionAprobada` (pedirle el permiso al vendedor), `DevolucionNoProcedio`, `RecordatorioDevolucionPendiente`, `DevolucionCerradaAlLiquidar`, `DeudaDevolucionRegistrada`, `DevolucionPagada`, `DeudaDevolucionSaldada`, `PagoDeudaDevolucionFallo`, `DevolucionPorRecibir`, `DevolucionSinCobro`, `ComisionDevuelta` y `DevolucionComisionFallo`. Estos dos últimos no traen `ventaId`: asócialos a la devolución aprobada más reciente de esa natillera.

## 4. Lo que el bot le avisa a la web

Con `X-Api-Key: <WEB_INDICE_API_KEY>`. Si la llamada falla, se reintenta: la web ignora los repetidos por id.

| # | Ruta | Cuándo | Cuerpo |
|---|---|---|---|
| 4.1 | `POST {WEB_INDICE_URL}/api/indice/natilleras` | Después de crear la natillera | `natilleraId`, `contractId`, `nombre`, `administrador` (`telegramId`, `nombre`), `creadaEn` |
| 4.2 | `POST {WEB_INDICE_URL}/api/indice/participaciones` | Después de crear la participación | `natilleraId`, `participacionId`, `contractId`, `nombre`, `telegramId`, `billetera` |
| 4.3 | `POST {WEB_INDICE_URL}/api/indice/actividades` | Después de encontrar las obligaciones | `natilleraId`, `actividadId`, `contractId`, `descripcion`, `obligaciones` (`participacionId`, `contractId`) |
| 4.4 | `POST {WEB_INDICE_URL}/api/indice/solicitudes` | El participante pide un préstamo | `solicitudId`, `natilleraId`, `participacionId`, `montoMaximo`, `montoSolicitado`, `plazoMeses`, `fechaSolicitud` |
| 4.5 | `POST {WEB_INDICE_URL}/api/indice/ventas` | Llega `AutorizacionCompraPendiente` (si entran las ventas) | `natilleraId`, `ventaId`, `contractId`, `productoId`, `descripcionProducto`, `compradorParticipacionId`, `vendedorParticipacionId`, `valor`, `comision`, `creadaEn` |

## Orden para probar hoy

1. **Crear la natillera** desde el bot y verla con `GET /api/contracts/{contractId}`.
2. **Unir a tres participantes de prueba** y confirmarles el permiso. Mientras el bot no le pida los permisos a la API de pagos, usa un `GrantId` de prueba. La natillera debe contar 3 en `ParticipantesValidados`.
3. **Pedirle a Willy que dispare `Iniciar`** con la fecha simulada (#57). Cuando la web reciba los avisos, el bot debe ver llegar `NatilleraActivada`, y el `PagoCompletado` de cada cuota en los avisos de la API de pagos cuando staging la llame (#55). Mientras la API de pagos de staging siga en modo de prueba, los cobros se dan por hechos sin mover dinero real: así se prueba el ciclo completo ya.
4. **Abrir «Mi natillera»** y ver el aporte.
5. **Seguir con mora, actividades y préstamo.** Las ventas, si se aprueban a las 20:00.
