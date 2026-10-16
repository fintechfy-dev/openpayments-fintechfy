import { Composer } from 'grammy';

// Motor de flujos (decisiones D-10 a D-12). Un flujo es una lista de pasos que se preguntan uno a la
// vez, con un ejemplo. La sesión guarda solo { id, paso, datos }: tras un reinicio el bot reencuentra
// la definición por su id. Nada se crea hasta el último paso: ahí se llama a `alTerminar` una vez.
//
// Un paso es { clave, pregunta, ejemplo, validar? }. `validar(texto, ctx)` devuelve { valor } si la
// respuesta sirve o { error } con el porqué; sin `validar`, se guarda el texto sin espacios de más.
//
// Si `alTerminar` lanza un error, grammY no guarda la sesión: el flujo sigue en la última pregunta y
// la persona puede volver a responderla sin perder lo anterior.

export const MENSAJE_FLUJO_PERDIDO = 'Lo que estabas haciendo ya no está disponible. Empieza de nuevo cuando quieras.';

export function textoPregunta(paso) {
  return paso.ejemplo ? `${paso.pregunta}\nEjemplo: ${paso.ejemplo}` : paso.pregunta;
}

function esComando(mensaje) {
  return mensaje.entities?.some((e) => e.type === 'bot_command' && e.offset === 0) ?? false;
}

export function crearMotorDeFlujos() {
  const flujos = new Map();

  function registrar(def) {
    if (flujos.has(def.id)) throw new Error(`El flujo ${def.id} ya está registrado.`);
    if (!def.pasos?.length) throw new Error(`El flujo ${def.id} no tiene pasos.`);
    flujos.set(def.id, def);
  }

  async function iniciar(ctx, id) {
    const def = flujos.get(id);
    if (!def) throw new Error(`No existe el flujo ${id}.`);
    ctx.session.flujo = { id, paso: 0, datos: {} };
    await ctx.reply(textoPregunta(def.pasos[0]));
  }

  async function avanzar(ctx, texto) {
    const estado = ctx.session.flujo;
    const def = flujos.get(estado.id);
    const paso = def?.pasos[estado.paso];
    if (!paso) {
      // La sesión apunta a un flujo (o a un paso) que ya no existe, por ejemplo tras cambiar el código.
      ctx.session.flujo = null;
      await ctx.reply(MENSAJE_FLUJO_PERDIDO);
      return;
    }

    const resultado = paso.validar ? await paso.validar(texto, ctx) : { valor: texto.trim() };
    if (resultado.error) {
      await ctx.reply(`${resultado.error}\n${textoPregunta(paso)}`);
      return;
    }

    const datos = { ...estado.datos, [paso.clave]: resultado.valor };
    const siguiente = estado.paso + 1;
    if (siguiente < def.pasos.length) {
      ctx.session.flujo = { id: estado.id, paso: siguiente, datos };
      await ctx.reply(textoPregunta(def.pasos[siguiente]));
      return;
    }

    ctx.session.flujo = null;
    await def.alTerminar(ctx, datos);
  }

  // Con un flujo en curso, los textos que no son comandos son respuestas del flujo.
  function middleware() {
    const composer = new Composer();
    composer.on('message:text', async (ctx, next) => {
      if (!ctx.session.flujo || esComando(ctx.message)) return next();
      await avanzar(ctx, ctx.message.text);
    });
    return composer;
  }

  return { registrar, iniciar, middleware };
}
