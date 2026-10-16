import { ICONOS, type NombreIcono } from "@/lib/natillera";

interface Props {
  nombre: NombreIcono;
  tamano?: "sm" | "md" | "lg";
  className?: string;
}

/** Ícono de línea del design system. Decorativo: el significado siempre va también en texto. */
export function Icono({ nombre, tamano = "md", className }: Props) {
  const clases = ["nt-ico", tamano !== "md" && `nt-ico--${tamano}`, className].filter(Boolean).join(" ");
  // Los trazos son constantes del propio código (ICONOS), no datos de usuario.
  return <svg className={clases} viewBox="0 0 24 24" aria-hidden="true" focusable="false" dangerouslySetInnerHTML={{ __html: ICONOS[nombre] }} />;
}
