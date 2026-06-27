"use client";

import { Button } from "@/components/ui";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="text-sm font-medium text-stone-700">問題が発生しました</p>
      <p className="mt-1 max-w-md text-sm text-stone-400">
        {error.message || "予期しないエラーが発生しました。"}
      </p>
      <div className="mt-4">
        <Button onClick={reset}>再読み込み</Button>
      </div>
    </div>
  );
}
