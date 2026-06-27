import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import DraftCard from "@/components/DraftCard";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui";
import { getDrafts } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function DraftsPage() {
  const drafts = await getDrafts();
  return (
    <>
      <PageHeader
        title="下書き"
        description="生成した撮影プラン・投稿文を保存・管理します。キャプションはワンタップでコピーできます。"
      />
      {drafts.length === 0 ? (
        <EmptyState
          title="まだ下書きがありません"
          description="撮影プランナーでプランを生成して保存すると、ここに並びます。"
          action={
            <Link href="/planner">
              <Button>撮影プランナーへ</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {drafts.map((d) => (
            <DraftCard key={d.id} draft={d} />
          ))}
        </div>
      )}
    </>
  );
}
