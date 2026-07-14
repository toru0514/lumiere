import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import DraftCard from "@/components/DraftCard";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui";
import { getDrafts } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const drafts = await getDrafts();
  const unposted = drafts.filter((d) => d.status !== "posted");
  const posted = drafts.filter((d) => d.status === "posted");

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
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-700">
              未投稿
              <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-500">
                {unposted.length}
              </span>
            </h2>
            {unposted.length === 0 ? (
              <p className="rounded-xl border border-dashed border-stone-200 p-4 text-sm text-stone-400">
                未投稿の投稿はありません。
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {unposted.map((d) => (
                  <DraftCard key={d.id} draft={d} />
                ))}
              </div>
            )}
          </section>

          {posted.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-500">
                投稿済み
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                  {posted.length}
                </span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {posted.map((d) => (
                  <DraftCard key={d.id} draft={d} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
}
