import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { generatePlan } from "@/lib/gemini";
import type { Background, Product } from "@/types";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const productId: string | undefined = body?.productId;
    const backgroundIds: string[] = Array.isArray(body?.backgroundIds)
      ? body.backgroundIds
      : [];

    if (!productId) {
      return NextResponse.json({ error: "商品が選択されていません。" }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data: product, error: pErr } = await supabase
      .from("lumiere_products")
      .select("*")
      .eq("id", productId)
      .single<Product>();

    if (pErr || !product) {
      return NextResponse.json({ error: "商品が見つかりません。" }, { status: 404 });
    }

    let backgrounds: Background[] = [];
    if (backgroundIds.length > 0) {
      const { data: bgs } = await supabase
        .from("lumiere_backgrounds")
        .select("*")
        .in("id", backgroundIds);
      // 選択順を維持
      const map = new Map((bgs ?? []).map((b) => [b.id, b as Background]));
      backgrounds = backgroundIds.map((id) => map.get(id)).filter(Boolean) as Background[];
    }

    const result = await generatePlan(product, backgrounds);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "生成に失敗しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
