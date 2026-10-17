# Maquetas

Maquetas de baja fidelidad en Mermaid: qué pantallas hay, cómo se llega a cada una y qué bloques las arman. El detalle
visual (colores, tipografía, componentes) está en el [design system](../../design-system/README.md); las capturas
reales de la web se sacan con `npm run capturas` en `web/`. Los textos entre comillas «» salen del código; los demás
describen el bloque y pueden no ser literales.

## 1. Mapa de pantallas

```mermaid
flowchart LR
  subgraph TG["Telegram"]
    START["/start<br/>TarjetaBienvenida"] --> CREAR["/crear<br/>Mini App o preguntas en el chat"]
    CREAR --> INV["Enlace de invitación"]
    INV --> UNIRSE["Unirse a la natillera"]
    UNIRSE --> AUT["Autorizar el cobro<br/>«Abrir mi billetera»"]
    AUT --> BILL["Billetera (Open Payments)<br/>aprueba el permiso"]
    BILL --> VUELTA["Vuelta al chat<br/>/start permiso_…"]
    VUELTA --> MIA["/mi_natillera<br/>cuánto lleva y próxima cuota"]
    MIA --> PRES["/prestamo<br/>monto y plazo"]
    START --> ADMIN["/administrar<br/>Mini App del administrador"]
  end

  subgraph WEBG["Web"]
    HOME["/ · página pública"] --> ING["/ingresar<br/>código de 6 dígitos por Telegram"]
    ING --> NATS["/natilleras"]
    NATS --> DET["/natilleras/[id]"]
    ING -.-> CRED["/creditos<br/>oculta en la entrega"]
    ING --> PAGOS["/pagos · registro para el jurado"]
    ING --> BIT["/bitacora"]
  end

  PRES -.->|solicitud en el índice| CRED
```

## 2. Bot de Telegram

### Bienvenida

```mermaid
flowchart TB
  subgraph Bienvenida["Chat · /start"]
    direction TB
    T1["TarjetaBienvenida (imagen)<br/>Natillera 2.0 · ahorrar juntos, siempre"]
    T2["Texto: qué es una natillera y cómo se cuida el dinero"]
    B1(["Crear una natillera"])
    B2(["Mi natillera"])
    T1 --> T2 --> B1
    T2 --> B2
  end
```

### Autorizar el cobro automático

```mermaid
flowchart TB
  subgraph Autorizar["Chat · después de unirse"]
    direction TB
    A1["Texto: para que la cuota se pague sola, aprobar el cobro en la billetera:<br/>hasta el valor de la cuota, una vez por periodo, hasta la fecha final"]
    A2(["Abrir mi billetera"])
    A3(["Ya aprobé"])
    A4["AutorizacionCompleta al volver: el cobro quedó autorizado"]
    A1 --> A2 --> A4
    A1 --> A3 --> A4
  end
```

### Mi natillera

```mermaid
flowchart TB
  subgraph Mia["Chat o Mini App · /mi_natillera"]
    direction TB
    M1["Nombre de la natillera · BadgeEstado (Activa, Mora…)"]
    M2["ProgresoAhorro: lo que lleva / lo que va a juntar"]
    M3["TarjetaAporte: última cuota y próxima fecha de cobro"]
    M4(["El botón que le toca:<br/>Autorizar el cobro · Pagar la deuda · Pedir préstamo"])
    M1 --> M2 --> M3 --> M4
  end
```

### Panel del administrador

```mermaid
flowchart TB
  subgraph Admin["Mini App · /administrar"]
    direction TB
    D1["Una tarjeta por natillera: nombre y fecha de creación"]
    D2["Quién falta por autorizar"]
    D3["Cómo va el arranque: validados / cupo mínimo"]
    D4(["Compartir el enlace de invitación"])
    D1 --> D2 --> D3 --> D4
  end
```

## 3. Web de la financiera y el administrador

### Ingresar

```mermaid
flowchart TB
  subgraph Ingresar["/ingresar"]
    direction TB
    I1["Logo · Iniciar sesión<br/>«Para la financiera y los administradores de cada natillera»"]
    I2["Usuario"]
    I3(["Pedir el código"])
    I4["Código de 6 dígitos<br/>«Te llega por Telegram, al chat que tienes con el bot de Natillera»"]
    I5(["Entrar"])
    I1 --> I2 --> I3 --> I4 --> I5
  end
```

### Natilleras

```mermaid
flowchart TB
  subgraph Lista["/natilleras"]
    direction TB
    L1["EncabezadoPagina: Natilleras"]
    L2["Tabla: nombre · administrador · participantes · total · BadgeEstado"]
    L3["EstadoVacio: «Todavía no hay natilleras» (si no hay)"]
    L1 --> L2
    L1 --> L3
  end
  subgraph Detalle["/natilleras/[id]"]
    direction TB
    N1["BloqueCustodia: la financiera custodia, nadie del grupo toca el dinero"]
    N2["ProgresoAhorro: total del grupo y periodo actual"]
    N3["Tabla de participantes: nombre · aportado · deuda · BadgeEstado"]
    N1 --> N2 --> N3
  end
  L2 -->|abre una| N1
```

### Créditos

**Oculta en la entrega:** el flujo no se alcanzó a probar de punta a punta, así que `/creditos` no sale en el menú y responde 404. Se vuelve a mostrar con `SECCION_CREDITOS_VISIBLE` en `web/src/lib/secciones.ts`.

```mermaid
flowchart TB
  subgraph Creditos["/creditos"]
    direction TB
    C1["SolicitudesCredito: participante · natillera · monto pedido / máximo · plazo"]
    C2(["Aprobar"])
    C3(["No aprobar"])
    C4["TarjetaCredito de cada crédito: capital · cuota · saldo · estado"]
    C5["AvisoRespuestas: lo que ya se respondió y quién"]
    C1 --> C2 --> C4
    C1 --> C3 --> C5
  end
```

### Registro de pagos para el jurado

```mermaid
flowchart TB
  subgraph Pagos["/pagos"]
    direction TB
    P1["PanelJurado: un pago real de Open Payments de punta a punta"]
    P2["Tabla: Fecha y hora · Participante · Tipo · Estado"]
    P3["LineaTiempoPago en cada fila: Solicitud · Autorización · Ejecución · Finalización<br/>(cada etapa con su hora y su estado)"]
    P1 --> P2 --> P3
  end
```

### Bitácora del administrador

```mermaid
flowchart TB
  subgraph Bitacora["/bitacora"]
    direction TB
    X1["Eventos de la natillera y de sus actividades, del más reciente al más viejo"]
    X2["Cada fila: hora · qué pasó · quién"]
    X1 --> X2
  end
```
