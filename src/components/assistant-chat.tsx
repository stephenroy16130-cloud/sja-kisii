"use client";

import { useEffect, useRef, useState } from "react";
import { EMERGENCY } from "@/lib/contact";
import { btnGhostCls } from "@/lib/ui";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "How do I earn points?",
  "How does check-in work?",
  "How is the Member of the Week chosen?",
  "What is coming up for me?",
  "How do I pay for something in the shop?",
  "Someone is choking. What do I do?",
];

function Linkified({ text }: { text: string }) {
  return (
    <>
      {text.split(/(https?:\/\/[^\s)]+)/g).map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="break-all text-gold underline">
            {p}
          </a>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}

export default function AssistantChat({
  firstName,
  enabled,
  limit,
  left: initialLeft,
}: {
  firstName: string;
  enabled: boolean;
  limit: number;
  left: number;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [left, setLeft] = useState(initialLeft);
  const abort = useRef<AbortController | null>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy || left <= 0) return;
    setError("");
    const next: Msg[] = [...messages.filter((m) => m.content), { role: "user", content: q }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    const ctrl = new AbortController();
    abort.current = ctrl;

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-8) }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error || "The assistant could not answer.");
      }
      setLeft((l) => Math.max(0, l - 1));
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setMessages([...next, { role: "assistant", content: acc }]);
      }
    } catch (e) {
      const stopped = e instanceof DOMException && e.name === "AbortError";
      if (!stopped) setError(e instanceof Error ? e.message : "The assistant could not answer.");
      setMessages((prev) => prev.filter((m, i) => !(i === prev.length - 1 && m.role === "assistant" && m.content === "")));
    }
    setBusy(false);
  }

  function reset() {
    abort.current?.abort();
    setMessages([]);
    setError("");
    setInput("");
  }

  if (!enabled) {
    return (
      <div className="rounded-3xl border border-white/10 bg-card p-6 text-sm text-white/60">
        The assistant is not switched on yet. Please check back soon.
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-card p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] uppercase tracking-[0.25em] text-gold">SJA Assistant</p>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/40">
            {left} of {limit} questions left today
          </span>
          {messages.length > 0 && (
            <button onClick={reset} className={btnGhostCls}>
              New chat
            </button>
          )}
        </div>
      </div>

      {messages.length === 0 ? (
        <div>
          <p className="font-copy text-sm leading-relaxed text-white/70">
            Hello {firstName}. I can explain how the app and the division work, tell you what is coming up for you, and
            help with basic first aid. What would you like to know?
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                disabled={busy || left <= 0}
                className="rounded-full border border-white/20 px-4 py-2 text-xs text-white/80 transition hover:border-white hover:text-white disabled:opacity-40"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  m.role === "user" ? "rounded-br-md bg-white text-black" : "rounded-bl-md border border-white/10 bg-black text-white/90"
                }`}
              >
                {m.content ? <Linkified text={m.content} /> : <span className="animate-pulse text-white/40">Thinking...</span>}
              </div>
            </div>
          ))}
          <div ref={end} className="scroll-mb-40" />
        </div>
      )}

      {error && <p className="mt-4 text-sm text-bad">{error}</p>}
      {left <= 0 && <p className="mt-4 text-sm text-warn">You have used today&apos;s questions. Come back tomorrow.</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="mt-5"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
          rows={2}
          maxLength={800}
          disabled={left <= 0}
          placeholder="Ask a question..."
          className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-white/60 disabled:opacity-50"
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-white/40">
            AI can make mistakes. In an emergency, call{" "}
            <a href={`tel:${EMERGENCY.tel}`} className="text-bad underline">
              {EMERGENCY.display}
            </a>
            .
          </p>
          {busy ? (
            <button type="button" onClick={() => abort.current?.abort()} className={btnGhostCls}>
              Stop
            </button>
          ) : (
            <button
              disabled={!input.trim() || left <= 0}
              className="rounded-full bg-white px-5 py-2.5 text-xs font-medium text-black transition hover:bg-neutral-200 disabled:opacity-40"
            >
              Send
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
