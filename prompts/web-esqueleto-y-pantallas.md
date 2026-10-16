# Web: kit de Claude, esqueleto y pantallas

## 2026-10-16 · Claude Code (Claude Opus)

```text
listo ahora necesito que creemos la web, entonces debe ser responsive y debe de tene rmuy buena sparcticas por lo tanto necesito que crees las skills de diseño, agentes y todo lo necesario para este proposito
```

```text
crea un commando director que orqueste todos.
```

Respuestas a las preguntas de Claude: stack «Next.js + TypeScript», datos «Datos de prueba detrás de una capa», alcance «Kit + web completa».

Claude Code repartió las pantallas entre tres subagentes que siguen `.claude/agents/web-implementador.md`; sus instrucciones completas quedan abajo.

### Subagente: pantalla Natilleras (#9)

```text
Eres el agente web-implementador del repo /Users/octopus/Proyectos Johan/openpayments-fintechfy. Lee y sigue al pie de la letra `.claude/agents/web-implementador.md`, y antes de escribir código lee las skills `.claude/skills/natillera-web/SKILL.md` (y su `references/checklist.md`) y `.claude/skills/natillera-design-system/SKILL.md`.

## Tu tarea: issue #9 "Ver y gestionar las natilleras desde la web" (frente Web)

Construye dos pantallas en `web/src/app/natilleras/`:

1. **`/natilleras` (lista)** — reemplaza el `page.tsx` provisional. Server Component que usa `listarNatilleras()` de `@/lib/servicio`. Para la financiera y el administrador:
   - Encabezado con `EncabezadoPagina` (único h1) y una línea de resumen: cuántas natilleras, cuántas activas, total en custodia (suma de `saldoCustodia`).
   - Indicadores arriba (grilla `grilla-datos` con `nt-card` + `nt-dato`): natilleras activas, plata en custodia, participantes, participantes con cuotas pendientes (usa "con cuotas pendientes", no "morosos").
   - La lista: tabla `nt-tabla` con clase `tabla-apilable` y `data-etiqueta` en cada `<td>` (en móvil se vuelve tarjetas): nombre (enlace a su detalle), estado (`Badge tipo="natillera"`), administrador, cuota y periodicidad, avance de cuotas (periodoActual/cuotasTotales), participantes (y cuántos con cuota pendiente), en custodia (`Dinero`), próximo cobro (`formatoFecha` de `@/lib/fechas`, o "—").
   - `BloqueCustodia` debajo de la tabla.
   - Estado vacío con `EstadoVacio` si no hay natilleras.
2. **`/natilleras/[id]` (detalle)** — `page.tsx` con `obtenerNatillera(id)`; `notFound()` si es null. `generateMetadata` con el nombre. Contenido:
   - Encabezado: nombre, badge de estado, descripción con administrador, cuota y periodicidad, fechas inicio–final.
   - Tarjeta destacada (`nt-card--destacada`) con el total en custodia y quién lo custodia, y el avance del ahorro con `nt-progreso` + `nt-cuotas` (mira `design-system/components/ProgresoAhorro/preview.html` y `TarjetaAporte/preview.html`).
   - Datos: cupo mínimo, mora diaria (%), próximo cobro, billetera del grupo (payment pointer en texto pequeño, que pueda partirse con `overflow-wrap:anywhere` para no desbordar en 360px).
   - Tabla de participantes `tabla-apilable`: nombre, estado (`Badge tipo="participante"`), cuotas pagadas, aportado, pendiente (deuda, o "Al día"). Usa como referencia `design-system/components/Tabla/preview.html`.
   - Enlace "Volver a natilleras".
   - `loading.tsx` opcional.

Estilos nuevos que necesites: crea `web/src/app/natilleras/natilleras.css` importado desde tus páginas (solo tokens, móvil primero). No toques `web/src/styles/app.css` salvo que sea imprescindible (y repórtalo).

Ya existen y debes reutilizar: `@/components/{Badge,Dinero,Aviso,EncabezadoPagina,EstadoVacio,BloqueCustodia,Icono}`, `@/lib/natillera` (formatoCOP, ESTADOS), `@/lib/fechas`, los tipos de `@/lib/servicio/tipos`. Mira los datos de prueba en `web/src/lib/servicio/mock.ts` para saber qué hay.

Criterios: lo que pide el issue (`gh issue view 9`) y la regla de que todos ven lo suyo y el total (US-008 en docs/discovery/3-bdd).

## Restricciones por trabajar en paralelo
Otros dos agentes construyen `/creditos` y `/pagos` + `/bitacora` al mismo tiempo en el mismo árbol. Quédate en `web/src/app/natilleras/`. Si necesitas un componente compartido nuevo, créalo en `web/src/components/` con un nombre propio de tu pantalla. NO corras `npm run build`, `npm run dev`, `npm run ds` ni `npm run verificar` (chocan con los otros agentes); en `web/` corre solo `npm run typecheck`, `npm run lint` y `npm run test`. No hagas commit.

Entrega el informe que pide el archivo del agente.
```

### Subagente: pantalla Créditos (#10)

```text
Eres el agente web-implementador del repo /Users/octopus/Proyectos Johan/openpayments-fintechfy. Lee y sigue al pie de la letra `.claude/agents/web-implementador.md`, y antes de escribir código lee las skills `.claude/skills/natillera-web/SKILL.md` (y su `references/checklist.md`) y `.claude/skills/natillera-design-system/SKILL.md`.

## Tu tarea: issue #10 "Ver las solicitudes de crédito de la financiera" (frente Web, con US-014)

Construye `/creditos` en `web/src/app/creditos/` (reemplaza el `page.tsx` provisional). La financiera ve las solicitudes de préstamo y las aprueba o no.

- Referencia visual obligatoria: `design-system/components/SolicitudesCredito/preview.html` y su README; también `TarjetaCredito`. Voz y tono del crédito en `design-system/docs/voz-y-tono.md` (sección Crédito) y estados en `design-system/docs/estados.md` (sección Crédito).
- Server Component con `listarSolicitudesCredito()` de `@/lib/servicio`.
- Encabezado (`EncabezadoPagina`, único h1) con cuántas solicitudes esperan respuesta.
- Dos secciones: **"Por responder"** (estado `solicitado`) y **"Respondidas"** (el resto), cada una con `h2`.
- Tabla `nt-tabla` + `tabla-apilable` con `data-etiqueta` en cada td: participante y su natillera, ahorro (cuotas al día de total; si `cuotasPendientes > 0`, "N pendiente(s)" en texto, sin rojo) y máximo que puede pedir, monto pedido, cuota mensual con plazo y tasa, estado (`Badge tipo="credito"`), fecha de solicitud/respuesta (`@/lib/fechas`), y acciones.
- Acciones solo si está `solicitado`: botones "Aprobar" (`nt-btn nt-btn--primario nt-btn--sm`) y "No aprobar" (`nt-btn--secundario nt-btn--sm`), que no se partan en dos líneas. Nunca "Rechazar" en rojo.
- **Server Action** en `web/src/app/creditos/actions.ts` (`"use server"`): recibe FormData con `id` y `decision`; valida en el servidor que `decision` sea `aprobar` o `no_aprobar` y que `id` sea un string corto con caracteres seguros; llama a `responderSolicitud` de `@/lib/servicio`; maneja el error sin mostrar el error crudo; `revalidatePath("/creditos")` y `revalidatePath("/bitacora")`. Devuelve un resultado `{ ok: true, mensaje }` o `{ ok: false, mensaje }`.
- El formulario por fila: un componente de cliente pequeño (por ejemplo `web/src/app/creditos/RespuestaSolicitud.tsx`) con `useActionState` (React 19) que muestra el botón deshabilitado mientras envía (`useFormStatus` o `isPending`) y el resultado con `Aviso` (`role="status"`, o error). Para "No aprobar", pide confirmación accesible simple (por ejemplo, un segundo clic "Confirmar: no aprobar" o un `<dialog>` nativo), porque es una decisión sobre una persona.
- Texto del aviso tras responder, en la voz del design system (dice que se le avisará al participante por el bot).
- Estado vacío si no hay solicitudes.
- `BloqueCustodia` o una nota de que el préstamo lo da la financiera y va aparte del ahorro.
- Pruebas: si extraes lógica pura (por ejemplo la validación de la acción o agrupar por estado), escríbela en un archivo aparte con su `*.test.ts` en Vitest.

Estilos nuevos: `web/src/app/creditos/creditos.css` (solo tokens, móvil primero). No toques `web/src/styles/app.css` salvo que sea imprescindible (y repórtalo).

Ya existen: `@/components/{Badge,Dinero,Aviso,EncabezadoPagina,EstadoVacio,BloqueCustodia,Icono}`, `@/lib/natillera`, `@/lib/fechas`, tipos en `@/lib/servicio/tipos` (los componentes de cliente importan tipos SOLO de ahí). Los datos de prueba están en `web/src/lib/servicio/mock.ts` (`responderSolicitud` ya existe y escribe en la bitácora).

## Restricciones por trabajar en paralelo
Otros dos agentes construyen `/natilleras` y `/pagos` + `/bitacora` al mismo tiempo en el mismo árbol. Quédate en `web/src/app/creditos/`. Componentes compartidos nuevos en `web/src/components/` con nombre propio. NO corras `npm run build`, `npm run dev`, `npm run ds` ni `npm run verificar`; en `web/` corre solo `npm run typecheck`, `npm run lint` y `npm run test`. No hagas commit.

Entrega el informe que pide el archivo del agente.
```

### Subagente: Registro de pagos (US-007-RPT) y Bitácora (US-012-AUD)

```text
Eres el agente web-implementador del repo /Users/octopus/Proyectos Johan/openpayments-fintechfy. Lee y sigue al pie de la letra `.claude/agents/web-implementador.md`, y antes de escribir código lee las skills `.claude/skills/natillera-web/SKILL.md` (y su `references/checklist.md`) y `.claude/skills/natillera-design-system/SKILL.md`.

## Tu tarea: US-007-RPT "Registro de pagos para el jurado" (#24) y US-012-AUD "Bitácora del administrador" (#34)

Lee los criterios en `docs/discovery/3-bdd/epics/EPIC-003-ahorrar-cada-periodo/stories/US-007-RPT-registro-de-pagos-para-el-jurado.md` y `docs/discovery/3-bdd/epics/EPIC-006-actividades-especiales/stories/US-012-AUD-bitacora-de-acciones-del-administrador.md`.

### 1. `/pagos` — Registro de pagos (lo que más mira el jurado)
Referencia visual obligatoria: `design-system/components/PanelJurado/preview.html` y `LineaTiempoPago/preview.html` con sus README.
- Server Component (`web/src/app/pagos/page.tsx`) que carga `listarPagos()` y pasa los datos iniciales a un componente de cliente.
- Route handler `web/src/app/api/pagos/route.ts` (GET) que devuelve `listarPagos()` en JSON con `Cache-Control: no-store` y `export const dynamic = "force-dynamic"`. La página también debe ser dinámica.
- Componente de cliente (`web/src/app/pagos/RegistroPagos.tsx`, `"use client"`) que hace **polling** a `/api/pagos` cada 3 s; se pausa cuando `document.visibilityState !== "visible"`; si falla, muestra un aviso discreto y reintenta; muestra "Actualizado a las …" (`formatoHora`). Importa tipos SOLO de `@/lib/servicio/tipos`.
- Indicadores (grilla `grilla-datos`): pagos procesados, completados, fallidos y en curso.
- Lista de pagos: tabla `nt-tabla` + `tabla-apilable` con `data-etiqueta` (en móvil se apila): fecha/hora, natillera, tipo (cuota, deuda, actividad, premio, liquidación, desembolso, reembolso — en palabras), participante, dirección (entra a la natillera / sale a la billetera), monto (`Dinero`), estado (`Badge tipo="pago"`), y las 4 etapas como marcas compactas en orden fijo Solicitud · Autorización · Ejecución · Finalización (hecha = check, fallida = alerta, actual = en curso, pendiente = reloj), con texto accesible (`solo-lectores`) que diga el estado de cada etapa.
- Al elegir un pago (botón en la fila, accesible con teclado), se muestra su **línea de tiempo** completa con `nt-linea` (componente nuevo `web/src/components/LineaTiempoPago.tsx`, que sirva también para otras pantallas): etapa, detalle técnico, hora exacta, y en fallidos el motivo en palabras simples con `nt-linea__motivo`. En escritorio puede ir en un panel al lado; en móvil, debajo de la lista o desplegada en la fila.
- Accesibilidad del polling: una región `aria-live="polite"` que anuncie solo pagos nuevos completados o fallidos, no cada refresco.
- Filtro simple por estado (Todos / Completados / Fallidos / En curso) con botones `aria-pressed`.
- Nota: el pago "en vivo" de los datos de prueba avanza solo una etapa cada 5 s; úsalo para comprobar que el polling se ve.
- Etapas con los nombres técnicos (este panel es para el jurado); motivos de falla en palabras simples.

### 2. `/bitacora` — Bitácora del administrador
- Server Component con `listarBitacora()`. Encabezado: explica que es un registro que no se puede borrar ni editar de lo que hacen el administrador, la financiera y el sistema.
- Lista cronológica (más reciente primero) en `tabla-apilable` o como línea de tiempo: fecha y hora, natillera, quién (actor), acción, detalle.
- Estado vacío.

Estilos nuevos: `web/src/app/pagos/pagos.css` y `web/src/app/bitacora/bitacora.css` (solo tokens, móvil primero). No toques `web/src/styles/app.css` salvo que sea imprescindible (y repórtalo).

Ya existen: `@/components/{Badge,Dinero,Aviso,EncabezadoPagina,EstadoVacio,BloqueCustodia,Icono}`, `@/lib/natillera`, `@/lib/fechas`, tipos y `ETAPAS` en `@/lib/servicio/tipos`. Datos de prueba en `web/src/lib/servicio/mock.ts`. Si extraes lógica pura (contar por estado, filtrar, detectar pagos nuevos entre dos lecturas), ponla en un archivo aparte con su `*.test.ts` en Vitest.

## Restricciones por trabajar en paralelo
Otros dos agentes construyen `/natilleras` y `/creditos` al mismo tiempo en el mismo árbol. Quédate en `web/src/app/pagos/`, `web/src/app/bitacora/`, `web/src/app/api/pagos/` y el componente nuevo `LineaTiempoPago`. NO corras `npm run build`, `npm run dev`, `npm run ds` ni `npm run verificar`; en `web/` corre solo `npm run typecheck`, `npm run lint` y `npm run test`. No hagas commit.

Entrega el informe que pide el archivo del agente.
```

### Subagente: revisor

```text
Eres el agente web-revisor del repo /Users/octopus/Proyectos Johan/openpayments-fintechfy. Lee y sigue al pie de la letra `.claude/agents/web-revisor.md`, junto con las skills `.claude/skills/natillera-web/SKILL.md` (y su `references/checklist.md`) y `.claude/skills/natillera-design-system/SKILL.md`.

Revisa TODO lo que hay en `web/` (es nuevo en esta rama: `git status` mostrará la carpeta sin seguimiento; revisa los archivos directamente, no el diff). Céntrate en `web/src/` (app, components, lib), `web/next.config.ts`, `web/eslint.config.mjs`, `web/package.json` y `web/scripts/`. Las carpetas `web/src/styles/ds/` y `web/public/ds/` son copias generadas del design system: no las revises.

Importante: otro agente está usando `.next/` ahora mismo para tomar capturas con `npm run start`. NO corras `npm run build` ni `npm run verificar` ni `npm run dev`. Puedes correr `npm run typecheck`, `npm run lint` y `npm run test` dentro de `web/`. El build ya se corrió y pasó (todas las rutas compilan; `/natilleras`, `/natilleras/[id]`, `/creditos`, `/pagos`, `/bitacora` y `/api/pagos` son dinámicas).

Contexto útil: la web usa datos de prueba (`web/src/lib/servicio/mock.ts`) porque el contrato del servicio externo (issue #5) no existe todavía; los `TODO(#5)` son conocidos. No hay autenticación ni roles todavía (decisión pendiente), no lo reportes como hallazgo salvo que algo concreto lo empeore.

Entrega lo que pide el archivo del agente: hallazgos verificados con archivo:línea, ordenados por gravedad, cómo fallan en la práctica y la corrección sugerida, más el resultado de typecheck, lint y test.
```

### Subagente: verificador visual

```text
Eres el agente web-verificador-visual del repo /Users/octopus/Proyectos Johan/openpayments-fintechfy. Lee y sigue `.claude/agents/web-verificador-visual.md` y la skill `.claude/skills/natillera-design-system/SKILL.md`.

El build ya está hecho en `web/.next` (no lo repitas: otro agente está revisando el código). Pasos:
1. En `web/`: `npm run start -- -p 3100` en segundo plano y espera a que `http://localhost:3100/natilleras` responda.
2. `npm run capturas -- --base http://localhost:3100` (rutas por defecto: /natilleras, /natilleras/los-primos, /creditos, /pagos, /bitacora; 360, 768 y 1280 px; claro y oscuro). Lee `web/.capturas/reporte.json`.
3. Revisa TODAS las capturas con la herramienta Read (ve imágenes). Compara con las vistas previas del design system cuando aplique (`design-system/components/PanelJurado/preview.html`, `SolicitudesCredito/preview.html`, `Tabla/preview.html`, `ProgresoAhorro/preview.html`).
4. Comprueba también el comportamiento en vivo de `/pagos`: con `curl -s http://localhost:3100/api/pagos` dos veces con 6 segundos de diferencia, confirma que el pago "en vivo" (id que empieza por `pag-vivo-`) avanza de etapa.
5. Detén el servidor (`pkill -f "next start -p 3100"`).

Entrega lo que pide el archivo del agente: por cada problema, ruta, ancho, tema, qué se ve mal, dónde, y la ruta de la captura; resumen de reporte.json; y una línea por ruta si se ve bien. No edites código.
```
