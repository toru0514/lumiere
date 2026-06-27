/** ハッシュタグ配列を編集用テキスト（# 付き・スペース区切り）に変換。 */
export function hashtagsToText(hashtags: string[]): string {
  return hashtags.map((h) => `#${h.replace(/^#+/, "")}`).join(" ");
}

/** 編集テキストからハッシュタグ配列へ。# や区切り（空白・改行・カンマ・読点）を吸収。 */
export function textToHashtags(text: string): string[] {
  return text
    .split(/[\s,、　]+/)
    .map((t) => t.trim().replace(/^#+/, ""))
    .filter(Boolean);
}

/** キャプション＋ハッシュタグを結合してコピー用文字列にする。 */
export function buildCaption(caption: string, hashtags: string[]): string {
  const tags = hashtags.map((h) => `#${h.replace(/^#+/, "")}`).join(" ");
  return tags ? `${caption.trim()}\n\n${tags}` : caption.trim();
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}
