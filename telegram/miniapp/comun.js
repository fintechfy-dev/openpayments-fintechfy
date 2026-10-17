// Lo que comparten las páginas de la Mini App: Telegram, el tema y los íconos del design system.

export const tg = window.Telegram?.WebApp;
// Fuera de Telegram el script de Telegram carga igual, pero con platform 'unknown'. No se usa initData:
// viene vacío cuando la Mini App se abre desde un botón del teclado, que es justo como la abre el bot
// (core.telegram.org/bots/webapps: "It is empty if the Mini App was launched from a keyboard button").
export const enTelegram = Boolean(tg && tg.platform && tg.platform !== 'unknown' && typeof tg.sendData === 'function');
export const parametros = new URLSearchParams(location.search);

// Dentro de Telegram, el tema del teléfono. En el navegador, `?tema=dark` o `?tema=light` para revisar
// el diseño; sin él, el del sistema (tokens.css ya lo sigue).
export function aplicarTema() {
  const tema = enTelegram ? tg.colorScheme : parametros.get('tema');
  if (tema === 'dark' || tema === 'light') document.documentElement.dataset.theme = tema;
}

// Cambia cada <span data-icono="x"> por el ícono del design system (bundle.js).
export function pintarIconos(raiz = document) {
  if (!window.Natillera) return;
  for (const span of raiz.querySelectorAll('[data-icono]')) {
    span.outerHTML = window.Natillera.icono(span.dataset.icono, span.dataset.clase);
  }
}

// El nombre de pila de quien abrió la Mini App, si Telegram lo da (desde el teclado no lo da).
export function nombreDePila() {
  return tg?.initDataUnsafe?.user?.first_name ?? null;
}

// `alCambiarTema` corre después de aplicar el tema nuevo (el formulario repinta su botón principal).
export function iniciarTelegram({ alCambiarTema } = {}) {
  aplicarTema();
  if (!tg) return;
  tg.onEvent?.('themeChanged', () => {
    aplicarTema();
    alCambiarTema?.();
  });
  tg.ready();
  tg.expand();
}
