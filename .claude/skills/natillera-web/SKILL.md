---
name: natillera-web
description: Cómo construir y cambiar la web de Natillera 2.0 (carpeta web/, Next.js + TypeScript) con buenas prácticas - estructura, capa de datos del servicio externo, componentes de servidor, diseño responsive desde móvil, accesibilidad, seguridad de la X-Api-Key, pruebas y verificación. Úsala siempre que toques algo dentro de web/, agregues una pantalla (natilleras, solicitudes de crédito, registro de pagos para el jurado, bitácora), conectes la web al servicio externo, arregles un error de la web o revises un PR del frente Web, aunque el pedido no diga "Next.js".
---

# Web de Natillera 2.0

La web es para **la financiera y el administrador**: gestionar natilleras, aprobar créditos, ver el registro de pagos que se le muestra al jurado y la bitácora. No mueve dinero: pide y muestra. Las reglas de dinero las aplica el servicio externo de lógica financiera, y los pagos los hace el servicio de pagos.

Junto con esta skill usa `natillera-design-system`: todo lo visual sale de ahí.

## Stack y comandos

Next.js (App Router) + TypeScript estricto + Vitest. Todo vive en `web/`.

```bash
cd web
npm install
npm run dev          # http://localhost:3000 (antes copia el design system: estilos a src/styles/ds, logos a public/ds)
npm run verificar    # tipos + lint + pruebas + build: lo mismo que se exige antes de un PR
npm run capturas     # capturas en 360, 768, 1024 y 1280 px, tema claro y oscuro (necesita npm run dev o start)
```

Las versiones van fijas en `package.json` (sin `^`). Para agregar una dependencia, elige una versión publicada hace al menos dos semanas y justifícala en el PR: cada paquete es superficie de ataque en un repo público y tiempo de instalación en la demo.

## Estructura

```
web/src/
  app/                    rutas (una carpeta por pantalla)
    layout.tsx            estructura común: encabezado, navegación, <main>
    natilleras/           #9 lista y detalle ([id])
    creditos/             #10 solicitudes (con actions.ts para aprobar o no aprobar)
    pagos/                US-007-RPT registro de pagos para el jurado
    bitacora/             US-012-AUD bitácora del administrador
    api/                  route handlers que la página consulta desde el navegador (polling)
  components/             piezas reutilizables en React sobre las clases nt- del design system
  lib/natillera.ts        formatoCOP, ESTADOS e íconos: el mismo comportamiento que design-system/components/bundle.js
  lib/servicio/           la ÚNICA puerta al servicio externo (tipos, datos de prueba, cliente HTTP)
  styles/app.css          solo el layout de la app; los componentes vienen de bundle.css
  styles/ds/              copia generada de tokens.css, bundle.css y fuentes (no se edita ni se sube)
```

Una pantalla nueva = una carpeta en `app/` con `page.tsx`, y si hace falta `loading.tsx` y `error.tsx`. Si un pedazo se repite en dos pantallas, va a `components/`.

## Datos: siempre por `lib/servicio`

El contrato con el servicio externo se define en el issue #5. Mientras tanto, `lib/servicio` responde con datos de prueba que tienen la forma esperada. Cuando exista el contrato, se cambia solo `lib/servicio/http.ts`; las pantallas no se enteran.

- En el servidor importa desde `@/lib/servicio` (`listarNatilleras()`, `obtenerNatillera(id)`, `listarSolicitudesCredito()`, `listarPagos()`, `listarBitacora()`, `responderSolicitud(...)`). Nunca hagas `fetch` al servicio externo desde una página o un componente.
- En un componente `"use client"` importa solo **tipos y constantes** desde `@/lib/servicio/tipos` (por ejemplo `Pago`, `ETAPAS`). `@/lib/servicio` es solo de servidor: importarlo desde el cliente rompe el build a propósito.
- Los tipos de `lib/servicio/tipos.ts` siguen los estados de `docs/discovery/4-logica-financiera/especificacion-funcional.md` y de `design-system/docs/estados.md`. Si necesitas un campo nuevo, agrégalo al tipo, a los datos de prueba y anótalo para el contrato de #5.
- `SERVICIO_URL` vacía → datos de prueba. Con valor → cliente HTTP. Así se puede hacer la demo aunque el servicio externo no esté.

## Seguridad: la llave no sale del servidor

El repo es público y la web llama a un servicio con `X-Api-Key`.

- `lib/servicio/index.ts` empieza con `import "server-only"`: si alguien lo importa desde un componente de cliente, el build falla. No lo quites.
- Las variables con la llave **nunca** llevan prefijo `NEXT_PUBLIC_`; ese prefijo las mete en el JavaScript del navegador.
- Secretos solo en `web/.env.local` (ignorado por git). `web/.env.example` lista los nombres sin valores.
- Las mutaciones (aprobar un crédito) van por **Server Actions** que validan la entrada en el servidor antes de llamar a `lib/servicio`: nunca confíes en lo que manda el formulario.
- No muestres errores crudos del servicio al usuario: registra el detalle en el servidor y muestra un `nt-aviso--error` con qué hacer.

## Componentes de servidor por defecto

- Las páginas son **Server Components**: leen datos con `await` directamente. Son más rápidas y no exponen nada.
- `"use client"` solo para lo interactivo: un menú que se abre, un filtro, el polling del registro de pagos. Mantén esos componentes pequeños y pásales datos ya listos por props.
- El registro de pagos se refresca solo: un componente de cliente consulta `app/api/pagos` cada pocos segundos (el jurado lo mira "en vivo"). Detén el polling cuando la pestaña no está visible (`document.visibilityState`).
- Después de una Server Action que cambia datos, `revalidatePath` de las rutas afectadas.

## Responsive desde móvil

Diseña primero para 360px y agranda; muchos administradores abren la web en el celular.

- Puntos de quiebre en `app.css`: `640px` (tablet) y `1024px` (escritorio). Escribe el estilo móvil sin media query y agrega `@media (min-width: …)` hacia arriba.
- **Nada de scroll horizontal de la página.** El margen lateral en móvil es `--espacio-4`. Comprueba en 360px.
- **Tablas:** en escritorio, `nt-tabla` dentro de `nt-tabla-marco`. En móvil, cada fila se vuelve una tarjeta: usa la clase `tabla-apilable` de `app.css` y pon `data-etiqueta="Columna"` en cada `<td>`. Una tabla con 6 columnas no cabe en 360px.
- Grillas con `grid-template-columns: repeat(auto-fit, minmax(…, 1fr))` en vez de anchos fijos.
- Imágenes con `width`/`height` (o `next/image`) para que no salte el layout; el logo grande solo en escritorio.
- Objetivos táctiles de 48px (`--control-alto`); en tablas de escritorio se vale `nt-btn--sm`.
- La navegación en móvil es una barra que se desplaza horizontalmente o un menú; nunca enlaces de 12px apretados.

## Accesibilidad

- Un solo `<h1>` por página, encabezados en orden, `<main id="contenido">` y enlace "Saltar al contenido" (ya está en el layout).
- `lang="es"` en `<html>`. Textos alternativos: el logo dice "Natillera 2.0"; íconos decorativos con `aria-hidden`.
- Formularios: cada campo con `<label>`, errores en texto junto al campo. Botones son `<button>`, enlaces son `<a>`/`<Link>`.
- Avisos: `role="status"` para lo normal, `role="alert"` solo para errores. El polling no debe anunciar cada refresco; anuncia solo pagos nuevos o fallidos.
- Respeta `prefers-reduced-motion` en cualquier animación.
- Tema oscuro: viene de los tokens (`prefers-color-scheme`). Mira cada pantalla en los dos temas.

## Rendimiento

- Poco JavaScript en el cliente: si algo se puede renderizar en el servidor, hazlo allí.
- Las fuentes del design system son locales (se empaquetan desde `src/styles/ds/fonts`), sin Google Fonts en tiempo de ejecución.
- Fechas y horas con `@/lib/fechas` (`formatoFecha`, `formatoHora`, `formatoFechaHora`): siempre en hora de Bogotá y como las dice el design system ("15 de octubre", "9:00 a. m.").
- No agregues librerías de UI ni de iconos: el design system ya trae ambas cosas.

## Pruebas y verificación

- Lógica pura (formato, cálculos de presentación, mapeo de estados) con pruebas en Vitest junto al archivo (`*.test.ts`). `lib/natillera.test.ts` comprueba que la versión TypeScript se comporta igual que `bundle.js`.
- Antes de decir que algo está listo: `npm run verificar` en verde y `npm run capturas` revisadas en 360, 768, 1024 y 1280, claro y oscuro. Si no pudiste correr algo, dilo.
- La lista completa de revisión está en [references/checklist.md](references/checklist.md).

## Reglas del equipo (hackathon)

- Rama `feature/web-<issue>-<tema>` desde `develop`; PR a `develop` con la plantilla. Nunca a `main`.
- Cada prompt real usado para programar se copia tal cual en `prompts/web-<tema>.md` con fecha y herramienta. Un resumen no cumple la política de IA.
- En el mismo PR, agrega a la tabla de `AI_USAGE.md` los archivos tocados, la herramienta y cuánta IA.
