// PostToolUse (Write, Edit, MultiEdit): revisión rápida del archivo recién escrito, para que el error
// se corrija en el momento y no al final. Lo completo (tipos y pruebas) lo corre verificar-al-parar.mjs.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { RAIZ, entrada, recortar, rutaDelRepo } from "./comun.mjs";

const { tool_input: e = {} } = entrada();
const ruta = rutaDelRepo(e.file_path);
if (!ruta || !/\.(ts|tsx|js|mjs|cjs)$/.test(ruta)) process.exit(0);

function fallar(titulo, r) {
  process.stderr.write(`${titulo}\n${recortar(`${r.stdout ?? ""}${r.stderr ?? ""}`.trim())}\n`);
  process.exit(2);
}

if (ruta.startsWith("web/")) {
  const eslint = join(RAIZ, "web/node_modules/.bin/eslint");
  // Sin dependencias instaladas no hay con qué revisar; el Stop y la CI lo cubren.
  if (!existsSync(eslint)) process.exit(0);
  const r = spawnSync(eslint, ["--no-warn-ignored", ruta.slice(4)], { cwd: join(RAIZ, "web"), encoding: "utf8" });
  if (r.status !== 0) fallar(`ESLint encontró problemas en ${ruta}. Corrígelos antes de seguir:`, r);
} else if (ruta.startsWith("telegram/") || ruta.startsWith("scripts/") || ruta.startsWith(".claude/hooks/")) {
  const r = spawnSync(process.execPath, ["--check", join(RAIZ, ruta)], { encoding: "utf8" });
  if (r.status !== 0) fallar(`${ruta} no compila (node --check):`, r);
}
