// «Mi natillera»: lo que ve un participante (US-008 y la entrada al préstamo de US-014). Por ahora con
// los datos de ejemplo de datos-demo.js; con el contrato de #5 se piden al servicio externo.
// Todo lo que viene de los datos se pinta con textContent, nunca como HTML.

import { iniciarTelegram, nombreDePila, parametros, pintarIconos, tg } from '../comun.js';
import { CASOS, CASO_POR_DEFECTO } from './datos-demo.js';
import { armarVista } from './vista.js';

const $ = (id) => document.getElementById(id);

// Crea un elemento: el('p', { clase: 'x', texto: 'Hola' }, hijos).
function el(etiqueta, { clase, texto, atributos = {} } = {}, hijos = []) {
  const nodo = document.createElement(etiqueta);
  if (clase) nodo.className = clase;
  if (texto !== undefined) nodo.textContent = texto;
  for (const [k, v] of Object.entries(atributos)) nodo.setAttribute(k, v);
  nodo.append(...hijos.filter(Boolean));
  return nodo;
}

const icono = (nombre, clase) => el('span', { atributos: { 'data-icono': nombre, ...(clase ? { 'data-clase': clase } : {}) } });

// Las insignias salen de la tabla fija del design system (Natillera.badge): no llevan datos de nadie.
function insignia(tipo, estado) {
  const span = el('span');
  span.innerHTML = window.Natillera?.badge(tipo, estado) ?? '';
  return span.firstElementChild ?? span;
}

function tarjeta({ clase = 'nt-card', iconoNombre, titulo }, hijos) {
  return el('div', { clase: `${clase} mn-tarjeta` }, [
    titulo ? el('div', { clase: 'mn-tarjeta__cabeza' }, [iconoNombre && icono(iconoNombre), el('span', { texto: titulo })]) : null,
    ...hijos,
  ]);
}

function aviso(tipo, iconoNombre, titulo, texto) {
  return el('div', { clase: `nt-aviso nt-aviso--${tipo}`, atributos: { role: tipo === 'error' ? 'alert' : 'status' } }, [
    icono(iconoNombre),
    el('div', {}, [el('p', { clase: 'nt-aviso__titulo', texto: titulo }), el('p', { clase: 'nt-aviso__texto', texto })]),
  ]);
}

function barraDeProgreso(porcentaje, etiqueta) {
  return el('div', { clase: 'nt-progreso' }, [
    el('div', {
      clase: 'nt-progreso__pista',
      atributos: { role: 'progressbar', 'aria-valuenow': String(porcentaje), 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-label': etiqueta },
    }, [el('div', { clase: 'nt-progreso__barra', atributos: { style: `width:${porcentaje}%` } })]),
  ]);
}

// ---------- Paneles ----------

function panelInicio(v) {
  const hijos = [];

  if (v.aviso) hijos.push(aviso('alerta', 'reloj', v.aviso.titulo, v.aviso.texto));

  if (v.arranque) {
    hijos.push(tarjeta({ iconoNombre: 'grupo', titulo: v.arranque.titulo }, [
      barraDeProgreso(v.arranque.porcentaje, 'Personas para arrancar'),
      el('p', { clase: 'nt-muted', texto: v.arranque.texto }),
    ]));
  }

  const segmentos = v.ahorro.segmentos.length
    ? [
        el('div', { clase: 'nt-cuotas', atributos: { style: `--n:${v.ahorro.segmentos.length}`, 'aria-hidden': 'true' } },
          v.ahorro.segmentos.map((s) => el('span', { clase: s === 'pendiente' ? 'nt-cuota' : `nt-cuota nt-cuota--${s}` }))),
        el('div', { clase: 'mn-leyenda', atributos: { 'aria-hidden': 'true' } }, [
          el('span', {}, [el('i', { clase: 'nt-cuota--pagada' }), 'Pagada']),
          v.ahorro.segmentos.includes('mora') ? el('span', {}, [el('i', { clase: 'nt-cuota--mora' }), 'Pendiente']) : null,
          v.ahorro.segmentos.includes('hoy') ? el('span', {}, [el('i', { clase: 'nt-cuota--hoy' }), 'Próxima']) : null,
        ]),
      ]
    : [];
  hijos.push(tarjeta({ clase: 'nt-card nt-card--destacada' }, [
    el('div', { clase: 'nt-dato' }, [
      el('span', { clase: 'nt-dato__etiqueta', texto: 'Llevas ahorrado' }),
      el('span', { clase: 'nt-dato__valor nt-num', texto: v.ahorro.valor }),
    ]),
    el('p', { texto: v.ahorro.detalle }),
    ...segmentos,
  ]));

  if (v.proxima) {
    hijos.push(tarjeta({ iconoNombre: 'calendario', titulo: v.proxima.titulo }, [el('p', { clase: 'nt-muted', texto: v.proxima.texto })]));
  }

  hijos.push(tarjeta({ iconoNombre: 'candado', titulo: 'Entre todos van' }, [
    el('span', { clase: 'nt-dato__valor nt-dato__valor--md nt-num', texto: v.grupo.valor }),
    barraDeProgreso(v.grupo.porcentaje, 'Ahorro del grupo'),
    el('p', { clase: 'nt-muted', texto: v.grupo.texto }),
  ]));

  hijos.push(tarjeta({ clase: 'nt-card nt-card--calida', iconoNombre: 'premio', titulo: 'Al final recibes' }, [
    el('span', { clase: 'nt-dato__valor nt-dato__valor--md nt-num', texto: v.liquidacion.valor }),
    el('p', { texto: v.liquidacion.texto }),
  ]));

  if (v.credito) {
    const boton = el('button', { clase: 'nt-btn nt-btn--primario nt-btn--bloque', texto: 'Pedir préstamo', atributos: { type: 'button' } });
    boton.addEventListener('click', pedirPrestamo);
    hijos.push(tarjeta({ iconoNombre: 'credito', titulo: v.credito.titulo }, [el('p', { texto: v.credito.texto }), boton]));
  }

  return hijos;
}

function panelReglas(v) {
  return [
    tarjeta({ iconoNombre: 'cuota', titulo: 'Las reglas' }, [
      el('dl', { clase: 'mn-reglas' }, v.reglas.map((r) => el('div', {}, [el('dt', { texto: r.etiqueta }), el('dd', { texto: r.valor })]))),
    ]),
    aviso('info', 'candado', 'Tu cobro automático', v.autorizacion),
    tarjeta({ iconoNombre: 'grupo', titulo: `${v.personas.length} personas` }, [
      el('ul', { clase: 'mn-personas' }, v.personas.map((p) =>
        el('li', {}, [
          el('span', { clase: 'mn-avatar', texto: p.iniciales, atributos: { 'aria-hidden': 'true' } }),
          el('span', { texto: p.nombre }),
          p.administra ? el('span', { clase: 'nt-badge nt-badge--info', texto: 'Administra' }) : null,
        ]))),
    ]),
  ];
}

function panelCobros(v) {
  if (!v.pagos.length) {
    return [tarjeta({}, [el('p', { clase: 'nt-muted mn-vacio', texto: 'Todavía no hay cobros. El primero llega cuando la natillera arranque.' })])];
  }
  return [
    tarjeta({ iconoNombre: 'billetera', titulo: 'Tus cobros' }, [
      el('ul', { clase: 'mn-cobros' }, v.pagos.map((p) =>
        el('li', { clase: 'mn-cobro' }, [
          el('div', {}, [el('p', { texto: `${p.titulo} · ${p.fecha}` }), insignia('pago', p.estado)]),
          el('span', { clase: 'mn-cobro__monto', texto: p.monto }),
          p.motivo ? el('p', { clase: 'mn-cobro__motivo', texto: p.motivo }) : null,
        ]))),
    ]),
  ];
}

// ---------- Acciones ----------

// El préstamo se pide en el chat (US-014): la Mini App vuelve al bot con /start prestamo. Funciona
// sin importar desde qué botón se abrió (a diferencia de sendData).
function pedirPrestamo() {
  const bot = parametros.get('bot');
  if (tg && bot && /^[A-Za-z0-9_]{5,32}$/.test(bot)) {
    tg.HapticFeedback?.impactOccurred('light');
    tg.openTelegramLink(`https://t.me/${bot}?start=prestamo`);
    tg.close();
    return;
  }
  tg?.showAlert?.('Abre «Mi natillera» desde el bot para pedir el préstamo.');
}

// ---------- Pantalla ----------

const PESTANAS = ['inicio', 'reglas', 'cobros'];

function mostrarPestana(nombre) {
  for (const p of PESTANAS) {
    const activa = p === nombre;
    $(`tab-${p}`).setAttribute('aria-selected', String(activa));
    $(`tab-${p}`).tabIndex = activa ? 0 : -1;
    $(`panel-${p}`).hidden = !activa;
  }
}

function pintar(caso) {
  const v = armarVista(CASOS[caso].datos);
  const nombre = nombreDePila() ?? CASOS[caso].datos.yo.nombre.split(' ')[0];

  $('avatar').textContent = nombre[0]?.toUpperCase() ?? '';
  $('saludo').textContent = `Hola, ${nombre}`;
  $('nombre-natillera').textContent = v.nombreNatillera;
  $('estado-natillera').replaceChildren(insignia('natillera', v.estadoNatillera));

  $('panel-inicio').replaceChildren(...panelInicio(v));
  $('panel-reglas').replaceChildren(...panelReglas(v));
  $('panel-cobros').replaceChildren(...panelCobros(v));

  $('casos').replaceChildren(...Object.entries(CASOS).map(([clave, c]) => {
    const b = el('button', { clase: 'ma-chip', texto: c.etiqueta, atributos: { type: 'button', 'aria-pressed': String(clave === caso) } });
    b.addEventListener('click', () => {
      tg?.HapticFeedback?.selectionChanged();
      pintar(clave);
    });
    return b;
  }));

  pintarIconos();
}

function conectarPestanas() {
  PESTANAS.forEach((p, i) => {
    const tab = $(`tab-${p}`);
    tab.addEventListener('click', () => mostrarPestana(p));
    // Flechas izquierda y derecha entre pestañas, como pide el patrón de pestañas accesibles.
    tab.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const siguiente = PESTANAS[(i + (e.key === 'ArrowRight' ? 1 : PESTANAS.length - 1)) % PESTANAS.length];
      mostrarPestana(siguiente);
      $(`tab-${siguiente}`).focus();
    });
  });
}

iniciarTelegram();
conectarPestanas();
const pedido = parametros.get('caso');
pintar(CASOS[pedido] ? pedido : CASO_POR_DEFECTO);
mostrarPestana(PESTANAS.includes(parametros.get('pestana')) ? parametros.get('pestana') : 'inicio');
