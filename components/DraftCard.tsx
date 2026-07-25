import Link from "next/link";
import { formatLabel, goalLabel, themeLabel, type DraftWithProduct } from "@/types";
import { formatDate } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";

export default function DraftCard({ draft }: { draft: DraftWithProduct }) {
  const preview = (draft.caption ?? "").slice(0, 60);
  const tags = [
    themeLabel(draft.theme),
    goalLabel(draft.goal),
    formatLabel(draft.format),
  ].filter(Boolean);

  return (
    <Link
      href={`/drafts/${draft.id}`}
      className="block rounded-xl border border-stone-200 bg-white p-4 transition hover:border-amber-300 hover:shadow-sm"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-medium text-stone-800">
          {draft.product?.name ?? "（商品なし）"}
        </p>
        <StatusBadge status={draft.status} />
      </div>
      <p className="mt-1 line-clamp-2 text-sm text-stone-500">
        {preview || "（投稿文なし）"}
        {preview.length >= 60 ? "…" : ""}
      </p>
      {tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {tags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-stone-600"
            >
              {t}
            </span>
          ))}
        </div>
      )}
      <p className="mt-2 text-xs text-stone-400">{formatDate(draft.created_at)}</p>
    </Link>
  );
}
