---
name: natillera-open-payments
description: Conocimiento de Open Payments (Interledger) para Natillera 2.0 - permisos GNAP, el cobro recurrente con un solo permiso, incoming payment, quote, outgoing payment, las 4 etapas que mira el jurado, la Test Wallet y el contrato que el servicio externo le pide a pagos/. Úsala cuando alguien pregunte cómo funciona un pago, un grant o la autorización de la billetera, cuando se diseñe o revise el servicio de pagos (pagos/), el retorno de la autorización al bot (US-005, US-005-INT) o el registro de pagos, o cuando falle un pago en la Test Wallet. En pagos/ explica y revisa, pero no escribe el código: la política de IA de la hackathon pide que el equipo lo escriba.
---

# Open Payments en Natillera 2.0

## Primero, la regla de la hackathon

**El código de `pagos/` lo escribe el equipo.** La política de IA lo pone como ejemplo de archivo con poca o ninguna IA y los mentores lo revisan línea por línea (`.claude/rules/ia-y-prompts.md`). En esa carpeta, Claude:
- **Sí:** explica conceptos y la API, responde dudas, revisa el código que escribió el equipo, ayuda a leer un error del SDK, propone pruebas o pasos para depurar.
- **No:** escribe archivos de `pagos/` ni entrega bloques de código listos para pegar. Si se lo piden, recuerda la regla y ofrece explicar el paso o revisar lo que escriban. Si el equipo decide usar IA de todos modos, que quede declarado con precisión en `AI_USAGE.md`.

Fuera de `pagos/` (bot, web, integración) puede escribir código que **consume** el servicio de pagos por su contrato.

## Las piezas

- **Wallet address** (payment pointer): URL pública de una billetera (`https://ilp.interledger-test.dev/<nombre>`). `GET` sobre ella da `authServer`, `resourceServer`, `assetCode` y `assetScale`.
- **Authorization server (GNAP):** emite permisos (*grants*). Un grant para `outgoing-payment` exige que la persona apruebe en su billetera (interacción).
- **Resource server:** donde se crean `incoming-payment`, `quote` y `outgoing-payment` con el token del grant.
- **Test Wallet:** `wallet.interledger-test.dev`, con saldo de práctica. Cada billetera del equipo y de los participantes de la demo vive ahí. La moneda la define cada billetera (`assetCode`/`assetScale`); no hay conversión en el corte de la hackathon: todas deben compartir moneda (US-005).

## El flujo de un cobro de cuota

SDK: `@interledger/open-payments` (cliente autenticado con `walletAddressUrl`, `keyId` y `privateKey` de la billetera de la natillera). Antes de usar una función, verifica su firma en el README y los tipos de la versión instalada (`node_modules/@interledger/open-payments`).

1. **Una sola vez por participante, al unirse (US-005):** grant de `outgoing-payment` sobre **su** billetera con `limits` y `interact`:
   - `limits.debitAmount`: tope total = cuota × número de cuotas.
   - `limits.interval`: intervalo ISO 8601 repetido (por ejemplo `R/2026-11-01T14:00:00Z/P1M`) para que el tope por periodo sea la cuota. **Esto es el riesgo SUP-001 (issue #3): pruébalo primero en la Test Wallet** antes de construir encima.
   - `interact.finish` con `method: 'redirect'`, la URI de retorno (la página web de "autorización completada") y un `nonce`. Al volver, verifica el `hash` del retorno con ese nonce antes de aceptarlo (hash verification).
2. **La persona aprueba en su billetera** (la URL `interact.redirect`) y vuelve con `interact_ref`. El servicio hace `grant.continue` y guarda el access token del grant (con su `manage` URL para rotarlo). El bot recibe "validado" (US-005-INT). Solo se aceptan retornos de solicitudes pendientes; aprobar dos veces cuenta como un solo permiso.
3. **Cada periodo (US-007), sin intervención de la persona:**
   - `incoming-payment` en la billetera de la natillera por el valor de la cuota.
   - `quote` sobre la billetera del participante con `receiver` = ese incoming payment.
   - `outgoing-payment` con el token del grant recurrente y el `quoteId`.
   - Si el token venció, se rota (`token.rotate`) antes de cobrar (US-007-INT); si no se puede, **no** se genera mora: se avisa al equipo y se pide reautorizar.
4. **Premios, liquidación y desembolsos:** pagos salientes desde la billetera de la natillera (o de la financiera) hacia la de cada persona, con su propio grant (sin interacción si la billetera es de la financiera).

## Las 4 etapas que mira el jurado

La demo debe mostrar un pago real con **Solicitud → Autorización → Ejecución → Finalización** (registro en la web, US-007-RPT). Mapeo sugerido para que todos usen los mismos nombres:

| Etapa | Qué pasó en Open Payments |
|---|---|
| Solicitud | Se creó el incoming payment (o se pidió el grant) |
| Autorización | Hay un grant vigente con su token |
| Ejecución | Se creó el quote y el outgoing payment |
| Finalización | El outgoing payment terminó y el incoming payment quedó completo |

Un fallo se reporta con la etapa donde ocurrió y un motivo en palabras simples ("Fondos insuficientes", "Autorización vencida", "Billetera no encontrada", "Límite de la autorización alcanzado").

## El contrato con el servicio externo

El servicio externo de lógica financiera le pide a `pagos/` cuatro operaciones (`docs/discovery/4-logica-financiera/apis/open-payments.api.json`), con `X-Api-Key`: `POST /cobrar-cuota`, `/cobrar`, `/pagar` y `/desembolsar`. `pagos/README.md` es el documento vivo del frente; si el contrato cambia, se cambia ahí y en ese JSON en el mismo PR.

## Secretos

La llave privada de la billetera (`privateKey`), su `keyId` y la `X-Api-Key` van en `pagos/.env`, nunca en el repo ni en un log. Los tokens de los grants son secretos también: no van en logs, mensajes del bot ni en el registro que ve el jurado (ahí va el id del recurso, no el token).

## Documentación

- Conceptos y flujo: https://openpayments.dev (sección de grants y del flujo de un pago).
- SDK de Node: el README de `@interledger/open-payments` (`npm view @interledger/open-payments readme`) y sus tipos.
- Extensión de VS Code «Open Payments SDK Snippets» (`op-grant-op`, `op-quote-create`, `op-op-create`): útil para que el equipo escriba el código a mano.
