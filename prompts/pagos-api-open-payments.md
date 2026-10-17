# Pagos: API de Open Payments

- **Herramienta:** Claude Code (Claude Opus 5.5), en una sola sesión, sin subagentes.
- **Fecha:** viernes 16 de octubre de 2026. Las horas son aproximadas (hora de Bogotá), tomadas de los comandos que corrió la sesión.
- **Resultado:** `pagos/` (código, pruebas, `API.md`) y la API publicada en Azure (`natillera-pagos`).

Los prompts van tal cual los escribió Willy, con sus errores de tipeo. Donde Claude hizo una pregunta con opciones, se copia la pregunta y la opción elegida, porque la respuesta es el prompt.

## 1. El pedido (~17:05)

```text
necesito crear una nueva api que implemente 

https://github.com/interledger/open-payments

y que use como ejemplo lo que ya hice en el playground del proyecto del motor 


E:\git\MotorCredito2026\dotnet-backend

necesitatmos publicar un api en azure para poder comunicarnos con interledger 

si tienes dudas dimelas pero comencemos con eso
```

Antes de escribir código, Claude señaló tres choques:

- El plan vigente ponía los pagos en el backend de la web, escritos a mano por Johan, y la guardia de Claude bloquea `pagos/`.
- El laboratorio del servicio externo es código previo al evento: se puede leer, pero no copiar.
- Lo que se necesita es un cliente de Open Payments, no implementar el estándar.

Después hizo tres preguntas:

> **¿Quién escribe el código de la API de pagos?** → «Yo lo escribo, se declara» (API aparte en `pagos/`, quitando el candado de la guardia solo para esa carpeta y declarándolo en `AI_USAGE.md`).
>
> **¿En qué cuenta de Azure la publicamos?** → «Patrocinio (la del checklist)».
>
> **¿En qué lenguaje la hacemos?** → «Node con el SDK oficial (Recomendado)».

## 2. Más contexto (~17:35)

```text
https://openpayments.dev/overview/getting-started/

aca mas info para la implementacion que necesitamos para esta hackthon
```

La página resultó ser una introducción general. La implementación siguió los tipos del SDK `@interledger/open-payments` 7.4.0 instalado y la página de verificación del hash de openpayments.dev.

## 3. Azure y las llaves (~18:25)

> **¿Creo esos recursos en Azure (Patrocinio) y despliego la API?** → «Sí, con B1 (Recomendado)».
>
> **¿Dónde están las Developer Keys de la billetera del grupo (Key ID y private.key)?** → respuesta libre:

```text
entran como parametros siempre
```

Claude preguntó qué significaba eso, porque cambiaba el diseño:

> **¿Cómo entran el Key ID y la llave privada?** → «En cada llamada» (quien llama manda wallet, Key ID y llave privada en cada solicitud y la API no guarda ninguna).

Claude avisó dos consecuencias y las resolvió así:

- La vuelta del permiso no puede terminarlo, porque la abre el navegador del participante, que no tiene las llaves. El permiso se termina cuando el bot consulta el estado con las llaves.
- El token de un permiso queda atado a la llave que lo pidió, así que el bot y staging tienen que mandar la misma.

## 4. La vuelta del permiso la manda el bot (~19:00)

```text
para que necesita el api de openpayment el bot usuario?
```

Claude explicó que solo se usaba para redirigir al participante a `https://t.me/<bot>?start=permiso_<id>` después de aprobar, y propuso que el bot mandara su propia dirección de vuelta en cada `POST /api/permisos`.

```text
cambiala asi
```

Resultado: `BOT_USUARIO` sale de la configuración y `POST /api/permisos` recibe `vuelta` (solo https, con `{permisoId}` como comodín). Sin `vuelta`, el navegador ve una página que dice que ya puede cerrar la ventana.

## 5. Swagger (~19:10)

```text
listo mergeado, ahora quiero que instales swagger para esta api  para poderla implementar
```

Resultado: el contrato OpenAPI 3.0 se arma desde la tabla `REGLAS` de `src/operaciones.js`, que también valida los cuerpos. Swagger UI queda en `/docs`, servido desde `swagger-ui-dist` 5.33.0 sin CDN. Las pruebas de contrato usan `@apidevtools/swagger-parser` 13.1.0 y revisan que el OpenAPI sea válido, la paridad de rutas en las dos direcciones y que los ejemplos sean aceptados. Se eligieron versiones publicadas hace más de dos semanas.

## 6. Pagos entre monedas (~22:20)

Los primeros cobros reales de staging fallaron con `422`: las billeteras de los participantes estaban en euros y dólares, y la del grupo en pesos. Claude explicó que Open Payments sí paga entre monedas con la cotización y que el bloqueo era una regla de esta API.

```text
pero open payment puede hacer pagos en diferentes monedas? que debe de pasar para poder hacer transferencias en diferentes monedas? en que fallamos?
```

Entre las opciones que propuso Claude, el equipo eligió:

```text
Que la API convierta monedas
```

Resultado: antes de cambiar el código, Claude comprobó con cotizaciones reales en la Test Wallet, sin pagos salientes, que hay tasa entre EUR, USD y COP (50.000 COP al grupo costaban 15,08 EUR o 15,74 USD). Los montos siguen en pesos, la moneda del grupo. Si quien recibe está en pesos, el cobro fija el monto; si quien paga está en pesos, la cotización fija lo que sale; si ninguno, el grupo cotiza la referencia sin pagar. El tope de un permiso en otra moneda se cotiza y lleva la mitad de margen por la comisión fija de cada pago. Hay 5 pruebas nuevas con tasas falsas, y cada una de tres roturas a propósito (siempre fijar al recibir, no cerrar el cobro, no convertir el tope) hizo fallar al menos una.

## 7. Prueba en Postman (17 de octubre, madrugada)

```text
necesito que hagamos una prueba en postman de la implementacion de esta api, haz una prueba postman
```

Resultado: Claude generó, con un script, una colección de Postman (formato v2.1, importable en la app) y su ambiente con las llaves vacías. Tiene cinco carpetas: salud y contrato, seguridad, permisos (pide y cancela), lecturas, y las 6 operaciones de staging aparte porque mueven dinero. La corrió con la CLI de Postman 1.74.0 contra la API publicada, con las llaves en un ambiente temporal fuera del repo: 22 solicitudes, 51 verificaciones y 0 fallas.
