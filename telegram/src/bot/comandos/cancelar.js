import { Composer } from 'grammy';

// /cancelar borra el flujo en curso sin llamar a su `alTerminar` (D-12): no queda nada creado.

export const MENSAJE_CANCELADO = 'Listo, lo dejamos así. No se guardó nada de lo que respondiste.';
export const MENSAJE_NADA_QUE_CANCELAR = 'No tienes nada en curso para cancelar.';

export function cancelar() {
  const comandos = new Composer();

  comandos.command('cancelar', async (ctx) => {
    if (!ctx.session.flujo) {
      await ctx.reply(MENSAJE_NADA_QUE_CANCELAR);
      return;
    }
    ctx.session.flujo = null;
    await ctx.reply(MENSAJE_CANCELADO);
  });

  return comandos;
}
