# Frente Web

La página de la financiera y del administrador: gestionar las natilleras, ver las solicitudes de crédito, el registro de pagos que se le muestra al jurado y la bitácora del administrador.

**Issues:** [frente: web](https://github.com/fintechfy-dev/openpayments-fintechfy/issues?q=is%3Aopen+label%3A%22frente%3A+web%22). Empieza por #8 (esqueleto) y #9 (ver y gestionar natilleras).

| Pantalla | Issue | Prioridad |
|---|---|---|
| Natilleras: lista y detalle | #9 | núcleo |
| Solicitudes de crédito de la financiera | #10 | núcleo |
| Registro de pagos con sus cuatro etapas (para el jurado) | US-007-RPT | núcleo |
| Bitácora del administrador | US-012-AUD | recorte 3 |

## Estilos

La página usa el [design system](../design-system/): carga `design-system/tokens/tokens.css`, `design-system/components/bundle.css` y `bundle.js`, y arma las pantallas con los componentes `PanelJurado`, `Tabla`, `BadgeEstado`, `LineaTiempoPago`, `SolicitudesCredito` (#10) y `TarjetaCredito`. Montos siempre con `Natillera.formatoCOP`.

## Contratos

- **Con el servicio externo de lógica financiera:** todo lo que muestra la página sale de ahí. El contrato se escribe en [`../integracion/README.md`](../integracion/README.md) (#5).
- La web no mueve dinero.

## Cómo correrlo

Next.js + TypeScript. Necesita Node 20.9 o más reciente.

```bash
cd web
npm install
npm run dev            # http://localhost:3000
```

| Comando | Qué hace |
|---|---|
| `npm run dev` | Arranca en modo desarrollo. Antes copia el design system (`npm run ds`). |
| `npm run verificar` | Tipos, lint, pruebas y build: lo que debe pasar antes de un PR. |
| `npm run capturas` | Con la web corriendo, toma capturas de cada pantalla en 360, 768, 1024 y 1280 px, en claro y oscuro, y avisa si alguna tiene scroll horizontal. Quedan en `web/.capturas/`. |

### Datos

Sin variables de entorno, la web usa **datos de prueba** (lo indica un aviso arriba de cada pantalla). Para conectarla al servicio externo, copia `.env.example` a `.env.local` y llena:

- `SERVICIO_URL`: dirección del servicio externo de lógica financiera.
- `SERVICIO_API_KEY`: su `X-Api-Key`. Solo la lee el servidor; nunca le pongas el prefijo `NEXT_PUBLIC_`.

Las rutas del cliente HTTP (`src/lib/servicio/http.ts`) son provisionales hasta que se defina el contrato en #5.

### Inicio de sesión

`/` es la página pública con el propósito del proyecto; `/ingresar`, el formulario. Todo el panel (`/natilleras`, `/creditos`, `/pagos`, `/bitacora` y `/api/pagos`) exige sesión.

- Dos usuarios de demo: `financiera` (ve todo y responde créditos) y `andres` (administrador de Los Primos: solo ve sus natilleras, sus pagos y su bitácora).
- **No hay claves: se entra con un código de 6 dígitos que llega por Telegram** (vence en 5 minutos y sirve una sola vez).
- En `.env.local`: `SESION_SECRETO` (al menos 32 caracteres al azar; el comando para generarlo está en `.env.example`), `TELEGRAM_BOT_TOKEN` (el mismo `BOT_TOKEN` del bot; la web solo envía mensajes) y el chat de cada usuario (`DEMO_FINANCIERA_TELEGRAM_CHAT_ID`, `DEMO_ADMIN_TELEGRAM_CHAT_ID`). Para saber el chat id, la persona le escribe `/start` al bot y el id queda en su log. Sin `SESION_SECRETO` nadie puede entrar y la página lo dice.
- **En desarrollo sin `TELEGRAM_BOT_TOKEN`**, el código aparece en la terminal de `npm run dev` en vez de enviarse. En producción eso nunca pasa.
- La sesión es una cookie `httpOnly` firmada (HMAC-SHA256) que dura 8 horas. El `proxy` (`src/proxy.ts`) es la primera barrera; cada página, la acción de créditos y la API vuelven a comprobar la sesión y el rol (`src/lib/sesion/acceso.ts`).
- Hasta 3 códigos por usuario cada 10 minutos; con 5 códigos equivocados, el código se invalida y el usuario espera 10 minutos. La pantalla responde igual exista o no el usuario.
- Es un inicio de sesión de demo: cuando el servicio externo (#5) defina cómo se autentica la financiera y dónde están los usuarios, se cambia `src/lib/sesion/usuarios.ts`.

### Cómo está hecha

- `src/lib/servicio/`: la única puerta al servicio externo (tipos, datos de prueba y cliente HTTP), solo de servidor.
- `src/app/<pantalla>/`: una carpeta por pantalla. Las páginas son componentes de servidor; lo interactivo (aprobar créditos, refresco del registro de pagos) va en componentes de cliente pequeños.
- Todo lo visual sale del [design system](../design-system/): `npm run ds` copia sus tokens, componentes, fuentes y logos.

### Trabajar con Claude Code

El repo trae lo necesario para que Claude construya la web con las reglas del proyecto:

- Skills `natillera-web` (buenas prácticas de esta web) y `natillera-design-system` (marca y componentes), en `.claude/skills/`.
- Agentes `web-implementador`, `web-revisor` y `web-verificador-visual`, en `.claude/agents/`.
- Comando `/director-web <encargo>`: planea, reparte pantallas entre implementadores en paralelo, revisa, verifica en 3 anchos y deja el PR listo.
