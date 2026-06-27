import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { STORAGE_BUCKET, storagePublicUrl } from "@/lib/supabase/constants";

const ALLOWED_FOLDERS = new Set(["products", "backgrounds"]);
const MAX_BYTES = 50 * 1024 * 1024; // 50MB（無料枠の1ファイル上限）

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const folder = String(form.get("folder") ?? "");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "ファイルがありません。" }, { status: 400 });
    }
    if (!ALLOWED_FOLDERS.has(folder)) {
      return NextResponse.json({ error: "不正な保存先です。" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "ファイルサイズが上限（50MB）を超えています。" },
        { status: 400 },
      );
    }

    const path = `${folder}/${randomUUID()}.jpg`;
    const supabase = createServiceClient();
    const arrayBuffer = await file.arrayBuffer();

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, Buffer.from(arrayBuffer), {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ path, url: storagePublicUrl(path) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "アップロードに失敗しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
