import { Composer, InlineKeyboard } from 'grammy';

// «Mi natillera» (US-008): abre la Mini App del participante (miniapp/natillera/). Un botón dentro del
// mensaje basta: esta página solo muestra; para pedir el préstamo vuelve al chat con /start prestamo.

export const BOTON_MI_NATILLERA = 'Ver mi natillera';
export const TEXTO_MENU = 'Mi natillera';

export function textoMiNatillera(nombre) {
  return [
    `🐷 ${nombre ? `${nombre}, aquí` : 'Aquí'} ves cuánto llevas, las reglas y tus cobros.`,
    'La plata la guarda Financiera Aliada, a nombre de la natillera.',
  ].join('\n');
}

export const MENSAJE_SIN_MINIAPP = 'Todavía no puedo mostrarte tu natillera desde aquí. Vuelve a intentarlo en un rato.';

// La página vive junto al formulario de crear: <MINIAPP_URL>natillera/. Lleva el usuario del bot para
// que «Pedir préstamo» sepa a qué chat volver.
export function urlMiNatillera(config, usuarioBot) {
  const url = new URL('natillera/', config.miniappUrl.endsWith('/') ? config.miniappUrl : `${config.miniappUrl}/`);
  if (usuarioBot) url.searchParams.set('bot', usuarioBot);
  return url.href;
}

export function miNatillera({ config }) {
  const comandos = new Composer();

  comandos.command('mi_natillera', async (ctx) => {
    if (!config.miniappUrl) {
      await ctx.reply(MENSAJE_SIN_MINIAPP);
      return;
    }
    await ctx.reply(textoMiNatillera(ctx.from?.first_name), {
      reply_markup: new InlineKeyboard().webApp(BOTON_MI_NATILLERA, urlMiNatillera(config, ctx.me.username)),
    });
  });

  return comandos;
}
