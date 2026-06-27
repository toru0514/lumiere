"use client";

import { SHOOT_PLAN_KEYS, SHOOT_PLAN_LABELS, type ShootPlan } from "@/types";
import { inputClass, labelClass } from "@/components/ui";

interface Props {
  plan: ShootPlan;
  caption: string;
  hashtagsText: string;
  onCaptionChange: (v: string) => void;
  onHashtagsChange: (v: string) => void;
  editable?: boolean;
}

export default function PlanResult({
  plan,
  caption,
  hashtagsText,
  onCaptionChange,
  onHashtagsChange,
  editable = true,
}: Props) {
  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-stone-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-semibold text-amber-700">撮影プラン</h3>
        <dl className="space-y-3">
          {SHOOT_PLAN_KEYS.map((key) => (
            <div key={key} className="grid grid-cols-[6rem_1fr] gap-3">
              <dt className="text-sm font-medium text-stone-500">
                {SHOOT_PLAN_LABELS[key]}
              </dt>
              <dd className="text-sm leading-relaxed text-stone-700">{plan[key]}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-semibold text-amber-700">投稿文・ハッシュタグ</h3>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>投稿文（編集可）</label>
            <textarea
              className={inputClass}
              rows={6}
              value={caption}
              readOnly={!editable}
              onChange={(e) => onCaptionChange(e.target.value)}
            />
            <p className="mt-1 text-right text-xs text-stone-400">
              {caption.length} 文字
            </p>
          </div>
          <div>
            <label className={labelClass}>ハッシュタグ（編集可・スペース区切り）</label>
            <textarea
              className={inputClass}
              rows={3}
              value={hashtagsText}
              readOnly={!editable}
              onChange={(e) => onHashtagsChange(e.target.value)}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
