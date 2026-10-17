# Regla: código

Aplica a `web/`, `telegram/`, `pagos/` e `integracion/`. Cada carpeta puede tener reglas más específicas (por ejemplo la skill `natillera-web`); si chocan, manda la más específica.

## Estructura

- **Una puerta por sistema externo.** El servicio externo se llama solo desde su cliente (en la web, `web/src/lib/servicio/`); Open Payments solo desde la API de pagos (`pagos/`). El bot y la web no hablan con Open Payments: llaman a esa API por HTTP (`PAGOS_URL`). Si una pantalla o un comando del bot hace `fetch` a un sistema externo, está mal ubicado.
- **Datos de prueba solo detrás de esa puerta** y visibles como tales (la web muestra un aviso). Nunca un dato de prueba escondido en una pantalla o en un mensaje del bot: en la demo tiene que verse qué es real y qué no, y la "demo de humo" está prohibida.
- **Sin `utils.ts` bolsa de todo.** Si algo no tiene sitio, falta un concepto: nómbralo (`fechas.ts`, `formato.js`, `presentacion.ts`).
- **Lógica pura separada de la UI**, en su propio archivo con su prueba. Una pantalla que calcula montos o estados en el JSX es difícil de probar y de revisar.
- **Extrae cuando** un archivo de vista pasa de ~300 líneas, la misma lógica aparece en 2 sitios o hay una regla pura que probar. No antes. (Los datos de prueba no cuentan.)
- **Una regla de dinero o de acceso se declara una sola vez.** Copiada en dos sitios, cambiarla exige acertar dos veces, y olvidar una no rompe nada visible: solo da un monto o un permiso equivocado.
- Los nombres dicen el dominio en español (`natillera`, `cuota`, `participante`, `liquidacion`); las convenciones del framework se quedan en inglés (`page.tsx`, `route.ts`, `useActionState`).

## Comentarios

Un comentario se gana su sitio solo si dice algo que el código no puede decir.

**Sí:** el porqué de una decisión no obvia ("polling y no websocket: el servicio externo no los soporta"), la alternativa descartada, una invariante que el tipo no expresa, un workaround con su condición de retiro, un `TODO(#issue)` con número.

**No, y se borra:** parafrasear el código, repetir lo que dice el nombre, títulos de sección, código muerto comentado, `TODO` sin issue.

## Idioma

Mensajes al usuario, documentación, commits y PR en **español con tildes correctas**. Los textos que ve un participante siguen la voz y tono del design system (`design-system/docs/voz-y-tono.md`).
