# Crear la natillera: botones en el chat y formulario en una Mini App

> Issue #13 (US-001) · rama `feature/telegram-13-crear-natillera` (sale de `feature/telegram-7-esqueleto-bot`) · 2026-10-16.
> Pedido de Estiven: «lo más visual y gráfico que podamos en Telegram», con las dos formas.

## Qué quedó

`/crear` (también el botón «Crear natillera» de la bienvenida) arma la natillera con los 7 datos de US-001: nombre, cuota, periodicidad, primera cuota, fecha final, cupo mínimo y mora diaria. Hay dos caminos y los dos terminan en el **mismo resumen en el chat**, con «Crear natillera», «Corregir un dato» y «Cancelar».

| Camino | Cómo se ve | Cuándo |
|---|---|---|
| **Formulario (Mini App)** | Una página dentro de Telegram con el design system: deslizador y montos sugeridos para la cuota, selector de periodicidad, calendario, botones − / + para el cupo, deslizador de mora y una tarjeta que calcula en vivo cuánto ahorra cada quien, con la barra de cuotas. Claro u oscuro según el teléfono | Si `MINIAPP_URL` está configurada |
| **En el chat** | Una tarjeta que se actualiza: «Paso 2 de 7 ▰▰▱▱▱▱▱», la pregunta, un ejemplo y botones con las respuestas comunes (montos, Semanal/Quincenal/Mensual, Hoy/En una semana/1 de noviembre, «3 cuotas», «31 de diciembre · 2 cuotas», 3/5/10/15 personas, 0 %–2 %). También se puede escribir | Siempre («Responder aquí»), y es el único si no hay Mini App |

El bot no crea nada todavía: al confirmar muestra una vista previa, porque falta el contrato con el servicio externo (#5). El enganche es `crearNatillera(datos, ctx)` en las dependencias de `crearBot`.

## Decisiones

| # | Decisión | Por qué | Alternativa descartada |
|---|---|---|---|
| D-21 | **Botones en línea y una sola tarjeta que se edita.** Un botón edita la tarjeta en su lugar; una respuesta escrita quita los botones de la anterior y manda una nueva | El chat no se llena de preguntas y no quedan botones viejos a la mano | Un mensaje nuevo por pregunta |
| D-22 | **Un botón manda el mismo texto que la persona escribiría**, y pasa por la misma validación | Una sola regla por dato, botón o texto | Validar aparte los botones |
| D-23 | **Mensajes del motor con `parse_mode: 'HTML'`** (cambia D-14). Todo lo que escribió una persona pasa por `escaparHTML` | Negrillas en el avance y en el resumen | MarkdownV2: obliga a escapar casi todo |
| D-24 | **Las reglas de US-001 viven en `src/natillera/reglas.js`, sin dependencias de Node**, y las usan el bot y la Mini App | El formulario avisa lo mismo que el bot, y el bot **siempre vuelve a validar** lo que llega | Copiar las reglas en la Mini App |
| D-25 | **La Mini App se abre desde un botón del teclado de abajo y devuelve los datos con `sendData`** | Así no necesita servidor propio: Telegram le entrega los datos al bot como un mensaje. Con un botón dentro del mensaje haría falta un servidor que reciba los datos y valide `initData` | Botón en línea + servidor HTTP (depende de #6) |
| D-26 | **La Mini App es una página estática en `telegram/miniapp/`** que carga el design system y las reglas por ruta relativa: se sirve desde la raíz del repo | Cero compilación; los mismos tokens y componentes que la web | React o un bundler |
| D-27 | **Los límites viajan en la dirección de la Mini App** (`?cuotaMin=…&cuotaMax=…&moraMax=…`) | La página estática no puede leer el `.env`; el bot igual revalida | Un endpoint de configuración |
| D-28 | **El resumen se revisa completo antes de mostrarse y al confirmar** (`revisar`) | Corregir el inicio puede dejar mala la fecha final, y «hoy» cambia: el dato que dejó de servir se vuelve a preguntar con su error | Revisar solo campo por campo |
| D-29 | **Lo que no sirve del formulario se pregunta en el chat**, conservando lo demás | Nada se pierde si la Mini App manda un dato fuera de rango | Rechazar el formulario entero |

Otras reglas de US-001 que quedaron así:

- **Número de cuotas:** las fechas de cobro entre la primera y la final, ambas incluidas. La mensual se cuenta siempre desde la primera fecha, para que el día no se corra (31 ene → 28 feb → 31 mar). Quincenal = cada 15 días.
- **Primera cuota:** entre hoy y un mes después (hora de Bogotá). **Fecha final:** después de la primera y hasta un año después; tiene que dar al menos una cuota.
- **Cupo mínimo:** de 3 a 50 personas. **Mora:** de 0 % al máximo de la configuración.
- **Fechas escritas:** `15/11/2026`, `15-11-2026` o `15/11` (si ya pasó, el año siguiente).
- **El nombre único** lo revisa el servicio externo (#5).

## Publicar la Mini App

Telegram solo abre Mini Apps por **https**. La página es estática, así que basta con servir la **raíz del repositorio**.

**Opción A: GitHub Pages (recomendada para la demo).** En el repo: *Settings → Pages → Deploy from a branch*, la rama que se use en la demo y la carpeta `/ (root)`. Queda en:

```text
https://fintechfy-dev.github.io/openpayments-fintechfy/telegram/miniapp/
```

Esa URL va en `MINIAPP_URL` del `telegram/.env`. **Lo decide el equipo:** activar Pages publica todo el repo como sitio (ya es público).

**Opción B: túnel desde la laptop.** Servir la raíz del repo y abrir un túnel https:

```bash
# en la raíz del repo
python -m http.server 8080
cloudflared tunnel --url http://localhost:8080   # da una URL https://….trycloudflare.com
```

`MINIAPP_URL=https://….trycloudflare.com/telegram/miniapp/`. La URL cambia cada vez que se abre el túnel.

**Revisarla en el navegador:** con el servidor local, `http://localhost:8080/telegram/miniapp/` muestra el formulario y valida, pero no envía (eso solo pasa dentro de Telegram). `?tema=dark` muestra el modo oscuro.

## Cómo se probó

- `npm test`: 55/55. Nuevas: `test/reglas.test.js` (5), `test/crear.test.js` (11) y el motor con botones en `test/flujo.test.js` (10).
- La Mini App se cargó en Chrome sin ventana a 390 y 360 px de ancho, en claro y oscuro, y con límites distintos: todos los archivos responden 200, no hay desplazamiento horizontal y se manejó el formulario (sin nombre muestra el error; una fecha final antes del inicio muestra el error; un monto sugerido, Semanal y «−» actualizan el resumen; con todo bien queda listo para enviar).
- **Falta probar dentro de Telegram:** abrir la Mini App con una `MINIAPP_URL` real y comprobar que el bot recibe el formulario.

## Pendientes

- **Dónde publicar la Mini App** (Pages o túnel): decisión del equipo.
- **#5:** con el contrato, `crearNatillera` llama al servicio externo y el nombre repetido vuelve a la pregunta del nombre.
- **Modo demo:** la historia pide periodicidad en minutos para la demo. Hoy el reloj acelerado va en el servicio externo (plan del esqueleto, sección 5); si el equipo quiere escogerlo en el bot, se suma una periodicidad «Demo».
- **Tarjetas-imagen** (`TarjetaAporte`, `TarjetaBienvenida`) como foto en el chat: necesitan generar PNG en el servidor (una dependencia más). La Mini App ya muestra esos componentes en vivo.
