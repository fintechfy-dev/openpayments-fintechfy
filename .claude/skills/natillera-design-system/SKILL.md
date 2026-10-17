---
name: natillera-design-system
description: Aplica el design system de Natillera 2.0 (tokens, componentes nt-, logo del kit, estados con badge, formato de pesos y voz y tono del bot) a cualquier pieza visual o texto del producto. Úsala siempre que vayas a crear o cambiar una pantalla de la web, un componente, una tarjeta-imagen o un mensaje del bot de Telegram, las diapositivas del pitch, colores, tipografía, íconos o el logo, aunque el pedido no diga "design system"; también al revisar si algo "se ve bien", es accesible o respeta la marca.
---

# Design system de Natillera 2.0

Todo lo visual del proyecto sale de `design-system/` en la raíz del repo. Esta skill te dice qué leer, qué usar y qué evitar para que el bot, la web y el pitch se vean como un solo producto. La fuente de verdad es el código de esa carpeta: si algo aquí contradice a `design-system/README.md` o a `tokens.json`, manda la carpeta.

## Antes de diseñar o escribir

Lee lo que corresponda; son archivos cortos:

| Vas a… | Lee |
|---|---|
| Hacer cualquier pantalla o componente | `design-system/README.md` (principios, color, tipografía, espaciado) |
| Mostrar un estado (natillera, participante, pago, crédito) | `design-system/docs/estados.md` |
| Escribir un texto que lee un participante (bot, avisos, botones) | `design-system/docs/voz-y-tono.md` |
| Poner el logo o el avatar | `design-system/assets/logos/README.md` |
| Usar un componente existente | `design-system/components/<Nombre>/README.md` y su `preview.html` |

Las vistas previas (`preview.html`) son la referencia visual de cada pieza: copia su estructura de clases en vez de inventar una nueva. La galería se ve con `python3 -m http.server -d design-system 8080`.

## Reglas que no se rompen (y por qué)

1. **Solo tokens, nunca hex.** Usa `var(--primario)`, `var(--espacio-4)`, `var(--radio-lg)`… El tema oscuro y cualquier ajuste de marca cambian los tokens, no los componentes; un hex pegado se queda viejo y rompe el contraste en oscuro. La única excepción es dentro de los archivos del logo.
2. **Los componentes ya existen: reutiliza las clases `nt-`.** Botones `nt-btn`, tarjetas `nt-card`, datos `nt-dato`, badges `nt-badge`, tablas `nt-tabla`, progreso `nt-progreso`/`nt-cuotas`, avisos `nt-aviso`, línea de tiempo `nt-linea`. Están en `design-system/components/bundle.css`. Si de verdad falta algo, constrúyelo con tokens y propónlo al design system en el mismo PR.
3. **Estados siempre con ícono + palabra.** Usa `ESTADOS` (en la web, `src/lib/natillera.ts`; en HTML suelto, `Natillera.badge(tipo, estado)`). El color solo no alcanza para daltónicos ni para el jurado mirando un proyector.
4. **La mora es naranja (`aviso`), nunca rojo.** Es un atraso de una persona, no un error del sistema. Rojo (`error`) es solo para fallas técnicas. "No aprobado" en crédito es neutro.
5. **Dinero con `formatoCOP`.** `$100.000`: signo pegado, punto de miles, sin decimales si son cero. `Intl.NumberFormat("es-CO")` mete un espacio y no agrupa 4 cifras en todos los navegadores. Nada de "COP" ni "1,8 M" en la interfaz. Cifras con `font-variant-numeric: tabular-nums` (`nt-num`).
6. **La plata siempre ubicada.** Donde haya dinero del grupo, decir quién lo custodia: "La plata la guarda Financiera Aliada. Nadie del grupo la puede sacar." Es el corazón del producto y de la historia para el jurado.
7. **Contraste AA en claro y oscuro.** Texto ≥4.5:1 (≥3:1 desde 24px), bordes de controles y foco ≥3:1. Los pares de `tokens.json` ya cumplen; si combinas tokens fuera de su `usage`, mide. El mostaza `acento` y el rosado `secundario` son rellenos, no colores de texto.
8. **Para todas las edades.** Párrafos ≥16px (`cuerpo`), controles de 48px (`control-alto`), foco visible (`.nt :focus-visible` ya lo trae). Una acción principal por pantalla.

## Logo

El oficial es el kit original en PNG: `design-system/assets/logos/kit/`.

- Barra de encabezado (web, cualquier ancho): `01_simbolo/marranito_64px.png` + `04_logotipo/nombre_original_512px.png`. Es lo que usa `web/src/components/Logo.tsx`.
- Portadas, pantallas de bienvenida, pitch: `03_horizontal/logo_horizontal_640px.png`, siempre a 320px de ancho o más (con menos, la tagline no se lee).
- Sobre fondo oscuro (`marca-fondo` o tema oscuro): marranito a color + `06_monocromos/nombre_blanco.png`. El nombre a color no se lee sobre oscuro.
- De 24 a 40px: solo el marranito, sin texto. Favicon: `01_simbolo/marranito_32px.png`. Avatar del bot: `05_avatar/avatar_verde_oscuro_512px.png`.
- No hay logo en vector: el redibujo en SVG se retiró porque no era idéntico al kit. Para impresión grande, usa los PNG de 1024 o 1600px.

## Texto para participantes

Resumen de `voz-y-tono.md` (léelo completo si escribes mensajes):
- Tuteo cálido, frases cortas, primero el dato. Máximo 3 líneas antes del botón.
- Cero tecnicismos con participantes: nada de Interledger, grant, wallet, token, transacción. Di billetera, cobro, cuota, autorizar.
- Sin culpa: "quedó pendiente", nunca "debes" ni "moroso"; nunca exponer a alguien ante el grupo.
- El préstamo lo da la financiera, no la natillera.
- Un emoji como máximo, ninguno en mora o error.

El panel del jurado y la web de la financiera sí pueden usar los nombres técnicos de las etapas de pago (Solicitud, Autorización, Ejecución, Finalización).

## Si cambias el design system

Edita `design-system/tokens/tokens.json` (nunca `tokens.css`) y regenera con `node design-system/tokens/build.mjs`. Mide el contraste de los pares que tocaste en los dos temas. El design system también vive en Claude Design (enlace en `design-system/README.md`): avisa en el PR que hay que sincronizarlo.
