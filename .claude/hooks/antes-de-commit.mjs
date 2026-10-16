// PreToolUse (Bash): un commit o un PR pasan antes por la checklist de entrega y las reglas de git
// (.claude/rules/checklist-entrega.md y git-y-entrega.md). Los demás comandos pasan sin revisar.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { RAIZ, entrada, negar, recortar } from "./comun.mjs";

const comando = entrada().tool_input?.command ?? "";
const esCommit = /\bgit\b(\s+-[cC]\s+\S+)*\s+commit\b/.test(comando);
const esPr = /\bgh\s+pr\s+create\b/.test(comando);
if (!esCommit && !esPr) process.exit(0);

// El texto del mensaje (con -m o en un heredoc) puede nombrar flags sin usarlos.
const sinMensaje = comando.replace(/<<-?\s*['"]?(\w+)['"]?[\s\S]*?\n\s*\1\b/g, "").replace(/-m\s+("[^"]*"|'[^']*')/g, "");

if (/--no-verify\b/.test(sinMensaje)) negar("PreToolUse", "Nada de --no-verify (.claude/rules/git-y-entrega.md).");

if (esCommit) {
  // La guardia revisa el índice: si el mismo comando agrega archivos, revisaría un índice viejo.
  if (/\bgit\s+add\b/.test(sinMensaje) || /\s(-a|--all|-[a-zA-Z]*a[a-zA-Z]*)\b/.test(sinMensaje)) {
    negar("PreToolUse", "Prepara los archivos con `git add <rutas>` en un comando aparte y luego haz el commit, para que la guardia revise exactamente lo que entra.");
  }

  const preparados = execFileSync("git", ["diff", "--cached", "--name-only"], { cwd: RAIZ, encoding: "utf8" }).split("\n").filter(Boolean);
  const gobernanza = preparados.filter((f) => f.startsWith(".claude/") || f === "CLAUDE.md");
  const codigo = preparados.filter((f) => /^(web|telegram|pagos|integracion|design-system|scripts|\.github)\//.test(f));
  // Un merge de develop trae lo que otros ya separaron en sus commits: no es mezcla propia.
  const enMerge = existsSync(join(RAIZ, ".git", "MERGE_HEAD"));
  if (gobernanza.length && codigo.length && !enMerge) {
    negar(
      "PreToolUse",
      `La configuración de Claude va en su propio commit, separada del código (.claude/rules/git-y-entrega.md). Preparados juntos: ${gobernanza.join(", ")} y ${codigo.join(", ")}. Saca uno de los dos grupos con \`git restore --staged\`.`,
    );
  }
}

const r = spawnSync(process.execPath, [join(RAIZ, "scripts/revisar-entrega.mjs"), "--rama"], { cwd: RAIZ, encoding: "utf8" });
if (r.status !== 0) {
  negar("PreToolUse", `scripts/revisar-entrega.mjs encontró un bloqueo (secreto o .env versionado). No hay commit ni PR hasta corregirlo; si ya se subió, aplica .claude/rules/secretos.md.\n\n${recortar(r.stdout)}`);
}

// Pasa, pero Claude debe cerrar su reporte con lo que falta (checklist-entrega.md, paso 4).
const avisos = r.stdout.split("\n").filter((l) => l.startsWith("! ") || l.startsWith("Próximo hito"));
console.log(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      additionalContext: `Checklist de entrega (scripts/revisar-entrega.mjs --rama). Cierra tu reporte con estos pendientes:\n${avisos.join("\n")}`,
    },
  }),
);
