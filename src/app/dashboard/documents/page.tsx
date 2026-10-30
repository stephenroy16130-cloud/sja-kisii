import type { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { audienceFilters, audienceText, canModerate, fmtSize, postable } from "@/lib/content";
import { db } from "@/lib/db";
import { fmt } from "@/lib/meetings";
import { displayName } from "@/lib/profile";
import { can } from "@/lib/rbac";
import DeleteDocumentButton from "./delete-document-button";
import DocumentForm from "./document-form";

export const dynamic = "force-dynamic";

const chip = "rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.12em]";

export default async function DocumentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const mod = canModerate(user);
  const where: Prisma.DocumentWhereInput = mod ? {} : { OR: [...audienceFilters(user), { uploadedById: user.id }] };

  const docs = await db.document.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { uploadedBy: { select: { fullName: true, preferredName: true } } },
  });

  const canPost = can(user, "content:create");
  const target = postable(user);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-light tracking-tight">Documents</h1>
        <p className="mt-1 text-sm text-white/50">The constitution, training manuals and other important files.</p>
      </div>

      {canPost && (
        <section>
          <h2 className="mb-4 text-xl font-light">Upload a document</h2>
          <DocumentForm crews={target.crews} band={target.band} />
        </section>
      )}

      <section>
        <h2 className="mb-4 text-xl font-light">Library ({docs.length})</h2>
        {docs.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-card p-6 text-sm text-white/50">
            No documents yet.
          </div>
        ) : (
          <div className="space-y-3">
            {docs.map((d) => (
              <div key={d.id} className="rounded-2xl border border-white/10 bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-light">{d.title}</p>
                    {d.description && <p className="font-copy mt-1 text-sm text-white/60">{d.description}</p>}
                    <p className="mt-2 text-xs text-white/40">
                      {d.fileName} · {fmtSize(d.fileSize)} · uploaded {fmt(d.createdAt)} by {displayName(d.uploadedBy)}
                    </p>
                  </div>
                  <span className={`${chip} ${d.audience === "GENERAL" ? "border-white/20 text-white/60" : "border-gold/50 text-gold"}`}>
                    {audienceText(d.audience, d.crewId)}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <a
                    href={d.fileUrl}
                    download={d.fileName}
                    className="rounded-full bg-white px-5 py-2.5 text-xs font-medium text-black transition hover:bg-neutral-200"
                  >
                    Download
                  </a>
                  {(mod || d.uploadedById === user.id) && <DeleteDocumentButton id={d.id} title={d.title} />}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
