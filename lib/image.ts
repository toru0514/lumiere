// クライアント側で画像をリサイズ・JPEG圧縮する。
// 無料枠（1ファイル50MB）対策＋転送量削減のため、アップロード前に長辺1200pxへ縮小。

const MAX_EDGE = 1200;
const JPEG_QUALITY = 0.82;

export interface ResizedImage {
  blob: Blob;
  width: number;
  height: number;
}

/** File/Blob を長辺 MAX_EDGE 以内へ縮小し、JPEG Blob を返す。 */
export async function resizeImage(file: File | Blob): Promise<ResizedImage> {
  const bitmap = await loadBitmap(file);
  const { width: ow, height: oh } = bitmap;

  const scale = Math.min(1, MAX_EDGE / Math.max(ow, oh));
  const width = Math.round(ow * scale);
  const height = Math.round(oh * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas を初期化できませんでした。");
  ctx.drawImage(bitmap, 0, 0, width, height);
  if ("close" in bitmap && typeof bitmap.close === "function") {
    bitmap.close();
  }

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
  );
  if (!blob) throw new Error("画像の変換に失敗しました。");

  return { blob, width, height };
}

async function loadBitmap(file: File | Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      // フォールバックへ
    }
  }
  return await new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("画像を読み込めませんでした。"));
    };
    img.src = url;
  });
}
