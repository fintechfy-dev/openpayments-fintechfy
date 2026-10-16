import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { abrirBaseDeDatos, contarSesiones, EN_MEMORIA } from '../src/db.js';
import { almacenDeSesiones } from '../src/bot/sesion-storage.js';
import { crearBotDePrueba, mensaje } from './helpers/bot-prueba.js';

function carpetaTemporal(t) {
  const carpeta = mkdtempSync(join(tmpdir(), 'natillera-bot-'));
  t.after(() => rmSync(carpeta, { recursive: true, force: true }));
  return carpeta;
}

test('el adaptador lee lo que escribió y borra', () => {
  const db = abrirBaseDeDatos(EN_MEMORIA);
  const almacen = almacenDeSesiones(db);

  assert.equal(almacen.read('100'), undefined);
  almacen.write('100', { flujo: { id: 'eco', paso: 1, datos: { nombre: 'Familia' } } });
  assert.deepEqual(almacen.read('100'), { flujo: { id: 'eco', paso: 1, datos: { nombre: 'Familia' } } });

  almacen.write('100', { flujo: null });
  assert.deepEqual(almacen.read('100'), { flujo: null });
  assert.equal(contarSesiones(db), 1);

  almacen.delete('100');
  assert.equal(almacen.read('100'), undefined);
  db.close();
});

test('la sesión sobrevive a cerrar y reabrir la base, y la carpeta se crea sola', (t) => {
  const ruta = join(carpetaTemporal(t), 'data', 'bot.db');

  const db1 = abrirBaseDeDatos(ruta);
  almacenDeSesiones(db1).write('100', { flujo: { id: 'eco', paso: 1, datos: {} } });
  db1.close();
  assert.ok(existsSync(ruta));

  const db2 = abrirBaseDeDatos(ruta);
  assert.deepEqual(almacenDeSesiones(db2).read('100'), { flujo: { id: 'eco', paso: 1, datos: {} } });
  db2.close();
});

test('un flujo a medias sobrevive a un reinicio del bot', async (t) => {
  const ruta = join(carpetaTemporal(t), 'bot.db');

  // Primer arranque: empieza /crear y responde la primera pregunta.
  const db1 = abrirBaseDeDatos(ruta);
  const antes = crearBotDePrueba({ db: db1 });
  await antes.bot.handleUpdate(mensaje('/crear'));
  await antes.bot.handleUpdate(mensaje('Los Primos'));
  assert.match(antes.llamadas.at(-1).payload.text, /Paso 2 de 7.*\n¿De cuánto es la cuota/);
  db1.close();

  // Segundo arranque, con otro bot y la base reabierta: responde la segunda y sigue con la tercera.
  const db2 = abrirBaseDeDatos(ruta);
  const despues = crearBotDePrueba({ db: db2 });
  await despues.bot.handleUpdate(mensaje('$20.000'));

  assert.match(despues.llamadas.at(-1).payload.text, /Paso 3 de 7.*\n¿Cada cuánto se cobra la cuota\?/);
  // La tarjeta anterior (del primer arranque) pierde sus botones: su id quedó guardado en la sesión.
  assert.equal(despues.llamadas[0].method, 'editMessageReplyMarkup');
  assert.deepEqual(almacenDeSesiones(db2).read('100').flujo.datos, { nombre: 'Los Primos', cuota: 20000 });
  db2.close();
});
