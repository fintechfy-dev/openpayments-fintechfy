// Un cliente de Open Payments falso con la misma forma que el SDK 7.4.0: guarda cada llamada y
// simula la red. Por defecto, el pago saliente completa el cobro de inmediato.
export const SERVIDOR_PERMISOS = "https://auth.prueba.test";
export const SERVIDOR_RECURSOS = "https://ilp.prueba.test";

export function wallet(nombre, { assetCode = "COP", assetScale = 2 } = {}) {
  return { id: `${SERVIDOR_RECURSOS}/${nombre}`, assetCode, assetScale, authServer: SERVIDOR_PERMISOS, resourceServer: SERVIDOR_RECURSOS, publicName: nombre };
}

export function crearOpFalso(billeteras) {
  const porUrl = new Map(billeteras.map((w) => [w.id, w]));
  const llamadas = [];
  const red = { cobros: new Map(), cotizaciones: new Map(), salientes: new Map(), pendientes: new Map() };
  const control = { salienteFalla: false, errorSaliente: null, completarCobro: true };
  let n = 0;

  const op = {
    walletAddress: {
      async get({ url }) {
        llamadas.push({ paso: "wallet", url });
        const w = porUrl.get(url);
        if (!w) throw Object.assign(new Error("not found"), { status: 404, description: "Not Found" });
        return w;
      },
    },
    grant: {
      async request({ url }, cuerpo) {
        llamadas.push({ paso: "permiso", url, cuerpo });
        n += 1;
        if (cuerpo.interact) {
          const nonceServidor = `nonce-servidor-${n}`;
          red.pendientes.set(`${url}/continue/${n}`, { cuerpo, nonceServidor });
          return {
            interact: { redirect: `https://wallet.prueba.test/aprobar/${n}`, finish: nonceServidor },
            continue: { access_token: { value: `continuar-${n}` }, uri: `${url}/continue/${n}`, wait: 5 },
          };
        }
        const tipo = cuerpo.access_token.access[0].type;
        return {
          access_token: { value: `token-${tipo}-${n}`, manage: `${url}/token/${n}`, expires_in: 600, access: cuerpo.access_token.access },
          continue: { access_token: { value: `continuar-${n}` }, uri: `${url}/continue/${n}` },
        };
      },
      async continue({ url, accessToken }, cuerpo) {
        llamadas.push({ paso: "continuar", url, accessToken, cuerpo });
        n += 1;
        return {
          access_token: { value: `token-saliente-${n}`, manage: `${SERVIDOR_PERMISOS}/token/${n}`, expires_in: 600, access: [] },
          continue: { access_token: { value: `continuar-final-${n}` }, uri: `${SERVIDOR_PERMISOS}/continue/final-${n}` },
        };
      },
      async cancel({ url }) {
        llamadas.push({ paso: "cancelar", url });
      },
    },
    token: {
      async rotate({ url, accessToken }) {
        llamadas.push({ paso: "rotar", url, accessToken });
        n += 1;
        return { access_token: { value: `token-rotado-${n}`, manage: `${SERVIDOR_PERMISOS}/token/${n}`, expires_in: 600, access: [] } };
      },
    },
    incomingPayment: {
      async create({ url, accessToken }, args) {
        llamadas.push({ paso: "cobro", url, accessToken, args });
        n += 1;
        const cobro = {
          id: `${url}/incoming-payments/${n}`,
          walletAddress: args.walletAddress,
          incomingAmount: args.incomingAmount,
          receivedAmount: { ...args.incomingAmount, value: "0" },
          completed: false,
        };
        red.cobros.set(cobro.id, cobro);
        return structuredClone(cobro);
      },
      async get({ url }) {
        llamadas.push({ paso: "consultar-cobro", url });
        return structuredClone(red.cobros.get(url));
      },
    },
    quote: {
      async create({ url, accessToken }, args) {
        llamadas.push({ paso: "cotizacion", url, accessToken, args });
        n += 1;
        const cobro = red.cobros.get(args.receiver);
        const cotizacion = { id: `${url}/quotes/${n}`, receiver: args.receiver, debitAmount: cobro.incomingAmount, receiveAmount: cobro.incomingAmount };
        red.cotizaciones.set(cotizacion.id, cotizacion);
        return cotizacion;
      },
    },
    outgoingPayment: {
      async create({ url, accessToken }, args) {
        llamadas.push({ paso: "saliente", url, accessToken, args });
        if (control.errorSaliente) throw control.errorSaliente;
        n += 1;
        const saliente = { id: `${url}/outgoing-payments/${n}`, failed: control.salienteFalla, quoteId: args.quoteId };
        red.salientes.set(saliente.id, saliente);
        const cobro = red.cobros.get(red.cotizaciones.get(args.quoteId).receiver);
        if (!control.salienteFalla && control.completarCobro) {
          cobro.receivedAmount = { ...cobro.incomingAmount };
          cobro.completed = true;
        }
        return structuredClone(saliente);
      },
      async get({ url }) {
        llamadas.push({ paso: "consultar-saliente", url });
        return structuredClone(red.salientes.get(url));
      },
    },
  };
  const contar = (paso) => llamadas.filter((l) => l.paso === paso).length;
  return { op, llamadas, red, control, contar };
}
