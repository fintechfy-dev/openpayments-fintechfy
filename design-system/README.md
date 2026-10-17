# Design system de Natillera 2.0

**Ahorrar juntos, siempre.** Natillera 2.0 se siente como la natillera del barrio, no como un banco: cálida, clara sobre dónde está el dinero y sin una sola palabra de jerga financiera o cripto.

Fuente: el design system del equipo en Claude Design ([artifact](https://claude.ai/artifact/T41dSDP95eL4LoYcmUuUau)). Esta carpeta es la copia que usa el código. Si cambian algo allá, tráiganlo aquí; si lo cambian aquí, súbanlo allá.

## Qué hay aquí

| Carpeta o archivo | Qué es |
|---|---|
| [`tokens/tokens.json`](tokens/tokens.json) | **Fuente de verdad** de colores (claro y oscuro), tipografía, espaciado, radios, sombras y controles |
| [`tokens/tokens.css`](tokens/tokens.css) | Variables CSS generadas, con las fuentes locales. No se edita a mano |
| [`tokens/tokens.resolved.json`](tokens/tokens.resolved.json) | Los mismos valores ya resueltos por tema, para el renderizador de imágenes del bot |
| [`tokens/build.mjs`](tokens/build.mjs) | Regenera los dos anteriores: `node design-system/tokens/build.mjs` |
| [`components/bundle.css`](components/bundle.css) | Estilos de los componentes (prefijo `nt-`) |
| [`components/bundle.js`](components/bundle.js) | `window.Natillera`: `formatoCOP`, `ESTADOS`, `icono()`, `badge()` |
| [`components/<Nombre>/`](components/) | Guía (`README.md`) y vista previa (`preview.html`) de cada componente |
| [`assets/logos/kit/`](assets/logos/kit/) | **Logo oficial**: el kit original del equipo en PNG (símbolo, vertical, horizontal, nombre, avatar y monocromos). Guía en [`assets/logos/README.md`](assets/logos/README.md) |
| [`assets/iconos/`](assets/iconos/) | Set base de íconos de línea |
| [`fonts/`](fonts/) | Nunito (700, 800, 900) y Atkinson Hyperlegible (400, 700) en woff2 |
| [`docs/`](docs/) | [Marca](docs/marca.md), [estados del producto](docs/estados.md) y [voz y tono del bot](docs/voz-y-tono.md) |
| [`index.html`](index.html) | Galería local de todos los componentes |

Para ver la galería: `python3 -m http.server -d design-system 8080` y abrir <http://localhost:8080>. Tiene botón para cambiar entre tema claro y oscuro.

## Cómo usarlo en el código

**Páginas web** (retorno de la autorización y panel del jurado):

```html
<link rel="stylesheet" href="/design-system/tokens/tokens.css">
<link rel="stylesheet" href="/design-system/components/bundle.css">
<script src="/design-system/components/bundle.js"></script>
<body class="nt"> … </body>
```

- Siempre `var(--nombre-token)`; nunca hex pegados en los componentes.
- El tema oscuro sigue al sistema; se fuerza con `data-theme="dark"` o `data-theme="light"` en `<html>`.
- Dinero siempre con `Natillera.formatoCOP(valor)`, que da `$100.000`. No usen `Intl.NumberFormat("es-CO")` a secas: mete un espacio después del `$` y a veces no agrupa números de 4 cifras.

**Crédito:** la financiera aprueba préstamos en `SolicitudesCredito` (web) y el participante ve el suyo en `TarjetaCredito` (bot y web). Los estados están en [estados del producto](docs/estados.md#crédito) y los mensajes en [voz y tono](docs/voz-y-tono.md#crédito).

**Bot de Telegram:** los textos siguen [voz y tono](docs/voz-y-tono.md). Para las tarjetas-imagen (aporte, bienvenida) usen los colores de `tokens.resolved.json` y la maqueta de `components/TarjetaAporte/preview.html`. El avatar del bot es `assets/logos/kit/05_avatar/avatar_verde_oscuro_512px.png`.

## Principios

1. **La plata siempre a la vista.** Toda pantalla que hable de dinero dice cuánto, de quién y quién lo custodia. El bloque de custodia ("La plata la guarda Financiera Aliada. Nadie del grupo la puede sacar.") aparece en la invitación, la tarjeta de aporte y la autorización.
2. **Una idea por pantalla.** Una acción principal (`nt-btn--primario`), un dato destacado (`nt-card--destacada`).
3. **Para todas las edades.** Texto de párrafo nunca menor a 16px (`cuerpo`), controles de 48px (`control-alto`), contraste AA en claro y oscuro, estados con ícono + palabra.
4. **Orgullo paisa sin caricatura.** El marranito rosado, el verde de montaña y la moneda mostaza; nada de sombreros, carrieles ni acentos exagerados.
5. **Evitar:** el gris-azul frío de banco, la estética cripto (neón, hexágonos, monedas 3D, degradados morados) y los colores o logos de marcas reales (Interledger, bancos, patrocinadores).

## Color

- **Primario `primario`** (verde del nombre en el logo, `#113A26`): acciones, progreso del ahorro, cifras positivas. Texto encima con `sobre-primario`.
- **Secundario `secundario`** (rosado del marranito): rellenos cálidos y bloques de marca, nunca texto. Fondos suaves con `secundario-suave` para custodia y bienvenida.
- **Marca `marca-fondo`** (verde oscuro de los fondos del kit, `#06472E`): portadas, encabezados y bloques de marca oscuros, con texto blanco.
- **Acento `acento`** (mostaza del "2.0", `#E7A402`): diciembre, liquidación, celebración y las monedas de la marca. Solo como relleno; el texto dorado es `acento-texto`.
- **Superficies:** `superficie` (página, la crema del kit `#FFF8EC`), `superficie-elevada` (tarjetas), `superficie-hundida` (campos, filas, fondos de mockup).
- **Texto:** `tinta` para todo lo importante y `tinta-suave` para fechas y ayudas. Ambos pasan AA sobre las tres superficies en los dos temas.
- **Bordes:** `borde` es decorativo; usa `borde-fuerte` en controles y marcadores (≥3:1).
- **Foco:** anillo sólido de 3px `foco` con 2px de separación en todo elemento interactivo (ya está en `.nt :focus-visible`).
- **Tema oscuro:** mismos nombres, valores aclarados; los rellenos `primario`, `secundario` y `acento` llevan texto oscuro (`sobre-…`).
- Proporción sugerida por pantalla: 70% superficies, 20% verde, 10% rosado y mostaza.

## Tipografía

- **Nunito** (`--font-display`, 700/800/900): títulos, cifras y botones. Redondeada y amable, como la marca.
- **Atkinson Hyperlegible** (`--font-body`, 400/700): todo el texto. Diseñada para baja visión: distingue bien 1/l/I y 0/O, clave para leer montos y fechas.

| Estilo | Tamaño / línea | Uso |
| --- | --- | --- |
| `display` | 40/44 · 900 | Portadas, pantalla de éxito |
| `titulo-1` | 30/36 · 800 | Título de página |
| `titulo-2` | 24/30 · 800 | Secciones |
| `titulo-3` | 20/26 · 800 | Título de tarjeta |
| `cifra-grande` | 36/40 · 900 | Tu aporte, total del grupo |
| `cifra` | 22/28 · 800 | Montos en tarjetas |
| `cuerpo-grande` | 18/28 | Mensajes clave en móvil |
| `cuerpo` | 16/24 | Texto por defecto |
| `etiqueta` | 15/20 · 700 | Etiquetas, encabezados de tabla |
| `pequeno` | 14/20 | Fechas y metadatos |
| `nota` | 13/18 · 700 | Badges |

Mayúscula inicial en títulos y botones ("Volver a Telegram"), nunca TODO EN MAYÚSCULAS salvo los rótulos cortos de diapositiva. Cifras siempre tabulares.

## Dinero en pesos colombianos

- Formato: **$100.000**: signo pegado, punto de miles, sin decimales. Decimales con coma solo cuando no son cero: $1.250,50.
- Nunca "COP", "pesos colombianos" ni "$100,000" en la interfaz; "COP" solo en el registro técnico del panel si hace falta.
- Montos grandes de grupo completos: $1.800.000, no "1,8 M".

## Espaciado, radios y sombras

- Escala de 4px: `espacio-1` (4) a `espacio-9` (64). Márgenes laterales en móvil `espacio-4`; padding de tarjeta `espacio-5`; entre secciones `espacio-7`.
- Radios: `radio-sm` 8 (campos, cuotas), `radio-md` 12 (avisos, tablas), `radio-lg` 20 (tarjetas), `radio-xl` 28 (bloques de marca), `radio-pildora` (botones, badges, progreso).
- Sombras cálidas y bajas: `sombra-1` tarjetas, `sombra-2` interactivas, `sombra-3` tarjetas-imagen del bot. Nunca sombras de color ni brillos.

## Iconografía

Línea de 2px, puntas redondeadas, 24×24, sin relleno. Set base: cuota, grupo, billetera, candado, calendario, premio, alerta, check; más reloj y punto (solo inline) para estados, y `credito` (mano con moneda, solo inline) para el préstamo. El candado significa siempre "la plata está protegida", nunca "bloqueado". Para íconos nuevos usen Lucide con el mismo trazo. Emoji solo en mensajes del bot, nunca en la interfaz web.
