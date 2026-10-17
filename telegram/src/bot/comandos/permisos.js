import { Composer, InlineKeyboard } from 'grammy';
import { formatoCOP } from '../../formato.js';
import { ID_PERMISO, PERMISO, PagosError } from '../../externo/pagos.js';

// /permisos: los permisos de las billeteras de la plataforma (#67), solo en el chat del equipo. De la
// billetera del grupo salen las liquidaciones y los premios; de la financiera, los préstamos. Los
// aprueba una vez el dueño de esa cuenta en la Test Wallet, que es del equipo y no de cada
// administrador. Sin ellos, cada pago falla con 403 y suma al cortacircuitos de staging.
//
// La API de pagos no dice cuál permiso es el vigente de cada rol: el bot guarda el que pidió (o el que
// se le registra con /permisos registrar) en la tabla permisos_rol.

export const ROLES = Object.freeze({ grupo: 'Grupo (liquidaciones y premios)', financiera: 'Financiera (préstamos)' });
// El tope total de cada permiso, en pesos. Alcanza para las natilleras de la demo.
export const TOPE_ROL = 2_000_000;

export const AYUDA_PERMISOS = [
  'Permisos de las billeteras de la plataforma:',
  '/permisos  · estado del de grupo y el de financiera, con botón para pedir el que falte',
  '/permisos registrar <grupo|financiera> <permisoId>  · usar uno ya aprobado',
].join('\n');

// Prefijo `pl:` (plataforma): `pr:` es del préstamo.
export const datoPedir = (tipo) => `pl:pedir:${tipo}`;
export const datoListo = (tipo) => `pl:listo:${tipo}`;

const ICONO = { [PERMISO.APROBADO]: '✓', [PERMISO.PENDIENTE]: '…', [PERMISO.RECHAZADO]: '✗', [PERMISO.CANCELADO]: '✗' };

export function lineaPermiso(tipo, e) {
  const nombre = ROLES[tipo];
  if (!e) return `✗ ${nombre}: sin pedir`;
  if (e.error) return `? ${nombre}: no pude consultarlo (${e.error})`;
  return `${ICONO[e.estado] ?? '?'} ${nombre}: ${e.estado}${e.motivo ? ` · ${e.motivo}` : ''}`;
}

export function textoEstadoPermisos(estados) {
  return ['Permisos de la plataforma:', ...Object.keys(ROLES).map((tipo) => lineaPermiso(tipo, estados[tipo]))].join('\n');
}

// Lo que avisa el lector de avisos de pago cuando un pago de la plataforma falla por falta de permiso.
export const textoAlertaPermiso = (tipo) =>
  `✗ Falló un pago de ${tipo} porque la billetera de la plataforma no tiene permiso aprobado. Revisa con /permisos y, cuando esté aprobado, reintenta con /reloj reintentar <natillera>.`;

export function permisos({ config, registro, pagos, log }) {
  const comandos = new Composer();
  const enEquipo = comandos.filter((ctx) => String(ctx.chat?.id) === config.teamChatId);

  async function consultar(tipo) {
    const id = registro.permisoRol(tipo);
    if (!id) return null;
    try {
      return { id, ...(await pagos.estadoPermiso(id)) };
    } catch (error) {
      return { id, error: error instanceof PagosError ? String(error.estado) : error.message };
    }
  }

  async function responderEstado(ctx) {
    const estados = {};
    for (const tipo of Object.keys(ROLES)) estados[tipo] = await consultar(tipo);
    const teclado = new InlineKeyboard();
    for (const tipo of Object.keys(ROLES)) {
      if (estados[tipo]?.estado !== PERMISO.APROBADO) teclado.text(`Pedir permiso de ${tipo}`, datoPedir(tipo)).row();
    }
    await ctx.reply(textoEstadoPermisos(estados), { reply_markup: teclado.inline_keyboard.length ? teclado : undefined });
  }

  enEquipo.command('permisos', async (ctx) => {
    const [accion, tipo, id] = String(ctx.match ?? '').trim().split(/\s+/);
    if (!accion) return responderEstado(ctx);
    if (accion !== 'registrar' || !(tipo in ROLES) || !ID_PERMISO.test(id ?? '')) return ctx.reply(AYUDA_PERMISOS);

    // Solo se registra uno aprobado: un id mal copiado dejaría a la plataforma sin poder pagar.
    let estado;
    try {
      estado = await pagos.estadoPermiso(id);
    } catch (error) {
      return ctx.reply(`✗ No pude consultar ${id}: ${error.message}`);
    }
    if (estado.estado !== PERMISO.APROBADO) return ctx.reply(`✗ ${id} está ${estado.estado}; solo registro un permiso aprobado.`);
    registro.guardarPermisoRol(tipo, id);
    return ctx.reply(`✓ Registré ${id} como el permiso de ${tipo}.`);
  });

  enEquipo.callbackQuery(/^pl:pedir:(grupo|financiera)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const tipo = ctx.match[1];
    let pedido;
    try {
      // Sin `vuelta`: al aprobar, la billetera muestra que ya se puede cerrar la ventana; se vuelve aquí
      // y se toca «Ya aprobé».
      pedido = await pagos.pedirPermiso({ tipo, monto: TOPE_ROL, referencia: `rol-${tipo}` });
    } catch (error) {
      log.error(`No se pudo pedir el permiso de ${tipo}:`, error);
      return ctx.reply(`✗ No pude pedir el permiso de ${tipo}: ${error.message}`);
    }
    registro.guardarPermisoRol(tipo, pedido.permisoId);
    log.info(`Permiso de ${tipo} ${pedido.permisoId} pedido con tope ${TOPE_ROL}.`);
    await ctx.reply(
      `Ábrelo con la cuenta dueña de la billetera de ${tipo} y apruébalo (tope total ${formatoCOP(TOPE_ROL)}). El enlace vence en unos 10 minutos. Al terminar, vuelve y toca «Ya aprobé».`,
      { reply_markup: new InlineKeyboard().url('Abrir la billetera', pedido.urlAprobacion).row().text('Ya aprobé', datoListo(tipo)) },
    );
  });

  enEquipo.callbackQuery(/^pl:listo:(grupo|financiera)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const tipo = ctx.match[1];
    // Esta consulta, con las llaves, es la que termina el permiso.
    const estado = await consultar(tipo);
    if (estado?.estado === PERMISO.APROBADO) return ctx.reply(`✓ El permiso de ${tipo} quedó aprobado. Ya se pueden reintentar los pagos con /reloj reintentar <natillera>.`);
    if (estado?.estado === PERMISO.PENDIENTE) {
      return ctx.reply(`… El permiso de ${tipo} sigue pendiente. Apruébalo en la billetera y toca otra vez.`, {
        reply_markup: new InlineKeyboard().text('Ya aprobé', datoListo(tipo)),
      });
    }
    return ctx.reply(lineaPermiso(tipo, estado), {
      reply_markup: new InlineKeyboard().text(`Pedir permiso de ${tipo}`, datoPedir(tipo)),
    });
  });

  return comandos;
}
