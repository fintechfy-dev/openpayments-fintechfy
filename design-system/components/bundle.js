/* Natillera 2.0 — utilidades sin dependencias (script clásico). Expone window.Natillera */
(function () {
  function miles(entero) {
    return String(entero).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }
  /** formatoCOP(100000) → "$100.000"; formatoCOP(1250.5) → "$1.250,50"; los decimales solo aparecen si no son cero. */
  function formatoCOP(valor) {
    var n = Number(valor) || 0;
    var negativo = n < 0;
    n = Math.abs(n);
    var centavos = Math.round(n * 100);
    var entero = Math.floor(centavos / 100);
    var dec = centavos % 100;
    var texto = "$" + miles(entero) + (dec ? "," + (dec < 10 ? "0" : "") + dec : "");
    return negativo ? "-" + texto : texto;
  }
  /** Cada estado del producto → variante de badge (.nt-badge--x), ícono y palabra. */
  var ESTADOS = {
    natillera: {
      creada: { variante: "neutro", icono: "punto", texto: "Creada" },
      iniciada: { variante: "info", icono: "calendario", texto: "Iniciada" },
      activa: { variante: "exito", icono: "check", texto: "Activa" },
      liquidando: { variante: "celebra", icono: "premio", texto: "Liquidando" },
      cerrada: { variante: "neutro", icono: "candado", texto: "Cerrada" }
    },
    participante: {
      validado: { variante: "info", icono: "check", texto: "Validado" },
      activo: { variante: "exito", icono: "cuota", texto: "Activo" },
      en_mora: { variante: "aviso", icono: "reloj", texto: "En mora" },
      liquidado: { variante: "celebra", icono: "premio", texto: "Liquidado" }
    },
    pago: {
      pendiente: { variante: "neutro", icono: "reloj", texto: "Pendiente" },
      autorizado: { variante: "info", icono: "candado", texto: "Autorizado" },
      completado: { variante: "exito", icono: "check", texto: "Completado" },
      fallido: { variante: "error", icono: "alerta", texto: "Fallido" }
    }
  };
  /** Trazos de los íconos (viewBox 0 0 24 24, sin relleno, trazo 2). */
  var ICONOS = {
    cuota: '<ellipse cx="12" cy="6.5" rx="7" ry="3"/><path d="M5 6.5v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5"/><path d="M5 11.5v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5"/>',
    grupo: '<circle cx="12" cy="8" r="3"/><path d="M6.5 19.5a5.5 5.5 0 0 1 11 0"/><circle cx="5" cy="10" r="2"/><circle cx="19" cy="10" r="2"/><path d="M2 18a3.5 3.5 0 0 1 3.8-3.4"/><path d="M22 18a3.5 3.5 0 0 0-3.8-3.4"/>',
    billetera: '<path d="M6 6V5.5A2.5 2.5 0 0 1 8.5 3H17"/><rect x="3" y="6" width="18" height="14" rx="3"/><path d="M21 11h-4.5a2 2 0 0 0 0 4H21"/><path d="M16.5 13h.01"/>',
    candado: '<rect x="5" y="10.5" width="14" height="10.5" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/><path d="M12 14.5v2.5"/>',
    calendario: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17"/><path d="M8 3v4"/><path d="M16 3v4"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01"/>',
    premio: '<circle cx="12" cy="9" r="5.5"/><path d="M8.6 13.3 7 21l5-2.5 5 2.5-1.6-7.7"/><path d="m12 6.8.7 1.4 1.5.2-1.1 1 .3 1.5-1.4-.7-1.4.7.3-1.5-1.1-1 1.5-.2z"/>',
    alerta: '<path d="M10.3 4.3a2 2 0 0 1 3.4 0l7.6 13.2a2 2 0 0 1-1.7 3H4.4a2 2 0 0 1-1.7-3z"/><path d="M12 9.5v4"/><path d="M12 17h.01"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="m8 12.3 2.8 2.8L16 9.6"/>',
    reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/>',
    punto: '<circle cx="12" cy="12" r="4"/>'
  };
  function icono(nombre, clase) {
    return '<svg class="nt-ico' + (clase ? " " + clase : "") + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICONOS[nombre] || "") + "</svg>";
  }
  /** badge("pago", "fallido") → HTML del badge con ícono y palabra. */
  function badge(tipo, estado) {
    var e = (ESTADOS[tipo] || {})[estado];
    if (!e) return "";
    return '<span class="nt-badge nt-badge--' + e.variante + '">' + icono(e.icono) + e.texto + "</span>";
  }
  window.Natillera = { formatoCOP: formatoCOP, ESTADOS: ESTADOS, ICONOS: ICONOS, icono: icono, badge: badge };
})();
