import { randomUUID } from 'node:crypto';
import { estadoDe } from './cliente.js';
import { PERMISO } from './pagos.js';
import { GRANT_DE_PRUEBA, parametrosConfirmarAutorizacion, parametrosParticipacion } from './parametros.js';

// Unirse y autorizar contra staging (US-004 y US-005, filas 2 y 3 de telegram/INTEGRACION.md). Con la
// API de pagos (`pagos`, src/externo/pagos.js) el permiso de cobro es real: la persona lo aprueba en su
// billetera. Sin ella, es uno de prueba que se reconoce por su id y que el bot anuncia como de prueba.

// EstadoNatillera y EstadoParticipacion de staging (web/INTEGRACION.md, «Los estados»).
export const NATILLERA_CREADA = 0;
export const PARTICIPACION_PENDIENTE = 0;

// El permiso no lleva intervalo (pagos/API.md): su tope es total y alcanza para todo lo que staging le
// cobra a la persona con él, que no es solo la cuota: la deuda con su mora y las actividades. Por eso
// va con un margen sobre lo que aporta en total.
export const MARGEN_DEL_PERMISO = 0.5;

// Cuota × número de cuotas, más el margen, redondeado hacia arriba a miles. Con el estado de la
// natillera o de la participación: las dos traen ValorCuota y NumeroCuotas.
export function topeDelPermiso(estado) {
  const total = Number(estado.ValorCuota) * Number(estado.NumeroCuotas) * (1 + MARGEN_DEL_PERMISO);
  return Math.ceil(total / 1000) * 1000;
}

export function crearUnirse({ servicio, registro, web, pagos, log, nuevoId = randomUUID, ahora = () => Date.now() }) {
  const leerNatillera = async (natillera) => estadoDe(await servicio.leerContrato(natillera.contract_id));
  const leerParticipacion = async (participacion) => estadoDe(await servicio.leerContrato(participacion.contract_id));
  const estadoParticipacion = async (participacion) => Number((await leerParticipacion(participacion)).EstadoParticipacion);
  const confirmar = (participacion, grantId) =>
    servicio.disparar(participacion.contract_id, 'ConfirmarAutorizacion', parametrosConfirmarAutorizacion(grantId));

  return {
    leerNatillera,
    estadoParticipacion,
    conPagos: Boolean(pagos),

    // Crea natillera-participacion con las reglas vigentes de la natillera. Devuelve { cerrada: true } si
    // la natillera ya no está en CREADA. Igual que al crear la natillera: si staging falla se lanza y no
    // queda nada; después de staging nada lanza, para que reintentar no inscriba dos veces.
    async inscribir({ natillera, telegramId, nombre, billetera }) {
      const estado = await leerNatillera(natillera);
      if (Number(estado.EstadoNatillera) !== NATILLERA_CREADA) return { cerrada: true, estado };

      const participacionId = `par-${nuevoId()}`;
      const natilleraId = natillera.natillera_id;
      const { contractId } = await servicio.crearContrato(
        'natillera-participacion',
        parametrosParticipacion({ participacionId, natilleraId, telegramId, billetera }, estado),
      );

      let inscritos;
      try {
        registro.guardarParticipacion({ participacionId, contractId, natilleraId, telegramId, nombre });
        inscritos = registro.contarParticipaciones(natilleraId);
      } catch (error) {
        log.error(`Participación ${participacionId} (contrato ${contractId}) creada en staging pero no se guardó en el registro:`, error);
      }
      log.info(`Participación ${participacionId} creada en ${natilleraId} con el contrato ${contractId}.`);

      const avisoWeb = web
        ? web.participacion({ natilleraId, participacionId, contractId, nombre, telegramId, billetera })
        : Promise.resolve(false);
      return { participacionId, contractId, estado, inscritos, avisoWeb };
    },

    // Sin API de pagos: un permiso de prueba que se reconoce por su id (GRANT_DE_PRUEBA).
    autorizar(participacion) {
      return confirmar(participacion, `${GRANT_DE_PRUEBA}${participacion.participacion_id}`);
    },

    // Con API de pagos: pide el permiso recurrente para la billetera que la persona dio al unirse (la
    // que tiene staging). Devuelve { urlAprobacion, permisoId, tope }, o { yaAutorizo: true } si staging
    // ya la tiene validada. `vuelta` es el enlace al chat, con {permisoId}.
    async pedirPermiso(participacion, vuelta) {
      const p = await leerParticipacion(participacion);
      if (Number(p.EstadoParticipacion) !== PARTICIPACION_PENDIENTE) return { yaAutorizo: true };
      const tope = topeDelPermiso(p);
      const { permisoId, urlAprobacion } = await pagos.pedirPermiso({
        tipo: 'recurrente',
        wallet: p.WalletParticipante,
        monto: tope,
        referencia: participacion.participacion_id,
        vuelta,
      });
      registro.guardarPermiso({ permisoId, participacionId: participacion.participacion_id, monto: tope, creadoEn: new Date(ahora()).toISOString() });
      log.info(`Permiso ${permisoId} pedido para ${participacion.participacion_id} con tope ${tope}.`);
      return { permisoId, urlAprobacion, tope };
    },

    // Al volver de la billetera (/start permiso_<id>): la consulta termina el permiso en la API de pagos.
    // Si quedó aprobado, staging recibe su grantId con ConfirmarAutorizacion; si la participación ya
    // estaba validada no se vuelve a disparar. Devuelve { estado, motivo }.
    async terminarPermiso(permiso) {
      const participacion = registro.participacion(permiso.participacion_id);
      const { estado, grantId, motivo } = await pagos.estadoPermiso(permiso.permiso_id);
      if (estado !== PERMISO.APROBADO) return { estado, motivo };
      if ((await estadoParticipacion(participacion)) === PARTICIPACION_PENDIENTE) {
        await confirmar(participacion, grantId ?? permiso.permiso_id);
        log.info(`ConfirmarAutorizacion de ${participacion.participacion_id} con el permiso ${permiso.permiso_id}.`);
      }
      return { estado };
    },
  };
}
