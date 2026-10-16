// Adaptador de sesiones de grammY sobre SQLite: cada sesión se guarda como JSON bajo su clave
// (hoy, el id del chat). Así un flujo a medias sobrevive a un reinicio del bot.

export function almacenDeSesiones(db, { ahora = () => new Date() } = {}) {
  const leer = db.prepare('SELECT valor FROM sesiones WHERE clave = ?');
  const escribir = db.prepare(`
    INSERT INTO sesiones (clave, valor, actualizado) VALUES (?, ?, ?)
    ON CONFLICT (clave) DO UPDATE SET valor = excluded.valor, actualizado = excluded.actualizado
  `);
  const borrar = db.prepare('DELETE FROM sesiones WHERE clave = ?');

  return {
    read(clave) {
      const fila = leer.get(clave);
      return fila ? JSON.parse(fila.valor) : undefined;
    },
    write(clave, valor) {
      escribir.run(clave, JSON.stringify(valor), ahora().toISOString());
    },
    delete(clave) {
      borrar.run(clave);
    },
  };
}
