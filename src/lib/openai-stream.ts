import { aiKey, aiModel } from "./ai-config";
import { HttpError } from "./http";

export type Turn = { role: "user" | "assistant"; content: string };
export type Usage = { input: number; output: number };

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const CUT = "\n\n(The answer ran out of room. Try a shorter question.)";
const FAIL = "\n\nSorry, something went wrong while answering. Please try again.";
const EMPTY = "Sorry, I could not come up with an answer. Please try again.";

// The real reason goes to the server log. The member only sees something friendly.
function failure(status: number, text: string): HttpError {
  console.error("OpenRouter error", status, text.slice(0, 500));
  if (status === 401) return new HttpError(503, "The assistant is not set up correctly yet. Please tell the administrator.");
  if (status === 402 || status === 429) return new HttpError(503, "The assistant is busy right now. Please try again in a minute.");
  if (status === 404 || status === 400) return new HttpError(503, "The assistant's model is not available. Please tell the administrator.");
  return new HttpError(502, "The assistant could not answer just now. Please try again.");
}

type Chunk = {
  choices?: { delta?: { content?: string | null }; finish_reason?: string | null }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: unknown;
};

export async function askStream(
  instructions: string,
  turns: Turn[],
  onDone: (u: Usage | null) => void
): Promise<ReadableStream<Uint8Array>> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${aiKey()}`,
      "Content-Type": "application/json",
      "X-Title": "SJA Kisii",
    },
    body: JSON.stringify({
      model: aiModel(),
      messages: [{ role: "system", content: instructions }, ...turns.map((t) => ({ role: t.role, content: t.content }))],
      max_tokens: 2000,
      stream: true,
      stream_options: { include_usage: true },
    }),
    signal: AbortSignal.timeout(55_000),
  });
  if (!res.ok || !res.body) throw failure(res.status, await res.text().catch(() => ""));

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  const enc = new TextEncoder();
  let buf = "";
  let usage: Usage | null = null;
  let produced = false;
  let failed = false;

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (s: string) => {
        try {
          controller.enqueue(enc.encode(s));
        } catch {
          // the member left
        }
      };
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });

          let i: number;
          while ((i = buf.indexOf("\n\n")) >= 0) {
            const block = buf.slice(0, i);
            buf = buf.slice(i + 2);
            const line = block.split("\n").find((l) => l.startsWith("data:"));
            if (!line) continue; // comments such as ": OPENROUTER PROCESSING"
            const payload = line.slice(5).trim();
            if (payload === "[DONE]") continue;
            let ev: Chunk;
            try {
              ev = JSON.parse(payload) as Chunk;
            } catch {
              continue;
            }
            if (ev.error) {
              console.error("OpenRouter stream error", payload.slice(0, 300));
              failed = true;
              send(FAIL);
              continue;
            }
            if (ev.usage) usage = { input: ev.usage.prompt_tokens ?? 0, output: ev.usage.completion_tokens ?? 0 };
            const c = ev.choices?.[0];
            const text = c?.delta?.content;
            if (typeof text === "string" && text) {
              produced = true;
              send(text);
            }
            if (c?.finish_reason === "length") {
              produced = true;
              send(CUT);
            }
          }
        }
        if (!produced && !failed) send(EMPTY);
      } catch (e) {
        console.error("assistant stream failed", e);
        send(FAIL);
      } finally {
        onDone(usage);
        try {
          controller.close();
        } catch {
          // already closed
        }
      }
    },
    cancel() {
      reader.cancel().catch(() => undefined);
    },
  });
}
