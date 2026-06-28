import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import DraftCard from "@/components/DraftCard";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui";
import { getDrafts } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const drafts = await getDrafts();
  return (
    <>
      <PageHeader
        title="投稿一覧"
        description="生成した投稿の一覧です。未投稿・投稿済みを管理できます。"
        action={
          <Link href="/planner">
            <Button>✦ 新規生成</Button>
          </Link>
        }
      />
      {drafts.length === 0 ? (
        <EmptyState
          title="まだ投稿がありません"
          description="撮影プランナーでプランを生成すると、未投稿としてここに並びます。"
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
