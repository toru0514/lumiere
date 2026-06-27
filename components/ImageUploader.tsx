"use client";

import { useRef, useState } from "react";
import { resizeImage } from "@/lib/image";

interface Props {
  folder: "products" | "backgrounds";
  /** 既存画像の public URL（編集時のプレビュー用） */
  initialUrl?: string | null;
  /** 既存画像の Storage パス（編集時の初期値） */
  initialPath?: string | null;
  /** アップロード完了時に Storage パスを通知。クリア時は null。 */
  onUploaded: (path: string | null) => void;
}

export default function ImageUploader({ folder, initialUrl, initialPath, onUploaded }: Props) {
  const [preview, setPreview] = useState<string | null>(initialUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const { blob } = await resizeImage(file);
      const localUrl = URL.createObjectURL(blob);
      setPreview(localUrl);

      const form = new FormData();
      form.append("file", blob, "image.jpg");
      form.append("folder", folder);

      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "アップロードに失敗しました。");

      onUploaded(data.path);
    } catch (e) {
      setError(e instanceof Error ? e.message : "アップロードに失敗しました。");
      setPreview(initialUrl ?? null);
      onUploaded(initialPath ?? null);
    } finally {
      setUploading(false);
    }
  }

  function clear() {
    setPreview(null);
    onUploaded(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-2">
      <div
        className="relative flex aspect-square w-40 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-stone-300 bg-stone-50 text-stone-400 transition hover:border-amber-400 hover:text-amber-500"
        onClick={() => inputRef.current?.click()}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="プレビュー" className="h-full w-full object-cover" />
        ) : (
          <span className="px-2 text-center text-xs">画像を選択<br />（長辺1200pxへ自動縮小）</span>
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-xs text-stone-600">
            アップロード中…
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />

      <div className="flex gap-3 text-xs">
        <button
          type="button"
          className="text-amber-600 hover:underline"
          onClick={() => inputRef.current?.click()}
        >
          {preview ? "変更" : "選択"}
        </button>
        {preview && (
          <button type="button" className="text-stone-400 hover:underline" onClick={clear}>
            削除
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
