import { randomUUID } from 'node:crypto';
import { estadoDe } from './cliente.js';
import { GRANT_DE_PRUEBA, parametrosConfirmarAutorizacion, parametrosParticipacion } from './parametros.js';

// Unirse y autorizar contra staging (US-004 y US-005, filas 2 y 3 de telegram/INTEGRACION.md).

// EstadoNatillera y EstadoParticipacion de staging (web/INTEGRACION.md, «Los estados»).
export const NATILLERA_CREADA = 0;
export const PARTICIPACION_PENDIENTE = 0;

export function crearUnirse({ servicio, registro, web, log, nuevoId = randomUUID }) {
  const leerNatillera = async (natillera) => estadoDe(await servicio.leerContrato(natillera.contract_id));

  return {
    leerNatillera,

    async estadoParticipacion(participacion) {
      return Number(estadoDe(await servicio.leerContrato(participacion.contract_id)).EstadoParticipacion);
    },

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
        registro.guardarParticipacion({ participacionId, contractId, natilleraId, telegramId });
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

    // TODO(#19): el permiso real lo pide el servicio de pagos; mientras no exista, uno de prueba que se
    // reconoce por su id (GRANT_DE_PRUEBA) y que el bot anuncia como de prueba.
    autorizar(participacion) {
      const grantId = `${GRANT_DE_PRUEBA}${participacion.participacion_id}`;
      return servicio.disparar(participacion.contract_id, 'ConfirmarAutorizacion', parametrosConfirmarAutorizacion(grantId));
    },
  };
}
