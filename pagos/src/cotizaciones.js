import { isFinalizedGrantWithAccessToken } from "@interledger/open-payments";
import { ErrorHttp } from "./errores.js";

// Los montos de la natillera están siempre en la moneda de la billetera del grupo (pesos). Una
// billetera en otra moneda se convierte con la cotización de Open Payments, que es la que conoce la
// tasa. En la Test Wallet, el 16 de octubre: 50.000 COP al grupo costaban 15,08 EUR y 15,74 USD.

// Un tope en otra moneda se calcula con una cotización real y se le suma la mitad. El tope cubre
// varios pagos (cuotas, mora, actividades) y en euros cada pago lleva una comisión fija de cerca de
// 1 EUR que una sola cotización del total no ve; además, la tasa se mueve.
const MARGEN_TOPE = { por: 3n, entre: 2n };
const COTIZACION_DE_TOPE_VENCE_MS = 5 * 60 * 1000;

export async function tokenSinInteraccion(op, servidorPermisos, tipo, paso) {
  let permiso;
  try {
    permiso = await op.grant.request(
      { url: servidorPermisos },
      { access_token: { access: [{ type: tipo, actions: tipo === "quote" ? ["create", "read"] : ["create", "read", "complete"] }] } },
    );
  } catch (error) {
    throw traducir(error, paso);
  }
  if (!isFinalizedGrantWithAccessToken(permiso)) throw new ErrorHttp(502, `La billetera pidió interacción para el ${paso}`);
  return permiso.access_token.value;
}

export async function paso(nombre, llamada) {
  try {
    return await llamada();
  } catch (error) {
    throw traducir(error, nombre);
  }
}

// El tope de un permiso va en la moneda de quien paga. Para saber cuánto vale `valorEnGrupo` en esa
// moneda se cotiza un cobro de ese valor al grupo, sin pagarlo: el cobro se cierra enseguida.
export async function topeEnMonedaDe({ op, billetera, grupo, valorEnGrupo, ahora = () => Date.now() }) {
  const tokenCobro = await tokenSinInteraccion(op, grupo.authServer, "incoming-payment", "permiso de la cotización del tope");
  const cobro = await paso("cobro de la cotización del tope", () =>
    op.incomingPayment.create(
      { url: grupo.resourceServer, accessToken: tokenCobro },
      {
        walletAddress: grupo.id,
        incomingAmount: { value: valorEnGrupo, assetCode: grupo.assetCode, assetScale: grupo.assetScale },
        expiresAt: new Date(ahora() + COTIZACION_DE_TOPE_VENCE_MS).toISOString(),
        metadata: { natillera: { cotizacionDeTope: true } },
      },
    ),
  );
  const tokenCotizacion = await tokenSinInteraccion(op, billetera.authServer, "quote", "permiso de la cotización del tope");
  const cotizacion = await paso("cotización del tope", () =>
    op.quote.create({ url: billetera.resourceServer, accessToken: tokenCotizacion }, { walletAddress: billetera.id, receiver: cobro.id, method: "ilp" }),
  );
  await cerrarCobro(op, cobro, tokenCobro);
  const conMargen = (BigInt(cotizacion.debitAmount.value) * MARGEN_TOPE.por + MARGEN_TOPE.entre - 1n) / MARGEN_TOPE.entre;
  return { value: conMargen.toString(), assetCode: cotizacion.debitAmount.assetCode, assetScale: cotizacion.debitAmount.assetScale };
}

// Un cobro sin monto fijo no se completa solo: se cierra a mano cuando ya llegó lo cotizado. Si el
// cierre falla, el dinero ya está en la billetera; se deja dicho en el log y el pago sigue completo.
export async function cerrarCobro(op, cobro, tokenCobro) {
  try {
    await op.incomingPayment.complete({ url: cobro.id, accessToken: tokenCobro });
  } catch (error) {
    console.warn(`cobro ${cobro.id}: no se pudo cerrar (${error?.description ?? error?.message})`);
  }
}

export function traducir(error, paso) {
  if (error instanceof ErrorHttp) return error;
  const estado = error?.status;
  const descripcion = error?.description ?? error?.message ?? "error desconocido";
  if (paso === "pago saliente" && (estado === 403 || /insufficient|limit|exceed/i.test(descripcion))) {
    return new ErrorHttp(402, `Sin fondos o tope del permiso superado: ${descripcion}`);
  }
  if (estado === 401 || estado === 403) return new ErrorHttp(403, `Open Payments negó el ${paso}: ${descripcion}`);
  if (estado >= 400 && estado < 500) return new ErrorHttp(422, `Open Payments rechazó el ${paso}: ${descripcion}`);
  return new ErrorHttp(502, `Open Payments falló en el ${paso}: ${descripcion}`);
}
