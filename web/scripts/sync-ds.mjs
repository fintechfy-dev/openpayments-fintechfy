// Copia lo que la web usa del design system (carpetas generadas, ignoradas por git):
//   src/styles/ds/  tokens.css, bundle.css y fuentes, que el layout importa en el bundle
//   public/ds/      logos del kit, servidos como archivos estáticos
// La fuente es ../design-system: nunca edites estas copias a mano.
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const web = join(dirname(fileURLToPath(import.meta.url)), "..");
const ds = join(web, "..", "design-system");
const estilos = join(web, "src", "styles", "ds");
const publico = join(web, "public", "ds");

const copias = [
  [estilos, "tokens/tokens.css", "tokens/tokens.css"],
  [estilos, "components/bundle.css", "components/bundle.css"],
  [estilos, "fonts", "fonts"],
  [publico, "assets/logos/kit/01_simbolo", "logos/01_simbolo"],
  [publico, "assets/logos/kit/02_vertical", "logos/02_vertical"],
  [publico, "assets/logos/kit/03_horizontal", "logos/03_horizontal"],
  [publico, "assets/logos/kit/04_logotipo", "logos/04_logotipo"],
  [publico, "assets/logos/kit/05_avatar", "logos/05_avatar"],
  [publico, "assets/logos/kit/06_monocromos", "logos/06_monocromos"],
];

// Todas las fuentes se revisan antes de borrar nada: si falta una, las copias actuales siguen sirviendo.
const faltantes = copias.map(([, de]) => de).filter((de) => !existsSync(join(ds, de)));
if (faltantes.length) {
  console.error(`Faltan en design-system/: ${faltantes.join(", ")}.`);
  if (faltantes.includes("tokens/tokens.css")) console.error("Para tokens.css corre: node design-system/tokens/build.mjs");
  process.exit(1);
}
for (const d of [estilos, publico]) rmSync(d, { recursive: true, force: true });
for (const [destino, de, a] of copias) {
  mkdirSync(dirname(join(destino, a)), { recursive: true });
  cpSync(join(ds, de), join(destino, a), { recursive: true });
}
console.log(`Design system copiado a src/styles/ds y public/ds (${copias.length} rutas).`);
