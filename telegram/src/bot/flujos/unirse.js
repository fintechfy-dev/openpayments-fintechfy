import { Composer, InlineKeyboard } from 'grammy';
import { escaparHTML, formatoCOP, formatoPorcentaje } from '../../formato.js';
import { formatoFecha, validarBilletera } from '../../natillera/reglas.js';
import { AccionRechazadaError } from '../../externo/cliente.js';
import { ID_PERMISO, PERMISO } from '../../externo/pagos.js';
import { NATILLERA_CREADA, PARTICIPACION_PENDIENTE, topeDelPermiso } from '../../externo/unirse.js';

// Unirse desde el enlace (US-004, #16) y autorizar el cobro (US-005, #19). El enlace abre /start <código>:
// el bot muestra las reglas que tiene la natillera en staging, la persona acepta, escribe su billetera y
// el bot crea su participación. Después autoriza el cobro: con la API de pagos, en su billetera (el bot
// le da el enlace y la billetera la trae de vuelta con /start permiso_<id>); sin ella, con un permiso de
// prueba que se anuncia como tal.

export const ID = 'unirse';

export const datoUnirme = (codigo) => `un:si:${codigo}`;
export const DATO_AHORA_NO = 'un:no';
export const datoAutorizar = (participacionId) => `un:aut:${participacionId}`;
export const datoNoAutorizar = (participacionId) => `un:nau:${participacionId}`;
export const datoYaAprobe = (permisoId) => `un:per:${permisoId}`;
// El enlace con que la billetera devuelve a la persona al chat; la API de pagos pone el id.
export const PAYLOAD_PERMISO = 'permiso_';
export const vueltaDelPermiso = (usuarioBot) => `https://t.me/${usuarioBot}?start=${PAYLOAD_PERMISO}{permisoId}`;

// ---------- Textos (voz y tono: tuteo, primero el dato, máximo 3 líneas, la plata ubicada) ----------

const nombreHTML = (nombre) => `<b>${escaparHTML(nombre)}</b>`;
// Staging guarda la mora en fracción (0.01); la persona la lee en porcentaje (1 %).
const moraEnPorcentaje = (fraccion) => formatoPorcentaje(Number((Number(fraccion) * 100).toFixed(4)));
const cadaCuanto = (meses) => (Number(meses) === 1 ? 'cada mes' : `cada ${meses} meses`);

// Las reglas en un solo mensaje, con el total al que se compromete (criterio crítico de US-004).
export function textoReglas(estado) {
  const cuotas = Number(estado.NumeroCuotas);
  const total = Number(estado.ValorCuota) * cuotas;
  return [
    `🐷 ${nombreHTML(estado.NombreNatillera)}: ${formatoCOP(estado.ValorCuota)} ${cadaCuanto(estado.PeriodicidadMeses)}, ${cuotas} ${cuotas === 1 ? 'cuota' : 'cuotas'}, del ${formatoFecha(estado.FechaInicio)} al ${formatoFecha(estado.FechaFinal, { anio: true })}. En total aportas ${formatoCOP(total)}.`,
    `Arranca con mínimo ${estado.CupoMinimo} personas. Si una cuota queda pendiente, la mora es de ${moraEnPorcentaje(estado.PorcentajeMoraDiaria)} diario.`,
    'La plata la guarda Financiera Aliada, no el administrador.',
  ].join('\n');
}

export const TEXTO_ENLACE_INVALIDO = 'Ese enlace no corresponde a ninguna natillera. Pídele a quien te invitó que te lo mande otra vez.';
export const textoCerrada = (nombre) => `${nombreHTML(nombre)} ya arrancó y no recibe más personas.`;
export const textoYaEstas = (nombre) => `Ya estás en ${nombreHTML(nombre)} y tu cobro está autorizado. Te aviso cada vez que se cobre una cuota.`;
export const textoFaltaAutorizar = (nombre) => `Ya te inscribiste en ${nombreHTML(nombre)}. Te falta autorizar el cobro de tus cuotas.`;
export const TEXTO_AHORA_NO = 'Listo, no te uniste. Si cambias de opinión, abre el enlace otra vez.';
export const PREGUNTA_BILLETERA = '¿Cuál es la dirección de tu billetera? La necesitamos para cobrar tus cuotas.';

// `conPagos`: el permiso es real y se aprueba en la billetera; si no, es de prueba y lo dice.
export function textoAutorizar(estado, { conPagos = false } = {}) {
  const cobro = `${formatoCOP(estado.ValorCuota)} ${cadaCuanto(estado.PeriodicidadMeses)}, hasta el ${formatoFecha(estado.FechaFinal, { anio: true })}`;
  if (conPagos) {
    return [
      `Para terminar, autoriza desde tu billetera el cobro automático: ${cobro}.`,
      `El tope es ${formatoCOP(topeDelPermiso(estado))} en total: tus cuotas y un margen por si alguna queda pendiente. Nunca se cobra más de eso.`,
    ].join('\n');
  }
  return [
    `Para terminar, autoriza el cobro automático: ${cobro}. Nunca se cobra más de eso.`,
    'Por ahora es una autorización de prueba: no se abre tu billetera ni se mueve plata.',
  ].join('\n');
}

export const BOTON_AUTORIZAR = 'Autorizar el cobro';
export const BOTON_AUTORIZAR_PRUEBA = 'Autorizar el cobro (prueba)';
export const botonAutorizar = (conPagos) => (conPagos ? BOTON_AUTORIZAR : BOTON_AUTORIZAR_PRUEBA);
export const BOTON_ABRIR_BILLETERA = 'Abrir mi billetera';
export const BOTON_YA_APROBE = 'Ya aprobé';
export const BOTON_NO_AUTORIZAR = 'Ahora no';
export const textoValidado = (nombre) => `✅ Listo: autorizaste el cobro en ${nombreHTML(nombre)}. Te aviso cuando arranque.`;
export const TEXTO_NO_AUTORIZO = 'Listo, no autorizaste el cobro. Cuando quieras hacerlo, abre el enlace de invitación otra vez.';
export const TEXTO_NO_SE_PUDO_AUTORIZAR = 'No se pudo autorizar el cobro ahora. Vuelve a intentarlo en un rato desde el enlace de invitación.';
export const TEXTO_NO_ES_TUYO = 'Este botón no es tuyo.';
export const textoAbrirBilletera = (tope) =>
  `Abre tu billetera y aprueba el cobro, con tope de ${formatoCOP(tope)}. Al terminar, la billetera te trae de vuelta aquí.\nSi no te trae, vuelve tú y toca «${BOTON_YA_APROBE}».`;
export const TEXTO_PERMISO_PENDIENTE = `Todavía no veo la aprobación en tu billetera. Cuando la apruebes, toca «${BOTON_YA_APROBE}».`;
export const TEXTO_PERMISO_DESCONOCIDO = 'No encuentro esa autorización. Abre el enlace de invitación otra vez para autorizar el cobro.';

export function textoAvisoAdmin(persona, nombreNatillera, inscritos, cupo) {
  return `🐷 ${escaparHTML(persona ?? 'Alguien')} se unió a ${nombreHTML(nombreNatillera)}. Van ${inscritos} de ${cupo} para arrancar.`;
}

const tecladoAutorizar = (participacionId, conPagos) =>
  new InlineKeyboard().text(botonAutorizar(conPagos), datoAutorizar(participacionId)).row().text(BOTON_NO_AUTORIZAR, datoNoAutorizar(participacionId));

// ---------- El flujo: una sola pregunta, la billetera ----------

export function flujoUnirse({ registro, unirse, log }) {
  return {
    id: ID,
    pasos: [
      {
        clave: 'billetera',
        etiqueta: 'Billetera',
        pregunta: PREGUNTA_BILLETERA,
        ejemplo: 'https://ilp.interledger-test.dev/tu-nombre',
        validar: (texto) => validarBilletera(texto),
      },
    ],

    alTerminar: async (ctx, datos) => {
      const natillera = registro.natilleraPorCodigo(datos.codigo);
      if (!natillera) {
        await ctx.reply(TEXTO_ENLACE_INVALIDO);
        return;
      }
      if (registro.participacionEn(natillera.natillera_id, ctx.from.id)) {
        await ctx.reply(textoFaltaAutorizar(natillera.nombre), { parse_mode: 'HTML' });
        return;
      }
      const resultado = await unirse.inscribir({
        natillera,
        telegramId: ctx.from.id,
        nombre: [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' '),
        billetera: datos.billetera,
      });
      if (resultado.cerrada) {
        await ctx.reply(textoCerrada(natillera.nombre), { parse_mode: 'HTML' });
        return;
      }

      // Ya existe en staging: desde aquí nada se relanza (el flujo quedaría abierto y reintentar
      // inscribiría dos veces).
      try {
        await ctx.reply(textoAutorizar(resultado.estado, { conPagos: unirse.conPagos }), {
          reply_markup: tecladoAutorizar(resultado.participacionId, unirse.conPagos),
        });
      } catch (error) {
        log.error('No se pudo pedir la autorización después de inscribir:', error);
      }
      if (natillera.admin_telegram_id !== ctx.from.id && resultado.inscritos) {
        try {
          await ctx.api.sendMessage(
            natillera.admin_telegram_id,
            textoAvisoAdmin(ctx.from.first_name, natillera.nombre, resultado.inscritos, resultado.estado.CupoMinimo),
            { parse_mode: 'HTML' },
          );
        } catch (error) {
          log.warn(`No se pudo avisar al administrador de ${natillera.natillera_id}: ${error.message}`);
        }
      }
    },
  };
}

// ---------- El enlace y los botones ----------

export function crearUnirseBot({ registro, unirse, motor, log }) {
  const comandos = new Composer();

  // Lo llama /start cuando trae un código. Lee la natillera en staging para mostrar las reglas vigentes.
  async function abrirInvitacion(ctx, codigo) {
    const natillera = registro.natilleraPorCodigo(codigo);
    if (!natillera) {
      await ctx.reply(TEXTO_ENLACE_INVALIDO);
      return;
    }

    // La misma persona dos veces: no se inscribe de nuevo (US-003, casos borde).
    const participacion = registro.participacionEn(natillera.natillera_id, ctx.from.id);
    if (participacion) {
      if ((await unirse.estadoParticipacion(participacion)) === PARTICIPACION_PENDIENTE) {
        const estado = await unirse.leerNatillera(natillera);
        await ctx.reply(textoFaltaAutorizar(natillera.nombre), { parse_mode: 'HTML' });
        await ctx.reply(textoAutorizar(estado, { conPagos: unirse.conPagos }), {
          reply_markup: tecladoAutorizar(participacion.participacion_id, unirse.conPagos),
        });
      } else {
        await ctx.reply(textoYaEstas(natillera.nombre), { parse_mode: 'HTML' });
      }
      return;
    }

    const estado = await unirse.leerNatillera(natillera);
    if (Number(estado.EstadoNatillera) !== NATILLERA_CREADA) {
      await ctx.reply(textoCerrada(natillera.nombre), { parse_mode: 'HTML' });
      return;
    }
    await ctx.reply(textoReglas(estado), {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard().text('Unirme', datoUnirme(codigo)).text('Ahora no', DATO_AHORA_NO),
    });
  }

  const quitarBotones = (ctx) => ctx.editMessageReplyMarkup().catch(() => {});

  comandos.callbackQuery(/^un:si:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await quitarBotones(ctx);
    await motor.iniciar(ctx, ID, { datos: { codigo: ctx.match[1] } });
  });

  comandos.callbackQuery(DATO_AHORA_NO, async (ctx) => {
    await ctx.answerCallbackQuery();
    await quitarBotones(ctx);
    await ctx.reply(TEXTO_AHORA_NO);
  });

  // El botón lleva el id de la participación, que alguien podría copiar: solo actúa para su dueño.
  const deQuienToca = (ctx) => {
    const p = registro.participacion(ctx.match[1]);
    return p && Number(p.telegram_id) === ctx.from.id ? p : null;
  };

  comandos.callbackQuery(/^un:aut:(.+)$/, async (ctx) => {
    const participacion = deQuienToca(ctx);
    if (!participacion) {
      await ctx.answerCallbackQuery({ text: TEXTO_NO_ES_TUYO });
      return;
    }
    await ctx.answerCallbackQuery();
    await quitarBotones(ctx);
    if (unirse.conPagos) {
      await pedirPermiso(ctx, participacion);
      return;
    }
    try {
      await unirse.autorizar(participacion);
    } catch (error) {
      if (!(error instanceof AccionRechazadaError)) throw error;
      log.info(`ConfirmarAutorizacion rechazado para ${participacion.participacion_id}: ${error.motivo}`);
      await ctx.reply(TEXTO_NO_SE_PUDO_AUTORIZAR);
      return;
    }
    await validado(ctx, participacion);
  });

  const validado = (ctx, participacion) =>
    ctx.reply(textoValidado(registro.natillera(participacion.natillera_id)?.nombre ?? 'tu natillera'), { parse_mode: 'HTML' });

  // Con la API de pagos: el permiso se pide y la persona lo aprueba en su billetera. Si la API falla,
  // la persona vuelve a tocar «Autorizar el cobro».
  async function pedirPermiso(ctx, participacion) {
    let pedido;
    try {
      pedido = await unirse.pedirPermiso(participacion, vueltaDelPermiso(ctx.me.username));
    } catch (error) {
      log.error(`No se pudo pedir el permiso de ${participacion.participacion_id}:`, error);
      await ctx.reply(TEXTO_NO_SE_PUDO_AUTORIZAR);
      return;
    }
    if (pedido.yaAutorizo) {
      await validado(ctx, participacion);
      return;
    }
    await ctx.reply(textoAbrirBilletera(pedido.tope), {
      reply_markup: new InlineKeyboard()
        .url(BOTON_ABRIR_BILLETERA, pedido.urlAprobacion)
        .row()
        .text(BOTON_YA_APROBE, datoYaAprobe(pedido.permisoId)),
    });
  }

  // /start permiso_<id> (la billetera trae a la persona de vuelta) o «Ya aprobé». El id llega en un
  // enlace que cualquiera puede escribir: solo actúa para la persona dueña de la participación.
  async function volverDePermiso(ctx, permisoId) {
    const permiso = ID_PERMISO.test(permisoId) ? registro.permiso(permisoId) : null;
    const participacion = permiso && registro.participacion(permiso.participacion_id);
    if (!participacion || Number(participacion.telegram_id) !== ctx.from.id) {
      await ctx.reply(TEXTO_PERMISO_DESCONOCIDO);
      return;
    }
    let resultado;
    try {
      resultado = await unirse.terminarPermiso(permiso);
    } catch (error) {
      if (error instanceof AccionRechazadaError) log.info(`ConfirmarAutorizacion rechazado para ${participacion.participacion_id}: ${error.motivo}`);
      else log.error(`No se pudo terminar el permiso ${permisoId}:`, error);
      await ctx.reply(TEXTO_NO_SE_PUDO_AUTORIZAR);
      return;
    }
    if (resultado.estado === PERMISO.APROBADO) {
      await validado(ctx, participacion);
    } else if (resultado.estado === PERMISO.PENDIENTE) {
      await ctx.reply(TEXTO_PERMISO_PENDIENTE, { reply_markup: new InlineKeyboard().text(BOTON_YA_APROBE, datoYaAprobe(permisoId)) });
    } else {
      log.info(`El permiso ${permisoId} quedó ${resultado.estado}: ${resultado.motivo ?? 'sin motivo'}`);
      await ctx.reply(TEXTO_NO_AUTORIZO);
    }
  }

  comandos.callbackQuery(/^un:per:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await volverDePermiso(ctx, ctx.match[1]);
  });

  comandos.callbackQuery(/^un:nau:(.+)$/, async (ctx) => {
    if (!deQuienToca(ctx)) {
      await ctx.answerCallbackQuery({ text: TEXTO_NO_ES_TUYO });
      return;
    }
    await ctx.answerCallbackQuery();
    await quitarBotones(ctx);
    await ctx.reply(TEXTO_NO_AUTORIZO);
  });

  return { comandos, abrirInvitacion, volverDePermiso };
}
