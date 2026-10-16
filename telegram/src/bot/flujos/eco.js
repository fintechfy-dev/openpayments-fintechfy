import { Composer } from 'grammy';
import { formatoCOP } from '../../formato.js';

// Flujo de prueba (tarea 4.8): dos preguntas para probar el motor sin #13. Se quita cuando exista
// /crear. El comando /eco no va en el menú.

function validarNombre(texto) {
  const nombre = texto.trim();
  if (nombre.length < 3 || nombre.length > 40) return { error: 'El nombre debe tener entre 3 y 40 letras.' };
  return { valor: nombre };
}

// Acepta "20000", "20.000" o "$20.000"; la cuota va en pesos enteros.
export function validarCuota(cuota) {
  return (texto) => {
    const limpio = texto.trim().replace(/^\$/, '').replace(/\./g, '');
    const valor = /^\d+$/.test(limpio) ? Number(limpio) : NaN;
    if (!(valor >= cuota.min && valor <= cuota.max)) {
      return { error: `La cuota debe estar entre ${formatoCOP(cuota.min)} y ${formatoCOP(cuota.max)}.` };
    }
    return { valor };
  };
}

export function textoEcoTerminado({ nombre, cuota }) {
  return [
    `Prueba terminada: «${nombre}», con cuota de ${formatoCOP(cuota)}.`,
    'No se creó ninguna natillera: esto solo prueba el bot.',
  ].join('\n');
}

export function flujoEco(config) {
  return {
    id: 'eco',
    pasos: [
      { clave: 'nombre', pregunta: '¿Cómo se llama tu natillera?', ejemplo: 'Natillera de la familia', validar: validarNombre },
      {
        clave: 'cuota',
        pregunta: '¿De cuánto es la cuota de cada periodo?',
        ejemplo: formatoCOP(config.cuota.min),
        validar: validarCuota(config.cuota),
      },
    ],
    alTerminar: (ctx, datos) => ctx.reply(textoEcoTerminado(datos)),
  };
}

export function eco({ motor }) {
  const comandos = new Composer();
  comandos.command('eco', (ctx) => motor.iniciar(ctx, 'eco'));
  return comandos;
}
