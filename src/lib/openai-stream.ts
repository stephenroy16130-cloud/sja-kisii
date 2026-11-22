import { aiKey, aiModel, aiReasoning } from "./ai-config";
import { HttpError } from "./http";

export type Turn = { role: "user" | "assistant"; content: string };
export type Usage = { input: number; output: number };

const ENDPOINT = "https://api.openai.com/v1/responses";
const CUT = "\n\n(The answer ran out of room. Try a shorter question.)";
const FAIL = "\n\nSorry, something went wrong while answering. Please try again.";
const EMPTY = "Sorry, I could not come up with an answer. Please try again.";

// The real reason goes to the server log. The member only sees something friendly.
function failure(status: number, text: string): HttpError {
  console.error("OpenAI error", status, text.slice(0, 500));
  if (status === 401) return new HttpError(503, "The assistant is not set up correctly yet. Please tell the administrator.");
  if (status === 429) return new HttpError(503, "The assistant is busy right now. Please try again in a minute.");
  if (status === 404 || (status === 400 && /model/i.test(text))) {
    return new HttpError(503, "The assistant's model is not available. Please tell the administrator.");
  }
  return new HttpError(502, "The assistant could not answer just now. Please try again.");
}

const call = (body: Record<string, unknown>) =>
  fetch(ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${aiKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(55_000),
  });

type StreamEvent = {
  type?: string;
  delta?: string;
  response?: { usage?: { input_tokens?: number; output_tokens?: number } };
};

export async function askStream(
  instructions: string,
  turns: Turn[],
  onDone: (u: Usage | null) => void
): Promise<ReadableStream<Uint8Array>> {
  const base: Record<string, unknown> = {
    model: aiModel(),
    instructions,
    input: turns.map((t) => ({ role: t.role, content: t.content })),
    max_output_tokens: 1500,
    store: false, // OpenAI should not keep these conversations
    stream: true,
  };

  const effort = aiReasoning();
  let res = await call(effort ? { ...base, reasoning: { effort } } : base);
  // A model without reasoning rejects that setting, so try once more without it
  if (res.status === 400 && effort) {
    const text = await res.text();
    if (!/reasoning|unsupported/i.test(text)) throw failure(400, text);
    res = await call(base);
  }
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
          // the member left, so there is nobody to send to
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
            if (!line) continue;
            let ev: StreamEvent;
            try {
              ev = JSON.parse(line.slice(5).trim()) as StreamEvent;
            } catch {
              continue;
            }

            if (ev.type === "response.output_text.delta" && typeof ev.delta === "string") {
              produced = true;
              send(ev.delta);
            } else if (ev.type === "response.completed") {
              const u = ev.response?.usage;
              if (u) usage = { input: u.input_tokens ?? 0, output: u.output_tokens ?? 0 };
            } else if (ev.type === "response.incomplete") {
              produced = true;
              send(CUT);
            } else if (ev.type === "response.failed" || ev.type === "error") {
              console.error("OpenAI stream error", line.slice(0, 300));
              failed = true;
              send(FAIL);
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
