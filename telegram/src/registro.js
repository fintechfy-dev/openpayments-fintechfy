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
    natilleraDelAdmin: db.prepare('SELECT * FROM natilleras WHERE admin_telegram_id = ? ORDER BY creada_en DESC LIMIT 1'),
    participacionEn: db.prepare('SELECT * FROM participaciones WHERE natillera_id = ? AND telegram_id = ?'),
    contarParticipaciones: db.prepare('SELECT count(*) AS n FROM participaciones WHERE natillera_id = ?'),
    guardarParticipacion: db.prepare(
      'INSERT INTO participaciones (participacion_id, contract_id, natillera_id, telegram_id) VALUES (?, ?, ?, ?)',
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
    // La natillera más reciente que administra una persona: la de /invitar.
    natilleraDelAdmin: (telegramId) => sql.natilleraDelAdmin.get(telegramId),
    participacionEn: (natilleraId, telegramId) => sql.participacionEn.get(natilleraId, telegramId),
    contarParticipaciones: (natilleraId) => sql.contarParticipaciones.get(natilleraId).n,
    guardarParticipacion({ participacionId, contractId, natilleraId, telegramId }) {
      sql.guardarParticipacion.run(participacionId, contractId, natilleraId, telegramId);
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
