import { NextResponse } from "next/server";
import { generateCaptionFromImages, type CaptionImageInput } from "@/lib/gemini";

export const maxDuration = 60;

/** 受け付ける画像枚数の上限（Instagram のカルーセルを想定しつつ負荷を抑える）。 */
const MAX_IMAGES = 6;
/** 1枚あたりの base64 サイズ上限（およそ 6MB 相当）。クライアントで圧縮済み前提。 */
const MAX_BASE64_LENGTH = 8_000_000;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawImages = Array.isArray(body?.images) ? body.images : [];
    const note: string | undefined =
      typeof body?.note === "string" ? body.note : undefined;

    if (rawImages.length === 0) {
      return NextResponse.json(
        { error: "写真を1枚以上添付してください。" },
        { status: 400 },
      );
    }
    if (rawImages.length > MAX_IMAGES) {
      return NextResponse.json(
        { error: `写真は最大${MAX_IMAGES}枚までです。` },
        { status: 400 },
      );
    }

    const images: CaptionImageInput[] = [];
    for (const img of rawImages) {
      const mimeType = typeof img?.mimeType === "string" ? img.mimeType : "";
      const data = typeof img?.data === "string" ? img.data : "";
      if (!mimeType.startsWith("image/") || !data) {
        return NextResponse.json(
          { error: "画像データが不正です。" },
          { status: 400 },
        );
      }
      if (data.length > MAX_BASE64_LENGTH) {
        return NextResponse.json(
          { error: "画像サイズが大きすぎます。もう一度お試しください。" },
          { status: 413 },
        );
      }
      images.push({ mimeType, data });
    }

    const result = await generateCaptionFromImages(images, note);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "生成に失敗しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
