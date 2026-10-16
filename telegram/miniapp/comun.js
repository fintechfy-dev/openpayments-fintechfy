// Lo que comparten las páginas de la Mini App: Telegram, el tema y los íconos del design system.

export const tg = window.Telegram?.WebApp;
// Fuera de Telegram el script existe pero no hay initData: se puede ver el diseño, no enviar.
export const enTelegram = Boolean(tg?.initData);
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

// El nombre de pila de quien abrió la Mini App, si Telegram lo da.
export function nombreDePila() {
  return tg?.initDataUnsafe?.user?.first_name ?? null;
}

export function iniciarTelegram() {
  aplicarTema();
  if (!tg) return;
  tg.onEvent?.('themeChanged', aplicarTema);
  tg.ready();
  tg.expand();
}
