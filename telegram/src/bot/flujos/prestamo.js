import { Composer, InlineKeyboard } from 'grammy';
import { randomUUID } from 'node:crypto';
import { escaparHTML, formatoCOP } from '../../formato.js';
import { hoyEnBogota } from '../../natillera/reglas.js';
import { estadoDe } from '../../externo/cliente.js';
import {
  elegibilidad,
  sugerenciasMonto,
  sugerenciasPlazo,
  textoPlazo,
  validarMontoPrestamo,
  validarPlazo,
} from '../../natillera/prestamo.js';

// Pedir un préstamo (US-014, #29). Staging no tiene solicitudes: el bot revisa en staging que la persona
// pueda pedirlo (src/natillera/prestamo.js), pregunta monto y plazo, guarda la solicitud y le avisa a la
// web (3.4), donde la financiera decide. Si aprueba, la web crea el crédito en staging y el aviso
// PrestamoDesembolsado le llega a la persona.
//
// Se entra con /prestamo, con /start prestamo (el botón de la Mini App), con el botón del aviso
// ElegibleParaPrestamo o con el de «Mi natillera».

export const ID = 'prestamo';
export const datoPrestamo = (participacionId) => `pr:${participacionId}`;
export const BOTON_PEDIR_PRESTAMO = 'Pedir préstamo';

// ---------- Textos (voz y tono: primero el dato, máximo 3 líneas, la plata ubicada) ----------

export const TEXTO_SIN_NATILLERA = 'Para pedir un préstamo tienes que estar en una natillera. Pídele el enlace a quien la administra.';
export const PREGUNTA_CUAL = '¿En cuál natillera quieres pedir el préstamo?';
export const TEXTO_NO_SE_PUDO_LEER = 'No pude revisar tu natillera ahora. Vuelve a intentarlo en un rato.';
export const TEXTO_NO_ES_TUYO = 'Este botón no es tuyo.';

export const preguntaMonto = (d) => `¿Cuánto necesitas? En ${escaparHTML(d.natillera)} puedes pedir hasta ${formatoCOP(d.maximo)}.`;
export const PREGUNTA_PLAZO = '¿En cuántos meses lo pagas?';

export function textoResumen(d) {
  return [
    `Pides <b>${formatoCOP(d.monto)}</b> a ${textoPlazo(d.plazo)} en <b>${escaparHTML(d.natillera)}</b>.`,
    'Financiera Aliada lo revisa y te dice la tasa y la cuota antes de prestarte.',
    'Se paga aparte de tus cuotas; si al final queda algo pendiente, se descuenta de tu parte.',
  ].join('\n');
}

export const textoSolicitado = (monto) =>
  `✅ Listo: le pasé tu solicitud de ${formatoCOP(monto)} a Financiera Aliada.\nSi la aprueba, te aviso cuando la plata llegue a tu billetera.`;

export const textoCambio = (maximo) =>
  `El monto que puedes pedir cambió: ahora es hasta ${formatoCOP(maximo)}. Empieza de nuevo con /prestamo.`;

// ---------- Lo que se lee de staging ----------

function crearEvaluador({ registro, servicio, hoy }) {
  const leer = async (contractId) => estadoDe(await servicio.leerContrato(contractId));
  return async (participacion) => {
    const natillera = registro.natillera(participacion.natillera_id);
    const [n, p] = await Promise.all([leer(natillera.contract_id), leer(participacion.contract_id)]);
    return { natillera, resultado: elegibilidad(n, p, { hoy: hoy(), solicitud: registro.solicitudDe(participacion.participacion_id) }) };
  };
}

// ---------- El flujo ----------

export function flujoPrestamo({ registro, servicio, web, log, hoy = () => hoyEnBogota(), ahora = () => Date.now(), nuevoId = randomUUID }) {
  const evaluar = crearEvaluador({ registro, servicio, hoy });

  return {
    id: ID,
    textoConfirmar: 'Pedir el préstamo',
    pasos: [
      {
        clave: 'monto',
        etiqueta: 'Monto',
        pregunta: (ctx, d) => preguntaMonto(d),
        ejemplo: (ctx, d) => formatoCOP(sugerenciasMonto(d.maximo)[0]),
        opciones: (ctx, d) => sugerenciasMonto(d.maximo).map((v) => ({ texto: formatoCOP(v), valor: String(v) })),
        columnas: 2,
        validar: (texto, ctx, d) => validarMontoPrestamo(texto, d.maximo),
      },
      {
        clave: 'plazo',
        etiqueta: 'Plazo',
        pregunta: PREGUNTA_PLAZO,
        ejemplo: (ctx, d) => String(sugerenciasPlazo(d.plazoMaximo).at(-1)),
        opciones: (ctx, d) => sugerenciasPlazo(d.plazoMaximo).map((m) => ({ texto: textoPlazo(m), valor: String(m) })),
        columnas: 3,
        validar: (texto, ctx, d) => validarPlazo(texto, d.plazoMaximo),
      },
    ],
    resumen: (ctx, d) => textoResumen(d),

    // Se vuelve a revisar en staging: entre la pregunta y la confirmación pudo quedar una cuota pendiente.
    // Si staging falla, se lanza y el flujo queda en el resumen para reintentar; aún no se guardó nada.
    alTerminar: async (ctx, d) => {
      const participacion = registro.participacion(d.participacionId);
      if (!participacion || Number(participacion.telegram_id) !== ctx.from.id) {
        await ctx.reply(TEXTO_NO_ES_TUYO);
        return;
      }
      const { natillera, resultado } = await evaluar(participacion);
      if (!resultado.puede) {
        await ctx.reply(resultado.texto);
        return;
      }
      if (d.monto > resultado.maximo || d.plazo > resultado.plazoMaximo) {
        await ctx.reply(textoCambio(resultado.maximo));
        return;
      }

      const solicitudId = `sol-${nuevoId()}`;
      const creadaEn = new Date(ahora()).toISOString();
      registro.guardarSolicitud({ solicitudId, participacionId: participacion.participacion_id, monto: d.monto, plazoMeses: d.plazo, creadaEn });
      log.info(`Solicitud de préstamo ${solicitudId} de ${participacion.participacion_id}: ${d.monto} a ${d.plazo} meses.`);
      // No se espera: crearAvisoWeb reintenta y nunca lanza; si la web no responde, el cuerpo queda en el log.
      web?.solicitud({
        solicitudId,
        natilleraId: natillera.natillera_id,
        participacionId: participacion.participacion_id,
        montoMaximo: resultado.maximo,
        montoSolicitado: d.monto,
        plazoMeses: d.plazo,
        fechaSolicitud: creadaEn,
      });
      await ctx.reply(textoSolicitado(d.monto));
    },
  };
}

// ---------- Cómo se entra ----------

export function crearPrestamoBot({ registro, servicio, motor, log, hoy = () => hoyEnBogota() }) {
  const comandos = new Composer();
  const evaluar = crearEvaluador({ registro, servicio, hoy });

  async function empezar(ctx, participacion) {
    let evaluado;
    try {
      evaluado = await evaluar(participacion);
    } catch (error) {
      log.error(`No se pudo revisar el préstamo de ${participacion.participacion_id}:`, error);
      await ctx.reply(TEXTO_NO_SE_PUDO_LEER);
      return;
    }
    const { natillera, resultado } = evaluado;
    if (!resultado.puede) {
      await ctx.reply(resultado.texto);
      return;
    }
    await motor.iniciar(ctx, ID, {
      datos: {
        participacionId: participacion.participacion_id,
        natillera: natillera.nombre,
        maximo: resultado.maximo,
        plazoMaximo: resultado.plazoMaximo,
      },
    });
  }

  // /prestamo y /start prestamo. Con varias natilleras, pregunta en cuál.
  async function abrirPrestamo(ctx) {
    const participaciones = registro.participacionesDe(ctx.from.id).filter((p) => registro.natillera(p.natillera_id));
    if (!participaciones.length) {
      await ctx.reply(TEXTO_SIN_NATILLERA);
      return;
    }
    if (participaciones.length === 1) {
      await empezar(ctx, participaciones[0]);
      return;
    }
    const teclado = InlineKeyboard.from(
      participaciones.map((p) => [InlineKeyboard.text(registro.natillera(p.natillera_id).nombre, datoPrestamo(p.participacion_id))]),
    );
    await ctx.reply(PREGUNTA_CUAL, { reply_markup: teclado });
  }

  comandos.command('prestamo', abrirPrestamo);

  // El botón lleva el id de la participación, que alguien podría copiar: solo actúa para su dueño.
  comandos.callbackQuery(/^pr:(.+)$/, async (ctx) => {
    const participacion = registro.participacion(ctx.match[1]);
    if (!participacion || Number(participacion.telegram_id) !== ctx.from.id) {
      await ctx.answerCallbackQuery({ text: TEXTO_NO_ES_TUYO });
      return;
    }
    await ctx.answerCallbackQuery();
    await empezar(ctx, participacion);
  });

  return { comandos, abrirPrestamo };
}
