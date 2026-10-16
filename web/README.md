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

La página usa el [design system](../design-system/): `npm run ds` copia `tokens.css`, `bundle.css`, las fuentes y los logos del kit (no `bundle.js`), y el layout los carga. Las pantallas se arman con componentes React propios en `src/components/` que usan las clases `nt-` y siguen las vistas previas del design system (`PanelJurado`, `Tabla`, `BadgeEstado`, `LineaTiempoPago`, `SolicitudesCredito`, `TarjetaCredito`). Montos siempre con `formatoCOP` de `@/lib/natillera` o el componente `<Dinero>`; una prueba compara esa copia con la de `bundle.js`. La web usa siempre el tema claro (`data-theme="light"` en `src/app/layout.tsx`).

## Contratos

- **Con el servicio externo de lógica financiera:** todo lo que muestra la página sale de ahí. El contrato se escribe en [`../integracion/README.md`](../integracion/README.md) (#5).
- La web no mueve dinero.

## Cómo correrlo

Next.js + TypeScript. Necesita Node 22 o más reciente.

```bash
cd web
npm install
npm run dev            # http://localhost:3000
```

| Comando | Qué hace |
|---|---|
| `npm run dev` | Arranca en modo desarrollo. Antes copia el design system (`npm run ds`). |
| `npm run verificar` | Tipos, lint, pruebas y build: lo que debe pasar antes de un PR. |
| `npm run capturas` | Con la web corriendo, toma capturas de cada pantalla en 360, 768, 1024 y 1280 px, emulando el sistema en claro y en oscuro, y avisa si alguna tiene scroll horizontal. Quedan en `web/.capturas/`. **Hoy no inicia sesión:** las rutas del panel están protegidas, así que las capturas muestran `/ingresar`; y como la web fuerza el tema claro, las "oscuras" se ven claras. |

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

### Estructura

| Ruta | Qué hay |
|---|---|
| `src/lib/servicio/` | **La única puerta al servicio externo**, solo de servidor (`server-only`). `index.ts` elige al cargar: sin `SERVICIO_URL` usa los datos de prueba de `mock.ts` (y el panel lo avisa); con URL y `SERVICIO_API_KEY`, el cliente de `http.ts` (`X-Api-Key`, rutas provisionales con `TODO(#5)`); con URL y sin llave, un servicio que falla con un error claro. `tipos.ts` es el contrato; lo importan también los componentes de cliente |
| `src/lib/sesion/` | Inicio de sesión: usuarios de demo (`usuarios.ts`), código de un solo uso (`otp.ts`), firma HMAC de la cookie (`firma.ts`), límite de intentos en memoria (`intentos.ts`), roles (`acceso.ts`) y envío por Telegram (`telegram.ts`, la única otra llamada a un sistema externo) |
| `src/lib/` | Lógica pura con prueba: `natillera.ts` (`formatoCOP`, estados e íconos, copia del `bundle.js` del design system), `pagos.ts` (etapas, filtros y anuncios del registro de pagos), `fechas.ts` (hora de Bogotá), `financiera.ts` (el nombre de la financiera, simulada) |
| `src/proxy.ts` | Primera barrera: sin sesión, las rutas del panel van a `/ingresar` y `/api/*` responde 401 |
| `src/app/page.tsx`, `ingresar/` | Inicio público y el ingreso con código (`actions.ts`) |
| `src/app/(panel)/` | Lo que exige sesión. El layout pide la sesión, muestra el rol, la navegación y el aviso de datos de prueba. Una carpeta por pantalla: `natilleras/` (y `[id]`), `creditos/` (solo la financiera; responde con la Server Action de `actions.ts`), `pagos/` (refresca cada 3 s desde `/api/pagos`) y `bitacora/`. La lógica de cada pantalla va en un `.ts` propio con su prueba (`presentacion.ts`, `logica.ts`, `bitacora.ts`) |
| `src/app/api/pagos/` | Lo que consulta el registro de pagos; filtra por las natilleras que puede ver la sesión |
| `src/components/` | Piezas compartidas sobre el design system: `Aviso`, `Badge`, `BloqueCustodia`, `Dinero`, `EncabezadoPagina`, `EstadoVacio`, `Icono`, `LineaTiempoPago`, `Logo`, `Navegacion` |
| `src/styles/app.css` | Estilos propios de la web; `src/styles/ds/` lo genera `npm run ds` (ignorado por git) |
| `scripts/` | `sync-ds.mjs` (copia el design system antes de `dev` y `build`) y `capturas.mjs` (Chrome sin ventana por CDP; usa `CHROME_PATH` si Chrome no está en la ruta conocida) |

Una página es componente de servidor; lo interactivo (aprobar créditos, refrescar pagos, el formulario de ingreso) va en componentes de cliente pequeños. La autorización se comprueba en el servidor en cada página, acción y ruta de API: el layout no protege las Server Actions.

**Integración con staging:** [`INTEGRACION.md`](INTEGRACION.md) es el plan para pasar de `X-Api-Key` a `Bearer` (`SERVICIO_EXTERNO_URL`, `SERVICIO_EXTERNO_TOKEN`) y recibir el índice del bot en `/api/indice/*` (`WEB_INDICE_API_KEY`). Nada de eso está construido todavía; al hacerlo se actualizan `.env.example`, esta tabla y `docs/arquitectura.md`.

### Trabajar con Claude Code

El repo trae lo necesario para que Claude construya la web con las reglas del proyecto:

- Skills `natillera-web` (buenas prácticas de esta web) y `natillera-design-system` (marca y componentes), en `.claude/skills/`.
- Agentes `web-implementador`, `web-revisor` y `web-verificador-visual`, en `.claude/agents/`.
- Comando `/director-web <encargo>`: planea, reparte pantallas entre implementadores en paralelo, revisa, verifica en 4 anchos (360, 768, 1024 y 1280 px) y deja el PR listo.
