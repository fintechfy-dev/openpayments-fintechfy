// Lee el cuerpo de una petición sin pasar de un límite de bytes: Content-Length puede faltar o
// mentir, así que se cuenta lo que llega y se corta en cuanto se pasa.
export const MAX_CUERPO_BYTES = 32 * 1024;

export type CuerpoLeido = { ok: true; texto: string } | { ok: false; motivo: "muy-grande" };

export async function leerCuerpoLimitado(request: Request, maximo = MAX_CUERPO_BYTES): Promise<CuerpoLeido> {
  const declarado = Number(request.headers.get("content-length"));
  if (Number.isFinite(declarado) && declarado > maximo) return { ok: false, motivo: "muy-grande" };
  if (!request.body) return { ok: true, texto: "" };

  const lector = request.body.getReader();
  const partes: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    total += value.byteLength;
    if (total > maximo) {
      await lector.cancel().catch(() => undefined);
      return { ok: false, motivo: "muy-grande" };
    }
    partes.push(value);
  }
  return { ok: true, texto: new TextDecoder("utf-8").decode(Buffer.concat(partes)) };
}
