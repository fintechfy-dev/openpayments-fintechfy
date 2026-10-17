import { Composer } from 'grammy';

// /cancelar borra el flujo en curso sin llamar a su `alTerminar` (D-12): no queda nada creado.
// El botón «Cancelar» de cada pregunta hace lo mismo desde el motor.

export { MENSAJE_CANCELADO, MENSAJE_NADA_QUE_CANCELAR } from '../flujo.js';

export function cancelar({ motor }) {
  const comandos = new Composer();
  comandos.command('cancelar', (ctx) => motor.cancelar(ctx));
  return comandos;
}
