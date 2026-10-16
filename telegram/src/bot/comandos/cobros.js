import { Composer } from 'grammy';
import { AccionRechazadaError } from '../../externo/cliente.js';

// Los botones de los avisos de mora y de actividades (US-017 y US-011, filas 6 y 8 de
// telegram/INTEGRACION.md): «Ya tengo la plata» dispara PagarDeuda y «Pagar mi parte», AutorizarPago.
// El botón lleva el id de la participación o de la actividad, que cualquiera podría copiar: por eso
// solo actúa si esa participación es de quien lo toca.

export const TEXTO_COBRO_PEDIDO = 'Listo, ya pedí el cobro. Te aviso cuando quede.';
export const TEXTO_NO_SE_PUEDE = 'Ahora no se puede hacer ese cobro. Si ya quedaste al día, no tienes que hacer nada.';
export const TEXTO_NO_ES_TUYO = 'Este botón no es de tu natillera.';

export function cobros({ servicio, registro, log }) {
  const comandos = new Composer();

  async function cobrar(ctx, buscar, trigger) {
    const contrato = buscar();
    if (!contrato) {
      await ctx.answerCallbackQuery({ text: TEXTO_NO_ES_TUYO });
      return;
    }
    await ctx.answerCallbackQuery();
    // Se quita el botón antes de llamar: dos toques seguidos pedirían el cobro dos veces.
    await ctx.editMessageReplyMarkup().catch(() => {});
    try {
      await servicio.disparar(contrato, trigger);
    } catch (error) {
      if (!(error instanceof AccionRechazadaError)) throw error;
      log.info(`${trigger} rechazado para el chat ${ctx.from.id}: ${error.motivo}`);
      await ctx.reply(TEXTO_NO_SE_PUEDE);
      return;
    }
    await ctx.reply(TEXTO_COBRO_PEDIDO);
  }

  comandos.callbackQuery(/^av:deuda:(.+)$/, (ctx) =>
    cobrar(
      ctx,
      () => {
        const p = registro.participacion(ctx.match[1]);
        return p && Number(p.telegram_id) === ctx.from.id ? p.contract_id : null;
      },
      'PagarDeuda',
    ),
  );

  comandos.callbackQuery(/^av:obl:(.+)$/, (ctx) =>
    cobrar(ctx, () => registro.obligacionDe(ctx.match[1], ctx.from.id)?.contract_id ?? null, 'AutorizarPago'),
  );

  return comandos;
}
