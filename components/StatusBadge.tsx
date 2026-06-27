import type { DraftStatus } from "@/types";

export default function StatusBadge({ status }: { status: DraftStatus }) {
  const posted = status === "posted";
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
        posted ? "bg-green-100 text-green-700" : "bg-stone-100 text-stone-500"
      }`}
    >
      {posted ? "投稿済み" : "下書き"}
    </span>
  );
}
