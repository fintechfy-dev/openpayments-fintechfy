# «Mi natillera»: la Mini App del participante

> Issue #26 (US-008) y la entrada al préstamo de US-014 (#29) · rama `feature/telegram-26-mi-natillera` · 2026-10-16.

## Qué ve el participante

Se abre con `/mi_natillera` o con el botón **Mi natillera** junto al cuadro de texto del chat. Tiene tres pestañas:

| Pestaña | Qué muestra |
|---|---|
| **Mi ahorro** | Cuánto lleva y la barra de cuotas del design system (pagadas, pendiente, próxima). La próxima cuota con fecha y hora. Cuánto van entre todos, con su avance y «La plata la guarda Financiera Aliada». Cuánto recibe al final. Si tiene una cuota pendiente, un aviso sin culpa. Si puede pedir préstamo, la tarjeta de Financiera Aliada con **Pedir préstamo**. Si la natillera no ha arrancado, cuántas personas faltan |
| **Reglas** | Cuota, fechas, número de cuotas, mora, cupo y quién administra. Su cobro automático con el tope autorizado. Las personas del grupo, **solo con su nombre**: nunca se muestra si alguien está en mora (guía de voz y tono) |
| **Mis cobros** | Cada cobro con su fecha, monto e insignia de estado del design system; si falló, el motivo en palabras simples |

## Decisiones

| # | Decisión | Por qué |
|---|---|---|
| D-30 | **Una página aparte, `miniapp/natillera/`**, junto al formulario de crear | Cada pantalla carga solo lo suyo; comparten `miniapp.css` y `comun.js` (Telegram, tema e íconos) |
| D-31 | **La lógica de la pantalla es una función pura (`vista.js`)** que recibe los datos y devuelve textos y estados | Se prueba con `node:test` sin navegador; la página solo pinta |
| D-32 | **Los datos tienen la forma de los de la web** (`web/src/lib/servicio/tipos.ts`): `Natillera`, `Participante`, `Pago` | Cuando llegue el contrato de #5, el bot, la web y la Mini App piden lo mismo |
| D-33 | **Datos de ejemplo mientras no exista #5** (`datos-demo.js`): «Los Primos», la misma natillera de prueba de la web, en tres momentos: al día, cuota pendiente y recién creada. La página lo dice y deja cambiar de ejemplo | Sirve para la demo sin engañar a nadie: dice «Datos de ejemplo» |
| D-34 | **Se abre con un botón dentro del mensaje o el botón de menú**, no con el teclado de abajo | Esta pantalla solo muestra; no necesita `sendData` |
| D-35 | **«Pedir préstamo» vuelve al chat con `t.me/<bot>?start=prestamo`** | Funciona sin importar desde qué botón se abrió. Por ahora el bot responde que llega pronto; el flujo es US-014 (#29) |
| D-36 | **Todo lo que viene de los datos se pinta con `textContent`** | Ningún nombre ni texto del servicio se interpreta como HTML |

## Cómo se probó

- `npm test`: 66/66. Nuevas en `test/mi-natillera.test.js` (11): la vista en los tres casos, los segmentos de cuotas, que las personas no expongan su estado, los textos según la guía, `/mi_natillera` con y sin Mini App, la dirección con el usuario del bot y `/start prestamo`.
- En Chrome sin ventana a 375 px, en claro y oscuro: los tres casos y las tres pestañas, sin desplazamiento horizontal ni archivos faltantes. Se probó cambiar de pestaña con clic y con flechas, cambiar de ejemplo, y que el préstamo aparece solo cuando corresponde. Se encontró y se arregló que las pestañas no se ocultaban.
- **Falta probar dentro de Telegram:** el botón de menú y que «Pedir préstamo» vuelva al chat.

## Pendientes

- **#5:** pedir los datos reales al servicio externo. Como la página es estática, hará falta que el bot (o el servicio) responda por https y valide el `initData` de Telegram para saber quién pide. Esto se decide con #5 y #6.
- **US-014 (#29):** el flujo de pedir el préstamo en el chat.
- **Varias natilleras por persona:** hoy se muestra una. Si alguien está en varias, hace falta un selector (pendiente del plan del esqueleto).
