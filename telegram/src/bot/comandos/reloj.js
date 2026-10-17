import { Composer } from 'grammy';
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

  comandos
    .filter((ctx) => String(ctx.chat?.id) === config.teamChatId)
    .command('reloj', async (ctx) => {
      const { accion, nombre, fecha, segundos } = leerOrden(ctx.match);
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
      const [natillera] = encontradas;

      let n;
      try {
        n = await leer(natillera.contract_id);
      } catch (error) {
        log.error('/reloj no pudo leer staging:', error);
        await ctx.reply(`No pude leer ${natillera.nombre} en staging: ${error.message}`);
        return;
      }

      if (accion === 'estado') return ctx.reply(textoEstado(natillera.nombre, n));
      if (accion === 'cobrar') return ctx.reply(await cobrar(natillera, { esperar: false }));
      if (accion === 'auto') return auto(ctx, natillera, segundos && segundos >= 5 ? segundos : INTERVALO_AUTO_S);
      if (accion === 'mora') return ctx.reply(await mora(natillera, fecha ?? diaDeMora(n)));
      if (accion === 'reintentar') return ctx.reply(await reintentar(natillera, fecha ?? diaDeReintento(n)));

      const [trigger, porDefecto] = {
        iniciar: ['Iniciar', n.FechaInicio],
        periodo: ['AbrirPeriodo', proximoCobro(n)],
        cupo: ['VerificarCupo', limiteCupo(n)],
        liquidar: ['IniciarLiquidacion', n.FechaFinal],
      }[accion];
      const { ok, texto } = await disparar(natillera.contract_id, trigger, fecha ?? porDefecto);
      await ctx.reply(texto);
      const cobrado = ok && (await cobrar(natillera, { trigger }));
      if (cobrado) await ctx.reply(cobrado);
    });

  return comandos;
}
