# Telegram: integración del bot con staging (#5)

Prompts reales de Estiven, copiados tal cual. La hora (de Bogotá) es aproximada: sale del reloj de la máquina al cerrar la sesión de Claude Code.

## 2026-10-16 · Claude Code (Claude Opus 5.5)

Primero se pidió una revisión de los mapas de integración (sin cambios en el código):

```text
/director web revisa el mapa de integracion para telegram
```

Después, la integración del bot. No se usaron subagentes.

21:00 (aprox.)

```text
no, solo trabajemos lo del bot, en telegram, hagamos la integracion
```

Configuración del `.env` y primera prueba contra staging (el log pegado iba con el último prompt; no tenía secretos):

```text
Tengo el token de sesiony la api en sandbox, explicame como para quey con que lleno los .env
```

```text
cesto me dio cuando intente crear la natillera
```

```text
es el mismo servicio externo token
```

Contraste con el OpenAPI del ecosistema (webhook por evento, cascadas del flujo en vivo, rechazos con 400, montos como texto):

```text
lee eset curl curl -H "Authorization: Bearer $TOKEN" https://sandbox-staging.corebank.ai/api/ecosystems/FND-20261015-natillera-2/openapi > FND-20261015-natillera-2.openapi.json esta la especificacion de la conexion al backend, recuerda solo resolvemos lo de telegram
```
