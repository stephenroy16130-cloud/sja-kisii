import { db } from "./db";

export const ARTICLE_PHOTO = "article-photo.jpg";
const DAY = 24 * 3_600_000;

// Removes article photos that were uploaded but never published (cancelled or abandoned) after 24 hours
export async function sweepArticlePhotos(): Promise<number> {
  try {
    const old = await db.storedFile.findMany({
      where: { name: ARTICLE_PHOTO, createdAt: { lt: new Date(Date.now() - DAY) } },
      select: { id: true },
      take: 200,
    });
    if (old.length === 0) return 0;
    const ids = old.map((f) => f.id);
    const used = await db.article.findMany({ where: { images: { hasSome: ids } }, select: { images: true } });
    const keep = new Set(used.flatMap((a) => a.images));
    const orphans = ids.filter((id) => !keep.has(id));
    if (orphans.length === 0) return 0;
    return (await db.storedFile.deleteMany({ where: { id: { in: orphans } } })).count;
  } catch (e) {
    console.error("photo sweep failed", e);
    return 0;
  }
}
