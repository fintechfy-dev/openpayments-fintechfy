# Uso de IA

Declaración exigida por la política de IA de la hackathon. El equipo la completa a medida que avanza y la revisa antes del cierre del sábado a las 11:00.

## Herramientas usadas

- Claude Code (Claude Opus 5.5), de Anthropic: código, documentación, pruebas y configuración.
- Claude Design, de Anthropic: componentes del design system y el redibujo del logo en vector.
- ChatGPT (modelo de imagen `gpt-image`), de OpenAI: el tablero original del logo. Lo dicen los metadatos C2PA de `design-system/assets/logos/tablero-original.png`: creado el 16 de octubre a las 12:06 p. m., firmado por «OpenAI Media Service».

## Dónde y cómo se usó

### 1. Discovery previo al evento (`docs/discovery/`)

- Claude Code condujo las sesiones de impact mapping, user story mapping, BDD y la especificación funcional de la lógica financiera haciendo preguntas al equipo. El equipo respondió y aprobó cada fase; la IA redactó los documentos a partir de esas respuestas y decisiones.
- No es código de la hackathon. Se hizo antes del 16 de octubre como diseño.

### 2. Arranque del repositorio

- Claude Code armó la estructura inicial y copió el discovery: `README.md`, `.gitignore`, este archivo, `docs/` y la carpeta `prompts/`.
- Con las decisiones del equipo sobre los frentes, Claude Code redactó el plan de trabajo (`docs/plan-de-trabajo.md`), la guía de GitFlow (`CONTRIBUTING.md`), los README de `telegram/`, `web/`, `pagos/` e `integracion/`, las plantillas de `.github/`, y creó los issues y etiquetas del repositorio.

### 3. Código de la hackathon

Una línea por archivo o componente: qué herramienta, para qué y cuánto (mucho, poco o nada).

| Archivo o componente | Herramienta | Para qué | Cuánta IA |
|---|---|---|---|
| `design-system/` (marca, tokens, componentes, voz y tono) | Claude Design; ChatGPT (`gpt-image`) para el logo | Explorar y vectorizar el logo del equipo, definir paleta, tipografía, componentes y guía de mensajes | Mucho |
| `design-system/tokens/build.mjs`, `design-system/index.html` | Claude Code (Claude Opus 5.5) | Generar `tokens.css` desde `tokens.json` y galería local de componentes | Mucho |
| `telegram/docs/plan-esqueleto.md` | Claude Code (Claude Opus 5.5) | Plan del esqueleto del bot: decisiones, herramientas y pasos; el equipo lo revisó y aprobó antes de ejecutar | Mucho |
| `telegram/src/` (arranque, `crearBot`, `/start`, logger) | Claude Code (Claude Opus 5.5) | Esqueleto del bot con grammY (#7) | Mucho; probado a mano por el equipo con un bot real |
| `telegram/src/secretos.js`, guardia de salida y logger que tapa secretos | Claude Code (Claude Opus 5.5) | US-002-SEC (#14): ningún secreto en logs ni en mensajes; `telegram/.env.example` | Mucho; el equipo verificó el arranque con su `.env` |
| `telegram/src/formato.js` y textos de `/start` | Claude Code (Claude Opus 5.5) | Montos con el mismo formato que `formatoCOP` del design system y mensajes según la guía de voz y tono | Mucho |
| `telegram/src/config.js` y `/diag` | Claude Code (Claude Opus 5.5) | Parte del bot de US-001-CFG (#12): configuración validada al arrancar y diagnóstico del equipo | Mucho |
| `telegram/src/db.js`, `telegram/src/bot/sesion-storage.js`, `flujo.js`, `/cancelar` y el flujo de prueba `/eco` | Claude Code (Claude Opus 5.5) | Parte del bot de US-007-BCK (#21): sesiones en SQLite y motor de preguntas que sobrevive a un reinicio | Mucho |
| `telegram/src/natillera/reglas.js`, `telegram/src/bot/flujos/crear.js` y botones del motor de flujos | Claude Code (Claude Opus 5.5) | US-001 (#13): `/crear` con botones en el chat, resumen con confirmar o corregir, y reglas compartidas con la Mini App | Mucho |
| `telegram/miniapp/` | Claude Code (Claude Opus 5.5) | Formulario de la Mini App de Telegram para crear la natillera, con el design system; revisado en Chrome sin ventana en claro y oscuro | Mucho |
| `telegram/miniapp/natillera/`, `telegram/miniapp/comun.js` y `/mi_natillera` | Claude Code (Claude Opus 5.5) | US-008 (#26): «Mi natillera», lo que ve el participante (ahorro, reglas y cobros) con datos de ejemplo; revisada en Chrome sin ventana en sus tres casos | Mucho |
| `telegram/test/` | Claude Code (Claude Opus 5.5) | Arnés de pruebas sin red y pruebas de `/start`, secretos, configuración, `/diag`, sesiones, flujos, reglas de US-001 y `/crear` | Mucho |
| `telegram/README.md` («Cómo correrlo») | Claude Code (Claude Opus 5.5) | Instrucciones para correr el bot | Mucho |
| `telegram/src/index.js`, `bot/flujo.js`, `bot/flujos/crear.js`, `natillera/reglas.js`, `miniapp/app.js` y sus pruebas | Claude Code (Claude Opus 5.5) | Correcciones de la revisión de calidad: Mini App dentro de Telegram, doble creación, montos y fechas, reintento del flujo, apagado y token en el log | Mucho |
| `telegram/src/externo/`, `src/web/`, `src/avisos/`, `src/registro.js`, `src/registrar-avisos.js`, `bot/comandos/cobros.js`, `config.js`, `db.js`, `/diag`, `.env.example` y sus pruebas | Claude Code (Claude Opus 5.5) | Integración del bot con staging (#5): crear la natillera de verdad, aviso a la web, registro Telegram ↔ contratos, avisos por webhook o flujo en vivo con sus mensajes, botones de pagar la deuda y la actividad, y solo periodicidad mensual (#58) | Mucho; el equipo creó una natillera real en staging con el bot |
| `telegram/src/bot/flujos/unirse.js`, `src/externo/unirse.js`, `bot/comandos/invitar.js`, `/start`, enlace al crear, `registro.js`, `db.js`, `reglas.js` (billetera) y sus pruebas | Claude Code (Claude Opus 5.5) | US-003, US-004 y US-005 (#16, #19): enlace de invitación y `/invitar`, unirse con las reglas leídas de staging, registrar la billetera y autorizar el cobro con un permiso de prueba visible como tal | Mucho; probado a mano en Telegram: 4 participaciones validadas en staging |
| `telegram/src/bot/comandos/mi-natillera.js`, `registro.js` y `test/mi-natillera-staging.test.js` | Claude Code (Claude Opus 5.5) | US-008 (#26): «Mi natillera» en el chat con los datos de staging, un mensaje por natillera según su estado y el botón que corresponde | Mucho; textos revisados contra los contratos reales de staging |
| `telegram/src/bot/comandos/administrar.js`, `invitar.js`, `src/natillera/panel.js`, `src/natillera/invitacion.js`, `miniapp/admin/`, `db.js`, `registro.js` y `test/administrar.test.js` | Claude Code (Claude Opus 5.5) | Panel del administrador: `/administrar` con la Mini App (cada natillera, su gente, quién falta por autorizar y el enlace), nombre de quien se une y `/invitar` con varias natilleras | Mucho; revisado en Chrome sin ventana con los datos reales de staging, en claro y oscuro |
| `telegram/src/bot/flujos/prestamo.js`, `src/natillera/prestamo.js`, solicitudes en `db.js` y `registro.js`, aviso 3.4 en `web/indice.js`, botones en `avisos/` y «Mi natillera», `/start prestamo` y `test/prestamo.test.js` | Claude Code (Claude Opus 5.5) | US-014 (#29): pedir un préstamo desde el chat con las reglas de staging, guardar la solicitud y avisar a la web | Mucho; reglas revisadas contra las participaciones reales de staging |
| `telegram/src/bot/comandos/reloj.js`, `registro.js` y `test/reloj.test.js` | Claude Code (Claude Opus 5.5) | `/reloj` en el chat del equipo: disparar las acciones del reloj de staging con fecha simulada, y el modo automático de una cuota por minuto para probar | Mucho |
| `telegram/src/externo/pagos.js`, `externo/unirse.js`, `bot/flujos/unirse.js`, `/start permiso_<id>`, permisos en `db.js` y `registro.js`, variables en `config.js` y `test/permiso.test.js` | Claude Code (Claude Opus 5.5) | US-005 (#19): el permiso de cobro real con la API de pagos (`POST /api/permisos`, la vuelta al chat y `ConfirmarAutorizacion` con el `grantId`) | Mucho; contrastado con el OpenAPI publicado de la API de pagos |
| `telegram/src/natillera/mi-natillera.js`, `miniapp/natillera/` (`app.js`, `vista.js`, `index.html`), `/mi_natillera` y `/start mi_natillera` en `bot/comandos/mi-natillera.js` y `test/mi-natillera-miniapp.test.js` | Claude Code (Claude Opus 5.5) | US-008 (#26): la Mini App «Mi natillera» con los datos de staging en vez de los de ejemplo | Mucho; probada con los contratos reales de «test4» |
| `web/` (revisión de calidad: `Badge`, `lib/pagos.ts`, `lib/financiera.ts`, `presentacion.ts`, `http.ts`, `scripts/`) | Claude Code (Claude Opus 5.5) | Correcciones de los code reviews: estados desconocidos, avance del ahorro, encabezados HTTP, scripts de capturas y del design system | Mucho |
| `CLAUDE.md`, `.claude/skills/`, `.claude/agents/`, `.claude/commands/director-web.md` | Claude Code (Claude Opus 5.5) | Skills del design system y de la web, agentes implementador, revisor y verificador visual, y el comando que los orquesta | Mucho |
| `.claude/rules/` | Claude Code (Claude Opus 5.5) | Reglas del proyecto adaptadas de otro proyecto del equipo: verificar, secretos, git, IA y prompts, código, pruebas, revisión, agentes y checklist de entrega, y el paso de la checklist en la skill `natillera-pr` | Mucho |
| `docs/checklist-entrega.md`, `scripts/revisar-entrega.mjs` | Claude Code (Claude Opus 5.5) | Contraste de la checklist del equipo con el repo y script que revisa lo comprobable en cada commit y PR (secretos en el historial, Open Payments, `AI_USAGE.md`, prompts, README, ramas, hitos) | Mucho |
| `web/` (configuración, `src/lib/`, `src/components/`, layout, `scripts/`) | Claude Code (Claude Opus 5.5) | Esqueleto de Next.js (#8), capa de datos del servicio externo con datos de prueba, componentes sobre el design system, script de capturas | Mucho |
| `web/src/app/page.tsx`, `inicio.css`, `ingresar/`, `(panel)/layout.tsx`, `src/lib/sesion/`, `src/proxy.ts` | Claude Code (Claude Opus 5.5) | Página de inicio con el propósito, inicio de sesión con código por Telegram (OTP), roles y protección del panel | Mucho |
| `web/src/app/natilleras/`, `creditos/`, `pagos/`, `bitacora/`, `api/pagos/` | Claude Code (Claude Opus 5.5, subagentes) | Pantallas de #9, #10, US-007-RPT y US-012-AUD, revisadas por un agente revisor y uno visual | Mucho |
| `web/src/lib/servicio/staging.ts`, `web/src/lib/servicio/index.ts` | Claude Code (Claude Opus 5.5, subagente `web-implementador` y director) | Cliente de staging con `Bearer`: lee `currentStateRaw` y lo traduce a los tipos de la web, sin dejar salir el token (#53) | Mucho |
| `web/src/lib/servicio/eventos-staging.ts` (y su fixture con eventos reales), `pagos-staging.ts`, `bitacora-staging.ts`, `listarPagos` y `listarBitacora` en `staging.ts`, `actividades()` del índice | Claude Code (Claude Opus 5.5, director y dos subagentes `web-implementador`) | `/pagos` y `/bitacora` desde los eventos de staging: las 4 etapas de cada cobro y las acciones de la natillera y sus actividades (#53) | Mucho |
| `web/src/lib/servicio/pagos-api.ts`, `registro-pagos.ts` (y sus pruebas), `pagosDeLaApi` en `staging.ts`, `saludPagos` en `index.ts`, `web/src/app/(panel)/pagos/` (`page.tsx`, `RegistroPagos.tsx`, `presentacion.ts`), `web/src/components/MarcaSimulado.tsx`, `quedanVisibles` en `web/src/lib/sesion/acceso.ts` | Claude Code (Claude Opus 5.5, director y dos subagentes `web-implementador` que se cortaron por un error de conexión) | `/pagos` con el registro real de la API de pagos (4 etapas con los ids de Open Payments), su estado y la marca de pagos simulados (#24, #53) | Mucho |
| `web/src/lib/servicio/creditos-staging.ts` (y su prueba), créditos reales en `staging.ts`, sección `decisiones` del índice (`web/src/lib/indice/`), `/creditos` y su acción; retiro de `mock.ts`, `creditos-prueba.ts`, `pagos-staging.ts`, el cliente provisional de `http.ts` y los avisos de datos de prueba | Claude Code (Claude Opus 5.5, director) | Dejar solo consumos reales: créditos desde las solicitudes del bot y los contratos `natillera-credito-ahorro` del motor (aprobar crea el contrato con `CREDITO_TASA_MENSUAL`), `/pagos` solo desde la API de pagos y sin datos de prueba (#53, #54) | Mucho |
| `web/src/lib/servicio/tabla-staging.ts` (y su prueba), lector combinado en `staging.ts`, ID en `web/src/app/(panel)/natilleras/page.tsx` y `natilleras.css` | Claude Code (Claude Opus 5.5, director) | Que el superadmin vea todas las natilleras del motor con `/api/contracts/table`, completadas con el índice, y mostrar el NatilleraId en la lista (#53) | Mucho |
| `integracion/FND-20261015-natillera-2.openapi.json`, `integracion/README.md`, `web/INTEGRACION.md` | Claude Code (Claude Opus 5.5, director) | Descargar la especificación del motor, contrastarla con dos contratos de prueba creados en staging y anotar lo verificado (formato de fechas, eventos, permisos); la especificación la genera el motor (#53) | Mucho |
| `web/src/lib/indice/`, `web/src/app/api/indice/[tipo]/route.ts`, `web/src/proxy.ts` | Claude Code (Claude Opus 5.5, subagente `web-implementador` y director) | Índice persistente que alimenta el bot con `X-Api-Key`: validación, escritura atómica, sin duplicados y la excepción del proxy solo para POST (#53) | Mucho |
| `web/src/lib/sesion/acceso.ts`, `firma.ts`, `index.ts`, `web/src/components/PantallaSinConectar.tsx`, `web/src/app/(panel)/{creditos,pagos,bitacora}/page.tsx` | Claude Code (Claude Opus 5.5) | El administrador se reconoce por su id de Telegram; aviso en las pantallas que aún no leen de staging (correcciones de la revisión) | Mucho |
| Estado «Por validar» en `design-system/components/bundle.js`, `design-system/docs/estados.md` y `web/src/lib/natillera.ts` | Claude Code (Claude Opus 5.5) | El estado `PENDIENTE_VALIDACION` de staging, con su paridad entre las dos copias | Mucho |
| `.claude/hooks/`, `.claude/settings.json`, `.claude/commands/director-web.md`, `.claude/agents/web-implementador.md` | Claude Code (Claude Opus 5.5) | Guardias automáticas de Claude (no escribe código en `pagos/`, ni `.env`, ni secretos; ESLint por archivo; pruebas antes de terminar; checklist antes de cada commit o PR) y `/director-web` corregido para no compilar en paralelo y registrar prompts mientras trabaja | Mucho |
| `.github/workflows/calidad.yml`, `scripts/secretos.mjs` | Claude Code (Claude Opus 5.5) | CI en cada PR (checklist de entrega, `verificar` de la web, pruebas del bot y de `pagos/` cuando exista) y patrones de secretos declarados una sola vez | Mucho |
| `pagos/` (API de Open Payments: `src/`, `test/`, `API.md`, `.env.example`) | Claude Code (Claude Opus 5.5) | API propia de pagos (#3, #4, #67): permisos con su vuelta y verificación del hash, cobros y pagos de las 6 rutas de staging, idempotencia, rotación del token, avisos de pago y registro de las cuatro etapas; contrato OpenAPI con Swagger UI en `/docs`; publicada en Azure. Decisión del equipo del 16 de octubre: la escribe la IA y se declara (`prompts/pagos-api-open-payments.md`) | Mucho; 38 pruebas con un Open Payments falso (incluido el contrato), sin probar aún un pago real en la Test Wallet |
| `pagos/src/cotizaciones.js`, `pagos/src/pagos.js`, `pagos/src/permisos.js`, `pagos/test/monedas.test.js`, `pagos/test/helpers/`, `pagos/API.md`, `pagos/README.md` | Claude Code (Claude Opus 5.5) | Pagos entre monedas: la cotización de Open Payments convierte cuando una billetera no está en pesos (fijo al recibir, fijo al enviar o convertido), y el tope de los permisos se cotiza en la moneda de quien paga con la mitad de margen. Comprobado con cotizaciones reales en la Test Wallet, sin pagos (`prompts/pagos-api-open-payments.md`, punto 6) | Mucho; 43 pruebas y 3 roturas a propósito detectadas |
| `pagos/postman/` (colección, ambiente y README) | Claude Code (Claude Opus 5.5) | Pruebas de la API publicada en Postman: salud, contrato, seguridad, permisos y lecturas sin mover dinero, y las 6 operaciones de staging aparte (`prompts/pagos-api-open-payments.md`, punto 7) | Mucho; 22 solicitudes y 51 verificaciones en verde contra Azure |
| `README.md` («Cómo usa Open Payments» y «Correr la demo»), `AI_USAGE.md`, `docs/checklist-entrega.md` | Claude Code (Claude Opus 5.5) | Kit de entrega: lo que pide la página de entrega y evaluación de la hackathon. El modelo del logo salió de los metadatos de la imagen | Mucho |
| `.claude/hooks/guardia-edicion.mjs`, `.claude/rules/ia-y-prompts.md` | Claude Code (Claude Opus 5.5) | Quitar el candado de `pagos/` y dejar escrita la nueva regla: `pagos/` lo escribe la IA y se declara con precisión | Mucho |
| `integracion/README.md`, `telegram/INTEGRACION.md`, `web/INTEGRACION.md`, `pagos/README.md`, `docs/plan-de-trabajo.md`, `docs/checklist-entrega.md`, `docs/discovery/4-logica-financiera/` | Claude Code (Claude Opus 5.5, subagentes de análisis y revisión) | Mapas de integración con la versión 0.2.0 del servicio externo (ventas), contrato de la API de pagos con staging y plan de trabajo, contrastados con el código del servicio externo, la puerta de staging y la documentación de Open Payments, y alineados con la API de pagos del PR #71 | Mucho |
| `scripts/revisar-entrega.mjs`, `CLAUDE.md`, `.claude/rules/`, `.claude/skills/`, `.claude/agents/`, `.claude/commands/director-web.md` | Claude Code (Claude Opus 5.5) | Reglas, skills, agentes y checklist alineados con la API de pagos en `pagos/`: Open Payments solo desde ahí, la web lee su registro y el bot le pide permisos y avisos de pago | Mucho |
| Retiro de los logos SVG redibujados de `design-system/assets/logos/` y sus menciones en `design-system/README.md`, `docs/marca.md`, `assets/logos/README.md` y `components/Logo/README.md` | Claude Code (Claude Opus 5.5) | Buscar qué logos no usa nadie y quitar el redibujo vectorial, que no era idéntico al kit oficial | Mucho |

## Servicios externos

- **Servicio externo de lógica financiera:** aplica las reglas de dinero (cobros, mora, crédito y liquidación), como un n8n que contiene esa lógica. No forma parte de este proyecto ni de esta declaración: el proyecto lo llama por API.
- **Interledger Test Wallet:** billeteras de prueba de Open Payments.

## Archivos hechos con poca o ninguna IA

Ninguno. Todo el código de la hackathon se escribió con ayuda de IA y está declarado archivo por archivo en la tabla de arriba. Eso incluye el servicio de Open Payments (`pagos/`), que escribió Claude Code por decisión del equipo del 16 de octubre en la tarde; el equipo lo revisó y lo probó en la Test Wallet.

## Lo que hizo el equipo

- Todas las decisiones de producto y de alcance del discovery.
- **Bot de Telegram (Estiven):** pidió y aprobó el plan del esqueleto antes de que se escribiera código, creó el bot en @BotFather, probó a mano el arranque, `/start` y el apagado con el bot real, y decidió el reacomodo a `telegram/` y cada commit.
- **Decisiones:** la arquitectura del 16 de octubre (la API de pagos aparte, los avisos a través de la web y la conversión de monedas) y qué entra a la demo. Todo cambio entró por pull request, y el equipo lo fusionó después de que pasaran las pruebas automáticas de la CI.
- **Pruebas con dinero de prueba:** el equipo creó natilleras en staging desde el bot, se unió con sus billeteras de la Test Wallet, aprobó los permisos en cada billetera y corrió la prueba de punta a punta del 16 de octubre, con tres cuotas cobradas desde billeteras en euros y dólares.
- **Configuración y llaves:** las billeteras de la Test Wallet y sus llaves de desarrollador, la configuración de Azure y de staging, y los tokens. Ninguna llave está en el repositorio.

## Registro de prompts

- **Discovery:** los prompts salen de los tres sistemas de descubrimiento que guiaron a la IA; hay una ficha de cada uno en [`prompts/discovery/`](prompts/discovery/).
- **Código de la hackathon:** el texto real de cada prompt, en [`prompts/`](prompts/), un archivo por frente y tema.
