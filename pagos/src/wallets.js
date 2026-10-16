import { ErrorHttp } from "./errores.js";

const VIGENCIA_MS = 10 * 60 * 1000;

// El SDK no encuentra los servidores solo: cada billetera dice cuál es su servidor de permisos
// (authServer) y cuál el de cobros y pagos (resourceServer). Es información pública: se consulta con
// un cliente sin llaves, una vez, y se guarda unos minutos.
export function crearWallets({ opPublico, ahora = () => Date.now() }) {
  const cache = new Map();
  return {
    async obtener(url) {
      const guardada = cache.get(url);
      if (guardada && guardada.hasta > ahora()) return guardada.wallet;
      let wallet;
      try {
        wallet = await opPublico.walletAddress.get({ url });
      } catch (error) {
        const estado = error?.status;
        if (estado && estado < 500) throw new ErrorHttp(422, `No se encontró la billetera ${url}`);
        throw new ErrorHttp(502, `No se pudo consultar la billetera ${url}: ${error?.description ?? error?.message}`);
      }
      cache.set(url, { wallet, hasta: ahora() + VIGENCIA_MS });
      return wallet;
    },
  };
}
