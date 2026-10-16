import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

// SQLite integrado de Node (decisión D-04), solo para las sesiones del bot. El estado de las
// natilleras no vive aquí: vive en el servicio externo.

export const EN_MEMORIA = ':memory:';

export function abrirBaseDeDatos(ruta) {
  if (ruta !== EN_MEMORIA) mkdirSync(dirname(ruta), { recursive: true });

  const db = new DatabaseSync(ruta);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec(`
    CREATE TABLE IF NOT EXISTS sesiones (
      clave TEXT PRIMARY KEY,
      valor TEXT NOT NULL,
      actualizado TEXT NOT NULL
    );
  `);
  return db;
}

export function contarSesiones(db) {
  return db.prepare('SELECT count(*) AS n FROM sesiones').get().n;
}
