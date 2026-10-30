"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { btnGhostCls } from "@/lib/ui";

export default function ArticleActions({
  id,
  published,
  moderator,
  author,
}: {
  id: string;
  published: boolean;
  moderator: boolean;
  author: boolean;
}) {
  const router = useRouter();
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

  if (!moderator && !author) return null;
  return (
    <div>
      <div className="flex flex-wrap gap-2">
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
