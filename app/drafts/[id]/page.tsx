import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import DraftDetail from "@/components/DraftDetail";
import { getBackgroundsByIds, getDraft } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function DraftDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const draft = await getDraft(id);
  if (!draft) notFound();

  const backgrounds = await getBackgroundsByIds(draft.background_ids ?? []);

  return (
    <>
      <div className="mb-2">
        <Link href="/" className="text-sm text-amber-600 hover:underline">
          ← 投稿一覧へ
        </Link>
      </div>
      <PageHeader title="投稿詳細" />
      <DraftDetail draft={draft} backgrounds={backgrounds} />
    </>
  );
}
