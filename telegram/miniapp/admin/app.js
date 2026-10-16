// Panel del administrador. Los datos llegan del bot en el fragmento del enlace (#d=..., ver
// src/natillera/panel.js); sin ellos se muestran datos de ejemplo con un aviso. Todo lo que viene de
// los datos se pinta con textContent, nunca como HTML.

import { iniciarTelegram, parametros, pintarIconos, tg } from '../comun.js';
import { decodificarPanel } from '../../src/natillera/panel.js';
import { DATOS_DEMO } from './datos-demo.js';
import { armarPanel, etiquetaDeNatillera } from './vista.js';

const $ = (id) => document.getElementById(id);

function el(etiqueta, { clase, texto, atributos = {} } = {}, hijos = []) {
  const nodo = document.createElement(etiqueta);
  if (clase) nodo.className = clase;
  if (texto !== undefined) nodo.textContent = texto;
  for (const [k, v] of Object.entries(atributos)) nodo.setAttribute(k, v);
  nodo.append(...hijos.filter(Boolean));
  return nodo;
}

const icono = (nombre) => el('span', { atributos: { 'data-icono': nombre } });

// Las variantes e íconos son de la tabla fija de vista.js; el texto va con textContent.
function insignia({ variante, icono: nombreIcono, texto }) {
  return el('span', { clase: `nt-badge nt-badge--${variante}` }, [icono(nombreIcono), document.createTextNode(texto)]);
}

function tarjeta({ clase = 'nt-card', iconoNombre, titulo }, hijos) {
  return el('div', { clase: `${clase} mn-tarjeta` }, [
    titulo ? el('div', { clase: 'mn-tarjeta__cabeza' }, [iconoNombre && icono(iconoNombre), el('span', { texto: titulo })]) : null,
    ...hijos,
  ]);
}

function barra(porcentaje, etiqueta) {
  return el('div', { clase: 'nt-progreso' }, [
    el('div', {
      clase: 'nt-progreso__pista',
      atributos: { role: 'progressbar', 'aria-valuenow': String(porcentaje), 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-label': etiqueta },
    }, [el('div', { clase: 'nt-progreso__barra', atributos: { style: `width:${porcentaje}%` } })]),
  ]);
}

function boton(texto, clase, alTocar) {
  const b = el('button', { clase: `nt-btn ${clase}`, texto, atributos: { type: 'button' } });
  b.addEventListener('click', alTocar);
  return b;
}

// ---------- Acciones ----------

function compartir(invitar) {
  const url = `https://t.me/share/url?url=${encodeURIComponent(invitar.enlace)}&text=${encodeURIComponent(invitar.compartir)}`;
  tg?.HapticFeedback?.impactOccurred('light');
  if (tg?.openTelegramLink) tg.openTelegramLink(url);
  else window.open(url, '_blank', 'noopener');
}

async function copiar(invitar, b) {
  try {
    await navigator.clipboard.writeText(invitar.copiar);
    b.textContent = 'Copiado';
    tg?.HapticFeedback?.notificationOccurred('success');
  } catch {
    tg?.showAlert?.('No se pudo copiar. Mantén presionado el enlace para copiarlo.');
  }
}

// ---------- Pantalla ----------

function panel(v) {
  const hijos = [
    el('div', { clase: 'ad-cabeza' }, [
      el('h2', { texto: v.nombre }),
      el('div', { clase: 'ad-fila' }, [insignia(v.insignia), el('span', { clase: 'nt-muted', texto: v.creada })]),
    ]),
    tarjeta({ iconoNombre: 'grupo', titulo: v.progreso.titulo }, [
      barra(v.progreso.porcentaje, v.progreso.titulo),
      el('p', { clase: 'nt-muted', texto: v.progreso.texto }),
    ]),
  ];

  if (v.invitar) {
    const copiarBoton = boton('Copiar mensaje', 'nt-btn--secundario', () => copiarBoton && copiar(v.invitar, copiarBoton));
    hijos.push(tarjeta({ iconoNombre: 'grupo', titulo: 'Invita a tu grupo' }, [
      el('p', { texto: 'Comparte este enlace en el chat del grupo. Tú también te unes con él, porque también ahorras.' }),
      el('p', { clase: 'ad-enlace', texto: v.invitar.enlace }),
      el('div', { clase: 'ad-acciones' }, [boton('Compartir', 'nt-btn--primario', () => compartir(v.invitar)), copiarBoton]),
    ]));
  }

  if (v.saldo) {
    hijos.push(tarjeta({ clase: 'nt-card nt-card--destacada', iconoNombre: 'candado', titulo: 'La natillera tiene' }, [
      el('span', { clase: 'nt-dato__valor nt-dato__valor--md nt-num', texto: v.saldo.valor }),
      el('p', { clase: 'nt-muted', texto: v.saldo.texto }),
    ]));
  }

  hijos.push(tarjeta({ iconoNombre: 'grupo', titulo: v.personas.titulo }, [
    v.personas.resumen ? el('p', { texto: v.personas.resumen }) : null,
    v.personas.vacio ? el('p', { clase: 'nt-muted', texto: v.personas.vacio }) : null,
    v.personas.lista.length
      ? el('ul', { clase: 'mn-personas' }, v.personas.lista.map((p) =>
        el('li', { clase: 'ad-persona' }, [
          el('span', { clase: 'mn-avatar', texto: p.iniciales, atributos: { 'aria-hidden': 'true' } }),
          el('span', { clase: 'ad-persona__nombre' }, [document.createTextNode(p.nombre), p.tu ? el('span', { clase: 'ad-tu', texto: ' (tú)' }) : null]),
          insignia(p.insignia),
          p.detalle ? el('span', { clase: 'ad-persona__detalle', texto: p.detalle }) : null,
        ])))
      : null,
  ]));

  hijos.push(tarjeta({ iconoNombre: 'cuota', titulo: 'Las reglas' }, [
    el('dl', { clase: 'mn-reglas' }, v.reglas.map((r) => el('div', {}, [el('dt', { texto: r.etiqueta }), el('dd', { texto: r.valor })]))),
  ]));

  return hijos;
}

function horaDeBogota(iso) {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return null;
  return fecha.toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: 'numeric', minute: '2-digit' });
}

function pintar(datos, elegida) {
  const natilleras = datos.natilleras;
  const actual = natilleras.find((d) => d.id === elegida) ?? natilleras[0];

  $('subtitulo').textContent = natilleras.length > 1
    ? `Administras ${natilleras.length}. Toca una para ver su gente y su enlace.`
    : 'La que administras.';

  $('selector').replaceChildren(...(natilleras.length > 1
    ? natilleras.map((d) => {
      const { nombre, fecha } = etiquetaDeNatillera(d);
      const b = el('button', { clase: 'ad-opcion', atributos: { type: 'button', 'aria-pressed': String(d === actual) } }, [
        el('span', { texto: nombre }),
        el('small', { texto: `Creada el ${fecha}` }),
      ]);
      b.addEventListener('click', () => {
        tg?.HapticFeedback?.selectionChanged();
        pintar(datos, d.id);
      });
      return b;
    })
    : []));

  $('panel').replaceChildren(...(actual ? panel(armarPanel(actual)) : [el('p', { clase: 'nt-muted', texto: 'Todavía no administras ninguna natillera. Crea una con /crear en el chat.' })]));

  const hora = horaDeBogota(datos.generado);
  const otraVez = 'Para ver lo más reciente, escribe /administrar otra vez en el chat.';
  // «6:27 p. m.» ya termina en punto.
  $('pie').textContent = hora ? `Datos de las ${hora}${hora.endsWith('.') ? '' : '.'} ${otraVez}` : otraVez;

  pintarIconos();
}

function avisoDeEjemplo() {
  return el('div', { clase: 'nt-aviso nt-aviso--info', atributos: { role: 'status' } }, [
    icono('alerta'),
    el('div', {}, [
      el('p', { clase: 'nt-aviso__titulo', texto: 'Datos de ejemplo' }),
      el('p', { clase: 'nt-aviso__texto', texto: 'Abre el panel desde el bot con /administrar para ver tus natilleras.' }),
    ]),
  ]);
}

iniciarTelegram();
const recibidos = decodificarPanel(new URLSearchParams(location.hash.slice(1)).get('d') ?? '');
if (!recibidos) $('aviso-demo').replaceChildren(avisoDeEjemplo());
pintar(recibidos ?? DATOS_DEMO, parametros.get('natillera'));
