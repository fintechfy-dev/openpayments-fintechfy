// Envío del código por el bot de Natillera. Usa el mismo token que telegram/ (solo enviar mensajes
// no choca con el long polling del bot). El token va en la URL, así que nunca se registra la URL
// ni el error crudo de red: solo un motivo corto.
import "server-only";

export type ResultadoEnvio = { ok: true } | { ok: false; motivo: string };

export async function enviarPorTelegram(chatId: string, texto: string): Promise<ResultadoEnvio> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) return { ok: false, motivo: "falta TELEGRAM_BOT_TOKEN" };
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: texto }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) return { ok: true };
    // La descripción de Telegram no trae el token ("chat not found", "bot was blocked by the user").
    const cuerpo = (await res.json().catch(() => null)) as { description?: string } | null;
    return { ok: false, motivo: `Telegram respondió ${res.status}${cuerpo?.description ? `: ${cuerpo.description}` : ""}` };
  } catch (error) {
    return { ok: false, motivo: error instanceof Error && error.name === "TimeoutError" ? "Telegram no respondió a tiempo" : "error de red" };
  }
}
