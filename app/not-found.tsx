import Link from "next/link";
import { Button } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="text-sm font-medium text-stone-600">ページが見つかりませんでした</p>
      <p className="mt-1 text-sm text-stone-400">
        URL が変更されたか、削除された可能性があります。
      </p>
      <Link href="/planner" className="mt-4">
        <Button>撮影プランナーへ</Button>
      </Link>
    </div>
  );
}
