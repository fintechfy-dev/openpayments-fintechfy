# Regla: secretos

El repo es **público** y se entrega a un jurado. Un secreto subido es un secreto publicado, aunque se borre después: queda en el historial y en los clones.

- Claves de Open Payments, token del bot, token del servicio externo, llaves entre el bot, la web y staging, y el secreto de firma de los avisos: solo en `.env` / `.env.local` de cada carpeta (ignorados por git). Los tokens de los permisos de Open Payments van en la base del backend de la web. Cada carpeta tiene su `.env.example` con los nombres, sin valores.
- En la web, ninguna variable secreta lleva prefijo `NEXT_PUBLIC_` (ese prefijo la mete en el JavaScript del navegador) y solo se leen en el código de servidor que autoriza ESLint (`web/eslint.config.mjs`: hoy `src/lib/servicio/`, `src/lib/sesion/` y `src/proxy.ts`; el backend de Open Payments se agrega a esa lista).
- Nunca se escribe un secreto en código, logs, mensajes del bot, prompts guardados, issues ni descripciones de PR. Los prompts de `prompts/` se copian tal cual: **si un prompt contenía un secreto, se reemplaza por `<SECRETO OMITIDO>`** y se avisa al equipo.
- Si alguien pega un secreto en el chat con Claude: avisarle de inmediato que quedó en el historial y debe rotarlo, usarlo solo si es imprescindible para la tarea en curso y pedir que en adelante viaje por variable de entorno.
- Antes de cada commit, revisa el árbol preparado: `git diff --cached | grep -inE "key|secret|token|password|BEGIN .*PRIVATE"`. Si se sube uno por error: avisar al equipo y rotar la clave antes de las 11:00 del sábado (US-002-SEC).
