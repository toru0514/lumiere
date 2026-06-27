import Link from "next/link";
import type { DraftWithProduct } from "@/types";
import { storagePublicUrl } from "@/lib/supabase/constants";
import { formatDate } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";

export default function DraftCard({ draft }: { draft: DraftWithProduct }) {
  const url = storagePublicUrl(draft.product?.image_path);
  const preview = (draft.caption ?? "").slice(0, 60);

  return (
    <Link
      href={`/drafts/${draft.id}`}
      className="flex gap-4 rounded-xl border border-stone-200 bg-white p-4 transition hover:border-amber-300 hover:shadow-sm"
    >
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-stone-100">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-stone-400">
            画像なし
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
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
        <p className="mt-2 text-xs text-stone-400">{formatDate(draft.created_at)}</p>
      </div>
    </Link>
  );
}
