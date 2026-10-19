import { Composer, InlineKeyboard } from 'grammy';
import { estadoDe, AccionRechazadaError } from '../../externo/cliente.js';
import { sumarDias, sumarMeses } from '../../natillera/reglas.js';
import { textoCobros } from '../../externo/cobros.js';

// /reloj: mueve el tiempo de una natillera en staging para probarla (solo en el chat del equipo, como
// /diag; no se anuncia). Las acciones del reloj (Iniciar, AbrirPeriodo, VerificarCupo,
// CausarMoraDiaria, IniciarLiquidacion) son privadas en staging: piden un token con rol admin. Cada
// una lleva CurrentDate, la fecha simulada: staging cree que llegó ese día.
//
// `/reloj auto <natillera> [segundos]` da un paso cada tantos segundos (60 por defecto): así una cuota
// mensual pasa cada minuto. Staging no tiene periodicidad menor a un mes; lo que se acelera es el reloj.

export const INTERVALO_AUTO_S = 60;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export const AYUDA = [
  'Reloj de staging (fechas simuladas, AAAA-MM-DD):',
  '/reloj  · solo, muestra botones con las natilleras y sus acciones',
  '/reloj estado <natillera>',
  '/reloj iniciar <natillera> [fecha]  · por defecto, la fecha de inicio',
  '/reloj periodo <natillera> [fecha]  · abre la siguiente cuota',
  '/reloj cupo <natillera> [fecha]  · revisa el cupo al vencer la espera',
  '/reloj mora <natillera> [fecha]  · causa un día de mora a quien deba',
  '/reloj liquidar <natillera> [fecha]  · por defecto, la fecha final',
  '/reloj reintentar <natillera> [fecha]  · reintenta los pagos de liquidación que fallaron (día después de la final)',
  `/reloj auto <natillera> [segundos]  · un paso cada ${INTERVALO_AUTO_S} s hasta liquidar`,
  '/reloj cobrar <natillera>  · con COBRAR_CUOTAS_BOT=si, cobra las cuotas que staging ya registró',
  '/reloj parar',
].join('\n');

// Botones del reloj: lo mismo que /reloj sin escribir nombres ni fechas. `/reloj` solo muestra las
// natilleras; al elegir una salen sus acciones, y cada resultado vuelve a traer los botones.
export const PANEL = 'Reloj de staging. Elige la natillera:';
export const MAX_NATILLERAS_PANEL = 10;
export const ACCIONES_BOTON = [
  ['siguiente', '▶ Siguiente paso'],
  ['estado', 'Estado'],
  ['iniciar', 'Iniciar'],
  ['periodo', 'Abrir cuota'],
  ['cupo', 'Revisar cupo'],
  ['mora', 'Causar mora'],
  ['cobrar', 'Cobrar cuotas'],
  ['liquidar', 'Liquidar'],
  ['reintentar', 'Reintentar liquidación'],
  ['auto', 'Automático'],
  ['parar', 'Parar automático'],
];
const ACCIONES = new Set(ACCIONES_BOTON.map(([accion]) => accion));
// El natillera_id cabe en los 64 bytes de callback_data: «rl:a:reintentar:nat-<uuid>» son 56.
export const datoNatillera = (natilleraId) => `rl:n:${natilleraId}`;
export const datoAccion = (accion, natilleraId) => `rl:a:${accion}:${natilleraId}`;

export function tecladoNatilleras(natilleras) {
  return InlineKeyboard.from(natilleras.map((n) => [InlineKeyboard.text(n.nombre, datoNatillera(n.natillera_id))]));
}

// «Siguiente paso» solo arriba; el resto, de a dos por fila.
export function tecladoAcciones(natilleraId) {
  const [primero, ...resto] = ACCIONES_BOTON;
  const filas = [[primero]];
  for (let i = 0; i < resto.length; i += 2) filas.push(resto.slice(i, i + 2));
  return InlineKeyboard.from(filas.map((fila) => fila.map(([accion, texto]) => InlineKeyboard.text(texto, datoAccion(accion, natilleraId)))));
}

const ESTADOS = ['CREADA', 'INICIADA', 'ACTIVA', 'LIQUIDANDO', 'REEMBOLSANDO', 'CERRADA', 'CERRADA_SIN_CUPO'];

// '/reloj iniciar los amigos 2026-11-01' → { accion: 'iniciar', nombre: 'los amigos', fecha: '2026-11-01' }.
export function leerOrden(texto) {
  const partes = String(texto ?? '').trim().split(/\s+/).filter(Boolean);
  const accion = (partes.shift() ?? '').toLowerCase();
  let fecha = null;
  let segundos = null;
  if (partes.length && FECHA.test(partes.at(-1))) fecha = partes.pop();
  else if (accion === 'auto' && partes.length > 1 && /^\d+$/.test(partes.at(-1))) segundos = Number(partes.pop());
  return { accion, nombre: partes.join(' '), fecha, segundos };
}

// La fecha de la cuota que sigue: la que dice staging o, si no la tiene, inicio + cuotas abiertas.
const proximoCobro = (n) => n.FechaProximoCobro || sumarMeses(n.FechaInicio, Number(n.PeriodoActual) || 0);
const limiteCupo = (n) => n.FechaLimiteCupo || sumarDias(n.FechaInicio, Number(n.DiasEsperaCupo) || 0);
// El día después del último cobro: cuando una cuota que falló empieza a causar mora.
const diaDeMora = (n) => sumarDias(sumarMeses(n.FechaInicio, Math.max(0, (Number(n.PeriodoActual) || 1) - 1)), 1);
// El reintento de la liquidación corre a diario después de la fecha final: por defecto, el día siguiente.
const diaDeReintento = (n) => sumarDias(n.FechaFinal, 1);

// El paso que sigue en la vida de la natillera, o null si ya terminó. Lo usa /reloj auto.
export function siguientePaso(n) {
  const estado = Number(n.EstadoNatillera);
  if (estado === 0) return { trigger: 'Iniciar', fecha: n.FechaInicio };
  if (estado === 1) return { trigger: 'VerificarCupo', fecha: limiteCupo(n) };
  if (estado === 2) {
    return Number(n.PeriodoActual) < Number(n.NumeroCuotas)
      ? { trigger: 'AbrirPeriodo', fecha: proximoCobro(n) }
      : { trigger: 'IniciarLiquidacion', fecha: n.FechaFinal };
  }
  return null;
}

export function textoEstado(nombre, n) {
  return [
    `${nombre}: ${ESTADOS[Number(n.EstadoNatillera)] ?? n.EstadoNatillera}`,
    `Cuota ${n.PeriodoActual} de ${n.NumeroCuotas} · próximo cobro ${n.FechaProximoCobro ?? '—'}`,
    `Validados ${n.ParticipantesValidados} · pagaron la primera ${n.PagosPrimeraCuota} · cupo ${n.CupoMinimo}`,
    `Saldo ${n.SaldoNatillera} · inicio ${n.FechaInicio} · final ${n.FechaFinal}`,
  ].join('\n');
}

// Lo que cambió según staging (results[].changes), en pocas líneas.
export function textoResultado(trigger, fecha, respuesta, maximo = 8) {
  const cambios = (respuesta?.results ?? []).flatMap((r) =>
    (r.changes ?? []).map((c) => `${c.conceptName}: ${c.previousValue ?? '—'} → ${c.newValue ?? '—'}`),
  );
  const cabeza = `✓ ${trigger} con fecha ${fecha}: corrió.`;
  if (!cambios.length) return `${cabeza} Sin cambios en este contrato; la cascada sigue en staging.`;
  const extra = cambios.length > maximo ? [`… y ${cambios.length - maximo} cambios más`] : [];
  return [cabeza, ...cambios.slice(0, maximo), ...extra].join('\n');
}

// Los pasos después de los cuales staging registra cuotas: ahí el bot las cobra de verdad.
export const PASOS_CON_COBRO = ['Iniciar', 'AbrirPeriodo'];

export const SIN_COBRADOR = 'El bot no cobra las cuotas: las cobra staging con la API de pagos (COBRAR_CUOTAS_BOT=si las cobra el bot).';

// `cobrador` (externo/cobros.js): con COBRAR_CUOTAS_BOT=si, después de cada paso con cobro el bot saca
// la cuota de cada billetera y la deja en la cuenta madre. Sin él, las cobra staging (modo real).
export function reloj({ config, registro, servicio, log, cobrador, programar = setInterval, cancelar = clearInterval }) {
  const comandos = new Composer();
  const leer = async (contractId) => estadoDe(await servicio.leerContrato(contractId));
  const autos = new Map();

  // El texto de los cobros para el chat del equipo, o null si no aplica. Un fallo aquí no tumba el reloj.
  async function cobrar(natillera, { trigger = null, esperar = true } = {}) {
    if (!cobrador) return trigger ? null : SIN_COBRADOR;
    if (trigger && !PASOS_CON_COBRO.includes(trigger)) return null;
    try {
      const resultados = esperar ? await cobrador.cobrarDespuesDe(natillera) : await cobrador.cobrarPendientes(natillera);
      return textoCobros(natillera.nombre, resultados);
    } catch (error) {
      log.error(`No se pudieron cobrar las cuotas de ${natillera.natillera_id}:`, error);
      return `✗ No pude cobrar las cuotas de ${natillera.nombre}: ${error.message}`;
    }
  }

  async function disparar(contractId, trigger, fecha) {
    try {
      const respuesta = await servicio.disparar(contractId, trigger, { CurrentDate: { type: 'Date', value: fecha } });
      return { ok: true, texto: textoResultado(trigger, fecha, respuesta) };
    } catch (error) {
      if (error instanceof AccionRechazadaError) return { ok: false, texto: `✗ ${trigger} con fecha ${fecha}: staging no la dejó correr. ${error.motivo}` };
      log.error(`/reloj ${trigger} falló:`, error);
      return { ok: false, texto: `✗ ${trigger} con fecha ${fecha}: ${error.message}` };
    }
  }

  // CausarMoraDiaria y ReintentarPagoLiquidacion son de cada participación: se disparan en todas y solo
  // corren en las que aplican (quien debe, o quien tiene su pago de liquidación fallido).
  async function enCadaParticipacion(natillera, trigger, fecha, sinNadie) {
    const lineas = [];
    for (const p of registro.participacionesEn(natillera.natillera_id)) {
      const { ok, texto } = await disparar(p.contract_id, trigger, fecha);
      if (ok) lineas.push(`${p.nombre ?? p.participacion_id}: ${texto}`);
    }
    return lineas.length ? lineas.join('\n') : sinNadie;
  }
  const mora = (natillera, fecha) =>
    enCadaParticipacion(natillera, 'CausarMoraDiaria', fecha, `Nadie tiene cuotas pendientes en ${natillera.nombre} con fecha ${fecha}.`);
  const reintentar = (natillera, fecha) =>
    enCadaParticipacion(natillera, 'ReintentarPagoLiquidacion', fecha, `Nadie tiene pagos de liquidación por reintentar en ${natillera.nombre} con fecha ${fecha}.`);

  function parar(natilleraId) {
    const timer = autos.get(natilleraId);
    if (timer) cancelar(timer);
    autos.delete(natilleraId);
  }

  async function auto(ctx, natillera, segundos) {
    parar(natillera.natillera_id);
    const { api } = ctx;
    const chat = ctx.chat.id;
    const avisar = (texto) => api.sendMessage(chat, texto).catch((e) => log.warn(`/reloj auto no pudo avisar: ${e.message}`));
    let ocupado = false;

    const paso = async () => {
      if (ocupado) return;
      ocupado = true;
      try {
        const n = await leer(natillera.contract_id);
        const siguiente = siguientePaso(n);
        if (!siguiente) {
          parar(natillera.natillera_id);
          await avisar(`${natillera.nombre} ya terminó (${ESTADOS[Number(n.EstadoNatillera)]}). Paré el reloj.`);
          return;
        }
        const { ok, texto } = await disparar(natillera.contract_id, siguiente.trigger, siguiente.fecha);
        await avisar(texto);
        const cobrado = ok && (await cobrar(natillera, { trigger: siguiente.trigger }));
        if (cobrado) await avisar(cobrado);
        if (!ok) {
          parar(natillera.natillera_id);
          await avisar('Paré el reloj automático. Revisa con /reloj estado y sigue a mano.');
        }
      } catch (error) {
        parar(natillera.natillera_id);
        log.error('/reloj auto falló:', error);
        await avisar(`No pude leer ${natillera.nombre} en staging: ${error.message}. Paré el reloj.`);
      } finally {
        ocupado = false;
      }
    };

    autos.set(natillera.natillera_id, programar(paso, segundos * 1000));
    await ctx.reply(`Reloj automático de ${natillera.nombre}: un paso cada ${segundos} s. Doy el primero ya. /reloj parar para detenerlo.`);
    await paso();
  }

  // Lo que hace cada acción sobre una natillera: los mensajes que responde, en orden (un paso con cobro
  // responde dos). `auto` responde por su cuenta porque sigue avisando en cada paso.
  async function ejecutar(ctx, accion, natillera, { fecha = null, segundos = null } = {}) {
    if (accion === 'parar') {
      const andaba = autos.has(natillera.natillera_id);
      parar(natillera.natillera_id);
      return [andaba ? `Paré el reloj automático de ${natillera.nombre}.` : `${natillera.nombre} no tenía reloj automático andando.`];
    }

    let n;
    try {
      n = await leer(natillera.contract_id);
    } catch (error) {
      log.error('/reloj no pudo leer staging:', error);
      return [`No pude leer ${natillera.nombre} en staging: ${error.message}`];
    }

    if (accion === 'estado') return [textoEstado(natillera.nombre, n)];
    if (accion === 'cobrar') return [await cobrar(natillera, { esperar: false })];
    if (accion === 'auto') {
      await auto(ctx, natillera, segundos && segundos >= 5 ? segundos : INTERVALO_AUTO_S);
      return [];
    }
    if (accion === 'mora') return [await mora(natillera, fecha ?? diaDeMora(n))];
    if (accion === 'reintentar') return [await reintentar(natillera, fecha ?? diaDeReintento(n))];

    let trigger;
    let porDefecto;
    if (accion === 'siguiente') {
      const paso = siguientePaso(n);
      if (!paso) return [`${natillera.nombre} ya terminó (${ESTADOS[Number(n.EstadoNatillera)]}): no hay siguiente paso.`];
      ({ trigger, fecha: porDefecto } = paso);
    } else {
      [trigger, porDefecto] = {
        iniciar: ['Iniciar', n.FechaInicio],
        periodo: ['AbrirPeriodo', proximoCobro(n)],
        cupo: ['VerificarCupo', limiteCupo(n)],
        liquidar: ['IniciarLiquidacion', n.FechaFinal],
      }[accion];
    }
    const { ok, texto } = await disparar(natillera.contract_id, trigger, fecha ?? porDefecto);
    const cobrado = ok && (await cobrar(natillera, { trigger }));
    return cobrado ? [texto, cobrado] : [texto];
  }

  async function mostrarPanel(ctx) {
    const natilleras = registro.natillerasRecientes(MAX_NATILLERAS_PANEL);
    if (!natilleras.length) return ctx.reply('Todavía no hay natilleras registradas en el bot.');
    return ctx.reply(PANEL, { reply_markup: tecladoNatilleras(natilleras) });
  }

  // El botón trae el natillera_id: natillerasPorNombre también busca por id.
  const natilleraPorId = (natilleraId) => registro.natillerasPorNombre(natilleraId).find((n) => n.natillera_id === natilleraId);

  const equipo = comandos.filter((ctx) => String(ctx.chat?.id) === config.teamChatId);

  equipo.command('reloj', async (ctx) => {
    const { accion, nombre, fecha, segundos } = leerOrden(ctx.match);
    if (!accion) return mostrarPanel(ctx);
    if (accion === 'parar') {
      const cuantos = autos.size;
      for (const id of [...autos.keys()]) parar(id);
      await ctx.reply(cuantos ? `Paré ${cuantos} reloj(es) automático(s).` : 'No había relojes automáticos andando.');
      return;
    }
    if (!['estado', 'iniciar', 'periodo', 'cupo', 'mora', 'liquidar', 'reintentar', 'auto', 'cobrar'].includes(accion) || !nombre) {
      await ctx.reply(AYUDA);
      return;
    }

    const encontradas = registro.natillerasPorNombre(nombre);
    if (encontradas.length !== 1) {
      await ctx.reply(encontradas.length ? `Hay ${encontradas.length} natilleras «${nombre}»; usa su id (nat-…).` : `No conozco la natillera «${nombre}».`);
      return;
    }
    for (const texto of await ejecutar(ctx, accion, encontradas[0], { fecha, segundos })) await ctx.reply(texto);
  });

  equipo.callbackQuery(/^rl:n:(.+)$/, async (ctx) => {
    const natillera = natilleraPorId(ctx.match[1]);
    if (!natillera) return ctx.answerCallbackQuery({ text: 'Ya no conozco esa natillera.' });
    await ctx.answerCallbackQuery();
    await ctx.reply(`${natillera.nombre}: ¿qué hago?`, { reply_markup: tecladoAcciones(natillera.natillera_id) });
  });

  equipo.callbackQuery(/^rl:a:([a-z]+):(.+)$/, async (ctx) => {
    const [, accion, natilleraId] = ctx.match;
    const natillera = natilleraPorId(natilleraId);
    if (!natillera || !ACCIONES.has(accion)) return ctx.answerCallbackQuery({ text: 'Ese botón ya no sirve. Escribe /reloj otra vez.' });
    await ctx.answerCallbackQuery({ text: 'Voy…' });
    const textos = await ejecutar(ctx, accion, natillera);
    if (!textos.length) textos.push(`${natillera.nombre}: el reloj automático va solo.`);
    // El último mensaje trae otra vez los botones: el siguiente paso queda a un toque.
    for (const [i, texto] of textos.entries()) {
      await ctx.reply(texto, i === textos.length - 1 ? { reply_markup: tecladoAcciones(natillera.natillera_id) } : undefined);
    }
  });

  return comandos;
}
