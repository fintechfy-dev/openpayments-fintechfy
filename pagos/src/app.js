import { crearAvisos } from "./avisos.js";
import { crearCandados } from "./candados.js";
import { crearIdempotencia } from "./idempotencia.js";
import { crearOperaciones } from "./operaciones.js";
import { crearPagos } from "./pagos.js";
import { crearPermisos } from "./permisos.js";
import { crearServidor } from "./servidor.js";
import { crearWallets } from "./wallets.js";

// Arma la API con sus piezas. index.js le pasa el SDK real de Open Payments y el almacén de Azure;
// las pruebas, un SDK falso y memoria, para probar el mismo cableado que corre en Azure.
//   opPublico: cliente sin llaves, para leer billeteras.
//   clientes:  arma el cliente autenticado con las llaves que trae cada llamada.
export function crearApp({ config, almacen, opPublico, clientes, ahora = () => Date.now(), esperar, limiteRespuestaMs }) {
  const conCandado = crearCandados();
  const wallets = crearWallets({ opPublico, ahora });
  const avisos = crearAvisos({ almacen, ahora });
  const permisos = crearPermisos({ config, almacen, wallets, conCandado, ahora });
  const pagos = crearPagos({ almacen, wallets, permisos, avisos, ahora, esperar });
  const operaciones = crearOperaciones({ config, permisos, pagos });
  const idempotencia = crearIdempotencia({ almacen, ahora });
  return crearServidor({ config, almacen, permisos, operaciones, pagos, avisos, idempotencia, clientes, limiteRespuestaMs });
}
