import { randomBytes } from "node:crypto";
import { isFinalizedGrantWithAccessToken, isPendingGrant } from "@interledger/open-payments";
import { verificarHash } from "./aprobacion.js";
import { mismaWallet, normalizarWallet } from "./billeteras.js";
import { ErrorHttp } from "./errores.js";
import { aUnidades, esMontoValido, MontoInvalido } from "./montos.js";

// recurrente: cuotas, deuda y actividades del participante. un-solo-uso: compra y devolución.
// grupo y financiera: las billeteras de las que salen premios, liquidación y préstamos (#67);
// las aprueba su dueño una vez antes de la demo.
export const TIPOS_PERMISO = ["recurrente", "un-solo-uso", "grupo", "financiera"];
const ROLES = new Set(["grupo", "financiera"]);

// El token de un permiso vence a los 10 minutos. Se rota antes de pagar si le quedan menos de 3,
// para que no venza entre la cotización y el pago saliente.
const MARGEN_TOKEN_MS = 3 * 60 * 1000;

// Estados: pendiente (esperando al participante) → aprobando (volvió con un hash válido; falta
// continuar el permiso con las llaves) → aprobado | rechazado | cancelado.
//
// «cuenta» es el cliente de Open Payments armado con las llaves que trajo la llamada, más su huella.
export function crearPermisos({ config, almacen, wallets, conCandado, ahora = () => Date.now() }) {
  const iso = () => new Date(ahora()).toISOString();
  const leer = (id) => almacen.obtener("permiso", id);
  const guardar = (permiso) => almacen.guardar("permiso", permiso.id, permiso);
  const tokenDe = (accessToken) => ({
    valor: accessToken.value,
    manage: accessToken.manage,
    vence: accessToken.expires_in ? ahora() + accessToken.expires_in * 1000 : null,
  });

  function exigirMismaLlave(permiso, cuenta) {
    if (permiso.huella !== cuenta.huella) {
      throw new ErrorHttp(422, `El permiso ${permiso.id} se pidió con otra llave de Open Payments; solo esa puede usarlo`);
    }
  }

  async function rechazar(permiso, motivo) {
    permiso.estado = "rechazado";
    permiso.motivo = motivo;
    await guardar(permiso);
  }

  // Cambia el interact_ref de la vuelta por el token del permiso. Necesita las llaves: por eso no
  // ocurre en la vuelta (la abre el navegador del participante) sino cuando el bot consulta el estado.
  async function continuar(permiso, cuenta) {
    exigirMismaLlave(permiso, cuenta);
    try {
      const final = await cuenta.op.grant.continue(
        { url: permiso.continuar.uri, accessToken: permiso.continuar.token },
        { interact_ref: permiso.interactRef },
      );
      if (!isFinalizedGrantWithAccessToken(final)) return rechazar(permiso, "la billetera no entregó el token del permiso");
      permiso.token = tokenDe(final.access_token);
      permiso.continuar = { uri: final.continue.uri, token: final.continue.access_token.value };
      permiso.estado = "aprobado";
      permiso.aprobado = iso();
      await guardar(permiso);
      if (ROLES.has(permiso.tipo)) await almacen.guardar("rol", permiso.tipo, { permisoId: permiso.id });
    } catch (error) {
      await rechazar(permiso, `no se pudo continuar el permiso: ${error?.description ?? error?.message}`);
    }
  }

  return {
    async pedir({ tipo, wallet, monto, referencia }, cuenta) {
      if (!TIPOS_PERMISO.includes(tipo)) throw new ErrorHttp(400, `tipo debe ser uno de: ${TIPOS_PERMISO.join(", ")}`);
      if (!esMontoValido(monto)) throw new ErrorHttp(400, "monto debe ser un número mayor que 0");
      const url = tipo === "grupo" ? config.walletGrupo : tipo === "financiera" ? config.walletFinanciera : normalizarWallet(wallet);
      if (!url) throw new ErrorHttp(400, "wallet debe ser una dirección https o un payment pointer");

      const billetera = await wallets.obtener(url);
      let valor;
      try {
        valor = aUnidades(monto, billetera.assetScale);
      } catch (error) {
        if (error instanceof MontoInvalido) throw new ErrorHttp(400, error.message);
        throw error;
      }
      const id = `p${randomBytes(8).toString("hex")}`;
      const nonceCliente = randomBytes(16).toString("hex");
      // Sin intervalo: el intervalo corre en tiempo real mientras la demo adelanta las fechas, y con
      // intervalo el tope es por periodo, así que una deuda con mora más cara que la cuota fallaría.
      const limites = { debitAmount: { value: valor, assetCode: billetera.assetCode, assetScale: billetera.assetScale } };
      let pendiente;
      try {
        pendiente = await cuenta.op.grant.request(
          { url: billetera.authServer },
          {
            access_token: {
              access: [{ type: "outgoing-payment", actions: ["create", "read"], identifier: billetera.id, limits: limites }],
            },
            interact: {
              start: ["redirect"],
              finish: { method: "redirect", uri: `${config.urlPublica}/api/permisos/${id}/retorno`, nonce: nonceCliente },
            },
          },
        );
      } catch (error) {
        throw new ErrorHttp(502, `La billetera no aceptó la solicitud del permiso: ${error?.description ?? error?.message}`);
      }
      if (!isPendingGrant(pendiente)) throw new ErrorHttp(502, "La billetera no pidió la aprobación del participante");

      await guardar({
        id,
        tipo,
        wallet: billetera.id,
        monto,
        referencia: referencia ?? null,
        huella: cuenta.huella,
        estado: "pendiente",
        creado: iso(),
        aprobado: null,
        motivo: null,
        // Lo que hace falta para verificar el hash de la vuelta aunque la app se reinicie.
        nonceCliente,
        nonceServidor: pendiente.interact.finish,
        urlServidorPermisos: billetera.authServer,
        interactRef: null,
        continuar: { uri: pendiente.continue.uri, token: pendiente.continue.access_token.value },
        token: null,
      });
      return { permisoId: id, urlAprobacion: pendiente.interact.redirect };
    },

    // La abre el navegador del participante al volver de su billetera. No lleva llaves: solo verifica
    // el hash, deja el permiso «aprobando» y lo devuelve al chat del bot, que consulta el estado.
    async retorno(id, consulta) {
      return conCandado(`permiso:${id}`, async () => {
        const permiso = await leer(id);
        if (!permiso) throw new ErrorHttp(404, "Ese permiso no existe");
        const vueltaAlBot = `https://t.me/${config.botUsuario}?start=permiso_${id}`;
        if (permiso.estado !== "pendiente") return vueltaAlBot;

        const resultado = consulta.get("result");
        const interactRef = consulta.get("interact_ref");
        if (resultado || !interactRef) {
          await rechazar(permiso, resultado ?? "la billetera volvió sin interact_ref");
          return vueltaAlBot;
        }
        const hashValido = verificarHash({
          nonceCliente: permiso.nonceCliente,
          nonceServidor: permiso.nonceServidor,
          interactRef,
          urlServidorPermisos: permiso.urlServidorPermisos,
          hash: consulta.get("hash"),
        });
        if (!hashValido) {
          await rechazar(permiso, "el hash de la vuelta no coincide");
          return vueltaAlBot;
        }
        permiso.estado = "aprobando";
        permiso.interactRef = interactRef;
        await guardar(permiso);
        return vueltaAlBot;
      });
    },

    // Si el participante ya volvió, termina el permiso con las llaves de la llamada.
    async estado(id, obtenerCuenta) {
      return conCandado(`permiso:${id}`, async () => {
        const permiso = await leer(id);
        if (!permiso) throw new ErrorHttp(404, "Ese permiso no existe");
        if (permiso.estado === "aprobando") await continuar(permiso, await obtenerCuenta());
        return { estado: permiso.estado === "aprobando" ? "pendiente" : permiso.estado, grantId: permiso.estado === "aprobado" ? id : null, motivo: permiso.motivo };
      });
    },

    async cancelar(id, obtenerCuenta) {
      return conCandado(`permiso:${id}`, async () => {
        const permiso = await leer(id);
        if (!permiso) throw new ErrorHttp(404, "Ese permiso no existe");
        if (permiso.estado === "aprobado") {
          const cuenta = await obtenerCuenta();
          exigirMismaLlave(permiso, cuenta);
          try {
            await cuenta.op.grant.cancel({ url: permiso.continuar.uri, accessToken: permiso.continuar.token });
          } catch {
            // Si la billetera ya no lo tiene, igual queda cancelado de este lado.
          }
        }
        permiso.estado = "cancelado";
        await guardar(permiso);
        return { estado: permiso.estado };
      });
    },

    // El permiso con el que se paga una operación. walletOrigen tiene que ser la billetera del permiso:
    // un grantId con la billetera de otra persona es un error de quien llama, no un cobro.
    async aprobado(id, walletOrigen, cuenta) {
      const permiso = await leer(id);
      if (!permiso) throw new ErrorHttp(403, `El permiso ${id} no existe`);
      if (permiso.estado !== "aprobado") throw new ErrorHttp(403, `El permiso ${id} no está aprobado (${permiso.estado})`);
      if (walletOrigen !== undefined && !mismaWallet(permiso.wallet, walletOrigen)) {
        throw new ErrorHttp(422, `El permiso ${id} es de otra billetera`);
      }
      exigirMismaLlave(permiso, cuenta);
      return permiso;
    },

    // La parte de una actividad llega sin grantId: se usa el permiso recurrente de esa billetera.
    async recurrenteDe(walletOrigen, cuenta) {
      const candidatos = (await almacen.listar("permiso"))
        .filter((p) => p.tipo === "recurrente" && p.estado === "aprobado" && mismaWallet(p.wallet, walletOrigen))
        .sort((a, b) => (a.aprobado < b.aprobado ? 1 : -1));
      if (!candidatos.length) throw new ErrorHttp(403, `La billetera ${walletOrigen} no tiene un permiso recurrente aprobado`);
      exigirMismaLlave(candidatos[0], cuenta);
      return candidatos[0];
    },

    async deRol(rol, cuenta) {
      const registro = await almacen.obtener("rol", rol);
      if (!registro) throw new ErrorHttp(403, `La billetera ${rol === "grupo" ? "del grupo" : "de la financiera"} no tiene permiso aprobado (#67)`);
      return this.aprobado(registro.permisoId, undefined, cuenta);
    },

    // Con candado por permiso: la rotación anula el token anterior.
    async tokenVigente(id, cuenta) {
      return conCandado(`permiso:${id}`, async () => {
        const permiso = await leer(id);
        if (!permiso || permiso.estado !== "aprobado") throw new ErrorHttp(403, `El permiso ${id} ya no está aprobado`);
        if (permiso.token.vence === null || permiso.token.vence - ahora() > MARGEN_TOKEN_MS) return permiso.token.valor;
        try {
          const rotado = await cuenta.op.token.rotate({ url: permiso.token.manage, accessToken: permiso.token.valor });
          permiso.token = tokenDe(rotado.access_token);
        } catch (error) {
          throw new ErrorHttp(403, `No se pudo renovar el token del permiso ${id}: ${error?.description ?? error?.message}`);
        }
        await guardar(permiso);
        return permiso.token.valor;
      });
    },
  };
}
