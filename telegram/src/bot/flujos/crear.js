import { Composer, Keyboard } from 'grammy';
import { escaparHTML, formatoCOP, formatoPorcentaje } from '../../formato.js';
import {
  CAMPOS,
  PERIODICIDADES,
  formatoFecha,
  formatoFechaCorta,
  hoyEnBogota,
  primeroDelMesSiguiente,
  resumenNatillera,
  sugerenciasCuota,
  sugerenciasFinal,
  sugerenciasMora,
  sumarDias,
  validarCampo,
  validarNatillera,
} from '../../natillera/reglas.js';

// Crear la natillera (US-001, #13), de dos formas que terminan en el mismo resumen:
// - en el chat, una pregunta a la vez con botones (motor de flujos);
// - con el formulario de la Mini App (miniapp/), que devuelve los datos con sendData.
// El bot vuelve a validar todo lo que llega de la Mini App. Nada se crea hasta confirmar (D-12).

export const ID = 'crear';
export const TIPO_FORMULARIO = 'crear-natillera';
export const BOTON_FORMULARIO = 'Llenar formulario';
export const BOTON_CHAT = 'Responder aquí';
export const MENSAJE_FORMULARIO_ILEGIBLE = 'No pude leer el formulario. Ábrelo otra vez desde el botón.';

export function textoElegir(nombre) {
  return [
    `🐷 ${nombre ? `${nombre}, vamos` : 'Vamos'} a crear tu natillera.`,
    'Llena el formulario o respóndeme aquí, una pregunta a la vez.',
  ].join('\n');
}

export function textoResumen(datos) {
  const { cuotas, porPersona } = resumenNatillera(datos);
  const p = PERIODICIDADES[datos.periodicidad];
  return [
    `🐷 Revisa <b>${escaparHTML(datos.nombre)}</b>: ${formatoCOP(datos.cuota)} ${p.cada}, ${cuotas} ${cuotas === 1 ? 'cuota' : 'cuotas'}.`,
    `Del ${formatoFecha(datos.inicio)} al ${formatoFecha(datos.final, { anio: true })}. Cada quien ahorra ${formatoCOP(porPersona)}, que guarda Financiera Aliada.`,
    `Mínimo ${datos.cupo} personas · mora de ${formatoPorcentaje(datos.mora)} diario.`,
  ].join('\n');
}

// Mientras no exista el contrato con el servicio externo (#5), la natillera no se crea de verdad.
export function textoVistaPrevia(nombre, datos) {
  return [
    `${nombre ? `${nombre}, guardé` : 'Guardé'} los datos de <b>${escaparHTML(datos.nombre)}</b>.`,
    'Todavía no se crea: falta conectar el bot con Financiera Aliada.',
  ].join('\n');
}

export function textoCreada(nombre, datos) {
  return `✅ ¡Listo${nombre ? `, ${nombre}` : ''}! Ya quedó creada <b>${escaparHTML(datos.nombre)}</b>.`;
}

// La dirección de la Mini App lleva los límites de la configuración: es una página estática y no
// puede leer el .env. Igual el bot vuelve a validar lo que llegue.
export function urlFormulario(config) {
  const url = new URL(config.miniappUrl);
  url.searchParams.set('cuotaMin', String(config.cuota.min));
  url.searchParams.set('cuotaMax', String(config.cuota.max));
  url.searchParams.set('moraMax', String(config.moraDiariaMaxPct));
  return url.href;
}

const ETIQUETA = Object.fromEntries(CAMPOS.map((c) => [c.clave, c.etiqueta]));

export function flujoCrear(config, { hoy = () => hoyEnBogota(), crearNatillera } = {}) {
  const limites = { cuota: config.cuota, moraDiariaMaxPct: config.moraDiariaMaxPct };
  const validar = (clave) => (texto, ctx, datos) => validarCampo(clave, texto, { limites, hoy: hoy(), datos });
  const cuotas = sugerenciasCuota(config.cuota);

  const paso = (clave, resto) => ({ clave, etiqueta: ETIQUETA[clave], validar: validar(clave), ...resto });

  return {
    id: ID,
    textoConfirmar: 'Crear natillera',
    pasos: [
      paso('nombre', { pregunta: '¿Cómo se va a llamar la natillera?', ejemplo: 'Los Primos' }),
      paso('cuota', {
        pregunta: '¿De cuánto es la cuota de cada persona?',
        ejemplo: formatoCOP(cuotas[0]),
        opciones: () => cuotas.map((v) => ({ texto: formatoCOP(v), valor: String(v) })),
        columnas: 2,
      }),
      paso('periodicidad', {
        pregunta: '¿Cada cuánto se cobra la cuota?',
        opciones: () => Object.entries(PERIODICIDADES).map(([valor, p]) => ({ texto: p.texto, valor })),
      }),
      paso('inicio', {
        pregunta: '¿Qué día se cobra la primera cuota?',
        ejemplo: () => formatoFechaCorta(primeroDelMesSiguiente(hoy())),
        opciones: () => {
          const h = hoy();
          const primero = primeroDelMesSiguiente(h);
          return [
            { texto: 'Hoy', valor: h },
            { texto: 'En una semana', valor: sumarDias(h, 7) },
            { texto: formatoFecha(primero), valor: primero },
          ];
        },
      }),
      paso('final', {
        pregunta: '¿Hasta qué día va la natillera?',
        ejemplo: (ctx, datos) => {
          const [primera] = sugerenciasFinal(datos.inicio, datos.periodicidad);
          return primera ? formatoFechaCorta(primera.fecha) : '31/12';
        },
        opciones: (ctx, datos) =>
          sugerenciasFinal(datos.inicio, datos.periodicidad).map((o) => ({
            texto: o.diciembre ? `31 de diciembre · ${o.cuotas} cuotas` : `${o.cuotas} cuotas`,
            valor: o.fecha,
          })),
        columnas: 2,
      }),
      paso('cupo', {
        pregunta: '¿Cuántas personas, contándote a ti, se necesitan para arrancar?',
        ejemplo: '5',
        opciones: () => [3, 5, 10, 15].map((n) => ({ texto: String(n), valor: String(n) })),
        columnas: 4,
      }),
      paso('mora', {
        pregunta: '¿Qué mora diaria se cobra si una cuota queda pendiente?',
        ejemplo: formatoPorcentaje(sugerenciasMora(config.moraDiariaMaxPct).at(-1)),
        opciones: () => sugerenciasMora(config.moraDiariaMaxPct).map((v) => ({ texto: formatoPorcentaje(v), valor: String(v) })),
        columnas: 4,
      }),
    ],

    // Las fechas dependen unas de otras y de hoy: se revisan todas antes del resumen y al confirmar.
    revisar: (ctx, datos) => {
      const { errores } = validarNatillera(datos, { limites, hoy: hoy() });
      const clave = CAMPOS.map((c) => c.clave).find((k) => errores[k]);
      return clave ? { clave, error: errores[clave] } : null;
    },

    resumen: (ctx, datos) => textoResumen(datos),

    alTerminar: async (ctx, datos) => {
      const nombre = ctx.from?.first_name;
      // Enganche de #5: aquí el bot le pide al servicio externo crear la natillera.
      if (!crearNatillera) {
        await ctx.reply(textoVistaPrevia(nombre, datos), { parse_mode: 'HTML' });
        return;
      }
      await crearNatillera(datos, ctx);
      // Ya existe en el servicio externo: si el mensaje no sale, no se relanza el error, porque el
      // flujo quedaría abierto y confirmar otra vez crearía la natillera dos veces.
      try {
        await ctx.reply(textoCreada(nombre, datos), { parse_mode: 'HTML' });
      } catch {
        // El manejador de errores del bot no se entera; la natillera quedó creada.
      }
    },
  };
}

// /crear, el botón de la bienvenida y lo que devuelve la Mini App.
export function crear({ config, motor, log, hoy = () => hoyEnBogota() }) {
  const comandos = new Composer();
  const limites = { cuota: config.cuota, moraDiariaMaxPct: config.moraDiariaMaxPct };

  async function empezar(ctx) {
    // Sin Mini App configurada, directo al chat.
    if (!config.miniappUrl) {
      await motor.iniciar(ctx, ID);
      return;
    }
    // sendData solo funciona si la Mini App se abre desde un botón del teclado de abajo (no desde un
    // botón del mensaje): por eso este teclado.
    const teclado = new Keyboard()
      .webApp(BOTON_FORMULARIO, urlFormulario(config))
      .row()
      .text(BOTON_CHAT)
      .resized()
      .oneTime();
    await ctx.reply(textoElegir(ctx.from?.first_name), { reply_markup: teclado });
  }

  comandos.command('crear', empezar);
  comandos.callbackQuery('menu:crear', async (ctx) => {
    await ctx.answerCallbackQuery();
    await empezar(ctx);
  });

  comandos.hears(BOTON_CHAT, async (ctx) => {
    await ctx.reply('Va, te pregunto por aquí.', { reply_markup: { remove_keyboard: true } });
    await motor.iniciar(ctx, ID);
  });

  comandos.on('message:web_app_data', async (ctx) => {
    let carga;
    try {
      carga = JSON.parse(ctx.message.web_app_data.data);
    } catch {
      carga = null;
    }
    if (carga?.tipo !== TIPO_FORMULARIO || typeof carga.datos !== 'object') {
      log.warn(`Formulario de la Mini App con un formato que no se conoce (${ctx.message.web_app_data.data.length} caracteres).`);
      await ctx.reply(MENSAJE_FORMULARIO_ILEGIBLE, { reply_markup: { remove_keyboard: true } });
      return;
    }

    const { datos, errores } = validarNatillera(carga.datos, { limites, hoy: hoy() });
    // Los datos que no sirven se vuelven a preguntar en el chat; el primero que falta sale con su error.
    const faltante = CAMPOS.find((c) => datos[c.clave] === undefined);
    await ctx.reply('Recibí el formulario.', { reply_markup: { remove_keyboard: true } });
    await motor.iniciar(ctx, ID, { datos, error: faltante && errores[faltante.clave] });
  });

  return comandos;
}
