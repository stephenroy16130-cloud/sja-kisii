"use client";

import { useEffect, useRef, useState } from "react";
import { EMERGENCY } from "@/lib/contact";
import { btnGhostCls } from "@/lib/ui";

type Msg = { role: "user" | "assistant"; content: string };
type Chat = { id: string; title: string; updatedAt: string };

const SUGGESTIONS = [
  "How do I earn points?",
  "How does check-in work?",
  "How is the Member of the Week chosen?",
  "What is coming up for me?",
  "How do I pay for something in the shop?",
  "Someone is choking. What do I do?",
];

async function call(url: string, method: string, body?: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const j = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(typeof j.error === "string" ? j.error : "Something went wrong");
  return j;
}
const msgOf = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");
const day = (iso: string) => new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short", timeZone: "Africa/Nairobi" });

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
  chats: initialChats,
}: {
  firstName: string;
  enabled: boolean;
  limit: number;
  left: number;
  chats: Chat[];
}) {
  const [chats, setChats] = useState<Chat[]>(initialChats);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [left, setLeft] = useState(initialLeft);
  const [showList, setShowList] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const abort = useRef<AbortController | null>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages]);

  async function refreshList() {
    try {
      const j = await call("/api/assistant/chats", "GET");
      setChats(j.chats as Chat[]);
    } catch {
      // keep the list we have
    }
  }

  function newChat() {
    abort.current?.abort();
    setActiveId(null);
    setMessages([]);
    setError("");
    setInput("");
    setShowList(false);
  }

  async function openChat(id: string) {
    setShowList(false);
    if (id === activeId) return;
    abort.current?.abort();
    setError("");
    try {
      const j = await call(`/api/assistant/chats/${id}`, "GET");
      setMessages(j.messages as Msg[]);
      setActiveId(id);
    } catch (e) {
      setError(msgOf(e));
    }
  }

  async function saveRename(id: string) {
    const title = draft.trim();
    setEditing(null);
    if (!title) return;
    try {
      await call(`/api/assistant/chats/${id}`, "PATCH", { title });
      setChats((c) => c.map((x) => (x.id === id ? { ...x, title } : x)));
    } catch (e) {
      setError(msgOf(e));
    }
  }

  async function removeChat(id: string) {
    if (!window.confirm("Delete this chat? This cannot be undone.")) return;
    try {
      await call(`/api/assistant/chats/${id}`, "DELETE");
      setChats((c) => c.filter((x) => x.id !== id));
      if (id === activeId) newChat();
    } catch (e) {
      setError(msgOf(e));
    }
  }

  async function clearAll() {
    if (!window.confirm("Delete ALL your chats? This cannot be undone.")) return;
    try {
      await call("/api/assistant/chats", "DELETE");
      setChats([]);
      newChat();
    } catch (e) {
      setError(msgOf(e));
    }
  }

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy || left <= 0) return;
    setError("");
    const base: Msg[] = [...messages, { role: "user", content: q }];
    setMessages([...base, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    const ctrl = new AbortController();
    abort.current = ctrl;

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: activeId ?? undefined, message: q }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error || "The assistant could not answer.");
      }
      const id = res.headers.get("X-Chat-Id");
      if (id) setActiveId(id);
      setLeft((l) => Math.max(0, l - 1));
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setMessages([...base, { role: "assistant", content: acc }]);
      }
      void refreshList();
    } catch (e) {
      const stopped = e instanceof DOMException && e.name === "AbortError";
      if (!stopped) setError(msgOf(e));
      setMessages((prev) => prev.filter((m, i) => !(i === prev.length - 1 && m.role === "assistant" && m.content === "")));
    }
    setBusy(false);
  }

  if (!enabled) {
    return (
      <div className="rounded-3xl border border-white/10 bg-card p-6 text-sm text-white/60">
        The assistant is not switched on yet. Please check back soon.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-[16rem_1fr]">
      <aside className={`${showList ? "block" : "hidden"} md:block`}>
        <div className="rounded-3xl border border-white/10 bg-card p-4">
          <button
            onClick={newChat}
            className="w-full rounded-full bg-white px-4 py-2.5 text-xs font-medium text-black transition hover:bg-neutral-200"
          >
            New chat
          </button>
          {chats.length === 0 ? (
            <p className="mt-4 text-xs text-white/40">Your chats will appear here.</p>
          ) : (
            <>
              <ul className="mt-4 max-h-[50vh] space-y-1 overflow-y-auto">
                {chats.map((c) => (
                  <li
                    key={c.id}
                    className={`rounded-xl border px-3 py-2 ${c.id === activeId ? "border-white/40 bg-white/10" : "border-transparent hover:bg-white/5"}`}
                  >
                    {editing === c.id ? (
                      <input
                        autoFocus
                        value={draft}
                        maxLength={80}
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={() => setEditing(null)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void saveRename(c.id);
                          if (e.key === "Escape") setEditing(null);
                        }}
                        className="w-full rounded-lg border border-white/20 bg-black px-2 py-1 text-xs outline-none"
                        aria-label="Chat name"
                      />
                    ) : (
                      <>
                        <button onClick={() => void openChat(c.id)} className="block w-full truncate text-left text-sm text-white/90">
                          {c.title}
                        </button>
                        <div className="mt-1 flex items-center justify-between text-[11px] text-white/40">
                          <span>{day(c.updatedAt)}</span>
                          <span className="flex gap-3">
                            <button
                              onClick={() => {
                                setEditing(c.id);
                                setDraft(c.title);
                              }}
                              className="hover:text-white"
                            >
                              Rename
                            </button>
                            <button onClick={() => void removeChat(c.id)} className="hover:text-bad">
                              Delete
                            </button>
                          </span>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
              <button onClick={() => void clearAll()} className="mt-3 text-[11px] text-white/40 hover:text-bad">
                Delete all chats
              </button>
            </>
          )}
        </div>
      </aside>

      <div className="rounded-3xl border border-white/10 bg-card p-4 md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] uppercase tracking-[0.25em] text-gold">SJA Assistant</p>
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/40">
              {left} of {limit} questions left today
            </span>
            <button onClick={() => setShowList((s) => !s)} className={`${btnGhostCls} md:hidden`}>
              Chats ({chats.length})
            </button>
            {messages.length > 0 && (
              <button onClick={newChat} className={`${btnGhostCls} md:hidden`}>
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
                  onClick={() => void send(s)}
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
              AI can make mistakes. Chats are saved to your account and only you can see them. Please do not type private
              details. In an emergency, call{" "}
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
    </div>
  );
}
