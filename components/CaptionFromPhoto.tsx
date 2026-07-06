"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CaptionResult } from "@/types";
import { prepareImage, type PreparedImage } from "@/lib/image";
import { buildCaption, hashtagsToText, textToHashtags } from "@/lib/format";
import { createCaptionDraft } from "@/app/drafts/actions";
import { Button, inputClass, labelClass } from "@/components/ui";
import CopyButton from "@/components/CopyButton";

const MAX_IMAGES = 6;

/** ステップ見出しの丸番号。 */
function StepBadge({ n }: { n: number }) {
  return (
    <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-xs text-white">
      {n}
    </span>
  );
}

export default function CaptionFromPhoto() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [images, setImages] = useState<PreparedImage[]>([]);
  const [note, setNote] = useState("");
  const [preparing, setPreparing] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const [result, setResult] = useState<CaptionResult | null>(null);
  const [caption, setCaption] = useState("");
  const [hashtagsText, setHashtagsText] = useState("");

  const [saving, startSaving] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);

  async function addFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) return;
    setGenError(null);
    setPreparing(true);
    const failed: string[] = [];
    const prepared: PreparedImage[] = [];
    for (const file of list) {
      if (images.length + prepared.length >= MAX_IMAGES) break;
      try {
        prepared.push(await prepareImage(file));
      } catch {
        failed.push(file.name);
      }
    }
    setImages((prev) => [...prev, ...prepared].slice(0, MAX_IMAGES));
    setPreparing(false);
    if (failed.length > 0) {
      setGenError(
        `次の画像は読み込めませんでした（HEIC などは対応していません）：${failed.join("、")}`,
      );
    }
  }

  function removeImage(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }

  async function generate() {
    if (images.length === 0) return;
    setGenerating(true);
    setGenError(null);
    setResult(null);
    try {
      const res = await fetch("/api/caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: images.map((i) => ({ mimeType: i.mimeType, data: i.data })),
          note,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "生成に失敗しました。");
      const gen = data as CaptionResult;
      setResult(gen);
      setCaption(gen.caption);
      setHashtagsText(hashtagsToText(gen.hashtags));
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "生成に失敗しました。");
    } finally {
      setGenerating(false);
    }
  }

  function saveDraft() {
    setSaveError(null);
    startSaving(async () => {
      const res = await createCaptionDraft({
        caption,
        hashtags: textToHashtags(hashtagsText),
      });
      if (!res.ok || !res.id) {
        setSaveError(res.error ?? "保存に失敗しました。");
        return;
      }
      router.push(`/drafts/${res.id}`);
    });
  }

  const copyText = buildCaption(caption, textToHashtags(hashtagsText));

  return (
    <div className="space-y-8">
      {/* STEP 1 写真を選ぶ */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-stone-700">
          <StepBadge n={1} />
          写真を選ぶ（最大 {MAX_IMAGES} 枚）
        </h2>

        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
          }}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${
            dragOver
              ? "border-amber-400 bg-amber-50"
              : "border-stone-300 bg-white hover:border-amber-300 hover:bg-stone-50"
          }`}
        >
          <span className="text-3xl">📷</span>
          <p className="mt-2 text-sm font-medium text-stone-700">
            タップして写真を選ぶ / ここにドラッグ＆ドロップ
          </p>
          <p className="mt-1 text-xs text-stone-400">
            iPhone は写真ライブラリ・撮影から、PC はフォルダから選べます
          </p>
        </div>
        {/* accept=image/* のみ・capture を付けないことで、
            iPhone では「フォトライブラリ / 撮影 / ファイルを選択」の選択肢が出る。 */}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />

        {preparing && (
          <p className="mt-3 text-xs text-stone-400">画像を読み込み中…</p>
        )}

        {images.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
            {images.map((img, idx) => (
              <div
                key={`${img.name}-${idx}`}
                className="group relative aspect-square overflow-hidden rounded-lg border border-stone-200 bg-stone-100"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.previewUrl}
                  alt={img.name}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  aria-label="削除"
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-xs text-white opacity-0 transition group-hover:opacity-100"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* STEP 2 補足メモ */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-stone-700">
          <StepBadge n={2} />
          補足メモ（任意）
        </h2>
        <textarea
          className={inputClass}
          rows={2}
          placeholder="例）ウォルナットのバングル。あたたかい雰囲気で。新作として紹介したい。"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <p className="mt-1 text-xs text-stone-400">
          商品名や伝えたい雰囲気を書くと、投稿文に反映されます。
        </p>
      </section>

      {/* 生成 */}
      <section className="border-t border-stone-200 pt-6">
        <div className="flex items-center gap-3">
          <Button
            onClick={generate}
            disabled={images.length === 0 || generating || preparing}
          >
            {generating ? "生成中…" : "✦ 投稿文を生成"}
          </Button>
          {images.length === 0 && (
            <span className="text-sm text-stone-400">写真を選択してください</span>
          )}
        </div>
        {genError && <p className="mt-3 text-sm text-red-600">{genError}</p>}
      </section>

      {generating && (
        <div className="rounded-xl border border-stone-200 bg-white p-8 text-center text-sm text-stone-400">
          Gemini が写真を読み取って投稿文を作成しています…
        </div>
      )}

      {/* 結果 */}
      {result && (
        <section className="space-y-5 border-t border-stone-200 pt-6">
          {result.photo_summary && (
            <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-4">
              <h3 className="mb-1 text-xs font-semibold text-amber-700">
                写真から読み取った要素
              </h3>
              <p className="text-sm leading-relaxed text-stone-700">
                {result.photo_summary}
              </p>
            </div>
          )}

          <div className="rounded-xl border border-stone-200 bg-white p-5">
            <h3 className="mb-3 text-sm font-semibold text-amber-700">
              投稿文・ハッシュタグ
            </h3>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>投稿文</label>
                <textarea
                  className={inputClass}
                  rows={6}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                />
                <p className="mt-1 text-right text-xs text-stone-400">
                  {caption.length} 文字
                </p>
              </div>
              <div>
                <label className={labelClass}>ハッシュタグ（スペース区切り）</label>
                <textarea
                  className={inputClass}
                  rows={3}
                  value={hashtagsText}
                  onChange={(e) => setHashtagsText(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <CopyButton text={copyText} />
            <Button variant="secondary" onClick={saveDraft} disabled={saving}>
              {saving ? "保存中…" : "下書きに保存"}
            </Button>
            <Button variant="secondary" onClick={generate} disabled={generating}>
              もう一度生成
            </Button>
          </div>
          {saveError && <p className="text-sm text-red-600">{saveError}</p>}
          <p className="text-xs text-stone-400">
            ※ 現在は写真そのものは保存されず、投稿文とハッシュタグのみ下書きになります。
          </p>
        </section>
      )}
    </div>
  );
}
