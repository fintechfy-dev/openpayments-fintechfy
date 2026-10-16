import { Composer, InlineKeyboard } from 'grammy';
import { escaparHTML } from '../../formato.js';
import { nuevoCodigoDeInvitacion } from '../../externo/crear-natillera.js';
import { formatoFecha } from '../../natillera/reglas.js';
import { enlaceDeInvitacion, textoInvitacion } from '../../natillera/invitacion.js';

// El enlace de invitación (US-003, #16): se entrega al crear la natillera y /invitar lo vuelve a dar.
// Van dos mensajes: uno para el administrador y otro listo para reenviar al chat del grupo, sin formato,
// para que se copie tal cual.

export { enlaceDeInvitacion, textoInvitacion } from '../../natillera/invitacion.js';

export function textoParaElAdmin(nombreNatillera, inscritos) {
  return [
    `🐷 Este es el enlace de <b>${escaparHTML(nombreNatillera)}</b>. Reenvía el siguiente mensaje al chat de tu grupo.`,
    'Tú también te unes con él, porque también ahorras.',
    inscritos > 0 ? `Van ${inscritos} ${inscritos === 1 ? 'persona inscrita' : 'personas inscritas'}.` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

export const TEXTO_SIN_NATILLERA = 'Todavía no administras ninguna natillera. Crea una con /crear.';
export const PREGUNTA_CUAL = '¿De cuál natillera quieres el enlace?';
export const BOTON_ENLACE = 'Enlace de invitación';
export const TEXTO_NO_ES_TUYA = 'Esa natillera no la administras tú.';

// El botón lleva el id de la natillera; solo responde a quien la administra.
export const datoInvitar = (natilleraId) => `ad:inv:${natilleraId}`;
// Dos natilleras pueden llamarse igual: la fecha en que se crearon las distingue.
export const botonDeNatillera = (fila) => `${fila.nombre} · ${formatoFecha(String(fila.creada_en).slice(0, 10))}`;

export async function enviarInvitacion(ctx, { nombre, codigo, inscritos = 0 }) {
  await ctx.reply(textoParaElAdmin(nombre, inscritos), { parse_mode: 'HTML' });
  await ctx.reply(textoInvitacion(nombre, enlaceDeInvitacion(ctx.me.username, codigo)), {
    link_preview_options: { is_disabled: true },
  });
}

export function invitar({ registro, nuevoCodigo = nuevoCodigoDeInvitacion }) {
  const comandos = new Composer();

  // Las natilleras creadas antes del enlace no tienen código: se les da uno aquí.
  const enviar = (ctx, natillera) =>
    enviarInvitacion(ctx, {
      nombre: natillera.nombre,
      codigo: registro.codigoDeInvitacion(natillera.natillera_id, nuevoCodigo()),
      inscritos: registro.contarParticipaciones(natillera.natillera_id),
    });

  comandos.command('invitar', async (ctx) => {
    const natilleras = registro.natillerasDelAdmin(ctx.from.id);
    if (!natilleras.length) {
      await ctx.reply(TEXTO_SIN_NATILLERA);
      return;
    }
    if (natilleras.length === 1) {
      await enviar(ctx, natilleras[0]);
      return;
    }
    const teclado = InlineKeyboard.from(natilleras.map((fila) => [InlineKeyboard.text(botonDeNatillera(fila), datoInvitar(fila.natillera_id))]));
    await ctx.reply(PREGUNTA_CUAL, { reply_markup: teclado });
  });

  comandos.callbackQuery(/^ad:inv:(.+)$/, async (ctx) => {
    const natillera = registro.natillera(ctx.match[1]);
    if (!natillera || Number(natillera.admin_telegram_id) !== ctx.from.id) {
      await ctx.answerCallbackQuery({ text: TEXTO_NO_ES_TUYA });
      return;
    }
    await ctx.answerCallbackQuery();
    await enviar(ctx, natillera);
  });

  return comandos;
}
