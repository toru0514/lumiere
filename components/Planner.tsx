"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  categoryLabel,
  tagLabel,
  type Background,
  type GenerateResult,
  type Material,
  type Product,
} from "@/types";
import { createDraft } from "@/app/drafts/actions";
import SelectableCard from "@/components/SelectableCard";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui";

interface Props {
  products: Product[];
  materials: Material[];
  backgrounds: Background[];
}

export default function Planner({ products, materials, backgrounds }: Props) {
  const router = useRouter();
  const [productId, setProductId] = useState<string | null>(null);
  const [materialId, setMaterialId] = useState<string | null>(null);
  const [bgIds, setBgIds] = useState<string[]>([]);

  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

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
        body: JSON.stringify({ productId, materialId, backgroundIds: bgIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "生成に失敗しました。");
      const gen = data as GenerateResult;

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

  return (
    <div className="space-y-8">
      {/* STEP 1 商品選択 */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-stone-700">
          <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-xs text-white">
            1
          </span>
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

      {/* STEP 2 木材選択 */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-stone-700">
          <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-xs text-white">
            2
          </span>
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

      {/* STEP 3 背景素材選択 */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-stone-700">
          <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-xs text-white">
            3
          </span>
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
