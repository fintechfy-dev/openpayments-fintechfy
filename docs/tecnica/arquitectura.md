# Arquitectura

Cómo está armada Natillera 2.0, quién habla con quién y cómo viaja el dinero. Los diagramas son Mermaid: GitHub los
dibuja solos. El resumen corto está en [`docs/plan-de-trabajo.md`](../plan-de-trabajo.md); aquí va el detalle.

## 1. Contexto

Quién usa el sistema y con qué sistemas de afuera habla.

```mermaid
flowchart TB
  subgraph Personas
    PART["Participante<br/>ahorra cada mes"]
    ADM["Administrador<br/>arma la natillera y también ahorra"]
    FIN["Financiera Aliada<br/>custodia y presta"]
    JUR["Jurado<br/>mira el pago de punta a punta"]
  end

  subgraph Natillera["Natillera 2.0 (este repositorio)"]
    BOT["Bot de Telegram<br/>y Mini Apps"]
    WEB["Web de la financiera<br/>y el administrador"]
    PAG["API de pagos<br/>(lo único que habla con Open Payments)"]
  end

  EXT[("Servicio externo de<br/>lógica financiera (staging)")]
  OP[["Open Payments<br/>Interledger Test Wallet"]]
  TG[["Telegram"]]

  PART -->|chat| TG --> BOT
  ADM -->|chat y Mini App| TG
  ADM -->|panel| WEB
  FIN -->|panel| WEB
  JUR -->|registro de pagos| WEB
  PART -->|aprueba permisos en su billetera| OP
  BOT -->|contratos y acciones| EXT
  WEB -->|estado y créditos| EXT
  EXT -->|pide cada cobro y cada pago| PAG
  PAG -->|permisos y pagos firmados| OP
```

- **El servicio externo de lógica financiera** aplica las reglas de dinero (cupo, cobro de cada periodo, mora,
  actividades, crédito y liquidación). Es como un n8n que ya contiene la lógica financiera: no se escribió en la
  hackathon y el proyecto solo lo llama por API. Sus reglas están en la
  [especificación funcional](../discovery/4-logica-financiera/especificacion-funcional.md).
- **La API de pagos** es la única pieza que firma con las llaves de Open Payments. El bot, la web y el servicio
  externo nunca hablan directo con una billetera.

## 2. Piezas y contratos entre ellas

Cada flecha dice qué ruta se llama y con qué credencial. Ninguna credencial viaja por Telegram.

```mermaid
flowchart LR
  subgraph Telegram
    BOT["telegram/<br/>Bot (Node + grammY)"]
    MINI["telegram/miniapp/<br/>Mini Apps (GitHub Pages)"]
  end
  WEB["web/<br/>Next.js + backend<br/>(Azure: natillera-web)"]
  PAG["pagos/<br/>API de pagos<br/>(Azure: natillera-pagos)"]
  EXT[("Servicio externo<br/>de lógica financiera<br/>(staging)")]
  OP[["Open Payments<br/>Test Wallet"]]
  NAV(["Navegador del participante"])

  BOT -->|"POST /api/contracts · POST /api/contracts/{id}/triggers<br/>GET /api/contracts/{id} · Bearer JWT"| EXT
  BOT -->|"POST /api/indice/{tipo} · X-Api-Key"| WEB
  BOT -->|"POST /api/permisos · GET /api/permisos/{id}<br/>GET /api/avisos · X-Api-Key + X-OP-*"| PAG
  MINI -.->|abre desde el chat| BOT
  WEB -->|"GET /api/contracts/table · acciones de crédito<br/>Bearer JWT (rol admin)"| EXT
  WEB -->|"GET /api/registro · X-Api-Key"| PAG
  EXT -->|"avisos de la natillera"| WEB
  EXT -->|"POST /api/open-payments/{operación}<br/>X-Api-Key de staging + X-OP-*"| PAG
  PAG -->|"permisos GNAP, cobros entrantes,<br/>cotizaciones y pagos salientes, firmados"| OP
  NAV -->|"aprueba el permiso"| OP
  OP -->|"vuelta"| PAG
  PAG -->|"GET /api/permisos/{id}/retorno<br/>redirige a t.me/…?start=permiso_{id}"| NAV
```

| Pieza | Qué hace | Qué NO hace | Mapa |
|---|---|---|---|
| Bot | Crea la natillera y las participaciones, ejecuta las acciones de cada persona, pide los permisos a la API de pagos y avisa por chat | No mueve dinero ni guarda llaves | [`telegram/INTEGRACION.md`](../../telegram/INTEGRACION.md) |
| Web | Panel de la financiera y del administrador: natilleras, créditos, registro de pagos, bitácora. Guarda en su índice lo que staging no guarda (nombres, administrador, solicitudes) | No mueve dinero | [`web/INTEGRACION.md`](../../web/INTEGRACION.md) |
| API de pagos | Pide y termina los permisos de Open Payments, ejecuta cada cobro y cada pago, y deja las cuatro etapas de cada pago para el jurado | No decide cuánto ni cuándo: eso lo dice el servicio externo | [`pagos/API.md`](../../pagos/API.md) |
| Servicio externo | Reglas de dinero, calendario de cobros, mora, liquidación, crédito y ventas | No es parte de la hackathon | [`integracion/README.md`](../../integracion/README.md) |

Las operaciones que el servicio externo le pide a la API de pagos son seis: `cobrar-cuota`, `cobrar`, `pagar`,
`desembolsar`, `pagar-con-permiso` y `aportar-con-permiso` (las dos últimas, de las ventas).

## 3. Despliegue

```mermaid
flowchart TB
  subgraph Azure["Azure · suscripción Patrocinio · grupo rg-natillera-pagos · Central US"]
    PLAN["Plan plan-natillera-pagos<br/>B1 Linux · siempre encendido · solo HTTPS"]
    PAGAPP["App Service natillera-pagos<br/>Node 24 · API de pagos"]
    WEBAPP["App Service natillera-web<br/>Node 22 · Next.js standalone<br/>índice en /home/data"]
    ST[("Storage stnatillerapagos<br/>tabla pagos")]
    PLAN --- PAGAPP
    PLAN --- WEBAPP
    PAGAPP --> ST
  end
  subgraph GitHub
    PAGES["GitHub Pages<br/>Mini Apps del bot"]
    CI["Actions: calidad.yml<br/>checklist, verificar de la web, pruebas del bot"]
  end
  BOTP["Proceso del bot<br/>Node + grammY"]
  STG[("Servicio externo · staging<br/>tenant de la hackathon")]
  TW[["Interledger Test Wallet"]]
  TGAPI[["API de bots de Telegram"]]

  BOTP --> TGAPI
  BOTP --> STG
  BOTP --> PAGAPP
  BOTP --> WEBAPP
  WEBAPP --> STG
  WEBAPP --> PAGAPP
  STG --> PAGAPP
  PAGAPP --> TW
```

- Las dos App Service comparten el plan B1 (una sola copia cada una). El grupo se borra completo después del evento.
- La configuración y las llaves viven en las variables de entorno de cada App Service y en los `.env` locales, nunca
  en el repositorio (`.claude/rules/secretos.md`).
- Las llaves de Open Payments llegan en cada llamada (`X-OP-*`) y no se guardan: la API solo guarda la huella de la llave
  que pidió cada permiso.

## 4. Flujos

### 4.1 Unirse y autorizar el cobro automático (US-004, US-005)

El participante aprueba UNA vez un permiso recurrente: hasta el valor de la cuota, una vez por periodo, hasta la fecha
final. Solo la aplicación tiene llaves de Open Payments; el participante solo aprueba en su billetera.

```mermaid
sequenceDiagram
  autonumber
  actor P as Participante
  participant B as Bot
  participant X as Servicio externo
  participant A as API de pagos
  participant W as Billetera (Open Payments)

  P->>B: abre el enlace de invitación
  B->>X: POST /api/contracts (natillera-participacion)
  X-->>B: contractId
  B->>A: POST /api/permisos (tipo recurrente, billetera, monto, vuelta)
  A->>W: pide el permiso (GNAP, firmado con la llave de la app)
  W-->>A: enlace de aprobación
  A-->>B: permisoId y urlAprobacion
  B->>P: botón «Abrir mi billetera»
  P->>W: inicia sesión y aprueba
  W->>A: vuelta (GET /api/permisos/{id}/retorno)
  A->>P: redirige al chat (start=permiso_{id})
  P->>B: /start permiso_{id} o «Ya aprobé»
  B->>A: GET /api/permisos/{id} (con las llaves X-OP-*)
  A->>W: termina el permiso (firmado)
  W-->>A: token del permiso
  A-->>B: estado aprobado y grantId
  B->>X: ConfirmarAutorizacion (GrantId)
  X-->>B: participación VALIDADA
```

El token del permiso se queda en la API de pagos: ni el bot ni el chat lo ven.

### 4.2 Cobro de cada cuota (US-006, US-007, US-017)

```mermaid
sequenceDiagram
  autonumber
  participant R as Reloj del servicio externo (06:00 o /reloj)
  participant X as Servicio externo
  participant A as API de pagos
  participant W as Billeteras (Open Payments)
  participant B as Bot y web

  R->>X: AbrirPeriodo (natillera)
  X->>X: CobrarCuota en cada participación
  X->>A: POST /api/open-payments/cobrar-cuota (grantId, billetera, monto, periodo)
  A->>W: cobro entrante en la billetera del grupo
  A->>W: cotización en la billetera del participante
  A->>W: pago saliente con el token del permiso
  W-->>A: completado
  A-->>X: estado completado y monto
  X->>X: CuotaCobrada, el aporte suma al total
  X-->>B: aviso CuotaPagada
  Note over A,W: Si no hay fondos, la API responde fallido: la participación pasa a MORA y el bot manda el recordatorio
```

Las cuatro etapas de cada pago (solicitud, autorización, ejecución y finalización) quedan en el registro de la API de
pagos, y la web las muestra en `/pagos` para el jurado.

### 4.3 Liquidación en diciembre (US-009)

```mermaid
sequenceDiagram
  autonumber
  participant X as Servicio externo
  participant A as API de pagos
  participant W as Billeteras (Open Payments)
  participant B as Bot y web

  X->>X: IniciarLiquidacion: parte igual para cada participante, menos sus deudas
  X->>X: lo descontado a los morosos se reparte entre todos
  loop por cada participación
    X->>A: POST /api/open-payments/pagar (billetera del participante, parte final)
    A->>W: pago saliente desde la billetera del grupo
    W-->>A: completado
    A-->>X: estado completado
  end
  X->>X: la cuenta del grupo queda en 0
  X-->>B: avisos ParticipacionLiquidada y NatilleraCerrada
```

### 4.4 Crédito desde el ahorro (US-014, US-016)

```mermaid
sequenceDiagram
  autonumber
  actor P as Participante
  participant B as Bot
  participant WB as Web
  actor F as Financiera
  participant X as Servicio externo
  participant A as API de pagos

  X-->>B: aviso ElegibleParaPrestamo
  P->>B: /prestamo (monto y plazo)
  B->>WB: POST /api/indice/solicitudes
  F->>WB: aprueba en /creditos
  WB->>X: POST /api/contracts (natillera-credito-ahorro, tasa de la financiera)
  X->>A: POST /api/open-payments/desembolsar
  A-->>X: completado
  X-->>B: aviso PrestamoDesembolsado
```

Si el préstamo sigue en mora en diciembre, el servicio externo lo descuenta de la parte del participante en la
liquidación.

### 4.5 Compra entre participantes (extra, versión 0.2.0 del servicio externo)

Una compra usa un permiso de un solo uso por el valor exacto: el servicio externo calcula la comisión (5 % por
omisión) y la API de pagos hace dos pagos desde la billetera del comprador.

```mermaid
sequenceDiagram
  autonumber
  actor C as Comprador
  participant B as Bot
  participant X as Servicio externo
  participant A as API de pagos
  participant W as Billeteras (Open Payments)

  C->>B: Comprar
  B->>X: SolicitarCompra en la natillera (valor)
  X-->>B: la venta nace con la comisión y lo que recibe el vendedor
  B->>A: POST /api/permisos (tipo un-solo-uso, valor exacto)
  C->>W: aprueba en su billetera
  B->>X: ConfirmarAutorizacionCompra (GrantId)
  X->>A: pagar-con-permiso (valor menos comisión, al vendedor)
  X->>A: aportar-con-permiso (comisión, al pozo)
  A->>W: los dos pagos salientes
  X-->>B: aviso VentaConfirmada
```
