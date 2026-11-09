"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { btnGhostCls, inputCls, labelCls } from "@/lib/ui";

type Row = { fullName: string; phone: string; email: string; crewId: number };
type Result = { name: string; email: string; phone: string; username?: string; tempPassword?: string; error?: string };

const CREW_WORDS: [RegExp, number][] = [
  [/fiery|knight/i, 1],
  [/amalfi/i, 2],
  [/royal|duke/i, 3],
  [/malta/i, 4],
];

function crewOf(s: string): number | null {
  const n = Number(s.trim());
  if (Number.isInteger(n) && n >= 1 && n <= 4) return n;
  for (const [re, id] of CREW_WORDS) if (re.test(s)) return id;
  return null;
}

function parse(text: string) {
  const ok: Row[] = [];
  const bad: string[] = [];
  text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((line, i) => {
      const p = line.split(/[,\t;]/).map((s) => s.trim());
      if (i === 0 && /name/i.test(p[0]) && /email/i.test(p[2] ?? "")) return; // a header line
      const crew = p[3] ? crewOf(p[3]) : null;
      if (p.length < 4 || !p[0] || !crew) bad.push(`Line ${i + 1} is not in the right format: ${line}`);
      else ok.push({ fullName: p[0], phone: p[1], email: p[2], crewId: crew });
    });
  return { ok, bad };
}

const cell = (v: string) => '"' + (/^[=+\-@]/.test(v) ? "'" + v : v).replace(/"/g, '""') + '"';

export default function AddMembers() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [problems, setProblems] = useState<string[]>([]);
  const [results, setResults] = useState<Result[]>([]);

  async function submit() {
    const { ok, bad } = parse(text);
    setProblems(bad);
    setResults([]);
    if (ok.length === 0) return;
    setBusy(true);
    const all: Result[] = [];
    try {
      for (let i = 0; i < ok.length; i += 25) {
        setProgress(`Adding ${Math.min(i + 25, ok.length)} of ${ok.length}...`);
        const r = await api("/api/admin/members/add", "POST", { rows: ok.slice(i, i + 25) });
        all.push(...(r.results as Result[]));
        setResults([...all]);
      }
      setText("");
    } catch (e) {
      setProblems((p) => [...p, e instanceof Error ? e.message : "Something went wrong"]);
    }
    setProgress("");
    setBusy(false);
    router.refresh();
  }

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const wa = (r: Result) =>
    `https://wa.me/${r.phone}?text=${encodeURIComponent(
      `Hello ${r.name}, your SJA Kisii account is ready.\nWebsite: ${origin}\nLogin: ${r.email}\nTemporary password: ${r.tempPassword}\nYou will be asked to choose your own password when you sign in.`
    )}`;

  function download() {
    const lines = [
      ["Name", "Email", "Username", "Temporary password", "Phone"].map(cell).join(","),
      ...results
        .filter((r) => r.tempPassword)
        .map((r) => [r.name, r.email, r.username ?? "", r.tempPassword ?? "", r.phone].map(cell).join(",")),
    ];
    const url = URL.createObjectURL(new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "new-member-logins.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const created = results.filter((r) => r.tempPassword);

  return (
    <section className="rounded-3xl border border-white/10 bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-gold">Add people</p>
          <p className="mt-1 text-sm text-white/60">
            Add members yourself. They are active at once and choose their own password on first sign-in.
          </p>
        </div>
        <button onClick={() => setOpen((o) => !o)} className={btnGhostCls}>
          {open ? "Close" : "Add members"}
        </button>
      </div>

      {open && (
        <div className="mt-5 space-y-4">
          <div>
            <label className={labelCls}>One person per line: full name, phone, email, crew</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              placeholder={"Jane Wanjiku, 0712345678, jane@example.com, 1\nPeter Omondi, 0723456789, peter@example.com, Malta"}
              className={`${inputCls} font-mono text-xs`}
            />
            <p className="mt-2 text-xs text-white/40">
              Crew can be 1 to 4, or a name: Fiery, Amalfi, Royal, Malta. You can paste straight from a spreadsheet.
              Up to 25 per go is fine, and more is added in batches.
            </p>
          </div>
          <button
            disabled={busy || !text.trim()}
            onClick={submit}
            className="rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-neutral-200 disabled:opacity-50"
          >
            {busy ? progress || "Adding..." : "Add them"}
          </button>
          {problems.length > 0 && (
            <ul className="space-y-1 text-sm text-bad">
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}

          {results.length > 0 && (
            <div className="border-t border-white/10 pt-4">
              <p className="text-sm">
                <span className="text-ok">{created.length} added</span>
                {results.length - created.length > 0 && (
                  <span className="text-bad"> · {results.length - created.length} not added</span>
                )}
              </p>
              <p className="mt-1 text-xs text-warn">
                The temporary passwords are shown only now. Send them to each person or download the list, then leave
                this page.
              </p>
              <div className="mt-3 divide-y divide-white/10">
                {results.map((r, i) => (
                  <div key={i} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="uppercase tracking-wide">{r.name}</p>
                      <p className="text-xs text-white/40">{r.email}</p>
                      {r.error && <p className="mt-1 text-xs text-bad">{r.error}</p>}
                    </div>
                    {r.tempPassword && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg bg-white/10 px-3 py-1.5 font-mono text-sm">{r.tempPassword}</span>
                        <a
                          href={wa(r)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full bg-ok px-4 py-2 text-xs font-medium text-black"
                        >
                          WhatsApp
                        </a>
                        <button
                          onClick={() => navigator.clipboard?.writeText(r.tempPassword ?? "")}
                          className={btnGhostCls}
                        >
                          Copy
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {created.length > 0 && (
                <button onClick={download} className={`${btnGhostCls} mt-4`}>
                  Download logins (CSV)
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
