// PreToolUse (Write, Edit, MultiEdit, NotebookEdit): lo que Claude no escribe nunca en este repo.
// Las reglas viven en .claude/rules/ia-y-prompts.md y secretos.md; aquí solo se hacen cumplir.
import { esArchivoSecreto, secretosEn } from "../../scripts/secretos.mjs";
import { entrada, negar, rutaDelRepo } from "./comun.mjs";

const { tool_input: e = {} } = entrada();
const ruta = rutaDelRepo(e.file_path ?? e.notebook_path);
if (!ruta) process.exit(0);

// Desde el 16 de octubre en la tarde, pagos/ lo escribe Claude y se declara en AI_USAGE.md (decisión del
// equipo; .claude/rules/ia-y-prompts.md): ya no hay candado sobre esa carpeta.

if (esArchivoSecreto(ruta)) {
  negar("PreToolUse", `${ruta} guarda secretos: lo llena la persona, nunca Claude (.claude/rules/secretos.md). Si falta una variable, agrégala sin valor al .env.example de la carpeta.`);
}

const texto = [e.content, e.new_string, e.new_source, ...(e.edits ?? []).map((x) => x.new_string)].filter(Boolean).join("\n");
const hallados = secretosEn(texto);
if (hallados.length) {
  negar(
    "PreToolUse",
    `El texto para ${ruta} parece contener un secreto (${hallados.join(", ")}). El repo es público: léelo de una variable de entorno, y en prompts/ reemplázalo por <SECRETO OMITIDO> (.claude/rules/secretos.md).`,
  );
}
