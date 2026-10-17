// Un cliente de Open Payments falso con la misma forma que el SDK 7.4.0: guarda cada llamada y
// simula la red. Por defecto, el pago saliente completa el cobro de inmediato.
export const SERVIDOR_PERMISOS = "https://auth.prueba.test";
export const SERVIDOR_RECURSOS = "https://ilp.prueba.test";

export function wallet(nombre, { assetCode = "COP", assetScale = 2 } = {}) {
  return { id: `${SERVIDOR_RECURSOS}/${nombre}`, assetCode, assetScale, authServer: SERVIDOR_PERMISOS, resourceServer: SERVIDOR_RECURSOS, publicName: nombre };
}

// Tasas de mentira, en pesos por unidad de cada moneda. Convierte redondeando a favor de la red:
// hacia arriba lo que se debita, hacia abajo lo que llega.
export const PESOS_POR = { COP: 1, EUR: 3600, USD: 3200 };

function convertir(monto, a, redondeo) {
  const pesos = (Number(monto.value) / 10 ** monto.assetScale) * PESOS_POR[monto.assetCode];
  const exacto = (pesos / PESOS_POR[a.assetCode]) * 10 ** a.assetScale;
  const valor = monto.assetCode === a.assetCode ? Number(monto.value) : redondeo === "arriba" ? Math.ceil(exacto - 1e-9) : Math.floor(exacto + 1e-9);
  return { value: String(valor), assetCode: a.assetCode, assetScale: a.assetScale };
}

export function crearOpFalso(billeteras) {
  const porUrl = new Map(billeteras.map((w) => [w.id, w]));
  const llamadas = [];
  const red = { cobros: new Map(), cotizaciones: new Map(), salientes: new Map(), pendientes: new Map() };
  const control = { salienteFalla: false, errorSaliente: null, completarCobro: true, sinTasa: false };
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
        const w = porUrl.get(args.walletAddress);
        const cobro = {
          id: `${url}/incoming-payments/${n}`,
          walletAddress: args.walletAddress,
          ...(args.incomingAmount ? { incomingAmount: args.incomingAmount } : {}),
          receivedAmount: { value: "0", assetCode: w.assetCode, assetScale: w.assetScale },
          completed: false,
        };
        red.cobros.set(cobro.id, cobro);
        return structuredClone(cobro);
      },
      async get({ url }) {
        llamadas.push({ paso: "consultar-cobro", url });
        return structuredClone(red.cobros.get(url));
      },
      async complete({ url }) {
        llamadas.push({ paso: "cerrar-cobro", url });
        const cobro = red.cobros.get(url);
        cobro.completed = true;
        return structuredClone(cobro);
      },
    },
    quote: {
      async create({ url, accessToken }, args) {
        llamadas.push({ paso: "cotizacion", url, accessToken, args });
        n += 1;
        const cobro = red.cobros.get(args.receiver);
        const quienPaga = porUrl.get(args.walletAddress);
        const quienRecibe = porUrl.get(cobro.walletAddress);
        if (control.sinTasa && quienPaga.assetCode !== quienRecibe.assetCode) {
          throw Object.assign(new Error("no rate"), { status: 400, description: `No hay tasa entre ${quienPaga.assetCode} y ${quienRecibe.assetCode}` });
        }
        let debitAmount;
        let receiveAmount;
        if (args.debitAmount) {
          debitAmount = args.debitAmount;
          receiveAmount = convertir(debitAmount, quienRecibe, "abajo");
        } else {
          receiveAmount = args.receiveAmount ?? cobro.incomingAmount;
          debitAmount = convertir(receiveAmount, quienPaga, "arriba");
        }
        const cotizacion = { id: `${url}/quotes/${n}`, receiver: args.receiver, debitAmount, receiveAmount };
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
        const cotizacion = red.cotizaciones.get(args.quoteId);
        const cobro = red.cobros.get(cotizacion.receiver);
        if (!control.salienteFalla && control.completarCobro) {
          cobro.receivedAmount = { ...cotizacion.receiveAmount };
          // Un cobro sin monto fijo no se completa solo: lo cierra quien lo creó.
          cobro.completed = Boolean(cobro.incomingAmount);
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
