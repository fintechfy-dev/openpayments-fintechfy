// Mini App: formulario para crear la natillera (US-001, #13). Usa las mismas reglas que el bot
// (src/natillera/reglas.js) y entrega los datos con Telegram.WebApp.sendData, que solo funciona si la
// Mini App se abrió desde el botón del teclado del bot. El bot vuelve a validar todo y muestra el
// resumen en el chat: aquí no se crea nada.

import { formatoCOP, formatoPorcentaje } from '../src/formato.js';
import {
  CAMPOS,
  CUPO_MAX,
  CUPO_MIN,
  PERIODICIDADES,
  formatoFecha,
  hoyEnBogota,
  primeroDelMesSiguiente,
  resumenNatillera,
  sugerenciasCuota,
  sugerenciasFinal,
  sumarMeses,
  validarNatillera,
} from '../src/natillera/reglas.js';

import { enTelegram, iniciarTelegram, parametros as q, pintarIconos, tg } from './comun.js';

const TIPO = 'crear-natillera';
const MAX_SEGMENTOS = 24;

// Los límites vienen en la dirección (el bot los pone desde su .env). Si faltan, unos razonables.
function numero(clave, porDefecto) {
  const crudo = q.get(clave);
  const n = Number(crudo);
  return crudo !== null && crudo !== '' && Number.isFinite(n) ? n : porDefecto;
}
const limites = {
  cuota: { min: numero('cuotaMin', 10000), max: numero('cuotaMax', 500000) },
  moraDiariaMaxPct: numero('moraMax', 2.5),
};
const hoy = hoyEnBogota();

const $ = (id) => document.getElementById(id);

// ---------- Estado inicial: una natillera típica que la persona ajusta ----------

const montos = sugerenciasCuota(limites.cuota);
const estado = {
  nombre: '',
  cuota: montos[Math.min(2, montos.length - 1)],
  periodicidad: 'mensual',
  inicio: primeroDelMesSiguiente(hoy),
  final: '',
  cupo: 5,
  mora: Math.min(1, limites.moraDiariaMaxPct),
};
{
  const opciones = sugerenciasFinal(estado.inicio, estado.periodicidad);
  estado.final = (opciones.find((o) => o.diciembre) ?? opciones[0])?.fecha ?? '';
}

// Los errores se muestran en los campos que la persona ya tocó, o en todos al intentar enviar.
const tocados = new Set();
let intentoEnviar = false;

// ---------- Controles ----------

function chip(texto, activo, alTocar) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'ma-chip';
  b.textContent = texto;
  b.setAttribute('aria-pressed', String(activo));
  b.addEventListener('click', alTocar);
  return b;
}

function tocar(clave) {
  tocados.add(clave);
  tg?.HapticFeedback?.selectionChanged();
}

function pintarCuota() {
  const rango = $('cuota-rango');
  rango.min = String(limites.cuota.min);
  rango.max = String(limites.cuota.max);
  // Pasos de $1.000 si el rango lo permite; si no, de a peso.
  rango.step = limites.cuota.max - limites.cuota.min >= 10000 ? '1000' : '1';
  rango.value = String(estado.cuota);
  $('cuota-valor').textContent = formatoCOP(estado.cuota);

  const chips = $('cuota-chips');
  chips.replaceChildren(
    ...montos.map((v) =>
      chip(formatoCOP(v), v === estado.cuota, () => {
        estado.cuota = v;
        tocar('cuota');
        actualizar();
      }),
    ),
  );
}

function pintarPeriodicidad() {
  const grupo = $('periodicidad');
  grupo.replaceChildren(
    ...Object.entries(PERIODICIDADES).map(([clave, p]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ma-segmento';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(clave === estado.periodicidad));
      b.textContent = p.texto;
      b.addEventListener('click', () => {
        estado.periodicidad = clave;
        tocar('periodicidad');
        actualizar();
      });
      return b;
    }),
  );
}

function pintarFechas() {
  const inicio = $('inicio');
  inicio.min = hoy;
  inicio.max = sumarMeses(hoy, 1);
  inicio.value = estado.inicio;

  const final = $('final');
  final.min = estado.inicio;
  final.max = estado.inicio ? sumarMeses(estado.inicio, 12) : '';
  final.value = estado.final;

  $('final-chips').replaceChildren(
    ...sugerenciasFinal(estado.inicio, estado.periodicidad).map((o) =>
      chip(o.diciembre ? `31 de diciembre · ${o.cuotas}` : `${o.cuotas} cuotas`, o.fecha === estado.final, () => {
        estado.final = o.fecha;
        tocar('final');
        actualizar();
      }),
    ),
  );
}

function pintarCupo() {
  $('cupo-valor').textContent = String(estado.cupo);
  $('cupo-menos').disabled = estado.cupo <= CUPO_MIN;
  $('cupo-mas').disabled = estado.cupo >= CUPO_MAX;
}

function pintarMora() {
  const rango = $('mora-rango');
  rango.max = String(limites.moraDiariaMaxPct);
  rango.value = String(estado.mora);
  $('mora-valor').textContent = `${formatoPorcentaje(estado.mora)} diario`;
}

// Control que recibe aria-invalid por cada campo (algunos no tienen un input con el nombre del campo).
const CONTROL_DE = { cuota: 'cuota-rango', cupo: 'cupo-valor', mora: 'mora-rango' };

function pintarErrores(errores) {
  for (const { clave } of CAMPOS) {
    const visible = Boolean(errores[clave]) && (intentoEnviar || tocados.has(clave));
    const p = $(`error-${clave}`);
    p.hidden = !visible;
    p.textContent = visible ? errores[clave] : '';
    const control = $(CONTROL_DE[clave] ?? clave);
    if (control) control.setAttribute('aria-invalid', String(visible));
  }
}

function pintarResumen(datos, valido) {
  const completo = ['cuota', 'periodicidad', 'inicio', 'final', 'cupo'].every((k) => datos[k] !== undefined);
  if (!completo) {
    $('resumen-total').textContent = '—';
    $('resumen-cuotas').textContent = 'Completa las fechas para ver cuánto ahorra cada quien.';
    $('resumen-barra').replaceChildren();
    $('resumen-fechas').textContent = '';
    $('resumen-grupo').textContent = '';
    return valido;
  }
  const r = resumenNatillera(datos);
  const p = PERIODICIDADES[datos.periodicidad];
  $('resumen-total').textContent = formatoCOP(r.porPersona);
  $('resumen-cuotas').textContent = `En ${r.cuotas} ${r.cuotas === 1 ? 'cuota' : 'cuotas'} de ${formatoCOP(datos.cuota)} ${p.cada}.`;

  // La barra de cuotas del design system; con muchas cuotas, solo el texto.
  const barra = $('resumen-barra');
  if (r.cuotas <= MAX_SEGMENTOS) {
    barra.style.setProperty('--n', String(r.cuotas));
    barra.replaceChildren(
      ...r.fechas.map((f, i) => {
        const s = document.createElement('span');
        s.className = i === 0 ? 'nt-cuota nt-cuota--hoy' : 'nt-cuota';
        s.title = formatoFecha(f);
        return s;
      }),
    );
  } else barra.replaceChildren();

  $('resumen-fechas').textContent = `Del ${formatoFecha(datos.inicio)} al ${formatoFecha(datos.final, { anio: true })}.`;
  $('resumen-grupo').textContent = `Si arrancan ${datos.cupo} personas, juntan al menos ${formatoCOP(r.grupoMinimo)}.`;
  return valido;
}

// ---------- Botón de enviar ----------

// Colores del botón de Telegram desde los tokens: se repinta cuando cambia el tema del teléfono.
function pintarBotonPrincipal() {
  const estilo = getComputedStyle(document.documentElement);
  tg.MainButton.setParams({
    text: 'Revisar natillera',
    color: estilo.getPropertyValue('--primario').trim() || undefined,
    text_color: estilo.getPropertyValue('--sobre-primario').trim() || undefined,
  });
}

function configurarBotonPrincipal() {
  if (!enTelegram) {
    $('enviar-navegador').hidden = false;
    $('fuera-de-telegram').hidden = false;
    return;
  }
  pintarBotonPrincipal();
  tg.MainButton.show();
  tg.MainButton.onClick(enviar);
}

function enviar() {
  intentoEnviar = true;
  const { datos, errores } = actualizar();
  if (Object.keys(errores).length || Object.keys(datos).length < 7) {
    tg?.HapticFeedback?.notificationOccurred('error');
    document.querySelector('.ma-error:not([hidden])')?.closest('section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  const carga = JSON.stringify({ tipo: TIPO, v: 1, datos: estado });
  if (!enTelegram) {
    console.info('Lo que recibiría el bot:', carga);
    $('fuera-de-telegram').textContent = 'Todo en orden. Abre este formulario desde el botón del bot para enviarlo.';
    return;
  }
  tg.HapticFeedback?.notificationOccurred('success');
  // Telegram cierra la Mini App y le manda los datos al bot.
  tg.sendData(carga);
}

// ---------- Ciclo ----------

function actualizar() {
  const entrada = { ...estado, nombre: estado.nombre.trim() || undefined };
  const { datos, errores } = validarNatillera(entrada, { limites, hoy });
  if (!estado.nombre.trim()) errores.nombre = 'Ponle un nombre a la natillera.';

  pintarCuota();
  pintarPeriodicidad();
  pintarFechas();
  pintarCupo();
  pintarMora();
  pintarErrores(errores);
  pintarResumen(datos, Object.keys(errores).length === 0);
  return { datos, errores };
}

function conectar() {
  $('nombre').addEventListener('input', (e) => {
    estado.nombre = e.target.value;
    actualizar();
  });
  $('nombre').addEventListener('blur', () => {
    tocados.add('nombre');
    actualizar();
  });
  $('cuota-rango').addEventListener('input', (e) => {
    estado.cuota = Number(e.target.value);
    tocados.add('cuota');
    actualizar();
  });
  $('inicio').addEventListener('change', (e) => {
    estado.inicio = e.target.value;
    tocar('inicio');
    actualizar();
  });
  $('final').addEventListener('change', (e) => {
    estado.final = e.target.value;
    tocar('final');
    actualizar();
  });
  $('cupo-menos').addEventListener('click', () => {
    estado.cupo = Math.max(CUPO_MIN, estado.cupo - 1);
    tocar('cupo');
    actualizar();
  });
  $('cupo-mas').addEventListener('click', () => {
    estado.cupo = Math.min(CUPO_MAX, estado.cupo + 1);
    tocar('cupo');
    actualizar();
  });
  $('mora-rango').addEventListener('input', (e) => {
    estado.mora = Math.round(Number(e.target.value) * 10) / 10;
    tocados.add('mora');
    actualizar();
  });
  $('formulario').addEventListener('submit', (e) => {
    e.preventDefault();
    enviar();
  });
}

// El tema primero: el botón de Telegram toma su color de los tokens ya aplicados, y se repinta cuando
// cambia el tema del teléfono.
iniciarTelegram({ alCambiarTema: () => enTelegram && pintarBotonPrincipal() });
pintarIconos();
conectar();
actualizar();
configurarBotonPrincipal();
