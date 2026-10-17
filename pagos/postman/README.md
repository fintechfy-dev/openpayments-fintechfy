# Pruebas de la API de pagos en Postman

Una colección para probar la API publicada (`https://natillera-pagos.azurewebsites.net`), importable en la app de Postman y ejecutable desde la terminal con la CLI de Postman.

| Carpeta | Qué prueba | ¿Mueve dinero? |
|---|---|---|
| 1. Salud y contrato | `/api/salud`, el contrato OpenAPI con sus 13 rutas y Swagger UI | No |
| 2. Seguridad (sin efectos) | Llaves que faltan o no corresponden (401), permisos sin llaves de Open Payments (400), rutas o permisos que no existen (404) | No |
| 3. Permisos (pide y cancela) | Pide un permiso recurrente en pesos y otro en otra moneda (la API cotiza el tope en la Test Wallet), revisa su estado y los cancela; valida tipo, monto y vuelta | No: nadie los aprueba |
| 4. Lecturas del bot y la web | El registro de pagos con sus cuatro etapas y los avisos de pago con su cursor | No |
| 5. Staging: mueven dinero | Las 6 operaciones que llama staging, una por caso | **Sí**, y quedan en el registro que ve el jurado: correr a mano |

## Importar en la app

1. *Import* → los dos archivos de esta carpeta: `natillera-pagos.postman_collection.json` y `natillera-pagos.postman_environment.json`.
2. En el ambiente, llenar las llaves (son secretas: nunca en el repo):
   - `apiKeyClientes` y `apiKeyStaging`: en Azure, Portal → `natillera-pagos` → *Configuración* → *Variables de entorno* (`API_KEY_CLIENTES` y `API_KEY_STAGING`).
   - `opWalletAddress`, `opKeyId` y `opPrivateKey`: las mismas llaves de Open Payments del bot (`OP_WALLET_ADDRESS`, `OP_KEY_ID`, `OP_PRIVATE_KEY`).
3. Para la carpeta 5, llenar además `grantId` (el `permisoId` de un permiso aprobado), las billeteras y los ids de la natillera.

## Correr desde la terminal

Con una copia del ambiente con las llaves llenas, **fuera del repo**:

```bash
cd pagos/postman
postman collection run natillera-pagos.postman_collection.json \
  -e /ruta/fuera/del/repo/ambiente-con-llaves.json \
  -i "1. Salud y contrato" -i "2. Seguridad (sin efectos)" \
  -i "3. Permisos (pide y cancela)" -i "4. Lecturas del bot y la web" \
  --timeout-request 60000
```

El 17 de octubre, contra la API publicada: 22 solicitudes, 51 verificaciones y 0 fallas.

Si la Test Wallet tarda en cotizar, «Pedir permiso (billetera en otra moneda)» puede responder 502: basta con repetir la corrida.
