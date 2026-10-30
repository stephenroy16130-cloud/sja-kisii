import type { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import Avatar from "@/components/avatar";
import { getCurrentUser } from "@/lib/auth";
import { audienceFilters, audienceText, canModerate, cleanHtml, postable } from "@/lib/content";
import { db } from "@/lib/db";
import { fmt } from "@/lib/meetings";
import { displayName, socialPhoto } from "@/lib/profile";
import { can } from "@/lib/rbac";
import ArticleActions from "./article-actions";
import ArticleForm from "./article-form";

export const dynamic = "force-dynamic";

const chip = "rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.12em]";

export default async function ArticlesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const mod = canModerate(user);
  const where: Prisma.ArticleWhereInput = mod
    ? {}
    : { isPublished: true, OR: [...audienceFilters(user), { authorId: user.id }] };

  const articles = await db.article.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 30,
    include: { author: { select: { id: true, fullName: true, preferredName: true, socialPhotoAt: true } } },
  });

  const canPost = can(user, "content:create");
  const target = postable(user);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-light tracking-tight">Articles</h1>
        <p className="mt-1 text-sm text-white/50">News, notices and stories from your leaders.</p>
      </div>

      {canPost && (
        <section>
          <h2 className="mb-4 text-xl font-light">Write an article</h2>
          <ArticleForm crews={target.crews} band={target.band} />
        </section>
      )}

      <section className="space-y-4">
        {articles.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-card p-6 text-sm text-white/50">
            No articles yet.
          </div>
        ) : (
          articles.map((a) => (
            <article key={a.id} className="rounded-3xl border border-white/10 bg-card p-6 md:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar name={displayName(a.author)} src={socialPhoto(a.author)} size={40} />
                  <div>
                    <p className="text-sm">{displayName(a.author)}</p>
                    <p className="text-xs text-white/40">{fmt(a.createdAt)}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!a.isPublished && <span className={`${chip} border-bad/50 text-bad`}>Unpublished</span>}
                  <span className={`${chip} ${a.audience === "GENERAL" ? "border-white/20 text-white/60" : "border-gold/50 text-gold"}`}>
                    {audienceText(a.audience, a.crewId)}
                  </span>
                </div>
              </div>

              <h2 className="mt-5 text-2xl font-light tracking-tight">{a.title}</h2>
              <div className="rich font-copy mt-4 text-sm text-white/80" dangerouslySetInnerHTML={{ __html: cleanHtml(a.content) }} />

              {a.images.length > 0 && (
                <div className={`mt-5 grid gap-2 ${a.images.length === 1 ? "" : "grid-cols-2"}`}>
                  {a.images.map((id) => (
                    <a key={id} href={`/api/files/${id}`} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/api/files/${id}`} alt="" loading="lazy" className="w-full rounded-2xl object-cover" />
                    </a>
                  ))}
                </div>
              )}

              {(mod || a.authorId === user.id) && (
                <div className="mt-5 border-t border-white/10 pt-4">
                  <ArticleActions id={a.id} published={a.isPublished} moderator={mod} author={a.authorId === user.id} />
                </div>
              )}
            </article>
          ))
        )}
      </section>
    </div>
  );
}
