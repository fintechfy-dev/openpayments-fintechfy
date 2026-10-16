# Lista de revisión de la web

Úsala antes de abrir un PR del frente Web y cuando revises uno. Cada punto explica qué romper evita.

## Funciona

- [ ] `npm run verificar` pasa: tipos, lint, pruebas y build.
- [ ] La pantalla carga con datos de prueba (`SERVICIO_URL` vacía) y muestra un estado vacío claro si no hay datos.
- [ ] Hay `loading.tsx` o un estado de carga, y `error.tsx` con un `nt-aviso--error` que dice qué hacer.
- [ ] Los escenarios de la historia o del issue se cumplen (enlázalos en el PR).

## Datos y seguridad

- [ ] Todo dato del servicio externo pasa por `@/lib/servicio`; ningún `fetch` directo desde páginas o componentes.
- [ ] Ninguna variable secreta con prefijo `NEXT_PUBLIC_`; `lib/servicio/index.ts` conserva `import "server-only"`.
- [ ] Sin `.env`, llaves ni tokens en el diff (`git diff --cached | grep -iE "key|secret|token"`).
- [ ] Las Server Actions validan la entrada (tipo, existencia del id, estado permitido) antes de llamar al servicio.
- [ ] Los errores del servicio se registran en el servidor; al usuario le llega un mensaje claro, no el error crudo.

## Design system

- [ ] Cero colores en hex, píxeles sueltos de espaciado o fuentes nuevas: solo tokens y clases `nt-`.
- [ ] Estados con `ESTADOS`/`Badge` (ícono + palabra). Mora en naranja, nunca rojo.
- [ ] Dinero con `formatoCOP` y `nt-num`.
- [ ] Donde haya dinero del grupo, se dice quién lo custodia.
- [ ] Logo del kit según el ancho y el fondo (ver la skill `natillera-design-system`).

## Responsive

- [ ] Revisado en 360, 768, 1024 y 1280 px (`npm run capturas`), sin scroll horizontal de la página.
- [ ] Tablas: `tabla-apilable` con `data-etiqueta` en cada celda para móvil.
- [ ] Botones y enlaces de navegación de al menos 48 px de alto en móvil.

## Accesibilidad

- [ ] Un `<h1>`, encabezados en orden, landmarks (`header`, `nav`, `main`).
- [ ] Se puede usar solo con teclado y el foco se ve.
- [ ] Contraste AA; nada de texto en `acento` o `secundario`. La web se ve clara aunque el sistema esté en modo oscuro.
- [ ] Imágenes con `alt` (o `alt=""` si son decorativas) y `width`/`height`.
- [ ] Avisos con `role="status"`; `role="alert"` solo para errores.

## Equipo

- [ ] Rama `feature/web-<issue>-<tema>` y PR a `develop` con `Closes #<issue>`.
- [ ] Prompts reales en `prompts/web-<tema>.md` y fila en `AI_USAGE.md`.
