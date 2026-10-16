/* eslint-disable @next/next/no-img-element -- PNG estáticos del kit con tamaño fijo; next/image no aporta aquí. */

/**
 * Logo del kit original para el encabezado: marranito + nombre en todos los anchos.
 * El horizontal del kit pide al menos 320 px de ancho (unos 100 px de alto), demasiado para una barra;
 * se usa en portadas. En tema oscuro el nombre va en blanco (el nombre a color no se lee sobre oscuro).
 */
export function Logo() {
  return (
    <span className="logo">
      <img className="logo__simbolo" src="/ds/logos/01_simbolo/marranito_64px.png" width={40} height={40} alt="" />
      <img className="logo__nombre logo__nombre--claro" src="/ds/logos/04_logotipo/nombre_original_512px.png" width={150} height={26} alt="Natillera 2.0" />
      <img className="logo__nombre logo__nombre--oscuro" src="/ds/logos/06_monocromos/nombre_blanco.png" width={150} height={31} alt="Natillera 2.0" />
    </span>
  );
}
