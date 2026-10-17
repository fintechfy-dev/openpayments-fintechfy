# API de pagos (Open Payments)

Lo único del sistema que habla con Open Payments. Staging la llama para cobrar y pagar, y el bot para pedir los permisos de cada participante. Vive aparte de la web y está publicada en Azure:

**`https://natillera-pagos.azurewebsites.net`**

Decisiones del 16 de octubre, en la tarde:

- Es una API propia en `pagos/`, en Node con el SDK oficial `@interledger/open-payments` 7.4.0.
- La escribió Claude Code y así queda declarada en `AI_USAGE.md` y en `prompts/pagos-api-open-payments.md`. Esto reemplaza el plan de que la escribiera Johan a mano en el backend de la web.
- **Las llaves de Open Payments llegan en cada llamada**, no viven en la API (ver [Llaves](#llaves-de-open-payments)).

El laboratorio `playground/open-payments-lab` del servicio externo se leyó como referencia del flujo. Su código no se copió.

## Rutas

| Quién llama | Ruta | Llave | Llaves de Open Payments |
|---|---|---|---|
| Staging | `POST /api/open-payments/{cobrar-cuota, cobrar, pagar, desembolsar, pagar-con-permiso, aportar-con-permiso}` | `X-Api-Key` = `API_KEY_STAGING` | Sí |
| Bot | `POST /api/permisos` con `{ tipo, wallet, monto, referencia }` → `201 { permisoId, urlAprobacion }` | `X-Api-Key` = `API_KEY_CLIENTES` | Sí |
| Bot | `GET /api/permisos/{permisoId}` → `{ estado, grantId, motivo }` | `API_KEY_CLIENTES` | Sí, la primera vez después de la vuelta |
| Bot | `POST /api/permisos/{permisoId}/cancelar` | `API_KEY_CLIENTES` | Sí, si estaba aprobado |
| Navegador del participante | `GET /api/permisos/{permisoId}/retorno` | Pública | No |
| Bot y web | `GET /api/avisos?desde=<cursor>` → `[{ id, evento, contractId, templateName, datos, recibido }]` | `API_KEY_CLIENTES` | No |
| Web | `GET /api/registro` → los pagos con sus cuatro etapas | `API_KEY_CLIENTES` | No |
| Cualquiera | `GET /api/salud` → `{ ok, almacen, walletGrupo, walletFinanciera, simuladas }` | Pública | No |

Los cuerpos y las respuestas de staging son los de [`README.md`](README.md): `/cobrar-cuota` responde `{ periodo, monto }` y las demás `{ monto }`, con el monto exacto que llegó.

**Tipos de permiso:**

- `recurrente`: cuotas, deuda y actividades.
- `un-solo-uso`: compra y devolución.
- `grupo` y `financiera`: las billeteras de las que salen premios, liquidación y préstamos (#67). Estos dos no llevan `wallet`, porque usan `OP_WALLET_GRUPO` y `OP_WALLET_FINANCIERA`.

Ningún permiso lleva intervalo: el tope es total y lo manda el bot en `monto`, en pesos.

## Llaves de Open Payments

Cada llamada que le habla a Open Payments trae las llaves de la billetera cliente de la app (la que tiene las *Developer Keys* en la Test Wallet):

| Encabezado | Valor |
|---|---|
| `X-OP-Wallet-Address` | La dirección de la billetera cliente (`https://ilp.interledger-test.dev/...` o `$ilp.interledger-test.dev/...`) |
| `X-OP-Key-Id` | El *Key ID* |
| `X-OP-Private-Key` | El archivo `private.key` en base64: `base64 -w0 private.key`, o en PowerShell `[Convert]::ToBase64String([IO.File]::ReadAllBytes("private.key"))` |

Si staging no puede mandar encabezados, los mismos datos pueden ir en el cuerpo como `opWalletAddress`, `opKeyId` y `opPrivateKey` (este último en base64 o como PEM). La API los quita del cuerpo antes de validarlo y antes de calcular la idempotencia.

- **No se guardan:** ni en Table Storage ni en los logs. El cliente armado con ellas vive unos minutos en memoria y se pierde al reiniciar. Cada permiso guarda solo la *huella* de su llave (dirección + Key ID, en hash), nunca la llave.
- **El token de un permiso queda atado a la llave que lo pidió.** El bot y staging tienen que mandar **la misma** llave. Si no, la API responde `422` («se pidió con otra llave») en vez de dejar que falle en la billetera.
- **Por qué la vuelta no termina el permiso:** la abre el navegador del participante, que no tiene las llaves. La vuelta solo verifica el hash y redirige a `https://t.me/<bot>?start=permiso_<permisoId>`. El permiso se termina cuando el bot consulta `GET /api/permisos/{permisoId}` con las llaves, que es lo que ya hace al recibir ese `/start`.

## Errores

El servicio externo no lee el cuerpo de un error: al contrato le llega `http-<código>`. Por eso cada código dice algo por sí solo.

| Código | Qué pasó | ¿Staging reintenta? |
|---|---|---|
| `400` | Cuerpo inválido o faltan las llaves de Open Payments | No |
| `401` | Falta `X-Api-Key` o no es la correcta | No |
| `402` | Sin fondos o tope del permiso superado | No (el participante recarga y se intenta otra vez) |
| `403` | El permiso no existe, no está aprobado o no se pudo renovar su token | No |
| `404` | Operación o permiso desconocido | No |
| `422` | Datos que no cuadran: otra billetera, otra llave, monedas distintas o una billetera que no existe | No |
| `502` | Open Payments falló | Sí |
| `503` | El pago sigue en curso | Sí, y el reintento recibe el resultado |

**Idempotencia:** la llave es la ruta más el cuerpo completo, sin las llaves de Open Payments, y dura 5 minutos. Mientras el pago sigue, el reintento recibe `503`. Solo se guarda un pago exitoso.

**Tiempo:** si en unos 20 segundos el cobro no se confirma, la API responde `503` y sigue consultando por detrás hasta 3 minutos.

## Avisos y registro

Al terminar cada pago se agrega un aviso `PagoCompletado` o `PagoFallido` con `{ tipo, referencia, monto, periodo?, motivo?, simulado? }`. El `tipo` puede ser `cuota`, `deuda`, `actividad`, `premio`, `liquidacion`, `desembolso`, `venta` o `comision`.

Dos casos comparten ruta y no se distinguen por el cuerpo, así que se rotulan como el de la demo:

- `/pagar` con `origen` sale como `premio`, aunque sea una comisión devuelta.
- `/pagar` sin `origen` sale como `liquidacion`, aunque sea un reembolso.

El bot lee estos avisos aquí, aparte de los de staging que recibe la web, y guarda su propio cursor.

`/api/registro` devuelve cada pago con sus etapas `solicitud`, `autorizacion`, `ejecucion` (con los ids del cobro, la cotización y el pago saliente) y `finalizacion`.

## Correrla

```bash
cd pagos
npm install
npm test          # 32 pruebas con un Open Payments falso, sin red
cp .env.example .env   # llenar
npm run dev
```

Sin `TABLA_CONEXION`, todo queda en memoria. Si falta configuración, la API arranca igual y responde `503` diciendo qué falta.

## Azure

Suscripción Patrocinio, grupo `rg-natillera-pagos`: se borra completo después del evento.

| Recurso | |
|---|---|
| App Service `natillera-pagos`, plan `plan-natillera-pagos` B1 Linux, Node 24, Central US | Una sola copia, siempre encendida (Always On) y solo HTTPS. En eastus2 no había cuota de B1 |
| Storage `stnatillerapagos`, tabla `pagos` | Permisos con sus tokens, pagos, avisos e idempotencia |

La configuración vive en la App Service: `API_KEY_STAGING` y `API_KEY_CLIENTES` (generadas al azar), `TABLA_CONEXION`, `URL_PUBLICA`, `BOT_USUARIO`, `OP_WALLET_GRUPO`, `OP_WALLET_FINANCIERA` y `OPERACIONES_SIMULADAS`. Para ver las llaves: Portal → `natillera-pagos` → *Configuración* → *Variables de entorno*.

Para desplegar, con la suscripción de Patrocinio activa: si la cuenta activa es otra, Kudu responde 403.

```bash
cd pagos
tar -a -c -f pagos.zip package.json package-lock.json src   # tar.exe de Windows
az account set --subscription <Patrocinio>
az webapp deploy -n natillera-pagos -g rg-natillera-pagos --src-path pagos.zip --type zip
```

## Lo que cambia para cada uno

- **Estiven (bot):**
  - `PAGOS_URL` = `https://natillera-pagos.azurewebsites.net`.
  - En `/api/permisos` va `X-Api-Key: API_KEY_CLIENTES` más los tres encabezados `X-OP-*`.
  - Con el `/start permiso_<id>`, el `GET /api/permisos/{id}` lleva las llaves.
  - Los avisos de pago se piden aquí (`/api/avisos`), con su propio cursor.
- **Willy (staging):**
  - Dirección base de la API de pagos: `https://natillera-pagos.azurewebsites.net/api/open-payments`.
  - Credencial: `API_KEY_STAGING`.
  - Los tres encabezados `X-OP-*` con **la misma** llave que usa el bot.
  - Antes del modo real, aprobar los permisos `grupo` y `financiera` (#67).
- **Johan (web):** la pantalla `/pagos` lee `GET /api/registro` de esta API. La web ya no necesita las rutas `/api/open-payments/*` ni `/api/permisos/*`.
