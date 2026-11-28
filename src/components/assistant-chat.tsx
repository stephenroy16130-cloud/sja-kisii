"use client";

import { useEffect, useRef, useState } from "react";
import { EMERGENCY } from "@/lib/contact";
import { HELPLINES } from "@/lib/helplines";

type Msg = { id?: string; role: "user" | "assistant"; content: string };
type Chat = { id: string; title: string; updatedAt: string };

const SUGGESTIONS = [
  "How do I earn points?",
  "How does check-in work?",
  "How is the Member of the Week chosen?",
  "What is coming up for me?",
  "How do I pay for something in the shop?",
  "Someone is choking. What do I do?",
  "I am feeling stressed. Can we talk?",
];

const CRISIS = /(suicid|kill myself|end my life|want to die|wanna die|don'?t want to (live|be here)|self[- ]?harm|hurt myself|cut myself|kujiua|kujiumiza|sitaki kuishi)/i;

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

// Today, the last 7 days, the last 30 days, and older (Nairobi days)
function groupChats(list: Chat[]) {
  const EAT = 3 * 3_600_000;
  const DAY = 86_400_000;
  const today = Math.floor((Date.now() + EAT) / DAY);
  const buckets: { label: string; items: Chat[] }[] = [
    { label: "Today", items: [] },
    { label: "7 days", items: [] },
    { label: "30 days", items: [] },
    { label: "Older", items: [] },
  ];
  for (const c of list) {
    const age = today - Math.floor((Date.parse(c.updatedAt) + EAT) / DAY);
    buckets[age <= 0 ? 0 : age <= 7 ? 1 : age <= 30 ? 2 : 3].items.push(c);
  }
  return buckets.filter((b) => b.items.length > 0);
}

function Icon({ d, children }: { d?: string; children?: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {d ? <path d={d} /> : children}
    </svg>
  );
}

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
  const [paused, setPaused] = useState(false);
  const [support, setSupport] = useState(false);
  const [error, setError] = useState("");
  const [left, setLeft] = useState(initialLeft);
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [editingMsg, setEditingMsg] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const abort = useRef<AbortController | null>(null);
  const pausedRef = useRef(false);
  const live = useRef<{ base: Msg[]; acc: string }>({ base: [], acc: "" });
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages]);

  function stopCurrent() {
    abort.current?.abort();
    abort.current = null;
    pausedRef.current = false;
    setPaused(false);
  }

  async function refreshList() {
    try {
      const j = await call("/api/assistant/chats", "GET");
      setChats(j.chats as Chat[]);
    } catch {
      // keep the list we have
    }
  }

  // Give the messages on screen their saved ids, so they can be edited
  async function syncIds(chatId: string | null) {
    if (!chatId) return;
    try {
      const j = await call(`/api/assistant/chats/${chatId}`, "GET");
      const server = j.messages as Msg[];
      setMessages((cur) => {
        const used = new Set<string>(cur.map((m) => m.id).filter((x): x is string => Boolean(x)));
        return cur.map((m) => {
          if (m.id) return m;
          const hit = server.find((s) => s.id && !used.has(s.id) && s.role === m.role && s.content === m.content);
          if (hit?.id) used.add(hit.id);
          return hit ? { ...m, id: hit.id } : m;
        });
      });
    } catch {
      // editing just stays unavailable for now
    }
  }

  function newChat() {
    stopCurrent();
    setActiveId(null);
    setMessages([]);
    setEditingMsg(null);
    setError("");
    setInput("");
    setOpen(false);
  }

  async function openChat(id: string) {
    setOpen(false);
    if (id === activeId) return;
    stopCurrent();
    setEditingMsg(null);
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
    setMenu(null);
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

  // Pausing holds the display still. The answer keeps arriving in the background.
  function togglePause() {
    const next = !pausedRef.current;
    pausedRef.current = next;
    setPaused(next);
    if (!next) setMessages([...live.current.base, { role: "assistant", content: live.current.acc }]);
  }

  async function send(text: string, edit?: { id: string; index: number }) {
    const q = text.trim();
    if (!q || busy || left <= 0) return;
    setError("");
    setEditingMsg(null);
    if (CRISIS.test(q)) setSupport(true);
    const base: Msg[] = [...(edit ? messages.slice(0, edit.index) : messages), { role: "user", content: q }];
    live.current = { base, acc: "" };
    pausedRef.current = false;
    setPaused(false);
    setMessages([...base, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    const ctrl = new AbortController();
    abort.current = ctrl;
    let chatId = activeId;

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: activeId ?? undefined, message: q, editMessageId: edit?.id }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error || "The assistant could not answer.");
      }
      const id = res.headers.get("X-Chat-Id");
      if (id) {
        setActiveId(id);
        chatId = id;
      }
      setLeft((l) => Math.max(0, l - 1));
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        live.current.acc = acc;
        if (!pausedRef.current) setMessages([...base, { role: "assistant", content: acc }]);
      }
      pausedRef.current = false;
      setPaused(false);
      setMessages([...base, { role: "assistant", content: acc }]);
      void refreshList();
      void syncIds(chatId);
    } catch (e) {
      // If the member has already moved to another chat, leave the screen alone
      if (abort.current === ctrl) {
        const stopped = e instanceof DOMException && e.name === "AbortError";
        if (!stopped) setError(msgOf(e));
        const { base: b, acc: a } = live.current;
        setMessages(a ? [...b, { role: "assistant", content: a }] : b);
        pausedRef.current = false;
        setPaused(false);
        void syncIds(chatId);
      }
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

  const groups = groupChats(chats);

  return (
    <div className="md:grid md:grid-cols-[16rem_1fr] md:items-start md:gap-4">
      {open && <div className="fixed inset-0 z-[60] bg-black/60 md:hidden" onClick={() => setOpen(false)} />}

      {/* History: a drawer on phones, a side panel on computers */}
      <aside
        className={`fixed inset-y-0 left-0 z-[70] w-[85%] max-w-sm overflow-y-auto border-r border-white/10 bg-black p-4 transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        } md:static md:z-auto md:max-h-[80vh] md:w-auto md:max-w-none md:translate-x-0 md:rounded-3xl md:border md:bg-card`}
      >
        <div className="mb-4 flex items-center justify-between md:hidden">
          <p className="text-[11px] uppercase tracking-[0.25em] text-gold">Ask SJA</p>
          <button onClick={() => setOpen(false)} aria-label="Close" className="text-white/70">
            <Icon d="M6 6l12 12M18 6L6 18" />
          </button>
        </div>

        <button
          onClick={newChat}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-neutral-200"
        >
          <span className="h-5 w-5">
            <Icon>
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v8M8 12h8" />
            </Icon>
          </span>
          New chat
        </button>

        {groups.length === 0 ? (
          <p className="mt-6 text-xs text-white/40">Your chats will appear here.</p>
        ) : (
          <>
            {groups.map((g) => (
              <div key={g.label} className="mt-5">
                <p className="px-2 text-xs text-white/40">{g.label}</p>
                <ul className="mt-1">
                  {g.items.map((c) => (
                    <li key={c.id}>
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
                          className="my-1 w-full rounded-lg border border-white/20 bg-black px-3 py-2 text-sm outline-none"
                          aria-label="Chat name"
                        />
                      ) : (
                        <div className={`flex items-center gap-1 rounded-xl px-2 ${c.id === activeId ? "bg-white/10" : "hover:bg-white/5"}`}>
                          <button onClick={() => void openChat(c.id)} className="min-w-0 flex-1 truncate py-3 text-left text-[15px] text-white/90">
                            {c.title}
                          </button>
                          <button
                            onClick={() => setMenu(menu === c.id ? null : c.id)}
                            aria-label="Chat options"
                            className="px-2 py-2 text-lg leading-none text-white/40 hover:text-white"
                          >
                            ⋯
                          </button>
                        </div>
                      )}
                      {menu === c.id && editing !== c.id && (
                        <div className="flex gap-5 px-3 pb-2 text-xs">
                          <button
                            onClick={() => {
                              setEditing(c.id);
                              setDraft(c.title);
                              setMenu(null);
                            }}
                            className="text-white/70 hover:text-white"
                          >
                            Rename
                          </button>
                          <button onClick={() => void removeChat(c.id)} className="text-bad">
                            Delete
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <button onClick={() => void clearAll()} className="mt-6 px-2 text-[11px] text-white/40 hover:text-bad">
              Delete all chats
            </button>
          </>
        )}
      </aside>

      {/* The chat */}
      <section className="flex min-h-[70vh] flex-col md:rounded-3xl md:border md:border-white/10 md:bg-card md:p-6">
        <div className="flex items-center justify-between pb-3 md:hidden">
          <button onClick={() => setOpen(true)} aria-label="Chat history" className="-ml-1 p-1">
            <Icon d="M4 8h14M4 16h9" />
          </button>
          <div className="text-center">
            <p className="text-sm">Ask SJA</p>
            <p className="text-[11px] text-white/40">
              {left} of {limit} left today
            </p>
          </div>
          <button onClick={newChat} aria-label="New chat" className="-mr-1 p-1">
            <Icon>
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v8M8 12h8" />
            </Icon>
          </button>
        </div>
        <div className="mb-4 hidden items-center justify-between md:flex">
          <p className="text-[11px] uppercase tracking-[0.25em] text-gold">SJA Assistant</p>
          <span className="text-xs text-white/40">
            {left} of {limit} questions left today
          </span>
        </div>

        <div className="flex flex-1 flex-col">
          {messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
              <span className="mb-3 text-gold">
                <Icon>
                  <path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" />
                </Icon>
              </span>
              <h2 className="text-2xl font-light tracking-tight">Hello {firstName}</h2>
              <p className="mt-1 text-sm text-white/50">What would you like to know?</p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
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
            <div className="flex-1 space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={m.role === "user" ? "flex flex-col items-end" : "flex justify-start"}>
                  {m.role === "user" && editingMsg === i ? (
                    <div className="w-full max-w-[88%]">
                      <textarea
                        autoFocus
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={3}
                        maxLength={800}
                        className="w-full resize-none rounded-2xl border border-white/30 bg-white/5 px-4 py-3 text-sm outline-none focus:border-white/60"
                        aria-label="Edit your message"
                      />
                      <div className="mt-2 flex justify-end gap-3 text-xs">
                        <button onClick={() => setEditingMsg(null)} className="px-3 py-2 text-white/60 hover:text-white">
                          Cancel
                        </button>
                        <button
                          disabled={!editText.trim() || busy || left <= 0 || !m.id}
                          onClick={() => m.id && void send(editText, { id: m.id, index: i })}
                          className="rounded-full bg-white px-4 py-2 font-medium text-black disabled:opacity-40"
                        >
                          Save and send
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div
                        className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                          m.role === "user" ? "rounded-br-md bg-white text-black" : "rounded-bl-md border border-white/10 bg-black text-white/90"
                        }`}
                      >
                        {m.content ? <Linkified text={m.content} /> : <span className="animate-pulse text-white/40">Thinking...</span>}
                      </div>
                      {m.role === "user" && m.id && !busy && (
                        <button
                          onClick={() => {
                            setEditingMsg(i);
                            setEditText(m.content);
                          }}
                          className="mt-1 px-2 text-[11px] text-white/40 hover:text-white"
                        >
                          Edit
                        </button>
                      )}
                    </>
                  )}
                </div>
              ))}
              <div ref={end} className="scroll-mb-40" />
            </div>
          )}
        </div>

        {support && (
          <div className="mt-4 rounded-2xl border border-gold/40 bg-black p-4 text-sm">
            <div className="flex items-start justify-between gap-3">
              <p className="text-white/90">You matter, and you do not have to carry this alone. Please reach out to someone now:</p>
              <button onClick={() => setSupport(false)} aria-label="Close" className="text-lg leading-none text-white/40 hover:text-white">×</button>
            </div>
            <ul className="mt-3 space-y-2">
              {HELPLINES.map((h) => (
                <li key={h.tel} className="flex items-center justify-between gap-3">
                  <span className="text-white/70">{h.name}</span>
                  <a href={`tel:${h.tel}`} className="shrink-0 rounded-full border border-gold/50 px-3 py-1 text-xs text-gold">{h.number}</a>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-white/50">
              In immediate danger, call <a href={`tel:${EMERGENCY.tel}`} className="text-bad underline">{EMERGENCY.display}</a> or 999.
            </p>
          </div>
        )}
        {error && <p className="mt-4 text-sm text-bad">{error}</p>}
        {paused && <p className="mt-3 text-center text-[11px] text-gold">Paused. The answer is still arriving. Tap play to show it.</p>}
        {left <= 0 && <p className="mt-4 text-sm text-warn">You have used today&apos;s questions. Come back tomorrow.</p>}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="mt-4"
        >
          <div className="relative">
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
              placeholder="Message Ask SJA"
              className={`w-full resize-none rounded-3xl border border-white/15 bg-white/5 py-4 pl-5 text-sm outline-none focus:border-white/50 disabled:opacity-50 ${
                busy ? "pr-28" : "pr-16"
              }`}
            />
            <div className="absolute bottom-3 right-3 flex gap-2">
              {busy ? (
                <>
                  <button
                    type="button"
                    onClick={togglePause}
                    aria-label={paused ? "Resume" : "Pause"}
                    className="grid h-10 w-10 place-items-center rounded-full border border-white/30 text-white"
                  >
                    <span className="h-5 w-5">
                      {paused ? (
                        <Icon>
                          <path d="M8 5l11 7-11 7z" />
                        </Icon>
                      ) : (
                        <Icon d="M9 5v14M15 5v14" />
                      )}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => abort.current?.abort()}
                    aria-label="Stop"
                    className="grid h-10 w-10 place-items-center rounded-full bg-white text-black"
                  >
                    <span className="h-3 w-3 rounded-sm bg-black" />
                  </button>
                </>
              ) : (
                <button
                  disabled={!input.trim() || left <= 0}
                  aria-label="Send"
                  className="grid h-10 w-10 place-items-center rounded-full bg-white text-black transition disabled:opacity-30"
                >
                  <span className="h-5 w-5">
                    <Icon d="M12 19V5M6 11l6-6 6 6" />
                  </span>
                </button>
              )}
            </div>
          </div>
          <p className="mt-2 text-center text-[11px] text-white/40">
            AI can make mistakes. Chats are saved to your account and only you can see them. Please do not type private
            details. If you are struggling, you can talk to the Kenya Red Cross free on{" "}
            <a href={`tel:${HELPLINES[0].tel}`} className="text-gold underline">
              {HELPLINES[0].number}
            </a>
            . In an emergency, call{" "}
            <a href={`tel:${EMERGENCY.tel}`} className="text-bad underline">
              {EMERGENCY.display}
            </a>
            .
          </p>
        </form>
      </section>
    </div>
  );
}
