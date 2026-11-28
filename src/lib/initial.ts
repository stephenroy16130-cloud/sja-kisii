// The first visible character of a word, so an emoji is never cut in half
export function firstChar(s: string): string {
  try {
    const first = Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(s))[0];
    return first ? first.segment : "";
  } catch {
    return [...s][0] ?? "";
  }
}
