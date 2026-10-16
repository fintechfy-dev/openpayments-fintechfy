#!/usr/bin/env node
// Revisa contra el repo los puntos de la checklist de entrega que se pueden comprobar
// (docs/checklist-entrega.md). Se corre antes de cada commit y de cada PR:
//
//   node scripts/revisar-entrega.mjs            revisión completa
//   node scripts/revisar-entrega.mjs --rama     además, lo que le falta al diff de la rama contra develop
//
// Sale con código 1 solo ante un bloqueo (un secreto o un .env versionado). Lo demás son avisos.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));
const conRama = process.argv.includes("--rama");

// Copiados de la checklist del equipo (datos.js). Si la organización los cambia, se actualizan aquí y en el doc.
const HITOS = [
  ["2026-10-16T08:30:00-05:00", "Registro en Ruta N"],
  ["2026-10-16T10:30:00-05:00", "Arranca la construcción"],
  ["2026-10-16T15:00:00-05:00", "Checkpoint de alcance"],
  ["2026-10-16T17:30:00-05:00", "Salida del viernes"],
  ["2026-10-17T07:00:00-05:00", "Registro del sábado"],
  ["2026-10-17T10:30:00-05:00", "Congelar y revisar"],
  ["2026-10-17T11:00:00-05:00", "Cierre del código"],
  ["2026-10-17T12:00:00-05:00", "Ronda 1"],
  ["2026-10-17T14:30:00-05:00", "Finalistas y Ronda 2"],
  ["2026-10-17T16:30:00-05:00", "Ganadores"],
];

// Mismos patrones que la regla de secretos, más los formatos concretos que usa el proyecto.
const PATRONES_SECRETO = [
  ["token de bot de Telegram", /\b\d{8,10}:AA[A-Za-z0-9_-]{33}\b/],
  ["clave privada", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["token de GitHub", /\bgh[pousr]_[A-Za-z0-9]{36,}\b/],
  ["llave de API", /\bsk-[A-Za-z0-9_-]{20,}\b/],
];
const ARCHIVO_SECRETO = /(^|\/)(\.env(\.[^/]*)?|[^/]*\.pem|[^/]*\.key)$/;

const resultados = [];
const ok = (punto, detalle) => resultados.push({ nivel: "ok", punto, detalle });
const aviso = (punto, detalle) => resultados.push({ nivel: "aviso", punto, detalle });
const bloqueo = (punto, detalle) => resultados.push({ nivel: "bloqueo", punto, detalle });

function git(...args) {
  return execFileSync("git", args, { cwd: RAIZ, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 }).trim();
}

function leer(ruta) {
  const completa = join(RAIZ, ruta);
  return existsSync(completa) ? readFileSync(completa, "utf8") : null;
}

function pendientesEn(texto) {
  return (texto.match(/_Por (completar|decidir)[^_]*_/g) ?? []).length;
}

// --- Secretos (s-secretos, US-002-SEC) ---

const versionados = git("ls-files").split("\n").filter((f) => ARCHIVO_SECRETO.test(f) && !f.endsWith(".env.example"));
if (versionados.length) bloqueo("s-secretos", `Archivos de secretos versionados: ${versionados.join(", ")}`);

const enHistoria = new Set(
  git("log", "--all", "--name-only", "--pretty=format:")
    .split("\n")
    .filter((f) => f && ARCHIVO_SECRETO.test(f) && !f.endsWith(".env.example")),
);
if (enHistoria.size) bloqueo("s-secretos", `Archivos de secretos en el historial (hay que rotar esas claves): ${[...enHistoria].join(", ")}`);

function buscarSecretos(texto, donde) {
  for (const [nombre, patron] of PATRONES_SECRETO) {
    if (patron.test(texto)) bloqueo("s-secretos", `Posible ${nombre} en ${donde}`);
  }
}
buscarSecretos(git("diff", "--cached"), "los cambios preparados para commit");
buscarSecretos(git("diff"), "los cambios sin preparar");
buscarSecretos(git("log", "--all", "-p", "--no-color"), "el historial de git");

if (!resultados.some((r) => r.punto === "s-secretos")) ok("s-secretos", "Sin archivos ni patrones de secretos en el árbol, los cambios ni el historial");

for (const carpeta of ["web", "telegram", "pagos"]) {
  const tieneCodigo = existsSync(join(RAIZ, carpeta, "package.json"));
  if (tieneCodigo && !existsSync(join(RAIZ, carpeta, ".env.example"))) {
    aviso("hoy-gitignore", `${carpeta}/ tiene código pero no tiene .env.example con los nombres de sus variables`);
  }
}

// --- Open Payments (b-op, c-op, s-video) ---

const usaSdk = git("ls-files", "*package.json")
  .split("\n")
  .filter(Boolean)
  .some((f) => /"@interledger\/open-payments"/.test(leer(f) ?? ""));
const codigoPagos = git("ls-files", "pagos").split("\n").filter((f) => f && !/README\.md$/.test(f));
if (usaSdk && codigoPagos.length) ok("b-op", "pagos/ tiene código y el SDK de Open Payments está declarado");
else aviso("b-op", `Ningún paquete usa todavía @interledger/open-payments${codigoPagos.length ? "" : " y pagos/ solo tiene su README"}. Sin la API de Open Payments el proyecto no entra a evaluación (#3, #4)`);

// --- Uso de IA (s-aiusage, s-prompts, b-prompts) ---

const aiUsage = leer("AI_USAGE.md");
if (!aiUsage) aviso("s-aiusage", "Falta AI_USAGE.md en la raíz");
else {
  const n = pendientesEn(aiUsage);
  if (n) aviso("s-aiusage", `AI_USAGE.md tiene ${n} sección(es) "_Por completar_" (entre ellas, los archivos con poca o ninguna IA)`);
  else ok("s-aiusage", "AI_USAGE.md sin secciones por completar");
  if (/completar modelo/i.test(aiUsage)) aviso("s-aiusage", "AI_USAGE.md dice \"completar modelo\": falta el modelo exacto de una herramienta");
}

const prompts = existsSync(join(RAIZ, "prompts")) ? readdirSync(join(RAIZ, "prompts")).filter((f) => f.endsWith(".md") && f !== "README.md") : [];
if (prompts.length) ok("s-prompts", `${prompts.length} archivo(s) de prompts en prompts/`);
else aviso("s-prompts", "prompts/ no tiene prompts de código");

// --- README (s-readme) ---

const readme = leer("README.md") ?? "";
const pendReadme = pendientesEn(readme);
if (pendReadme) aviso("s-readme", `README.md tiene ${pendReadme} sección(es) por completar (cómo usa Open Payments, cómo correr la demo)`);
else ok("s-readme", "README.md sin secciones por completar");

// --- Repositorio y ramas (s-publico, s-main) ---

try {
  const vis = execFileSync("gh", ["repo", "view", "--json", "visibility", "--jq", ".visibility"], { cwd: RAIZ, encoding: "utf8" }).trim();
  if (vis === "PUBLIC") ok("s-publico", "El repositorio es público");
  else aviso("s-publico", `El repositorio está en ${vis}: un repositorio privado no se evalúa`);
} catch {
  aviso("s-publico", "No se pudo consultar con gh si el repositorio es público; compruébalo abriendo el enlace sin sesión");
}

try {
  const pendientesMain = Number(git("rev-list", "--count", "origin/main..origin/develop"));
  if (pendientesMain) aviso("s-main", `develop lleva ${pendientesMain} commit(s) que no están en main; se integran con release/entrega antes de las 11:00 del sábado (#11)`);
  else ok("s-main", "main tiene todo lo de develop");
} catch {
  aviso("s-main", "No se pudo comparar origin/main con origin/develop (¿falta git fetch?)");
}

// --- La rama actual contra develop (b-prompts, s-aiusage) ---

if (conRama) {
  let cambiados = [];
  try {
    // Contra la base común con develop e incluyendo el árbol de trabajo: se corre antes del commit.
    const base = git("merge-base", "origin/develop", "HEAD");
    cambiados = [
      ...git("diff", "--name-only", base).split("\n"),
      ...git("ls-files", "--others", "--exclude-standard").split("\n"),
    ].filter(Boolean);
  } catch {
    aviso("rama", "No se pudo comparar con origin/develop (¿falta git fetch?)");
  }
  const deCodigo = cambiados.filter((f) => /^(web|telegram|pagos|integracion|design-system|scripts|\.claude)\//.test(f) || f === "CLAUDE.md");
  if (deCodigo.length) {
    if (!cambiados.some((f) => f.startsWith("prompts/"))) aviso("b-prompts", "La rama cambia código pero no agrega prompts en prompts/");
    else ok("b-prompts", "La rama agrega prompts");
    if (!cambiados.includes("AI_USAGE.md")) aviso("s-aiusage", "La rama cambia código pero no toca AI_USAGE.md");
    else ok("s-aiusage", "La rama actualiza AI_USAGE.md");
    if (deCodigo.some((f) => f.startsWith("pagos/"))) aviso("b-servicio", "La rama toca pagos/: debe estar escrito por el equipo con poca o ninguna IA, y AI_USAGE.md lo declara con precisión");
  }
}

// --- El reloj (hitos) ---

const ahora = Date.now();
const proximo = HITOS.find(([cuando]) => Date.parse(cuando) > ahora);
const minutos = proximo ? Math.round((Date.parse(proximo[0]) - ahora) / 60000) : null;

// --- Reporte ---

const icono = { ok: "✓", aviso: "!", bloqueo: "✗" };
console.log("Checklist de entrega · lo que se puede comprobar desde el repo (docs/checklist-entrega.md)\n");
if (proximo) {
  const h = Math.floor(minutos / 60);
  console.log(`Próximo hito: ${proximo[1]} (${proximo[0].slice(11, 16)}), en ${h ? `${h} h ` : ""}${minutos % 60} min\n`);
}
for (const nivel of ["bloqueo", "aviso", "ok"]) {
  for (const r of resultados.filter((x) => x.nivel === nivel)) console.log(`${icono[nivel]} [${r.punto}] ${r.detalle}`);
}
console.log("\nLo que depende de personas (Slack, billeteras, video, presentación, formulario) se marca en la checklist web; ver docs/checklist-entrega.md.");

process.exit(resultados.some((r) => r.nivel === "bloqueo") ? 1 : 0);
