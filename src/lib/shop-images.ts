export const MAX_ITEM_PHOTOS = 6;

// Older items kept one photo in imageUrl. Newer ones keep a list in images.
export const itemImages = (i: { images: string[]; imageUrl: string | null }): string[] =>
  i.images.length ? i.images : i.imageUrl ? [i.imageUrl] : [];
