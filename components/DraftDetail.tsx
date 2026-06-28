"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  SHOOT_PLAN_KEYS,
  SHOOT_PLAN_LABELS,
  type Background,
  type DraftWithProduct,
} from "@/types";
import { buildCaption, formatDate, hashtagsToText, textToHashtags } from "@/lib/format";
import {
  deleteDraft,
  setDraftStatus,
  updateDraftContent,
} from "@/app/drafts/actions";
import { Button, inputClass, labelClass } from "@/components/ui";
import CopyButton from "@/components/CopyButton";
import StatusBadge from "@/components/StatusBadge";

interface Props {
  draft: DraftWithProduct;
  backgrounds: Background[];
}

export default function DraftDetail({ draft, backgrounds }: Props) {
  const router = useRouter();
  const [caption, setCaption] = useState(draft.caption ?? "");
  const [hashtagsText, setHashtagsText] = useState(hashtagsToText(draft.hashtags ?? []));
  const [status, setStatus] = useState(draft.status);
  const [dirty, setDirty] = useState(false);

  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const copyText = useMemo(
    () => buildCaption(caption, textToHashtags(hashtagsText)),
    [caption, hashtagsText],
  );

  const plan = draft.shoot_plan;

  function save() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await updateDraftContent(
        draft.id,
        caption,
        textToHashtags(hashtagsText),
      );
      if (!res.ok) {
        setError(res.error ?? "保存に失敗しました。");
        return;
      }
      setDirty(false);
      setMessage("保存しました。");
      router.refresh();
    });
  }

  function toggleStatus() {
    const next = status === "posted" ? "draft" : "posted";
    setError(null);
    startTransition(async () => {
      const res = await setDraftStatus(draft.id, next);
      if (!res.ok) {
        setError(res.error ?? "更新に失敗しました。");
        return;
      }
      setStatus(next);
      router.refresh();
    });
  }

  function remove() {
    if (!confirm("この下書きを削除しますか？")) return;
    startTransition(async () => {
      const res = await deleteDraft(draft.id);
      if (!res.ok) {
        setError(res.error ?? "削除に失敗しました。");
        return;
      }
      router.push("/drafts");
    });
  }

  return (
    <div className="space-y-6">
      {/* 商品・背景素材 */}
      <section className="rounded-xl border border-stone-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <h2 className="truncate text-base font-medium text-stone-800">
            {draft.product?.name ?? "（商品なし）"}
          </h2>
          <StatusBadge status={status} />
        </div>
        {draft.material && (
          <p className="mt-1 text-xs text-stone-500">木材：{draft.material.name}</p>
        )}
        {backgrounds.length > 0 && (
          <p className="mt-1 text-xs text-stone-500">
            背景：{backgrounds.map((b) => b.name).join("、")}
          </p>
        )}
        <p className="mt-1 text-xs text-stone-400">{formatDate(draft.created_at)} 作成</p>
      </section>

      {/* 撮影プラン */}
      {plan && (
        <section className="rounded-xl border border-stone-200 bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold text-amber-700">撮影プラン</h3>
          <dl className="space-y-3">
            {SHOOT_PLAN_KEYS.map((key) => (
              <div key={key} className="grid grid-cols-[6rem_1fr] gap-3">
                <dt className="text-sm font-medium text-stone-500">
                  {SHOOT_PLAN_LABELS[key]}
                </dt>
                <dd className="whitespace-pre-line text-sm leading-relaxed text-stone-700">
                  {plan[key]}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* 投稿文編集 */}
      <section className="rounded-xl border border-stone-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-semibold text-amber-700">投稿文・ハッシュタグ</h3>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>投稿文</label>
            <textarea
              className={inputClass}
              rows={6}
              value={caption}
              onChange={(e) => {
                setCaption(e.target.value);
                setDirty(true);
              }}
            />
            <p className="mt-1 text-right text-xs text-stone-400">{caption.length} 文字</p>
          </div>
          <div>
            <label className={labelClass}>ハッシュタグ（スペース区切り）</label>
            <textarea
              className={inputClass}
              rows={3}
              value={hashtagsText}
              onChange={(e) => {
                setHashtagsText(e.target.value);
                setDirty(true);
              }}
            />
          </div>
        </div>
      </section>

      {/* アクション */}
      <section className="flex flex-wrap items-center gap-3">
        <CopyButton text={copyText} />
        <Button variant="secondary" onClick={save} disabled={pending || !dirty}>
          {pending ? "保存中…" : dirty ? "変更を保存" : "保存済み"}
        </Button>
        <Button variant="secondary" onClick={toggleStatus} disabled={pending}>
          {status === "posted" ? "未投稿に戻す" : "投稿済みにする"}
        </Button>
        <div className="ml-auto">
          <Button variant="danger" onClick={remove} disabled={pending}>
            削除
          </Button>
        </div>
      </section>

      {message && <p className="text-sm text-green-600">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
