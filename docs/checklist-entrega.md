# Checklist de entrega contra el repo

La checklist del equipo es la [página de la checklist](https://lemon-field-03774490f.1.azurestaticapps.net/#hoy): ahí se marcan los ✓ y los responsables. Su contenido se leyó el 15 de octubre de los documentos oficiales; si la organización publica cambios, manda lo que diga ella.

Este documento hace otra cosa: dice **qué muestra el repo** de cada punto, para saber qué falta antes de cada commit y de cada PR. Lo que se puede comprobar con código lo revisa el script:

```bash
node scripts/revisar-entrega.mjs          # revisión completa
node scripts/revisar-entrega.mjs --rama   # además, lo que le falta al diff de tu rama contra develop
```

Sale con código 1 solo si encuentra un secreto o un `.env` versionado. El resto son avisos. La regla `.claude/rules/checklist-entrega.md` pide correrlo y actualizar este documento en cada commit y PR.

**Contrastado:** viernes 16 de octubre, 16:05 (hora de Bogotá), sobre `develop` en `a719c8b` (con #49, #50 y #51).

**Estados:** ✅ hecho, con evidencia en el repo · ⚠️ a medias · ❌ falta · 👥 depende de personas y no se ve en el repo: se marca en la página · ❓ pregunta abierta para la organización · ℹ️ dato

## Lo que falta, por urgencia

1. ❌ **Nada usa todavía la API de Open Payments** (`b-op`, `c-op`). `pagos/` solo tiene su README y ningún `package.json` depende de `@interledger/open-payments`. Sin esto el proyecto no entra a evaluación ni a premios. #3 (cobro recurrente con un permiso) y #4 (servicio de pagos) **no tienen responsable**, y ya pasó el checkpoint de las 15:00. Además, según `integracion/README.md` (diferencia 6), en staging la API de pagos del servicio externo apunta a `https://natillera-bff.example`, que no existe, y puede estar en modo de prueba: hay que configurarla en modo real con la URL pública del servicio de pagos, o no se mueve dinero real.
2. ❌ **Sin evidencia de un pago de punta a punta** (`b-primer-pago`, `b-evidencia`, `s-video`). El video debe mostrar la solicitud, la autorización en la billetera, la ejecución y la finalización exitosa.
3. ⚠️ **Ningún issue del frente Pagos tiene responsable**: #3, #4, #12, #15, #20 a #23, #25, #28, #30 y #31. Tampoco #11 (release de entrega), #14 (secretos), #37 (guion con 4 billeteras) ni #38 (entregables del repositorio).
4. ⚠️ **El checkpoint de las 15:00 no dejó registro** (`b-checkpoint`). Si se recortó algo, hay que anotarlo en `docs/plan-de-trabajo.md` y en los issues `recorte *`.
5. ⚠️ **`AI_USAGE.md` tiene 3 secciones por completar**: el código de la hackathon, los archivos con poca o ninguna IA y lo que hizo el equipo. También falta el modelo de ChatGPT usado para el logo (`s-aiusage`).
6. ⚠️ **Al README le faltan "Cómo usa Open Payments" y "Correr la demo"** (`s-readme`).
7. ❓ **La rama por defecto de GitHub es `develop`, no `main`.** El jurado abre el enlace del repositorio y ve la rama por defecto. Al fusionar `release/entrega` el sábado, decidir si se cambia a `main` o si se deja `develop` igual a `main` (`s-main`, #11).
8. ❌ **No hay presentación ni video en el repo** (`hoy-slides-faltan`, `s-slides`, `s-subir`). La plantilla oficial no trae las diapositivas de usuario, uso de Open Payments ni aprendizajes.

## Hoy (jueves 15)

| Id | Tipo | Punto | En el repo |
|---|---|---|---|
| `hoy-equipo` | Exigido | Somos 4, mayores de 18, cada uno en un solo equipo | 👥 El README nombra a Estiven, Juan Rafael, Johan y Willy |
| `hoy-guia` | Exigido | Los 4 leyeron la Guía de supervivencia (mínimo el capítulo 03) | 👥 |
| `hoy-slack` | Exigido | Los 4 están en el Slack de Interledger | 👥 |
| `hoy-roles` | Plan | Repartir los roles | ⚠️ Telegram (Estiven) y Web (Johan) tienen issues asignados. Pagos, el video, la presentación y quién lleva `AI_USAGE.md` no tienen responsable en GitHub |
| `hoy-repo` | Plan | Repositorio de la hackathon vacío hasta el viernes 10:30 | ✅ Primer commit: viernes 16, 11:32 (`16fcc32`) |
| `hoy-gitignore` | Recomendado | Proteger los secretos desde el primer commit | ✅ `.gitignore` excluye `.env*`, `*.pem` y `*.key`. Hay `.env.example` en `web/` y en `telegram/`. Falta en `pagos/` cuando tenga código |
| `hoy-wallets` | Recomendado | Cuentas de prueba en la Test Wallet: administrador, Ana, Beto y Carla (sin fondos) | 👥 Las direcciones no están anotadas en el repo; el guion es #37 |
| `hoy-wallet-grupo` | Recomendado | Billetera del grupo a nombre de la financiera | ❌ #15 abierto, sin responsable |
| `hoy-moneda` | Plan | Anotar la moneda de la Test Wallet (riesgo R-02) | ❌ Sigue como supuesto en `docs/discovery/3-bdd/risk-analysis.md:8` |
| `hoy-claves` | Recomendado | Claves de desarrollador de la billetera, fuera del repo | 👥 No hay claves en el repo ni en el historial (ver `s-secretos`) |
| `hoy-recurrente` | Recomendado | Leer cómo se pide un permiso de pago saliente con tope e intervalo | ⚠️ Está explicado en la skill `natillera-open-payments`, pero la prueba (#3) no se ha hecho |
| `hoy-laptops` | Recomendado | Node, Git y la extensión de snippets de Open Payments | 👥 |
| `hoy-bot` | Recomendado | Crear el bot con BotFather | ✅ Lo creó Estiven (`AI_USAGE.md`, "Lo que hizo el equipo"); el token no está en el repo |
| `hoy-plantilla` | Recomendado | Copiar la plantilla oficial y llenar portada y equipo | 👥 |
| `hoy-slides-faltan` | Exigido | Agregar las diapositivas de usuario, uso de Open Payments y aprendizajes | ❌ No hay presentación en el repo |
| `hoy-discovery` | Plan | Paquete del discovery en `docs/`, si un mentor lo aprueba | ⚠️ Está en `docs/discovery/`, marcado como diseño previo en el README. No hay constancia de que un mentor lo aprobara (ver `ask-docs`) |
| `hoy-redondeo` | Plan | Regla de redondeo del sobrante de la liquidación | ❌ Sigue abierta: `docs/discovery/3-bdd/SHARED-MEMORY.md:896` |

## Viernes 16

| Id | Tipo | Punto | En el repo |
|---|---|---|---|
| `vie-laptop`, `vie-documento`, `vie-llegar` | Exigido / por confirmar | Laptop, documento y llegada a Ruta N | 👥 |
| `vie-bienvenida` | Dato | Mesa de mentores y canal de Slack | ℹ️ |
| `ask-hora` | Por confirmar | ¿Video y presentación cierran a las 11:00 o a las 12:00? | ❓ Sin respuesta anotada. Plan seguro: antes de las 11:00 |
| `ask-donde` | Por confirmar | ¿Drive, repositorio o ambos? | ❓ Plan seguro: los dos |
| `ask-demo` | Por confirmar | ¿La demo puede correr desde nuestro equipo? | ❓ El servicio externo corre en staging (`integracion/README.md`). El bot ya no necesita URL pública: lee los avisos del flujo en vivo de staging desde cualquier laptop (`telegram/src/avisos/`, rama `feature/telegram-5-integracion-staging`). Falta decidir dónde corre el servicio de pagos, que sí necesita una URL pública HTTPS para que staging lo llame |
| `ask-docs` | Por confirmar | ¿Se puede subir el discovery hecho antes? | ❓ Ya está subido; si dicen que no, se retira antes de las 11:00 del sábado |
| `ask-ronda1` | Por confirmar | ¿Presentan todos en la Ronda 1? | ❓ Plan seguro: estar listos |
| `b-primer-commit` | Exigido | Primer código y primer commit después de las 10:30 | ✅ 11:32 del viernes |
| `b-op` | Exigido | El proyecto usa la API de Open Payments | ❌ Ver "Lo que falta", punto 1 |
| `b-primer-pago` | Recomendado | Lo primero: un pago de punta a punta | ❌ #3 abierto |
| `b-prompts` | Exigido | Prompts reales desde el primer minuto | ✅ 10 archivos en `prompts/` con el texto literal; cada PR agrega los suyos |
| `b-servicio` | Recomendado | El servicio de Open Payments con poca IA | ⚠️ Aún no existe. La regla `ia-y-prompts.md` dice que lo escribe el equipo y Claude solo explica y revisa; el hook `.claude/hooks/guardia-edicion.mjs` le impide a Claude escribir código en `pagos/` |
| `b-revisar-ia` | Recomendado | Revisar y probar lo que genera la IA | ✅ La web y el bot tienen pruebas (`npm run verificar` en `web/`, `npm test` en `telegram/`) y revisiones con hallazgos corregidos (PR #49). GitHub las corre en cada PR (`.github/workflows/calidad.yml`) y Claude no puede cerrar un turno con pruebas en rojo (`.claude/hooks/verificar-al-parar.mjs`) |
| `b-push` | Plan | Subir cambios seguido | ✅ Del #1 al #51, todo entra por PR a `develop` |
| `b-evidencia` | Plan | Evidencia de cada pago real de prueba | ❌ No hay pagos todavía |
| `b-checkpoint` | Plan | 15:00, checkpoint de alcance | ⚠️ Ver "Lo que falta", punto 4 |
| `b-noche` | Dato | En la noche se puede seguir desde casa | ℹ️ |

## Sábado 17

| Id | Tipo | Punto | En el repo |
|---|---|---|---|
| `s-congelar` | Plan | 10:30: congelar y revisar entregables | Pendiente: correr el script y este documento a las 10:30 |
| `s-publico` | Exigido | El repositorio es público | ✅ `gh repo view` dice `PUBLIC`. Confirmarlo también en una ventana sin sesión |
| `s-main` | Exigido | Todas las ramas integradas en la principal y todo subido | ❌ `develop` lleva 44 commits que no están en `main`; se integran con `release/entrega` (#11). Ver también "Lo que falta", punto 7 |
| `s-aiusage` | Exigido | `AI_USAGE.md` en la raíz, con herramientas, partes y archivos sin IA | ⚠️ Existe; le faltan las secciones del punto 5 |
| `s-prompts` | Exigido | Prompts en `/prompts`, texto real | ✅ |
| `s-readme` | Plan | README con la natillera, la demo y los secretos | ⚠️ Faltan "Cómo usa Open Payments" y "Correr la demo"; la sección de secretos ya está |
| `s-secretos` | Recomendado | Ninguna clave ni token en el repo ni en su historial | ✅ El script revisó el historial completo de todas las ramas: sin archivos `.env` ni claves, ni tokens de Telegram, GitHub o llaves de API |
| `s-video` | Exigido | Video de un pago de punta a punta | ❌ |
| `s-slides` | Exigido | Presentación final: reto, usuario, solución, Open Payments y aprendizajes | ❌ |
| `s-subir` | Exigido | Video y presentación en Drive, con copia en el repo | ❌ No hay carpeta para la copia; propuesta: `docs/entrega/` |
| `s-demo-link` | Exigido | Enlace a la demo a mano | ❌ |
| `s-form` | Exigido | Enlace del repo en el formulario de Slack | 👥 |
| `s-opcional` | Recomendado | Diagrama, maquetas, documentación técnica | ✅ Diagrama en `docs/plan-de-trabajo.md`, `design-system/` y `docs/discovery/` |
| `s-freeze` | Exigido | Después de las 11:00 nadie toca el código | Pendiente |
| `p-ensayo`, `p-sala`, `p-voto`, `p-cierre` | Dato | Ensayo, sala, voto y cierre | ℹ️ |
| `p-5min` | Exigido | Cronometrar 5 minutos con presentación y demo | 👥 |
| `p-planb` | Plan | Plan B: la corrida grabada, dicha como grabación | ❌ Depende de `s-video` |
| `p-ronda2` | Exigido | Listos para la Ronda 2 de inmediato | 👥 |

## Siempre: los 8 criterios del jurado

Lo que el repo ya permite mostrar de cada criterio, para armar la presentación.

| Id | Criterio | Qué hay hoy |
|---|---|---|
| `c-problema` | Definición del problema | ✅ README, "El problema" |
| `c-op` | Uso de Open Payments | ❌ Ver "Lo que falta", punto 1 |
| `c-ux` | Experiencia de usuario | ⚠️ El bot ya crea la natillera con botones o con la Mini App (US-001) y la web muestra natilleras, créditos, pagos y bitácora con datos de prueba. Falta unirse, autorizar y ver aportes reales |
| `c-tecnica` | Calidad técnica | ⚠️ Pruebas en la web y el bot. "Sin doble cobro" (#21) y "token vigente antes de cada cobro" (#22) no existen porque no hay cobros |
| `c-presentacion` | Presentación | ❌ No hay presentación |
| `c-inclusion` | Inclusión (Premio Puntored) | ⚠️ El README lo plantea (nadie del grupo custodia el dinero), pero falta escribirlo para la presentación |
| `c-innovacion` | Innovación | 👥 |
| `c-impacto` | Impacto | 👥 |

## Siempre: conducta y premios

`cc-leido`, `cc-parar`, `cc-lenguaje`, `cc-fotos`, `cc-reportar`, `pr-uno` y `pr-banco` dependen de personas (👥). Para el repo aplica `cc-lenguaje`: los textos del bot, la web y la presentación siguen `design-system/docs/voz-y-tono.md`, sin «chicos» para grupos mixtos y sin asumir pronombres.

## Hitos

| Cuándo | Qué |
|---|---|
| Viernes 08:30 | Registro en Ruta N |
| Viernes 10:30 | Arranca la construcción |
| Viernes 15:00 | Checkpoint de alcance |
| Viernes 17:30 | Salida del viernes |
| Sábado 07:00 | Registro del sábado |
| Sábado 10:30 | Congelar y revisar |
| Sábado 11:00 | Cierre del código |
| Sábado 12:00 | Ronda 1 |
| Sábado 14:30 | Finalistas y Ronda 2 |
| Sábado 16:30 | Ganadores |

## Avisos de la checklist

- Las horas de carga no coinciden: el sitio dice antes de las 11:00 y el PDF dice entre 11:00 y 12:00. Se sube todo antes de las 11:00.
- Cada sala de jurado usa una sola laptop, así que el video de la demo es obligatorio en la práctica.
- La plantilla oficial no trae todo lo que se evalúa.
- Los prompts van con su texto real desde el primer minuto.
- El repositorio es público: la clave privada de la billetera y el token del bot no entran nunca, ni en un commit viejo.

## Cómo se mantiene

- Si cambia la checklist de la página, se actualizan este documento y los `HITOS` de `scripts/revisar-entrega.mjs`. Se conservan los ids: son los mismos de la página.
- Cuando un PR cumple un punto, en ese mismo PR se cambia su estado y se cita la evidencia (archivo, commit o PR).
- Las respuestas de la organización a las preguntas `ask-*` se anotan en su fila, con la hora y quién respondió.
