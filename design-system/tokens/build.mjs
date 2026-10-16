// Genera tokens.css y tokens.resolved.json a partir de tokens.json (la única fuente de verdad).
// Uso: node design-system/tokens/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const tokens = JSON.parse(readFileSync(join(dir, "tokens.json"), "utf8"));
const temas = tokens.color.themes.map((t) => t.id); // el primero es el tema por defecto

// Valor de un token en un tema; un valor plano o un tema faltante hereda el primer tema.
function valor(token, tema) {
  const v = token.value;
  if (typeof v !== "object") return v;
  return v[tema] ?? v[temas[0]];
}

const colores = Object.fromEntries(tokens.color.tokens.map((t) => [t.name, t]));
function color(nombre, tema, visitados = new Set()) {
  const v = valor(colores[nombre], tema);
  const alias = /^\{(.+)\}$/.exec(v);
  if (!alias) return v;
  if (visitados.has(nombre) || !colores[alias[1]]) throw new Error(`Alias inválido en ${nombre}`);
  visitados.add(nombre);
  return color(alias[1], tema, visitados);
}

const tematicos = [...tokens.color.tokens.map((t) => t.name), ...(tokens.shadow?.tokens ?? []).map((t) => t.name)];
const sombras = Object.fromEntries((tokens.shadow?.tokens ?? []).map((t) => [t.name, t]));
const deTema = (tema) =>
  Object.fromEntries(tematicos.map((n) => [n, colores[n] ? color(n, tema) : valor(sombras[n], tema)]));

const fijos = {};
for (const familia of ["spacing", "radius", "control"]) {
  for (const t of tokens[familia]?.tokens ?? []) fijos[t.name] = t.value;
}
fijos["font-display"] = tokens.type.families.display;
fijos["font-body"] = tokens.type.families.body;

const decl = (obj, sangria = "  ") => Object.entries(obj).map(([k, v]) => `${sangria}--${k}: ${v};`).join("\n");

const fuentes = tokens.type.fonts
  .map(
    (f) => `@font-face {
  font-family: "${f.family}";
  src: url("../${f.file}") format("woff2");
  font-weight: ${f.weight};
  font-style: normal;
  font-display: swap;
}`
  )
  .join("\n");

const [claro, oscuro] = temas;
const css = `/* ${tokens.name} — generado desde tokens.json con build.mjs. No editar a mano. */
${fuentes}

:root {
${decl(fijos)}
${decl(deTema(claro))}
  color-scheme: light;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="${claro}"]) {
${decl(deTema(oscuro), "    ")}
    color-scheme: dark;
  }
}

:root[data-theme="${oscuro}"] {
${decl(deTema(oscuro))}
  color-scheme: dark;
}
`;

const resuelto = {
  name: tokens.name,
  temas: Object.fromEntries(temas.map((t) => [t, deTema(t)])),
  fijos,
  tipografia: tokens.type.groups,
};

writeFileSync(join(dir, "tokens.css"), css);
writeFileSync(join(dir, "tokens.resolved.json"), JSON.stringify(resuelto, null, 2) + "\n");
console.log(`tokens.css y tokens.resolved.json generados (${tematicos.length} tokens por tema).`);
