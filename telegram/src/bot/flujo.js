import { Composer, GrammyError, InlineKeyboard } from 'grammy';
import { escaparHTML } from '../formato.js';

// Motor de flujos (decisiones D-10 a D-12, D-21). Un flujo es una lista de pasos que se preguntan uno
// a la vez, con un ejemplo y, si hay, botones con las respuestas más comunes. La sesión guarda solo
// { id, paso, datos, mensajeId, corrigiendo }: tras un reinicio el bot reencuentra la definición por
// su id. Nada se crea hasta el final: ahí se llama a `alTerminar` una vez.
//
// Un paso es { clave, etiqueta, pregunta, ejemplo?, validar?, opciones?, columnas? }. `pregunta` y
// `ejemplo` pueden ser funciones (ctx, datos). `validar(texto, ctx, datos)` devuelve { valor } o
// { error }. `opciones(ctx, datos)` devuelve [{ texto, valor }]: un botón manda `valor` por el mismo
// camino que si la persona lo hubiera escrito, así que también se valida.
//
// Si el flujo tiene `resumen(ctx, datos)`, al final se muestra con tres botones: confirmar
// (`textoConfirmar`), corregir un dato o cancelar. `revisar(ctx, datos)` puede devolver
// { clave, error } para volver a preguntar un dato que dejó de servir (por ejemplo, una fecha).
//
// Las preguntas se muestran en una sola tarjeta: un botón la edita en su lugar; una respuesta escrita
// quita los botones de la anterior y manda una nueva. Los mensajes van con parse_mode HTML: todo lo
// que escribió una persona pasa por escaparHTML.
//
// Si `alTerminar` lanza un error, grammY no guarda la sesión: el flujo sigue donde estaba y la
// persona puede reintentar.

export const MENSAJE_FLUJO_PERDIDO = 'Lo que estabas haciendo ya no está disponible. Empieza de nuevo cuando quieras.';
export const MENSAJE_CANCELADO = 'Listo, lo dejamos así. No se guardó nada de lo que respondiste.';
export const MENSAJE_NADA_QUE_CANCELAR = 'No tienes nada en curso para cancelar.';
export const AVISO_PREGUNTA_VIEJA = 'Esa pregunta ya pasó.';
export const AVISO_INACTIVO = 'Esto ya no está activo.';
export const AVISO_USA_BOTONES = 'Revisa el resumen y escoge una opción.';

const RESUMEN = 'resumen';
const CORREGIR = 'corregir';
const HTML = { parse_mode: 'HTML' };

// Prefijo de los botones del motor. Los datos de un botón no pueden pasar de 64 bytes (Telegram).
const PREFIJO = 'f:';

export function barraDeAvance(i, n) {
  return `<b>Paso ${i + 1} de ${n}</b>  ${'▰'.repeat(i + 1)}${'▱'.repeat(n - i - 1)}`;
}

function valorDe(campo, ctx, datos) {
  return typeof campo === 'function' ? campo(ctx, datos) : campo;
}

function esComando(mensaje) {
  return mensaje.entities?.some((e) => e.type === 'bot_command' && e.offset === 0) ?? false;
}

function datoDeBoton(texto) {
  const dato = PREFIJO + texto;
  if (new TextEncoder().encode(dato).length > 64) throw new Error(`Botón demasiado largo: ${dato}`);
  return dato;
}

function filas(teclado, botones, columnas) {
  botones.forEach((b, i) => {
    if (i > 0 && i % columnas === 0) teclado.row();
    teclado.text(b.texto, datoDeBoton(b.dato));
  });
  if (botones.length) teclado.row();
  return teclado;
}

function noCambio(error) {
  return error instanceof GrammyError && /message is not modified/i.test(error.description);
}

export function crearMotorDeFlujos() {
  const flujos = new Map();

  function registrar(def) {
    if (flujos.has(def.id)) throw new Error(`El flujo ${def.id} ya está registrado.`);
    if (!def.pasos?.length) throw new Error(`El flujo ${def.id} no tiene pasos.`);
    flujos.set(def.id, def);
  }

  // Quita los botones de la tarjeta anterior para que no queden respuestas viejas a la mano.
  async function quitarBotones(ctx, mensajeId) {
    if (!mensajeId) return;
    try {
      await ctx.api.editMessageReplyMarkup(ctx.chat.id, mensajeId, { reply_markup: { inline_keyboard: [] } });
    } catch {
      // El mensaje pudo borrarse o ser muy viejo: no importa.
    }
  }

  // Con un botón, edita la tarjeta en su lugar; con texto escrito, manda una nueva.
  async function mostrar(ctx, texto, teclado) {
    const estado = ctx.session.flujo;
    const extra = { ...HTML, reply_markup: teclado };
    const mensaje = ctx.callbackQuery?.message;
    if (mensaje) {
      try {
        await ctx.editMessageText(texto, extra);
      } catch (error) {
        if (!noCambio(error)) throw error;
      }
      if (estado) estado.mensajeId = mensaje.message_id;
      return;
    }
    await quitarBotones(ctx, estado?.mensajeId);
    const enviado = await ctx.reply(texto, extra);
    if (estado) estado.mensajeId = enviado?.message_id;
  }

  async function preguntar(ctx, def, { error } = {}) {
    const estado = ctx.session.flujo;
    const paso = def.pasos[estado.paso];
    const ejemplo = valorDe(paso.ejemplo, ctx, estado.datos);
    let cabeza;
    if (error) cabeza = escaparHTML(error);
    else if (estado.corrigiendo) cabeza = `<b>Corrige: ${escaparHTML(paso.etiqueta)}</b>`;
    else cabeza = barraDeAvance(estado.paso, def.pasos.length);

    const texto = [cabeza, escaparHTML(valorDe(paso.pregunta, ctx, estado.datos)), ejemplo ? `Ejemplo: ${escaparHTML(ejemplo)}` : null]
      .filter(Boolean)
      .join('\n');

    const opciones = paso.opciones?.(ctx, estado.datos) ?? [];
    const teclado = filas(
      new InlineKeyboard(),
      opciones.map((o) => ({ texto: o.texto, dato: `p:${estado.paso}:${o.valor}` })),
      paso.columnas ?? 3,
    ).text('Cancelar', datoDeBoton('x'));
    await mostrar(ctx, texto, teclado);
  }

  function tecladoResumen(def) {
    return new InlineKeyboard()
      .text(def.textoConfirmar ?? 'Confirmar', datoDeBoton('ok'))
      .row()
      .text('Corregir un dato', datoDeBoton('c'))
      .text('Cancelar', datoDeBoton('x'));
  }

  async function mostrarResumen(ctx, def) {
    const estado = ctx.session.flujo;
    ctx.session.flujo = { ...estado, paso: RESUMEN, corrigiendo: false };
    await mostrar(ctx, def.resumen(ctx, estado.datos), tecladoResumen(def));
  }

  async function terminar(ctx, def, datos) {
    ctx.session.flujo = null;
    await def.alTerminar(ctx, datos);
    // Después de alTerminar: si falla, la tarjeta conserva sus botones para reintentar.
    if (ctx.callbackQuery?.message) await quitarBotones(ctx, ctx.callbackQuery.message.message_id);
  }

  // Lleva al primer dato que falta; si no falta ninguno, al resumen (o termina si no hay resumen).
  async function siguiente(ctx, def, { error } = {}) {
    const estado = ctx.session.flujo;
    const i = def.pasos.findIndex((p) => estado.datos[p.clave] === undefined);
    if (i !== -1) {
      ctx.session.flujo = { ...estado, paso: i };
      await preguntar(ctx, def, { error });
      return;
    }
    const problema = def.revisar?.(ctx, estado.datos);
    if (problema) {
      const { [problema.clave]: _, ...resto } = estado.datos;
      ctx.session.flujo = { ...estado, datos: resto };
      await siguiente(ctx, def, { error: problema.error });
      return;
    }
    if (def.resumen) await mostrarResumen(ctx, def);
    else await terminar(ctx, def, estado.datos);
  }

  async function responder(ctx, def, texto) {
    const estado = ctx.session.flujo;
    const paso = def.pasos[estado.paso];
    const resultado = paso.validar ? await paso.validar(texto, ctx, estado.datos) : { valor: String(texto).trim() };
    if (resultado.error) {
      await preguntar(ctx, def, { error: resultado.error });
      return;
    }
    ctx.session.flujo = { ...estado, datos: { ...estado.datos, [paso.clave]: resultado.valor } };
    await siguiente(ctx, def);
  }

  // `datos` permite empezar con respuestas que ya llegaron (por ejemplo, de la Mini App); `error` se
  // muestra con la primera pregunta que falte.
  async function iniciar(ctx, id, { datos = {}, error } = {}) {
    const def = flujos.get(id);
    if (!def) throw new Error(`No existe el flujo ${id}.`);
    const anterior = ctx.session.flujo?.mensajeId;
    ctx.session.flujo = { id, paso: 0, datos: { ...datos }, mensajeId: undefined, corrigiendo: false };
    await quitarBotones(ctx, anterior);
    await siguiente(ctx, def, { error });
  }

  async function cancelar(ctx) {
    const estado = ctx.session.flujo;
    if (!estado) {
      await ctx.reply(MENSAJE_NADA_QUE_CANCELAR);
      return;
    }
    ctx.session.flujo = null;
    if (ctx.callbackQuery?.message) {
      await ctx.editMessageText(MENSAJE_CANCELADO);
      return;
    }
    await quitarBotones(ctx, estado.mensajeId);
    await ctx.reply(MENSAJE_CANCELADO);
  }

  // Devuelve la definición del flujo en curso, o null si se perdió (y avisa).
  async function flujoVigente(ctx) {
    const estado = ctx.session.flujo;
    const def = flujos.get(estado.id);
    const pasoValido = estado.paso === RESUMEN || estado.paso === CORREGIR || def?.pasos[estado.paso];
    if (def && pasoValido) return def;
    ctx.session.flujo = null;
    await ctx.reply(MENSAJE_FLUJO_PERDIDO);
    return null;
  }

  async function alBoton(ctx) {
    const accion = ctx.callbackQuery.data.slice(PREFIJO.length);
    const estado = ctx.session.flujo;

    if (!estado) {
      await ctx.answerCallbackQuery({ text: AVISO_INACTIVO });
      await quitarBotones(ctx, ctx.callbackQuery.message?.message_id);
      return;
    }
    const def = await flujoVigente(ctx);
    if (!def) {
      await ctx.answerCallbackQuery();
      return;
    }

    if (accion === 'x') {
      await ctx.answerCallbackQuery();
      await cancelar(ctx);
      return;
    }

    if (accion.startsWith('p:')) {
      const [, paso, ...resto] = accion.split(':');
      if (Number(paso) !== estado.paso) {
        await ctx.answerCallbackQuery({ text: AVISO_PREGUNTA_VIEJA });
        return;
      }
      await ctx.answerCallbackQuery();
      await responder(ctx, def, resto.join(':'));
      return;
    }

    const enResumen = estado.paso === RESUMEN || estado.paso === CORREGIR;
    if (!enResumen) {
      await ctx.answerCallbackQuery({ text: AVISO_PREGUNTA_VIEJA });
      return;
    }
    await ctx.answerCallbackQuery();

    if (accion === 'ok') {
      // Se revisa otra vez al confirmar: una fecha pudo dejar de servir desde que se vio el resumen.
      // Si algo falla, `siguiente` vuelve a preguntar ese dato con su error.
      if (def.revisar?.(ctx, estado.datos)) {
        await siguiente(ctx, def);
        return;
      }
      await terminar(ctx, def, estado.datos);
    } else if (accion === 'c') {
      ctx.session.flujo = { ...estado, paso: CORREGIR };
      const teclado = filas(
        new InlineKeyboard(),
        def.pasos.map((p, i) => ({ texto: p.etiqueta, dato: `e:${i}` })),
        2,
      ).text('Volver al resumen', datoDeBoton('r'));
      await mostrar(ctx, '¿Qué dato quieres corregir?', teclado);
    } else if (accion === 'r') {
      await mostrarResumen(ctx, def);
    } else if (accion.startsWith('e:')) {
      const i = Number(accion.slice(2));
      const paso = def.pasos[i];
      if (!paso) return;
      const { [paso.clave]: _, ...resto } = estado.datos;
      ctx.session.flujo = { ...estado, paso: i, datos: resto, corrigiendo: true };
      await preguntar(ctx, def);
    }
  }

  function middleware() {
    const composer = new Composer();

    // Con un flujo en curso, los textos que no son comandos son respuestas del flujo.
    composer.on('message:text', async (ctx, next) => {
      if (!ctx.session.flujo || esComando(ctx.message)) return next();
      const def = await flujoVigente(ctx);
      if (!def) return;
      const { paso } = ctx.session.flujo;
      if (paso === RESUMEN || paso === CORREGIR) {
        // En el resumen se responde con botones: se vuelve a mostrar abajo para tenerlo a la mano.
        await ctx.reply(AVISO_USA_BOTONES);
        await mostrarResumen(ctx, def);
        return;
      }
      await responder(ctx, def, ctx.message.text);
    });

    composer.callbackQuery(/^f:/, alBoton);
    return composer;
  }

  return { registrar, iniciar, cancelar, middleware };
}
