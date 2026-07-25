import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { generatePlan } from "@/lib/gemini";
import { findPlannedPost } from "@/lib/postPlan";
import { parseDesign, type Background, type Material, type Product } from "@/types";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const productId: string | undefined = body?.productId;
    const materialId: string | undefined = body?.materialId || undefined;
    const backgroundIds: string[] = Array.isArray(body?.backgroundIds)
      ? body.backgroundIds
      : [];
    const design = parseDesign(body ?? {});
    const planned = findPlannedPost(
      typeof body?.planRef === "string" ? body.planRef : null,
    );

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

    let material: Material | null = null;
    if (materialId) {
      const { data: m } = await supabase
        .from("lumiere_materials")
        .select("*")
        .eq("id", materialId)
        .maybeSingle();
      material = (m as Material) ?? null;
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

    const result = await generatePlan(product, material, backgrounds, design, planned);
    return NextResponse.json({ ...result, ...design });
  } catch (e) {
    const message = e instanceof Error ? e.message : "生成に失敗しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
