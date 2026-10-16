import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

// SQLite integrado de Node (decisión D-04): las sesiones del bot y el registro con que llama a staging
// (src/registro.js). El estado de las natilleras no vive aquí: vive en el servicio externo.

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
    CREATE TABLE IF NOT EXISTS natilleras (
      natillera_id TEXT PRIMARY KEY,
      contract_id TEXT NOT NULL UNIQUE,
      nombre TEXT NOT NULL,
      admin_telegram_id INTEGER NOT NULL,
      creada_en TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS participaciones (
      participacion_id TEXT PRIMARY KEY,
      contract_id TEXT NOT NULL UNIQUE,
      natillera_id TEXT NOT NULL REFERENCES natilleras (natillera_id),
      telegram_id INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS actividades (
      actividad_id TEXT PRIMARY KEY,
      contract_id TEXT NOT NULL UNIQUE,
      natillera_id TEXT NOT NULL REFERENCES natilleras (natillera_id)
    );
    CREATE TABLE IF NOT EXISTS obligaciones (
      contract_id TEXT PRIMARY KEY,
      actividad_id TEXT NOT NULL REFERENCES actividades (actividad_id),
      participacion_id TEXT NOT NULL REFERENCES participaciones (participacion_id),
      UNIQUE (actividad_id, participacion_id)
    );
  `);
  return db;
}

export function contarSesiones(db) {
  return db.prepare('SELECT count(*) AS n FROM sesiones').get().n;
}
