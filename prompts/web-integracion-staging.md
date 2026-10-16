# Web: integración con staging (#53)

## 2026-10-16 · 16:50 (hora de Bogotá) · Claude Code (Claude Opus 5.5)

Comando `/director-web` con este encargo:

```text
puedes revisar esto : web/INTEGRACION.md ya tengo en env. el token JWT_TOKEN .env en la raiz
```

Claude Code preguntó y la persona respondió:

- URL de staging: «La pongo yo en web/.env.local».
- Token: «Lo copio yo a web/.env.local (Recomendado)».
- Alcance: «Lo de 'probar hoy' (Recomendado)»: capa de datos con Bearer, índice persistente con sus 4 rutas para el bot, y `/natilleras` y su detalle con datos reales.

Lo compartido lo hizo Claude Code antes de repartir: `web/src/lib/indice/tipos.ts`, el estado «Por validar» en `design-system/components/bundle.js`, `design-system/docs/estados.md` y `web/src/lib/natillera.ts`, las variables nuevas de `web/.env.example`, `data/` en `web/.gitignore` y `src/lib/indice/**` en la excepción de ESLint.

## 2026-10-16 · 17:03 (hora de Bogotá) · Claude Code (Claude Opus 5.5) → subagente `web-implementador` (capa de datos)

```text
Repo: /Users/octopus/Proyectos Johan/openpayments-fintechfy. Issue #53 (Web: integrar con staging), parte "capa de datos con Bearer". Lee primero web/INTEGRACION.md (secciones "Antes de empezar", "2. Cada pantalla contra staging" y "Los estados"), integracion/README.md ("Lo que expone el servicio externo") y web/src/lib/servicio/{tipos.ts,index.ts,http.ts,mock.ts}.

**Estás en paralelo con otro agente** (que construye web/src/lib/indice/ y /api/indice). No corras `npm run build`, `npm run verificar` ni `npm run dev` (comparten .next/ y la copia del design system); verifica con `npm --prefix web run typecheck`, `npm --prefix web run lint` y `npm --prefix web run test`.

**Tus archivos (solo estos):** `web/src/lib/servicio/staging.ts` y `web/src/lib/servicio/staging.test.ts`. Todo lo demás es de solo lectura. En particular NO edites `web/src/lib/servicio/index.ts` (lo conecta quien coordina), ni `web/src/lib/indice/` (es del otro agente), ni `tipos.ts`. Si necesitas cambiar algo fuera de tus archivos, no lo hagas: repórtalo.

**Qué construir:** `export function crearServicioStaging(opciones: { urlBase: string; token: string; indice: LectorIndice; fetch?: typeof fetch }): Servicio`, con `LectorIndice` de `@/lib/indice/tipos` (ya existe: natilleras(), natillera(id), participaciones(natilleraId)) y `Servicio` de `./tipos`. El `fetch` se inyecta para las pruebas (por defecto el global).

- Peticiones a staging: `Authorization: Bearer <token>`, `Content-Type: application/json`, `cache: "no-store"`, tiempo límite de 10 s. `GET {urlBase}/api/contracts/{contractId}` (encodeURIComponent). Reusa `ErrorServicio` de `./http`. **Ningún mensaje de error ni log puede contener el token** (pon una prueba que lo compruebe). Un 404 de un contrato: la natillera se omite de la lista con un `console.error` (sin token) y en `obtenerNatillera` da `null`; cualquier otro fallo lanza `ErrorServicio` con un mensaje claro.
- La respuesta trae `currentStateRaw` (valores sin formato) y `currentStateLabels`. Todavía no se ha visto una respuesta real, así que lee los valores de forma tolerante con una función pura: el valor puede venir crudo (`5000`, `"ACTIVA"`), como string numérica (`"5000"`), o tipado `{ type, value }`. Los estados pueden venir como número (0, 1, …) o como nombre (`"ACTIVA"`): acepta los dos.
- Mapeo de estados (decisión del director; documéntalo en un comentario corto):
  - `EstadoNatillera`: 0 CREADA→creada, 1 INICIADA→iniciada, 2 ACTIVA→activa, 3 LIQUIDANDO→liquidando, 4 REEMBOLSANDO→liquidando, 5 CERRADA→cerrada, 6 CERRADA_SIN_CUPO→cerrada.
  - `EstadoParticipacion`: 0 PENDIENTE_VALIDACION→por_validar (estado nuevo, ya agregado a ESTADOS), 1 VALIDADA→validado, 2 ACTIVA→activo, 3 MORA→en_mora, 4 EN_LIQUIDACION→activo, 5 EN_REEMBOLSO→activo, 6 LIQUIDADA→liquidado, 7 REEMBOLSADA→liquidado.
  - Un estado desconocido: `console.error` y el valor neutro del grupo (creada / por_validar), nunca lanzar.
- `listarNatilleras()`: por cada registro de `indice.natilleras()`, en paralelo, el GET de su `contractId` y el GET de cada participación de `indice.participaciones(natilleraId)`. Campos de `NatilleraResumen`:
  - id = natilleraId del índice; nombre = `NombreNatillera` (si falta, el nombre del índice); administrador = `registro.administrador.nombre` (OJO: el control de acceso compara esto con el nombre de la sesión);
  - estado ← `EstadoNatillera`; valorCuota ← `ValorCuota`; periodicidad: `PeriodicidadMeses` 1 → "mensual" (staging solo tiene meses; si llega otro valor, "mensual" y un console.warn);
  - fechaInicio ← `FechaInicio`, fechaFinal ← `FechaFinal`, proximoCobro ← `FechaProximoCobro` (null si viene vacío). Las fechas de staging son `AAAA-MM-DD`: conviértelas a ISO al mediodía de Bogotá (`AAAA-MM-DDT17:00:00Z`) para que `@/lib/fechas` no muestre el día anterior; si ya traen hora, déjalas;
  - cuotasTotales ← `NumeroCuotas`; periodoActual ← `PeriodoActual` (0 si falta); cupoMinimo ← `CupoMinimo`;
  - numeroParticipantes = cuántas participaciones tiene en el índice; participantesEnMora = cuántas tienen `EstadoParticipacion` MORA; saldoCustodia ← `SaldoNatillera`.
- `obtenerNatillera(id)`: `indice.natillera(id)`; si es null → null. Además de lo anterior: moraDiariaPct = `PorcentajeMoraDiaria` × 100 (en staging el porcentaje es una fracción: 1 % = 0.01; redondea a 2 decimales para no mostrar 2.4999999); billeteraGrupo = `registro.billeteraGrupo` o "Por registrar"; participantes: por cada registro de participación, id = participacionId, nombre = el del índice, billetera = `WalletParticipante` de staging o la del índice, estado ← `EstadoParticipacion`, cuotasPagadas ← `CuotasPagadas`, aportado ← `TotalAportado`, deuda = `DeudaCuotas` + `MoraAcumulada`.
- `listarSolicitudesCredito`, `responderSolicitud`, `listarPagos`, `listarBitacora`: fuera de este alcance. Que lancen `ErrorServicio("Esta pantalla todavía no está conectada a staging (#53).")`.
- Sin dependencias nuevas. No importes `server-only` en staging.ts (las pruebas lo importan; `index.ts` ya es la barrera).

**Pruebas (`staging.test.ts`, Vitest, sin red, con fetch falso):** lectura tolerante de valores (crudo, string, tipado), mapeo de cada estado (número y nombre) y del desconocido, fechas `AAAA-MM-DD` → mediodía de Bogotá, porcentaje de fracción a %, deuda = cuotas + mora, conteo de mora, 404 omitido / null, error sin token, y que se mande `Authorization: Bearer`. Antes de dar una prueba por buena, rompe a propósito la línea que protege y mírala fallar (.claude/rules/pruebas.md).

Sigue `.claude/agents/web-implementador.md` y las skills natillera-web y natillera-design-system. Devuelve tu veredicto (`LISTO` · `LISTO-CON-PENDIENTES` · `BLOQUEADO`) con el informe del formato del agente, incluida la salida final de typecheck, lint y test.
```

## 2026-10-16 · 17:03 (hora de Bogotá) · Claude Code (Claude Opus 5.5) → subagente `web-implementador` (índice)

```text
Repo: /Users/octopus/Proyectos Johan/openpayments-fintechfy. Issue #53 (Web: integrar con staging), parte "índice persistente con sus 4 rutas para el bot". Lee primero web/INTEGRACION.md (sección "1. Lo que la web recibe del bot"), telegram/INTEGRACION.md (sección "3. Lo que el bot le avisa a la web"), web/src/lib/indice/tipos.ts (ya existe: los tipos de cada registro y la interfaz LectorIndice; no lo cambies), web/src/proxy.ts y web/src/lib/sesion/firma.ts (para ver cómo se compara en tiempo constante).

**Estás en paralelo con otro agente** (que construye web/src/lib/servicio/staging.ts). No corras `npm run build`, `npm run verificar` ni `npm run dev` (comparten .next/ y la copia del design system); verifica con `npm --prefix web run typecheck`, `npm --prefix web run lint` y `npm --prefix web run test`.

**Tus archivos:** `web/src/lib/indice/` (todo menos `tipos.ts`, que es de solo lectura), `web/src/app/api/indice/` y un cambio mínimo en `web/src/proxy.ts`. No toques `web/src/lib/servicio/` (es del otro agente) ni `lib/servicio/index.ts`. Si necesitas algo fuera de eso, repórtalo.

**Qué construir:**

1. **Validación pura** (`lib/indice/validacion.ts` + prueba): una función por tipo de registro que recibe `unknown` y devuelve `{ ok: true, registro }` o `{ ok: false, errores: string[] }`, con errores en español claros para el bot. Campos exactos de `tipos.ts`. Reglas:
   - ids (`natilleraId`, `participacionId`, `actividadId`, `solicitudId`): `^[A-Za-z0-9_-]{1,64}$`;
   - `contractId`: 1 a 128 caracteres de `[A-Za-z0-9_.:-]`;
   - textos no vacíos y de máximo 200 caracteres (recorta espacios); `billetera` y `billeteraGrupo` (opcional) máximo 300;
   - montos y plazos: números finitos mayores que 0 (`plazoMeses` entero);
   - fechas: string que `Date.parse` entienda;
   - `obligaciones`: arreglo de máximo 100 elementos;
   - **campos de más se descartan**: el registro guardado tiene solo los campos del tipo.
2. **Almacén persistente** (`lib/indice/almacen.ts` + prueba): `crearAlmacen(ruta: string)` sobre un archivo JSON `{ natilleras: {}, participaciones: {}, actividades: {}, solicitudes: {} }` indexado por id. Tiene que aguantar un reinicio del servidor durante la demo. Detalles:
   - `guardar(tipo, registro): Promise<ResultadoGuardar>`: si el id ya existe responde "repetido" y **no** lo sobrescribe (el bot reintenta).
   - Escritura atómica: archivo temporal y `rename`. Las escrituras se serializan dentro del proceso con una cola de promesas, para que dos POST seguidos no se pisen.
   - Crea la carpeta si no existe. Si el archivo no existe, el índice está vacío; si está corrupto, lanza un error claro, sin borrarlo.
   - Las lecturas que pide `LectorIndice`, más `participaciones(natilleraId)`.
   - Las pruebas usan una carpeta temporal del sistema.
3. **`lib/indice/index.ts`** con `import "server-only"`:
   - la ruta es `process.env.INDICE_RUTA` o `path.join(process.cwd(), "data", "indice.json")` (web/data/ ya está en .gitignore; ESLint ya permite `process.env` en lib/indice);
   - exporta `lectorIndice: LectorIndice`, `guardarRegistro(tipo, cuerpo: unknown)` (valida y guarda) y `llaveIndice(encabezado: string | null): "sin-configurar" | "invalida" | "valida"`. Esta última compara `X-Api-Key` con `process.env.WEB_INDICE_API_KEY` en tiempo constante (`timingSafeEqual` sobre hashes de igual largo, como hace firma.ts).
4. **Ruta** `web/src/app/api/indice/[tipo]/route.ts`, solo POST. En Next 16, `params` es una promesa: lee `web/node_modules/next/dist/docs/` antes de usar la API de route handlers. Respuestas:
   - `tipo` fuera de los 4 → 404;
   - llave sin configurar → 503; llave inválida → 401;
   - cuerpo de más de 32 KB → 413; JSON inválido → 400; validación fallida → 400 con `{ errores }`;
   - "nuevo" → 201; "repetido" → 200, con `{ resultado }`;
   - todo con `Cache-Control: no-store`;
   - nunca devuelvas el detalle de un error interno (regístralo en el servidor);
   - exporta `dynamic = "force-dynamic"`.
5. **`proxy.ts`**: hoy exige sesión en `/api/:path*`, así que el bot (que no tiene cookie) recibiría 401. Exceptúa **solo** `/api/indice/` de la sesión, porque esa ruta tiene su propia llave. El resto de `/api` sigue exigiendo sesión. Cambio mínimo, y repórtalo.

**Pruebas:** validación (casos buenos, cada regla mala, campos extra descartados), almacén (nuevo, repetido sin sobrescribir, dos escrituras seguidas sin pérdida, persistencia al recrear el almacén sobre el mismo archivo) y `llaveIndice`. Si es fácil, prueba también el handler llamando a `POST` con un `Request`. Antes de dar una prueba por buena, rompe a propósito la línea que protege y mírala fallar (.claude/rules/pruebas.md).

Sin dependencias nuevas. Sigue `.claude/agents/web-implementador.md` y la skill natillera-web. Devuelve tu veredicto (`LISTO` · `LISTO-CON-PENDIENTES` · `BLOQUEADO`) con el informe del formato del agente, incluida la salida final de typecheck, lint y test.
```

## 2026-10-16 · 17:00 (hora de Bogotá) · Claude Code (Claude Opus 5.5)

Comando `/director-web` con este encargo:

```text
curl -H "Authorization: Bearer $TOKEN" https://sandbox-staging.corebank.ai/api/ecosystems/FND-20261015-natillera-2/openapi > FND-20261015-natillera-2.openapi.json lee este curls que ahi esta toda la especificacion del backend
```

Al integrar, Claude Code cambió dos decisiones de los implementadores: una natillera sin `FechaInicio` o `FechaFinal` lanza un error claro en vez de mostrar la fecha de creación del índice, y `WEB_INDICE_API_KEY` exige al menos 32 caracteres. Agregó una prueba de cada una y la vio fallar con el código roto. Conectó `web/src/lib/servicio/index.ts` y corrió `npm --prefix web run verificar` (124 pruebas, build en verde). No lanzó `web-verificador-visual`: las capturas no inician sesión y saldrían de `/ingresar`, y el único cambio visible es el badge «Por validar».

## 2026-10-16 · 17:20 (hora de Bogotá) · Claude Code (Claude Opus 5.5) → subagente `web-revisor`

```text
Repo: /Users/octopus/Proyectos Johan/openpayments-fintechfy, rama feature/web-53-integracion-staging. Revisa el trabajo de #53 (web contra staging), que aún no tiene commit: todo está en el árbol de trabajo. Usa `git status` y `git diff` (con `git diff origin/develop -- web/ design-system/` para lo modificado), y lee con Read los archivos nuevos sin seguimiento: web/src/lib/indice/** (tipos, validacion, almacen, llave, cuerpo, index y sus pruebas), web/src/app/api/indice/[tipo]/route.ts y su prueba, web/src/lib/servicio/staging.ts y su prueba. Modificados: web/src/lib/servicio/index.ts, web/src/proxy.ts, web/src/lib/natillera.ts, design-system/components/bundle.js, design-system/docs/estados.md, web/.env.example, web/.gitignore, web/eslint.config.mjs y web/README.md.

**No compiles:** corre solo `npm --prefix web run typecheck`, `npm --prefix web run lint` y `npm --prefix web run test` (el build ya se hizo y pasó).

Contexto: web/INTEGRACION.md es el mapa. La web llama a staging con `Authorization: Bearer` (SERVICIO_EXTERNO_URL y SERVICIO_EXTERNO_TOKEN), y el bot alimenta un índice persistente con POST /api/indice/{natilleras,participaciones,actividades,solicitudes} y `X-Api-Key` (WEB_INDICE_API_KEY). El proxy exceptúa de la sesión solo /api/indice/. /creditos, /pagos y /bitacora quedan fuera de alcance a propósito: con staging lanzan un error que lo dice.

Pon especial atención a:
1. Secretos: que el token nunca salga en errores, logs ni respuestas, y que nada de esto llegue a un componente de cliente.
2. La excepción del proxy: que no abra otras rutas de /api sin sesión (traversal, prefijos parecidos, mayúsculas, codificación %2F).
3. La ruta del índice: autenticación antes de leer el cuerpo, límites, respuestas que no filtren detalles internos, idempotencia y escritura concurrente.
4. El mapeo de staging a los tipos (estados, fechas a mediodía de Bogotá, porcentaje como fracción, deuda) y que el control de acceso (`administrador` comparado con el nombre de la sesión) siga funcionando con los datos del índice.
5. Código inyectado fuera de alcance.

Devuelve el formato de tu agente: veredicto, hallazgos con severidad y `archivo:línea`, y la salida de las tres verificaciones.
```

Claude Code leyó la especificación (8 rutas, 132 esquemas, 110 webhooks) y preguntó; la persona respondió:

- Contrato de prueba: «Sí, crea uno (Recomendado)»: `POST natillera-cuenta` + `natillera-participacion` con datos marcados como prueba, `GET` de los dos y ajustar `staging.ts` a los nombres reales.
- Especificación: «Sí, en integracion/ (Recomendado)».

Resultado (17:10): `POST /api/contracts` con `natillera-cuenta` respondió 403 sin cuerpo con el JWT del equipo; no se creó ningún contrato. Claude Code guardó la especificación en `integracion/` y anotó en `web/INTEGRACION.md` lo que confirma y lo que falta verificar.

`web-revisor` respondió `CAMBIOS-NECESARIOS` (2 🟠, 4 🟡, 3 ⚪). Claude Code corrigió: el acceso del administrador por id de Telegram en vez de por nombre, 409 ante un id repetido con otros datos, una natillera mala ya no tumba la lista, `ValorCuota` y `NumeroCuotas` obligatorios, aviso «Esta parte todavía no está conectada» en las tres pantallas fuera de alcance, el conteo de participantes y la excepción del proxy solo para POST. Cada corrección con una prueba que falla al romper la línea. `verificar` en verde (129 pruebas).

## 2026-10-16 · 17:28 (hora de Bogotá) · Claude Code (Claude Opus 5.5) → subagente `web-revisor` (segunda revisión)

```text
Repo: /Users/octopus/Proyectos Johan/openpayments-fintechfy, rama feature/web-53-integracion-staging, sin commit (todo en el árbol de trabajo). Segunda revisión: ya revisaste este trabajo y diste CAMBIOS-NECESARIOS. **No compiles:** corre solo `npm --prefix web run typecheck`, `lint` y `test` (el build ya pasó después de las correcciones).

Revisa solo las correcciones, contra tus hallazgos:
1. 🟠 Acceso del administrador: ahora `web/src/lib/sesion/acceso.ts` compara `administradorTelegramId` (nuevo campo opcional de `NatilleraResumen` en `web/src/lib/servicio/tipos.ts`, lo llena `staging.ts` desde el índice) con `sesion.telegramId` (nuevo campo opcional de `DatosSesion` en `firma.ts`, que `crearSesion` en `lib/sesion/index.ts` toma de `chatDe(usuario)`). Sin id en la natillera (datos de prueba), compara el nombre normalizado NFC. Confirma que no hay un camino por el que un administrador vea una natillera ajena, que una cookie vieja sin `telegramId` siga siendo válida y no dé acceso de más, y que `esDatosSesion` valide el campo.
2. 🟡 Id repetido con otros datos: `almacen.ts` responde "conflicto" y la ruta 409, sin sobrescribir.
3. 🟡 `listarNatilleras` en `staging.ts` usa `Promise.allSettled`: omite la natillera que falla y lanza solo si fallan todas.
4. 🟡 `ValorCuota` y `NumeroCuotas` son obligatorios (lanzan); los demás montos que faltan dan 0 con `console.warn`.
5. 🟡 Con staging, `/creditos`, `/pagos` y `/bitacora` muestran `web/src/components/PantallaSinConectar.tsx` (bandera `pantallasSinConectar` en `lib/servicio/index.ts`) en vez de error.tsx. Revisa el texto con la voz del design system y la accesibilidad (un solo h1).
6. ⚪ `numeroParticipantes` = participaciones encontradas; ⚪ la excepción del proxy es solo para POST.

Devuelve el formato de tu agente: veredicto, hallazgos nuevos o que sigan abiertos con severidad y `archivo:línea`, y la salida de las tres verificaciones.
```

## 2026-10-16 · 17:14 (hora de Bogotá) · Claude Code (Claude Opus 5.5)

Comando `/director-web` con este encargo:

```text
ya tienes el token admin revisalo por favor
```

La segunda revisión dio `CAMBIOS-MENORES` (solo ⚪); Claude Code los corrigió. Antes del commit apareció en `web/INTEGRACION.md` una nota de otra persona o sesión, contrastada contra staging: `NumeroCuotas` es parámetro de `natillera-participacion`, no de la cuenta. Claude Code dejó de exigirlo en la cuenta (se toma de la cuenta o de sus participaciones, con prueba) para que la lista no cayera con datos reales. Esa nota y `integracion/` no van en este commit: no son de este trabajo.

El token admin estaba en `web/.env.local` (`JWT_TOKEN`, `org_role: "admin"`). Con él, `POST /api/contracts` respondió 201: Claude Code creó `natillera-cuenta` `0650899a-5af5-46ee-bc3b-0f21da6fce9e` y `natillera-participacion` `30acc57f-279e-4024-9e38-d4e01fe9e429` («Prueba web #53»), leyó su estado y eventos, encontró que las fechas llegan como `"AAAA-MM-DDT00:00:00"` sin zona y corrigió `fechaStaging` con su prueba. Probó `crearServicioStaging` en vivo con un archivo de prueba temporal (borrado después).

## 2026-10-16 · 17:25 (hora de Bogotá) · Claude Code (Claude Opus 5.5)

Comando `/director-web` con este encargo:

```text
podemos integrar al proyecto como una api intermedia de esto https://github.com/interledger/open-payments
```

Claude Code respondió que la API intermedia de Open Payments es `pagos/` (#4), que la escribe el equipo a mano, y ofreció guiar y revisar.

## 2026-10-16 · 17:33 (hora de Bogotá) · Claude Code (Claude Opus 5.5)

Comando `/director-web` con este encargo:

```text
bueno dejemos eso un lado puedes rellenar la informacion de la web con las apis ya que tienes?
```

## 2026-10-16 · 17:39 (hora de Bogotá) · Claude Code (Claude Opus 5.5) → subagente `web-implementador` (pagos)

```text
Repo: /Users/octopus/Proyectos Johan/openpayments-fintechfy. Issue #53 (Web: integrar con staging), parte "/pagos desde los eventos de staging".

**Tus archivos (solo estos):** `web/src/lib/servicio/pagos-staging.ts` y `web/src/lib/servicio/pagos-staging.test.ts`.

**Qué construir:** `export function pagosDeParticipacion(entrada: { natillera: { id: string; nombre: string }; participanteNombre: string; valorCuota: number; eventos: EventoContrato[] }): Pago[]` (tipos de `./tipos` y `./eventos-staging`).

- Un `Pago` por cada solicitud de cobro: `CobrarCuota` (tipo "cuota", periodo = parametros.Periodo, monto = valorCuota) y `PagarDeuda` (tipo "deuda"; monto de parametros si lo trae, si no 0 con un console.warn). Dirección "entrante". id estable = `${contractId}-${secuencia}`. creado = fecha de la solicitud.
- Etapas (en el orden de `ETAPAS`):
  - solicitud: "hecha" con la fecha del evento de solicitud.
  - autorización: "hecha" si antes de la solicitud hay un evento que puso GrantId no vacío (detalle = "Permiso <grantId>"; fecha de ese evento); si no, "fallida" con motivo "El participante no ha autorizado el cobro".
  - ejecución y finalización: buscar el primer evento POSTERIOR a la solicitud que la responde (mismo Periodo en parametros para cuotas). Éxito → ejecución "hecha" (detalle "Lo ejecuta el servicio de pagos (#4)", fecha del evento) y finalización "hecha" (detalle con el nombre de la función, por ejemplo "PrimeraCuotaCobrada"); monto = parametros.MontoCobrado si viene. Fallo → ejecución "fallida", finalización "pendiente", motivo en palabras simples ("El cobro no se pudo hacer"). Sin respuesta todavía → ejecución "actual", finalización "pendiente".
- estado del Pago: completado si finalización hecha; fallido si alguna etapa fallida; autorizado si la autorización está hecha; si no, pendiente.
- Ordena del más reciente al más antiguo.

**Pruebas:** con `EVENTOS_PARTICIPACION` sale exactamente 1 pago "cuota" de $50.000 completado con las 4 etapas hechas y el detalle "Permiso grant-prueba-web-53"; casos a mano: cobro sin respuesta (ejecución actual), cobro fallido, cobro sin permiso previo, dos periodos que no se cruzan las respuestas, PagarDeuda.

**Estás en paralelo con otro agente.** No corras `npm run build`, `npm run verificar` ni `npm run dev` (comparten .next/ y la copia del design system); verifica con `npm --prefix web run typecheck`, `npm --prefix web run lint` y `npm --prefix web run test`. No edites `web/src/lib/servicio/staging.ts`, `index.ts`, `tipos.ts`, `eventos-staging.ts` ni `eventos-staging.fixtures.ts` (los conecta quien coordina); si necesitas algo fuera de tus archivos, repórtalo. Sin dependencias nuevas, sin `server-only` (las pruebas lo importan). Lógica pura: tu función recibe datos ya leídos y no hace fetch.

Ya existe (léelo, no lo reescribas): `web/src/lib/servicio/eventos-staging.ts` (`EventoContrato`: contractId, secuencia, fecha, tipo "Initialized"|"StateChanged", funcion, disparador, cambios [{concepto, antes, despues}] en formato para mostrar "$50.000,00", parametros sin envoltorio, actor null si lo disparó el motor) y `eventos-staging.fixtures.ts` con eventos REALES de staging del 16 oct: participación = Initialized, ConfirmarAutorizacion (EstadoParticipacion 0→1, GrantId ""→"grant-prueba-web-53"), CobrarCuota (parametros {Periodo:1}; PeriodoEnCobro 0→1), PrimeraCuotaCobrada (disparador "CuotaCobrada", actor null, parametros {Periodo:1, MontoCobrado:50000}; CuotasPagadas 0→1, TotalAportado → "$50.000,00", EstadoParticipacion 1→2); cuenta = Initialized y RegistrarValidado (ParticipantesValidados 0→1). Los tipos de salida están en `web/src/lib/servicio/tipos.ts`; los registros del índice en `web/src/lib/indice/tipos.ts`. Lee `web/INTEGRACION.md` (sección "Lo que confirma la especificación" y "Las cuatro etapas") y, para nombres de funciones, `integracion/FND-20261015-natillera-2.openapi.json` (esquemas `Trigger_natillera_*`). OJO: los nombres de las funciones que registran la RESPUESTA de un pago (como PrimeraCuotaCobrada) no están en la especificación: no inventes una lista cerrada; reconoce el éxito por los cambios (CuotasPagadas sube) o por `MontoCobrado` en los parámetros, y el fallo por cambios como PagoFallidoPendiente 0→1 o funciones con "Fallo"/"Fallida" en el nombre.

Pruebas con Vitest, sin red, usando los fixtures reales más casos armados a mano. Antes de dar una prueba por buena, rompe a propósito la línea que protege y mírala fallar (.claude/rules/pruebas.md). Textos en español con tildes, voz de design-system/docs/voz-y-tono.md. Sigue `.claude/agents/web-implementador.md` y las skills natillera-web y natillera-design-system. Devuelve tu veredicto (`LISTO` · `LISTO-CON-PENDIENTES` · `BLOQUEADO`) con el informe del formato del agente, incluida la salida final de typecheck, lint y test.
```

## 2026-10-16 · 17:39 (hora de Bogotá) · Claude Code (Claude Opus 5.5) → subagente `web-implementador` (bitácora)

```text
Repo: /Users/octopus/Proyectos Johan/openpayments-fintechfy. Issue #53 (Web: integrar con staging), parte "/bitacora desde los eventos de staging".

**Tus archivos (solo estos):** `web/src/lib/servicio/bitacora-staging.ts` y `web/src/lib/servicio/bitacora-staging.test.ts`.

**Qué construir:** `export function bitacoraDeNatillera(entrada: { natillera: { id: string; nombre: string; administrador: string; valorCuota: number }; eventosCuenta: EventoContrato[]; actividades: { registro: RegistroActividad; eventos: EventoContrato[] }[] }): EventoBitacora[]` (tipos de `./tipos`, `./eventos-staging` y `@/lib/indice/tipos`).

- Natillera (eventos de la cuenta), por `tipo`/`funcion`: Initialized → "Creó la natillera" (actor = administrador; detalle con la cuota formateada con `formatoCOP` de `@/lib/natillera` si existe, si no como la usa la web); RegistrarValidado → "Se validó un participante" (actor "Sistema"); Iniciar → "La natillera arrancó"; VerificarCupo con EstadoNatillera hacia CERRADA_SIN_CUPO (6) → "Cerró sin cupo"; AbrirPeriodo → "Abrió el periodo <n>"; IniciarLiquidacion → "Inició la liquidación"; un evento con EstadoNatillera → 5 → "Cerró la natillera". Los eventos de dinero de la cuenta (RegistrarAporte, RegistrarPagoLiquidacion, RegistrarComision… y cualquiera cuyo nombre empiece por "Registrar" salvo RegistrarValidado) NO van a la bitácora: son de /pagos.
- Actividades: Initialized → "Creó una actividad" (detalle = registro.descripcion); IndicarGanador → "Indicó al ganador"; CerrarSinPremioOSinGanador → "Cerró la actividad sin premio"; CerrarEnLiquidacion → "Cerró la actividad al liquidar".
- Una función desconocida no se inventa ni se descarta en silencio: entra como accion "Acción en staging", detalle = nombre de la función.
- actor: el administrador si el evento trae actor (lo pidió alguien con el JWT), "Sistema" si actor es null.
- id estable `${contractId}-${secuencia}`; ordenado del más reciente al más antiguo.

**Pruebas:** con `EVENTOS_CUENTA` salen 2 entradas ("Creó la natillera" y "Se validó un participante", en ese orden de más reciente primero) con el actor correcto; casos a mano para actividad creada, ganador, función desconocida, RegistrarAporte omitido y cierre sin cupo.

**Estás en paralelo con otro agente.** No corras `npm run build`, `npm run verificar` ni `npm run dev` (comparten .next/ y la copia del design system); verifica con `npm --prefix web run typecheck`, `npm --prefix web run lint` y `npm --prefix web run test`. No edites `web/src/lib/servicio/staging.ts`, `index.ts`, `tipos.ts`, `eventos-staging.ts` ni `eventos-staging.fixtures.ts` (los conecta quien coordina); si necesitas algo fuera de tus archivos, repórtalo. Sin dependencias nuevas, sin `server-only` (las pruebas lo importan). Lógica pura: tu función recibe datos ya leídos y no hace fetch.

Ya existe (léelo, no lo reescribas): `web/src/lib/servicio/eventos-staging.ts` (`EventoContrato`: contractId, secuencia, fecha, tipo "Initialized"|"StateChanged", funcion, disparador, cambios [{concepto, antes, despues}] en formato para mostrar "$50.000,00", parametros sin envoltorio, actor null si lo disparó el motor) y `eventos-staging.fixtures.ts` con eventos REALES de staging del 16 oct: participación = Initialized, ConfirmarAutorizacion (EstadoParticipacion 0→1, GrantId ""→"grant-prueba-web-53"), CobrarCuota (parametros {Periodo:1}; PeriodoEnCobro 0→1), PrimeraCuotaCobrada (disparador "CuotaCobrada", actor null, parametros {Periodo:1, MontoCobrado:50000}; CuotasPagadas 0→1, TotalAportado → "$50.000,00", EstadoParticipacion 1→2); cuenta = Initialized y RegistrarValidado (ParticipantesValidados 0→1). Los tipos de salida están en `web/src/lib/servicio/tipos.ts`; los registros del índice en `web/src/lib/indice/tipos.ts`. Lee `web/INTEGRACION.md` (sección "Lo que confirma la especificación" y "Las cuatro etapas") y, para nombres de funciones, `integracion/FND-20261015-natillera-2.openapi.json` (esquemas `Trigger_natillera_*`). OJO: los nombres de las funciones que registran la RESPUESTA de un pago (como PrimeraCuotaCobrada) no están en la especificación: no inventes una lista cerrada; reconoce el éxito por los cambios (CuotasPagadas sube) o por `MontoCobrado` en los parámetros, y el fallo por cambios como PagoFallidoPendiente 0→1 o funciones con "Fallo"/"Fallida" en el nombre.

Pruebas con Vitest, sin red, usando los fixtures reales más casos armados a mano. Antes de dar una prueba por buena, rompe a propósito la línea que protege y mírala fallar (.claude/rules/pruebas.md). Textos en español con tildes, voz de design-system/docs/voz-y-tono.md. Sigue `.claude/agents/web-implementador.md` y las skills natillera-web y natillera-design-system. Devuelve tu veredicto (`LISTO` · `LISTO-CON-PENDIENTES` · `BLOQUEADO`) con el informe del formato del agente, incluida la salida final de typecheck, lint y test.
```

## 2026-10-16 · 17:47 (hora de Bogotá) · Claude Code (Claude Opus 5.5) → subagente `web-revisor`

```text
Repo: /Users/octopus/Proyectos Johan/openpayments-fintechfy. Revisa el trabajo no comiteado del issue #53 (web contra staging) en la rama feature/web-53-integracion-staging: `git status` y `git diff -- web/` más los archivos nuevos sin seguimiento de `web/src/lib/servicio/` (eventos-staging.ts, eventos-staging.fixtures.ts, eventos-staging.test.ts, pagos-staging.ts, pagos-staging.test.ts, bitacora-staging.ts, bitacora-staging.test.ts). Lo importante: `fechaStaging` (las fechas de staging llegan como "AAAA-MM-DDT00:00:00" sin zona), `pedirJson`/`eventosDe`/`listarPagos`/`listarBitacora` en staging.ts, `actividades()` en el lector del índice (lib/indice/tipos.ts, almacen.ts, index.ts) y las dos funciones puras de pagos y bitácora.

**No compiles: corre solo typecheck, lint y test** (`npm --prefix web run typecheck`, `lint`, `test`); el build ya pasó.

Contexto: web/INTEGRACION.md, sección "Lo que confirma la especificación" (formas reales de staging del 16 oct), y integracion/FND-20261015-natillera-2.openapi.json. Fíjate en especial en: que el token no salga en ningún error ni log; que `/pagos` (pantalla del jurado) no presente como pago de Open Payments algo que staging marcó como cobrado sin que pase por pagos/; el emparejamiento heurístico de respuestas de cobro en pagos-staging.ts; llamadas en paralelo sin tope (N natilleras × M participaciones) y qué pasa si un GET de eventos falla (¿tumba toda la lista?); y que /creditos siga avisando que no está conectado. Sigue `.claude/agents/web-revisor.md` y devuelve su veredicto y hallazgos con severidad y ruta:línea.
```

## 2026-10-16 · 17:59 (hora de Bogotá) · Claude Code (Claude Opus 5.5) → subagente `web-revisor` (segunda pasada)

```text
Repo: /Users/octopus/Proyectos Johan/openpayments-fintechfy. Segunda pasada sobre el issue #53 (rama feature/web-53-integracion-staging, trabajo no comiteado). En la primera devolviste CAMBIOS-NECESARIOS con 5 🟠, 2 🟡 y 2 ⚪. Verifica que estén corregidos y que la corrección no haya roto nada:

1. /pagos y /bitacora apagadas con staging → `pantallasSinConectar` pasó a `usaStaging` + `creditosSinConectar` en web/src/lib/servicio/index.ts; pagos/page.tsx y bitacora/page.tsx ya no cortan; creditos/page.tsx usa creditosSinConectar.
2. Un GET que falla tumbaba la lista → helper `reunir` (allSettled) en web/src/lib/servicio/staging.ts, usado por natillera, participación y actividad.
3. Consultas sin tope → caché de 2 s por ruta dentro del servicio (`pedirJson`, CACHE_MS), los fallos no se guardan.
4. Cobro de staging presentado como de Open Payments → `Aviso` info en web/src/app/(panel)/pagos/RegistroPagos.tsx (prop `sinOpenPayments`, la pasa pagos/page.tsx con usaStaging) y detalle de ejecución honesto en pagos-staging.ts; además un cobro sin permiso ya no sale completado (estadoDe).
5. Deuda en $0 → `deudaActual` (DeudaCuotas + MoraAcumulada) en la entrada de pagosDeParticipacion; una deuda solo la cierra una respuesta con "Deuda" en el nombre.
⚪8 medianoche con Z en fechaStaging; ⚪9 comentarios al día y ValorCuota con numeroObligatorio.
Queda abierto a propósito el 🟡7 (actor de la bitácora con JWT compartido): solo dime si lo ves 🟠.

**No compiles: corre solo typecheck, lint y test** (el build ya pasó). Revisa también accesibilidad y design system del Aviso nuevo (que no se anuncie dos veces dentro de la región viva del registro). Sigue `.claude/agents/web-revisor.md` y devuelve veredicto y hallazgos con severidad y ruta:línea.
```

Resultado (18:04): `web-revisor` dio CAMBIOS-NECESARIOS (5 🟠) y, tras las correcciones de Claude Code, CAMBIOS-MENORES; Claude Code corrigió también los 🟡 1-3 y los ⚪ 5-6. Quedan anotados el ⚪ 4 (línea de tiempo de un cobro sin permiso) y el 🟡 7 (actor de la bitácora con el JWT compartido). `npm --prefix web run verificar`: 166 pruebas, build compilado.
