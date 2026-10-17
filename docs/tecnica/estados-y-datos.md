# Estados y datos

Qué estados recorre cada cosa y qué guarda cada pieza. Los estados de la natillera y de la participación son los del
servicio externo tal como el bot y la web los leen en `currentStateRaw` (el número es la posición del estado). Los
del permiso y del pago son de la API de pagos (`pagos/src/permisos.js` y `pagos/src/pagos.js`).

## 1. La natillera (`natillera-cuenta`, concepto `EstadoNatillera`)

```mermaid
stateDiagram-v2
  [*] --> CREADA
  CREADA --> INICIADA: Iniciar · llegó la fecha de inicio con el cupo de validados
  INICIADA --> ACTIVA: la primera cuota que completa el cupo
  INICIADA --> REEMBOLSANDO: VerificarCupo · pasó la espera sin cupo
  REEMBOLSANDO --> CERRADA_SIN_CUPO: el último reembolso deja la cuenta en 0
  ACTIVA --> LIQUIDANDO: IniciarLiquidacion · llegó la fecha final
  ACTIVA --> PREPARANDO_LIQUIDACION: IniciarLiquidacion con devoluciones en deuda (0.2.0)
  PREPARANDO_LIQUIDACION --> LIQUIDANDO: las devoluciones quedaron asignadas
  LIQUIDANDO --> CERRADA: el último pago deja la cuenta en 0
  CERRADA --> [*]
  CERRADA_SIN_CUPO --> [*]
```

| Número | Estado |
|---|---|
| 0 | CREADA |
| 1 | INICIADA |
| 2 | ACTIVA |
| 3 | LIQUIDANDO |
| 4 | REEMBOLSANDO |
| 5 | CERRADA |
| 6 | CERRADA_SIN_CUPO |
| 7 | PREPARANDO_LIQUIDACION |

## 2. La participación (`natillera-participacion`, concepto `EstadoParticipacion`)

```mermaid
stateDiagram-v2
  [*] --> PENDIENTE_VALIDACION
  PENDIENTE_VALIDACION --> VALIDADA: ConfirmarAutorizacion · permiso aprobado
  VALIDADA --> ACTIVA: primera cuota cobrada
  VALIDADA --> MORA: sin fondos el día del cobro
  ACTIVA --> MORA: sin fondos el día del cobro
  MORA --> ACTIVA: PagarDeuda · pagó deuda y mora
  ACTIVA --> EN_LIQUIDACION: la natillera liquida
  MORA --> EN_LIQUIDACION: liquida con su deuda descontada
  EN_LIQUIDACION --> LIQUIDADA: le pagaron su parte final
  VALIDADA --> REEMBOLSADA: sin cupo y nunca pagó
  ACTIVA --> EN_REEMBOLSO: sin cupo
  MORA --> EN_REEMBOLSO: sin cupo, con algo aportado
  EN_REEMBOLSO --> REEMBOLSADA: le devolvieron lo aportado
  LIQUIDADA --> [*]
  REEMBOLSADA --> [*]
```

Números: PENDIENTE_VALIDACION 0 · VALIDADA 1 · ACTIVA 2 · MORA 3 · EN_LIQUIDACION 4 · EN_REEMBOLSO 5 · LIQUIDADA 6 ·
REEMBOLSADA 7.

## 3. El permiso de Open Payments (API de pagos)

```mermaid
stateDiagram-v2
  [*] --> pendiente: POST /api/permisos · la billetera devuelve el enlace de aprobación
  pendiente --> aprobado: el participante aprobó y el bot consultó GET /api/permisos/{id} con las llaves
  pendiente --> rechazado: no aprobó o falló la billetera
  aprobado --> cancelado: POST /api/permisos/{id}/cancelar
  rechazado --> [*]
  cancelado --> [*]
```

| Tipo | Para qué | De qué billetera |
|---|---|---|
| `recurrente` | Cuotas, deuda y actividades del participante | La del participante |
| `un-solo-uso` | Una compra o una devolución, por el valor exacto | La del comprador o la del vendedor |
| `grupo` | Pagos de la natillera: liquidación, premios y reembolsos | La del grupo (a nombre de la financiera) |
| `financiera` | Desembolsos de préstamos | La de la financiera |

Mientras el permiso termina, la API lo marca por dentro como `aprobando` y responde `pendiente`.

## 4. Un pago y sus cuatro etapas (lo que ve el jurado)

```mermaid
stateDiagram-v2
  direction LR
  [*] --> Solicitud: el servicio externo pide la operación
  Solicitud --> Autorizacion: permiso vigente (token)
  Autorizacion --> Ejecucion: cotización y pago saliente en Open Payments
  Ejecucion --> Finalizacion: completado o fallido, con su motivo
  Finalizacion --> [*]
```

Cada etapa queda con su hora y su estado en el registro (`GET /api/registro`) y la web la dibuja con `LineaTiempoPago`.

## 5. Qué guarda cada pieza

```mermaid
erDiagram
  NATILLERA ||--o{ PARTICIPACION : "tiene"
  NATILLERA ||--o{ ACTIVIDAD : "organiza"
  ACTIVIDAD ||--o{ OBLIGACION : "una por participante"
  PARTICIPACION ||--o{ SOLICITUD : "pide préstamo"
  SOLICITUD ||--o| DECISION : "la responde la web"

  NATILLERA {
    string natilleraId PK
    string contractId "natillera-cuenta en staging"
    string nombre
    string administrador "telegramId y nombre"
    string billeteraGrupo
    string creadaEn
  }
  PARTICIPACION {
    string participacionId PK
    string natilleraId FK
    string contractId "natillera-participacion en staging"
    string nombre
    string telegramId
    string billetera
  }
  ACTIVIDAD {
    string actividadId PK
    string natilleraId FK
    string contractId
    string descripcion
  }
  OBLIGACION {
    string participacionId FK
    string contractId
  }
  SOLICITUD {
    string solicitudId PK
    string participacionId FK
    number montoMaximo
    number montoSolicitado
    number plazoMeses
    string fechaSolicitud
  }
  DECISION {
    string solicitudId PK
    string decision "aprobada o no_aprobada"
    string creditoId "el crédito en staging"
    string respondio
    string fecha
  }
```

- **Índice de la web** (`web/src/lib/indice/tipos.ts`, en `/home/data/indice.json` en Azure): lo que staging no guarda
  y la web necesita para mostrar, como los nombres, el administrador y las solicitudes de crédito. Lo alimenta el bot
  con `POST /api/indice/{tipo}` (natilleras, participaciones, actividades, solicitudes); las decisiones las escribe
  solo la web. Un reintento con los mismos datos responde 200; con otros datos, 409 y no cambia nada.
- **API de pagos** (`pagos/src/almacen.js`, tabla `pagos` en Azure Storage): una fila por objeto, con el tipo como
  partición (permisos con sus tokens, pagos con sus etapas, avisos e idempotencia). Nunca guarda las llaves de Open
  Payments: solo la huella de la llave que pidió cada permiso.
- **Servicio externo**: el estado de cada contrato (saldos, deudas, estados) y su historia de eventos. Es la fuente de
  verdad del dinero; el bot y la web solo leen `currentStateRaw` y ejecutan acciones.
