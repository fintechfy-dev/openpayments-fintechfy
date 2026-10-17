// Lo mínimo que el bot guarda para llamar a staging y para saber a quién avisar: id de Telegram ↔
// ParticipacionId ↔ contractId, y los contractId de la natillera y de sus actividades
// (telegram/INTEGRACION.md). Nada de montos ni estados: esos se leen de staging.
//
// En chats privados el id del chat es el id de Telegram de la persona, por eso no se guardan aparte.

export function crearRegistro(db) {
  const sql = {
    guardarNatillera: db.prepare(
      'INSERT INTO natilleras (natillera_id, contract_id, nombre, admin_telegram_id, creada_en, codigo_invitacion) VALUES (?, ?, ?, ?, ?, ?)',
    ),
    guardarCodigo: db.prepare('UPDATE natilleras SET codigo_invitacion = ? WHERE natillera_id = ? AND codigo_invitacion IS NULL'),
    natilleraPorCodigo: db.prepare('SELECT * FROM natilleras WHERE codigo_invitacion = ?'),
    participacionEn: db.prepare('SELECT * FROM participaciones WHERE natillera_id = ? AND telegram_id = ?'),
    contarParticipaciones: db.prepare('SELECT count(*) AS n FROM participaciones WHERE natillera_id = ?'),
    guardarParticipacion: db.prepare(
      'INSERT INTO participaciones (participacion_id, contract_id, natillera_id, telegram_id, nombre) VALUES (?, ?, ?, ?, ?)',
    ),
    guardarActividad: db.prepare('INSERT INTO actividades (actividad_id, contract_id, natillera_id) VALUES (?, ?, ?)'),
    guardarObligacion: db.prepare('INSERT INTO obligaciones (contract_id, actividad_id, participacion_id) VALUES (?, ?, ?)'),
    natillera: db.prepare('SELECT * FROM natilleras WHERE natillera_id = ?'),
    participacion: db.prepare('SELECT * FROM participaciones WHERE participacion_id = ?'),
    actividad: db.prepare('SELECT * FROM actividades WHERE actividad_id = ?'),
    obligacion: db.prepare(
      `SELECT o.* FROM obligaciones o JOIN participaciones p USING (participacion_id)
       WHERE o.actividad_id = ? AND p.telegram_id = ?`,
    ),
    natilleraPorContrato: db.prepare('SELECT * FROM natilleras WHERE contract_id = ?'),
    participacionPorContrato: db.prepare('SELECT * FROM participaciones WHERE contract_id = ?'),
    actividadPorContrato: db.prepare('SELECT * FROM actividades WHERE contract_id = ?'),
    obligacionPorContrato: db.prepare('SELECT * FROM obligaciones WHERE contract_id = ?'),
    participantes: db.prepare('SELECT telegram_id FROM participaciones WHERE natillera_id = ?'),
    participacionDe: db.prepare('SELECT * FROM participaciones WHERE telegram_id = ? ORDER BY rowid DESC LIMIT 1'),
    guardarSolicitud: db.prepare('INSERT INTO solicitudes (solicitud_id, participacion_id, monto, plazo_meses, creada_en) VALUES (?, ?, ?, ?, ?)'),
    solicitud: db.prepare('SELECT * FROM solicitudes WHERE solicitud_id = ?'),
    solicitudDe: db.prepare('SELECT * FROM solicitudes WHERE participacion_id = ? ORDER BY creada_en DESC, rowid DESC LIMIT 1'),
    guardarPermiso: db.prepare('INSERT INTO permisos (permiso_id, participacion_id, monto, creado_en) VALUES (?, ?, ?, ?)'),
    permiso: db.prepare('SELECT * FROM permisos WHERE permiso_id = ?'),
    permisoDe: db.prepare('SELECT * FROM permisos WHERE participacion_id = ? ORDER BY creado_en DESC, rowid DESC LIMIT 1'),
    participacionesEn: db.prepare('SELECT * FROM participaciones WHERE natillera_id = ? ORDER BY rowid'),
    guardarCobro: db.prepare(
      `INSERT INTO cobros (participacion_id, periodo, monto, estado, motivo, intentado_en) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (participacion_id, periodo) DO UPDATE SET monto = excluded.monto, estado = excluded.estado, motivo = excluded.motivo, intentado_en = excluded.intentado_en`,
    ),
    cobro: db.prepare('SELECT * FROM cobros WHERE participacion_id = ? AND periodo = ?'),
    guardarNombre: db.prepare('UPDATE participaciones SET nombre = ? WHERE participacion_id = ? AND nombre IS NULL'),
    participacionesDe: db.prepare('SELECT * FROM participaciones WHERE telegram_id = ? ORDER BY rowid DESC'),
    natillerasPorNombre: db.prepare('SELECT * FROM natilleras WHERE lower(nombre) = lower(?) OR natillera_id = ? ORDER BY creada_en DESC'),
    natillerasDelAdmin: db.prepare('SELECT * FROM natilleras WHERE admin_telegram_id = ? ORDER BY creada_en DESC'),
    cursor: db.prepare('SELECT valor FROM cursores WHERE fuente = ?'),
    foto: db.prepare('SELECT valor FROM fotos WHERE contract_id = ?'),
    guardarFoto: db.prepare('INSERT INTO fotos (contract_id, valor) VALUES (?, ?) ON CONFLICT (contract_id) DO UPDATE SET valor = excluded.valor'),
    natilleras: db.prepare('SELECT * FROM natilleras ORDER BY creada_en DESC'),
    guardarCursor: db.prepare('INSERT INTO cursores (fuente, valor) VALUES (?, ?) ON CONFLICT (fuente) DO UPDATE SET valor = excluded.valor'),
  };

  return {
    guardarNatillera({ natilleraId, contractId, nombre, adminTelegramId, creadaEn, codigoInvitacion = null }) {
      sql.guardarNatillera.run(natilleraId, contractId, nombre, adminTelegramId, creadaEn, codigoInvitacion);
    },
    // El código del enlace de invitación (US-003). Solo se pone si no tenía: un enlace ya compartido no
    // deja de funcionar. Devuelve el código vigente.
    codigoDeInvitacion(natilleraId, nuevo) {
      sql.guardarCodigo.run(nuevo, natilleraId);
      return sql.natillera.get(natilleraId)?.codigo_invitacion;
    },
    natilleraPorCodigo: (codigo) => sql.natilleraPorCodigo.get(codigo),
    participacionEn: (natilleraId, telegramId) => sql.participacionEn.get(natilleraId, telegramId),
    contarParticipaciones: (natilleraId) => sql.contarParticipaciones.get(natilleraId).n,
    guardarParticipacion({ participacionId, contractId, natilleraId, telegramId, nombre = null }) {
      sql.guardarParticipacion.run(participacionId, contractId, natilleraId, telegramId, nombre);
    },
    // Las personas de una natillera, en el orden en que se unieron (el panel del administrador).
    participacionesEn: (natilleraId) => sql.participacionesEn.all(natilleraId),
    // Para las que se unieron antes de guardar el nombre: se completa la primera vez que se conoce.
    guardarNombre(participacionId, nombre) {
      sql.guardarNombre.run(nombre, participacionId);
    },
    guardarActividad({ actividadId, contractId, natilleraId }) {
      sql.guardarActividad.run(actividadId, contractId, natilleraId);
    },
    guardarObligacion({ contractId, actividadId, participacionId }) {
      sql.guardarObligacion.run(contractId, actividadId, participacionId);
    },

    natillera: (id) => sql.natillera.get(id),
    participacion: (id) => sql.participacion.get(id),
    actividad: (id) => sql.actividad.get(id),
    // La obligación de una persona en una actividad: así un botón no necesita llevar el contractId.
    obligacionDe: (actividadId, telegramId) => sql.obligacion.get(actividadId, telegramId),
    // La participación más reciente de una persona: para los avisos que solo traen su id de Telegram.
    participacionDe: (telegramId) => sql.participacionDe.get(telegramId),
    // Préstamos pedidos desde el bot (US-014): uno a la vez por participación.
    guardarSolicitud({ solicitudId, participacionId, monto, plazoMeses, creadaEn }) {
      sql.guardarSolicitud.run(solicitudId, participacionId, monto, plazoMeses, creadaEn);
    },
    solicitud: (id) => sql.solicitud.get(id),
    solicitudDe: (participacionId) => sql.solicitudDe.get(participacionId),
    // Permisos de cobro pedidos a la API de pagos (US-005).
    guardarPermiso({ permisoId, participacionId, monto, creadoEn }) {
      sql.guardarPermiso.run(permisoId, participacionId, monto, creadoEn);
    },
    permiso: (id) => sql.permiso.get(id),
    // El último permiso pedido por una participación: su tope se muestra en «Mi natillera».
    permisoDe: (participacionId) => sql.permisoDe.get(participacionId),
    // Cobros de cuota hechos por el bot (externo/cobros.js): el último intento de cada periodo.
    guardarCobro({ participacionId, periodo, monto, estado, motivo = null, intentadoEn }) {
      sql.guardarCobro.run(participacionId, periodo, monto, estado, motivo, intentadoEn);
    },
    cobro: (participacionId, periodo) => sql.cobro.get(participacionId, periodo),
    // Para «Mi natillera»: todas las de una persona, la más reciente primero.
    participacionesDe: (telegramId) => sql.participacionesDe.all(telegramId),
    natillerasDelAdmin: (telegramId) => sql.natillerasDelAdmin.all(telegramId),
    // Para /reloj: por nombre sin importar mayúsculas, o por su id.
    natillerasPorNombre: (texto) => sql.natillerasPorNombre.all(texto, texto),
    // El último aviso leído de una fuente (avisos/pagos.js); undefined si nunca leyó.
    cursor: (fuente) => sql.cursor.get(fuente)?.valor,
    guardarCursor(fuente, valor) {
      sql.guardarCursor.run(fuente, valor);
    },
    // La última foto de un contrato que vio avisos/estados.js; undefined si nunca lo vio.
    foto(contractId) {
      const fila = sql.foto.get(contractId);
      return fila ? JSON.parse(fila.valor) : undefined;
    },
    guardarFoto(contractId, foto) {
      sql.guardarFoto.run(contractId, JSON.stringify(foto));
    },
    natilleras: () => sql.natilleras.all(),

    // Para los avisos que solo traen el contrato que los originó.
    porContrato(contractId) {
      for (const tipo of ['natillera', 'participacion', 'actividad', 'obligacion']) {
        const fila = sql[`${tipo}PorContrato`].get(contractId);
        if (fila) return { tipo, fila };
      }
      return null;
    },

    // Administrador y participantes, sin repetir: el administrador también puede ahorrar.
    chatsDelGrupo(natilleraId) {
      const natillera = sql.natillera.get(natilleraId);
      if (!natillera) return [];
      const ids = [natillera.admin_telegram_id, ...sql.participantes.all(natilleraId).map((f) => f.telegram_id)];
      return [...new Set(ids.map(Number))];
    },
  };
}
