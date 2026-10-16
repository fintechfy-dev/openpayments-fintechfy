import { Composer, InlineKeyboard } from 'grammy';
import { escaparHTML, formatoCOP } from '../../formato.js';
import { formatoFecha } from '../../natillera/reglas.js';
import { estadoDe } from '../../externo/cliente.js';
import { nuevoCodigoDeInvitacion } from '../../externo/crear-natillera.js';
import { MAXIMO_PERSONAS, codificarPanel, datosDeNatillera } from '../../natillera/panel.js';
import { BOTON_ENLACE, TEXTO_SIN_NATILLERA, datoInvitar, enlaceDeInvitacion } from './invitar.js';

// El panel del administrador. /administrar lee en staging cada natillera que administra la persona y
// a su gente, y abre la Mini App miniapp/admin/ con esos datos en el enlace (src/natillera/panel.js).
// Allí escoge la natillera, ve quién falta por autorizar y comparte el enlace de invitación.
// Sin Mini App, responde en el chat: un mensaje por natillera con su botón de enlace.

export const MAXIMO_NATILLERAS = 5;
export const BOTON_ADMINISTRAR = 'Abrir el panel';
export const TEXTO_NO_SE_PUDO_LEER = 'No pude traer tus natilleras ahora. Vuelve a intentarlo en un rato.';

const nombres = (lista) => (lista.length > 1 ? `${lista.slice(0, -1).join(', ')} y ${lista.at(-1)}` : lista[0] ?? '');

export function textoAdministrar(natilleras) {
  const cuantas = natilleras.length === 1 ? '1 natillera' : `${natilleras.length} natilleras`;
  return [
    `🐷 Administras ${cuantas}: ${escaparHTML(nombres(natilleras.map((d) => d.nombre)))}.`,
    'En el panel ves a cada persona, quién falta por autorizar y el enlace para invitar.',
  ].join('\n');
}

// El mensaje de una natillera cuando no hay Mini App. Máximo 3 líneas.
export function textoNatilleraEnChat(d) {
  const faltan = d.personas.filter((p) => p.estado === 'falta_autorizar').map((p) => p.nombre);
  let estado;
  if (d.estado === 'creada') estado = `Arranca el ${formatoFecha(d.inicio)}. Van ${d.listas} de ${d.cupo} personas listas.`;
  else if (d.estado === 'iniciada') estado = `Ya se pidió la primera cuota: van ${d.pagaron} de ${d.cupo} personas que pagaron.`;
  else estado = `Van ${d.periodo} de ${d.cuotas} cuotas. La natillera tiene ${formatoCOP(d.saldo)}.`;
  return [
    `🐷 <b>${escaparHTML(d.nombre)}</b>, creada el ${formatoFecha(d.creada)}.`,
    estado,
    faltan.length ? `Falta autorizar: ${escaparHTML(nombres(faltan))}.` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

// <MINIAPP_URL>admin/?bot=<usuario>#d=<datos>. El fragmento no llega al servidor que publica la Mini App.
export function urlPanel(config, usuarioBot, datos) {
  const url = new URL('admin/', config.miniappUrl.endsWith('/') ? config.miniappUrl : `${config.miniappUrl}/`);
  if (usuarioBot) url.searchParams.set('bot', usuarioBot);
  url.hash = `d=${datos}`;
  return url.href;
}

export function administrar({ config, registro, servicio, log, ahora = () => Date.now(), nuevoCodigo = nuevoCodigoDeInvitacion }) {
  const comandos = new Composer();
  const leer = async (contractId) => estadoDe(await servicio.leerContrato(contractId));

  // Quien se unió antes de que el bot guardara nombres: se le pregunta a Telegram y se guarda.
  async function nombreDe(ctx, fila) {
    if (fila.nombre) return fila.nombre;
    try {
      const chat = await ctx.api.getChat(fila.telegram_id);
      const nombre = [chat.first_name, chat.last_name].filter(Boolean).join(' ');
      if (nombre) registro.guardarNombre(fila.participacion_id, nombre);
      return nombre || null;
    } catch (error) {
      log.warn(`No se pudo leer el nombre de ${fila.participacion_id}: ${error.message}`);
      return null;
    }
  }

  async function leerNatillera(ctx, fila) {
    const filas = registro.participacionesEn(fila.natillera_id).slice(0, MAXIMO_PERSONAS);
    const [n, personas] = await Promise.all([
      leer(fila.contract_id),
      Promise.all(
        filas.map(async (p) => ({
          nombre: await nombreDe(ctx, p),
          p: await leer(p.contract_id),
          esAdmin: Number(p.telegram_id) === ctx.from.id,
        })),
      ),
    ]);
    const codigo = registro.codigoDeInvitacion(fila.natillera_id, nuevoCodigo());
    return datosDeNatillera({ fila, n, personas, enlace: enlaceDeInvitacion(ctx.me.username, codigo) });
  }

  comandos.command('administrar', async (ctx) => {
    const filas = registro.natillerasDelAdmin(ctx.from.id).slice(0, MAXIMO_NATILLERAS);
    if (!filas.length) {
      await ctx.reply(TEXTO_SIN_NATILLERA);
      return;
    }

    let natilleras;
    try {
      natilleras = await Promise.all(filas.map((fila) => leerNatillera(ctx, fila)));
    } catch (error) {
      log.error(`/administrar no pudo leer staging para el chat ${ctx.from.id}:`, error);
      await ctx.reply(TEXTO_NO_SE_PUDO_LEER);
      return;
    }

    if (!config.miniappUrl) {
      for (const d of natilleras) {
        await ctx.reply(textoNatilleraEnChat(d), {
          parse_mode: 'HTML',
          reply_markup: new InlineKeyboard().text(BOTON_ENLACE, datoInvitar(d.id)),
        });
      }
      return;
    }

    const datos = codificarPanel(natilleras, new Date(ahora()).toISOString());
    await ctx.reply(textoAdministrar(natilleras), {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard().webApp(BOTON_ADMINISTRAR, urlPanel(config, ctx.me.username, datos)),
    });
  });

  return comandos;
}
