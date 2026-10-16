import { Composer } from 'grammy';
import { escaparHTML } from '../../formato.js';
import { nuevoCodigoDeInvitacion } from '../../externo/crear-natillera.js';

// El enlace de invitación (US-003, #16): se entrega al crear la natillera y /invitar lo vuelve a dar.
// Van dos mensajes: uno para el administrador y otro listo para reenviar al chat del grupo, sin formato,
// para que se copie tal cual.

export const enlaceDeInvitacion = (usuarioBot, codigo) => `https://t.me/${usuarioBot}?start=${codigo}`;

export function textoParaElAdmin(nombreNatillera, inscritos) {
  return [
    `🐷 Este es el enlace de <b>${escaparHTML(nombreNatillera)}</b>. Reenvía el siguiente mensaje al chat de tu grupo.`,
    'Tú también te unes con él, porque también ahorras.',
    inscritos > 0 ? `Van ${inscritos} ${inscritos === 1 ? 'persona inscrita' : 'personas inscritas'}.` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

export function textoInvitacion(nombreNatillera, enlace) {
  return [
    `Únete a nuestra natillera «${nombreNatillera}» para ahorrar juntos para diciembre.`,
    'La plata la guarda Financiera Aliada, no una persona.',
    `Entra aquí y mira las reglas: ${enlace}`,
  ].join('\n');
}

export const TEXTO_SIN_NATILLERA = 'Todavía no administras ninguna natillera. Crea una con /crear.';

export async function enviarInvitacion(ctx, { nombre, codigo, inscritos = 0 }) {
  await ctx.reply(textoParaElAdmin(nombre, inscritos), { parse_mode: 'HTML' });
  await ctx.reply(textoInvitacion(nombre, enlaceDeInvitacion(ctx.me.username, codigo)), {
    link_preview_options: { is_disabled: true },
  });
}

export function invitar({ registro, nuevoCodigo = nuevoCodigoDeInvitacion }) {
  const comandos = new Composer();

  comandos.command('invitar', async (ctx) => {
    const natillera = registro.natilleraDelAdmin(ctx.from.id);
    if (!natillera) {
      await ctx.reply(TEXTO_SIN_NATILLERA);
      return;
    }
    // Las natilleras creadas antes del enlace no tienen código: se les da uno aquí.
    const codigo = registro.codigoDeInvitacion(natillera.natillera_id, nuevoCodigo());
    await enviarInvitacion(ctx, { nombre: natillera.nombre, codigo, inscritos: registro.contarParticipaciones(natillera.natillera_id) });
  });

  return comandos;
}
