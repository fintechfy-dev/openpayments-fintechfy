import { createAuthenticatedClient } from "@interledger/open-payments";

const VIGENCIA_MS = 10 * 60 * 1000;

// Armar un cliente autenticado carga la especificación de Open Payments: no se hace en cada llamada.
// Se reutiliza en memoria por unos minutos, por huella. Nunca se escribe a disco ni al almacén;
// si la app se reinicia, el siguiente llamado trae las llaves otra vez.
export function crearClientes({ crearCliente = createAuthenticatedClient, ahora = () => Date.now() } = {}) {
  const vivos = new Map();
  return {
    async para(credenciales) {
      const vivo = vivos.get(credenciales.huella);
      if (vivo && vivo.hasta > ahora()) return vivo.cliente;
      const cliente = await crearCliente({
        walletAddressUrl: credenciales.walletAddressUrl,
        keyId: credenciales.keyId,
        privateKey: credenciales.llavePrivada,
        logLevel: "warn",
      });
      vivos.set(credenciales.huella, { cliente, hasta: ahora() + VIGENCIA_MS });
      return cliente;
    },
  };
}
