/** Group glossary article titles by first letter (Vietnamese-aware). */
export function glossaryLetterFromTitle(title: string): string {
  const t = title.normalize("NFC").trim();
  if (!t) return "#";
  const ch = t[0]!.toUpperCase();
  if (ch === "Đ") return "Đ";
  const base = ch.normalize("NFD").replace(/\p{M}/gu, "");
  if (/[A-Z]/i.test(base)) return base.toUpperCase();
  return ch;
}
