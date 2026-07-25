"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  POST_FORMATS,
  POST_GOALS,
  POST_THEMES,
  categoryLabel,
  tagLabel,
  type Background,
  type GenerateResult,
  type Material,
  type PostFormat,
  type PostGoal,
  type PostTheme,
  type Product,
} from "@/types";
import { MONTH1_POSTS, PINNED_POSTS, findPlannedPost } from "@/lib/postPlan";
import { createDraft } from "@/app/drafts/actions";
import SelectableCard from "@/components/SelectableCard";
import EmptyState from "@/components/EmptyState";
import { Button, inputClass, labelClass } from "@/components/ui";

interface Props {
  products: Product[];
  materials: Material[];
  backgrounds: Background[];
}

/** ステップ見出しの丸番号。 */
function StepBadge({ n }: { n: number }) {
  return (
    <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-xs text-white">
      {n}
    </span>
  );
}

export default function Planner({ products, materials, backgrounds }: Props) {
  const router = useRouter();
  const [productId, setProductId] = useState<string | null>(null);
  const [materialId, setMaterialId] = useState<string | null>(null);
  const [bgIds, setBgIds] = useState<string[]>([]);

  const [planRef, setPlanRef] = useState<string>("");
  const [theme, setTheme] = useState<PostTheme>("product");
  const [goal, setGoal] = useState<PostGoal>("profile");
  const [format, setFormat] = useState<PostFormat>("feed");

  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  /** 投稿計画の枠を選んだら、テーマ・目的・形式を計画書の値に合わせる。 */
  function selectPlan(ref: string) {
    setPlanRef(ref);
    const planned = findPlannedPost(ref);
    if (!planned) return;
    setTheme(planned.theme);
    setGoal(planned.goal);
    setFormat(planned.format);
  }

  function toggleBg(id: string) {
    setBgIds((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id],
    );
  }

  async function generate() {
    if (!productId) return;
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          materialId,
          backgroundIds: bgIds,
          theme,
          goal,
          format,
          planRef: planRef || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "生成に失敗しました。");
      const gen = data as GenerateResult & { warnings?: string[] };

      // 書き直しても表現ルール違反が残った場合は、保存前に知らせる。
      if (gen.warnings && gen.warnings.length > 0) {
        const ok = confirm(
          `表現ルールに反する箇所が残っています。\n\n${gen.warnings.join(
            "\n",
          )}\n\nこのまま下書きとして保存し、手で直しますか？`,
        );
        if (!ok) {
          setGenerating(false);
          return;
        }
      }

      // 生成のたびに未投稿として一覧へ追加する
      const saved = await createDraft({
        product_id: productId,
        material_id: materialId,
        background_ids: bgIds,
        shoot_plan: {
          composition: gen.composition,
          lighting: gen.lighting,
          props_arrangement: gen.props_arrangement,
          mood: gen.mood,
          tips: gen.tips,
        },
        caption: gen.caption,
        hashtags: gen.hashtags,
        theme,
        goal,
        format,
        hook: gen.hook,
        cta: gen.cta,
        carousel: gen.carousel,
        reel: gen.reel,
        plan_ref: planRef || null,
      });
      if (!saved.ok || !saved.id) {
        throw new Error(saved.error ?? "保存に失敗しました。");
      }
      router.push(`/drafts/${saved.id}`);
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "生成に失敗しました。");
      setGenerating(false);
    }
  }

  if (products.length === 0) {
    return (
      <EmptyState
        title="先に商品を登録してください"
        description="撮影プランを生成するには、商品マスターに商品が1つ以上必要です。"
        action={
          <Link href="/settings/products">
            <Button>商品マスターへ</Button>
          </Link>
        }
      />
    );
  }

  const themeHint = POST_THEMES.find((t) => t.value === theme)?.hint;
  const goalHint = POST_GOALS.find((g) => g.value === goal)?.hint;
  const formatHint = POST_FORMATS.find((f) => f.value === format)?.hint;

  return (
    <div className="space-y-8">
      {/* STEP 1 投稿設計 */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-stone-700">
          <StepBadge n={1} />
          何の投稿かを決める
        </h2>

        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <div>
            <label className={labelClass}>投稿計画の枠から選ぶ（任意）</label>
            <select
              className={inputClass}
              value={planRef}
              onChange={(e) => selectPlan(e.target.value)}
            >
              <option value="">計画によらず作る</option>
              <optgroup label="固定投稿">
                {PINNED_POSTS.map((p) => (
                  <option key={p.ref} value={p.ref}>
                    {p.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="1ヶ月目（7/28〜8/23）">
                {MONTH1_POSTS.map((p) => (
                  <option key={p.ref} value={p.ref}>
                    {p.date?.slice(5)} {p.label}
                  </option>
                ))}
              </optgroup>
            </select>
            <p className="mt-1 text-xs text-stone-400">
              選ぶとテーマ・目的・形式が計画書の設定に合わせて入り、フック案も生成に使われます。
            </p>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass}>テーマ</label>
              <select
                className={inputClass}
                value={theme}
                onChange={(e) => setTheme(e.target.value as PostTheme)}
              >
                {POST_THEMES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-stone-400">{themeHint}</p>
            </div>

            <div>
              <label className={labelClass}>主目的（CTAが決まります）</label>
              <select
                className={inputClass}
                value={goal}
                onChange={(e) => setGoal(e.target.value as PostGoal)}
              >
                {POST_GOALS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-stone-400">{goalHint}</p>
            </div>

            <div>
              <label className={labelClass}>形式</label>
              <select
                className={inputClass}
                value={format}
                onChange={(e) => setFormat(e.target.value as PostFormat)}
              >
                {POST_FORMATS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-stone-400">{formatHint}</p>
            </div>
          </div>
        </div>
      </section>

      {/* STEP 2 商品選択 */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-stone-700">
          <StepBadge n={2} />
          商品を選ぶ
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {products.map((p) => (
            <SelectableCard
              key={p.id}
              name={p.name}
              subtitle={categoryLabel(p.category)}
              selected={productId === p.id}
              onClick={() => setProductId(p.id)}
            />
          ))}
        </div>
      </section>

      {/* STEP 3 木材選択 */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-stone-700">
          <StepBadge n={3} />
          木材を選ぶ（任意）
        </h2>
        {materials.length === 0 ? (
          <p className="text-sm text-stone-400">
            木材は未登録です。
            <Link href="/settings/materials" className="ml-1 text-amber-600 hover:underline">
              登録する
            </Link>
            （なしでも生成できます）
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {materials.map((m) => (
              <SelectableCard
                key={m.id}
                name={m.name}
                subtitle={m.description ? m.description.slice(0, 20) : null}
                selected={materialId === m.id}
                onClick={() =>
                  setMaterialId((cur) => (cur === m.id ? null : m.id))
                }
              />
            ))}
          </div>
        )}
      </section>

      {/* STEP 4 背景素材選択 */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-stone-700">
          <StepBadge n={4} />
          背景素材を選ぶ（任意・複数可）
        </h2>
        {backgrounds.length === 0 ? (
          <p className="text-sm text-stone-400">
            背景素材は未登録です。
            <Link href="/settings/backgrounds" className="ml-1 text-amber-600 hover:underline">
              登録する
            </Link>
            （なしでも生成できます）
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {backgrounds.map((b) => {
              const idx = bgIds.indexOf(b.id);
              return (
                <SelectableCard
                  key={b.id}
                  name={b.name}
                  subtitle={tagLabel(b.tag)}
                  selected={idx !== -1}
                  badge={idx !== -1 ? String(idx + 1) : null}
                  onClick={() => toggleBg(b.id)}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* 生成（未投稿として一覧に追加） */}
      <section className="border-t border-stone-200 pt-6">
        <div className="flex items-center gap-3">
          <Button onClick={generate} disabled={!productId || generating}>
            {generating ? "生成中…" : "✦ プランを生成"}
          </Button>
          {!productId && (
            <span className="text-sm text-stone-400">商品を選択してください</span>
          )}
        </div>
        <p className="mt-2 text-xs text-stone-400">
          生成すると未投稿として一覧に追加され、投稿文を編集できます。
        </p>
        {genError && <p className="mt-3 text-sm text-red-600">{genError}</p>}
      </section>

      {generating && (
        <div className="rounded-xl border border-stone-200 bg-white p-8 text-center text-sm text-stone-400">
          Gemini が撮影プランと投稿文を作成しています…
        </div>
      )}
    </div>
  );
}
