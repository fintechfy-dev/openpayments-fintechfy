import { randomUUID } from 'node:crypto';
import { parametrosNatilleraCuenta } from './parametros.js';

// Enganche `crearNatillera(datos, ctx)` del flujo /crear (US-001, fila 1 de telegram/INTEGRACION.md):
// crea natillera-cuenta en staging, guarda su contractId y le avisa a la web.
//
// El orden importa: si falla staging, se lanza y el flujo queda para reintentar sin haber creado nada.
// Después de staging nada debe lanzar, o confirmar otra vez crearía la natillera dos veces: por eso el
// aviso a la web no se espera (y nunca lanza).
export function crearNatilleraEnServicio({ servicio, registro, web, reglasServicio, log, ahora = () => new Date(), nuevoId = randomUUID }) {
  return async (datos, ctx) => {
    const natilleraId = `nat-${nuevoId()}`;
    const { contractId } = await servicio.crearContrato('natillera-cuenta', parametrosNatilleraCuenta(natilleraId, datos, reglasServicio));

    const admin = ctx.from;
    const creadaEn = ahora().toISOString();
    try {
      registro.guardarNatillera({ natilleraId, contractId, nombre: datos.nombre, adminTelegramId: admin.id, creadaEn });
    } catch (error) {
      // Sin registro el bot no sabrá a quién avisar, pero la natillera ya existe: queda en el log.
      log.error(`Natillera ${natilleraId} (contrato ${contractId}) creada en staging pero no se guardó en el registro:`, error);
    }
    log.info(`Natillera ${natilleraId} creada en staging con el contrato ${contractId}.`);

    const avisoWeb = web
      ? web.natillera({
          natilleraId,
          contractId,
          nombre: datos.nombre,
          administrador: { telegramId: admin.id, nombre: [admin.first_name, admin.last_name].filter(Boolean).join(' ') },
          creadaEn,
        })
      : Promise.resolve(false);

    return { natilleraId, contractId, avisoWeb };
  };
}
