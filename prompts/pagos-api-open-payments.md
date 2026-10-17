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
