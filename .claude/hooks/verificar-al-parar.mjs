// Stop: antes de dar un turno por terminado, las pruebas de cada carpeta con cambios sin commit
// tienen que pasar (.claude/rules/pruebas.md). Si fallan, Claude sigue trabajando en vez de cerrar.
//
// En web/ no se corre el build: comparte .next/ con `npm run dev` y con los agentes del director.
// El build lo corren la CI (.github/workflows/calidad.yml) y el paso de integración de /director-web.
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RAIZ, entrada, recortar } from "./comun.mjs";

const CARPETAS = {
  web: [["run", "typecheck"], ["run", "lint"], ["run", "test"]],
  telegram: [["test"]],
  pagos: [["test"]],
};

const { stop_hook_active: yaBloqueado } = entrada();

let estado;
try {
  estado = execFileSync("git", ["status", "--porcelain", "--untracked-files=all"], { cwd: RAIZ, encoding: "utf8" });
} catch {
  process.exit(0);
}
const cambiados = estado
  .split("\n")
  .filter(Boolean)
  .map((l) => l.slice(3).split(" -> ").pop());

// Huella de lo cambiado por carpeta: si nada cambió desde la última corrida verde, no se repite.
const cache = join(tmpdir(), `natillera-verificar-${createHash("sha1").update(RAIZ).digest("hex").slice(0, 10)}.json`);
let verdes = {};
try {
  verdes = JSON.parse(readFileSync(cache, "utf8"));
} catch {}

const fallos = [];
for (const [carpeta, comandos] of Object.entries(CARPETAS)) {
  const propios = cambiados.filter((f) => f.startsWith(`${carpeta}/`));
  const paquete = join(RAIZ, carpeta, "package.json");
  if (!propios.length || !existsSync(paquete) || !existsSync(join(RAIZ, carpeta, "node_modules"))) continue;
  if (carpeta === "pagos" && !JSON.parse(readFileSync(paquete, "utf8")).scripts?.test) continue;

  const huella = createHash("sha1");
  for (const f of propios.sort()) {
    const s = existsSync(join(RAIZ, f)) ? statSync(join(RAIZ, f)) : null;
    huella.update(`${f}:${s?.mtimeMs}:${s?.size}\n`);
  }
  const firma = huella.digest("hex");
  if (verdes[carpeta] === firma) continue;

  for (const args of comandos) {
    const r = spawnSync("npm", ["--prefix", carpeta, ...args], { cwd: RAIZ, encoding: "utf8" });
    if (r.status !== 0) {
      fallos.push(`npm --prefix ${carpeta} ${args.join(" ")} falló:\n${recortar(`${r.stdout}${r.stderr}`.trim(), 3000)}`);
      break;
    }
  }
  if (!fallos.some((f) => f.includes(`--prefix ${carpeta} `))) verdes[carpeta] = firma;
}

try {
  writeFileSync(cache, JSON.stringify(verdes));
} catch {}

if (!fallos.length) process.exit(0);

// Segundo intento seguido: no se bloquea otra vez (evita un bucle), pero la persona lo ve.
if (yaBloqueado) {
  console.log(JSON.stringify({ systemMessage: `Las pruebas siguen fallando:\n${fallos.map((f) => f.split("\n")[0]).join("\n")}` }));
  process.exit(0);
}
process.stderr.write(`Hay pruebas en rojo en lo que cambiaste. Corrígelas (o explica por qué no son tuyas, comparando con develop limpio) antes de terminar:\n\n${fallos.join("\n\n")}\n`);
process.exit(2);
