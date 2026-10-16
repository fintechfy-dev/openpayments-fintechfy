# Regla: la checklist de entrega en cada commit y cada PR

La hackathon se pierde por lo que nadie miró a tiempo: una entrega sin pago de Open Payments, sin video o con `AI_USAGE.md` a medias no se evalúa, aunque el código esté bien. La checklist del equipo es la [página de la checklist](https://lemon-field-03774490f.1.azurestaticapps.net/#hoy), y su contraste con el repo está en `docs/checklist-entrega.md`.

**Antes de cada commit y de cada PR:**

1. Corre `node scripts/revisar-entrega.mjs --rama`. Si sale con código 1 (un secreto o un `.env` versionado), no hay commit hasta corregirlo. Si el secreto ya se subió, aplica `secretos.md`.
2. Lee "Lo que falta, por urgencia" en `docs/checklist-entrega.md` y mira el próximo hito que imprime el script.
3. Si el cambio cumple o avanza un punto, actualiza en el mismo commit su fila en `docs/checklist-entrega.md` (estado y evidencia: archivo, commit o PR) y la lista "Lo que falta".
4. Al reportar el commit o el PR, cierra con lo que sigue faltando: los avisos del script más los puntos ❌ y 👥 que vencen antes del próximo hito, en una lista corta. En el PR va en una sección **Checklist de entrega**.

**Cómo se lee:**

- Lo que el script no puede ver (Slack, billeteras, video, presentación, formulario) se marca en la página, no en el repo. No lo des por hecho porque no aparezca en el script.
- Un ✅ de `docs/checklist-entrega.md` vale lo que valga su evidencia. Si al revisar ya no se cumple (por ejemplo, alguien quitó el `.env.example`), se baja el estado y se avisa.
- Si la página o la organización cambian un punto o una hora, se actualizan el documento y los `HITOS` del script, y se conservan los ids.
