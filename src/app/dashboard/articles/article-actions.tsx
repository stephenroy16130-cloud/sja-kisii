"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import RichEditor from "@/components/rich-editor";
import { api } from "@/lib/client";
import { btnGhostCls, inputCls, labelCls } from "@/lib/ui";

export default function ArticleActions({
  id,
  title,
  content,
  published,
  moderator,
  author,
}: {
  id: string;
  title: string;
  content: string;
  published: boolean;
  moderator: boolean;
  author: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [html, setHtml] = useState(content);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(action: "publish" | "unpublish" | "delete") {
    if (action === "delete" && !window.confirm("Delete this article? This cannot be undone.")) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/articles/${id}`, "POST", { action });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setBusy(false);
    }
  }

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      await api(`/api/articles/${id}`, "PUT", { title: f.get("title"), content: html });
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
    setBusy(false);
  }

  if (!moderator && !author) return null;

  if (editing) {
    return (
      <form onSubmit={save} className="space-y-4">
        <div>
          <label className={labelCls}>Title</label>
          <input name="title" required defaultValue={title} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Article</label>
          <RichEditor onChange={setHtml} resetKey={0} initial={content} />
        </div>
        {error && <p className="text-sm text-bad">{error}</p>}
        <div className="flex gap-2">
          <button
            disabled={busy}
            className="rounded-full bg-white px-5 py-2.5 text-xs font-medium text-black transition hover:bg-neutral-200 disabled:opacity-50"
          >
            {busy ? "Saving..." : "Save changes"}
          </button>
          <button type="button" disabled={busy} onClick={() => setEditing(false)} className={btnGhostCls}>
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {author && (
          <button disabled={busy} onClick={() => setEditing(true)} className={btnGhostCls}>
            Edit
          </button>
        )}
        {moderator && (
          <button disabled={busy} onClick={() => run(published ? "unpublish" : "publish")} className={btnGhostCls}>
            {published ? "Unpublish" : "Republish"}
          </button>
        )}
        <button
          disabled={busy}
          onClick={() => run("delete")}
          className="rounded-full border border-bad/50 px-5 py-2.5 text-xs text-bad transition hover:bg-bad hover:text-black disabled:opacity-50"
        >
          Delete
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-bad">{error}</p>}
    </div>
  );
}
