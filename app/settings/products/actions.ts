"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";

export interface ProductInput {
  name: string;
  category: string;
  material: string | null;
  description: string | null;
  /** 最低価格（税込・円）。空なら null＝カテゴリ既定の価格を使う */
  price_min: number | null;
  metal: string | null;
  size_range: string | null;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const METAL_VALUES = ["none", "resin_option", "metal", "unknown"];

function parseInput(input: ProductInput): ProductInput | string {
  const name = input.name?.trim();
  const category = input.category?.trim();
  if (!name) return "商品名は必須です。";
  if (!category) return "カテゴリは必須です。";

  const price = input.price_min;
  if (price != null && (!Number.isFinite(price) || price < 0)) {
    return "価格は0以上の数値で入力してください。";
  }

  return {
    name,
    category,
    material: input.material?.trim() || null,
    description: input.description?.trim() || null,
    price_min: price != null ? Math.round(price) : null,
    metal: METAL_VALUES.includes(input.metal ?? "") ? input.metal : "unknown",
    size_range: input.size_range?.trim() || null,
  };
}

export async function createProduct(input: ProductInput): Promise<ActionResult> {
  const parsed = parseInput(input);
  if (typeof parsed === "string") return { ok: false, error: parsed };
  const supabase = createServiceClient();
  const { error } = await supabase.from("lumiere_products").insert(parsed);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings/products");
  revalidatePath("/planner");
  return { ok: true };
}

export async function updateProduct(
  id: string,
  input: ProductInput,
): Promise<ActionResult> {
  const parsed = parseInput(input);
  if (typeof parsed === "string") return { ok: false, error: parsed };
  const supabase = createServiceClient();
  const { error } = await supabase.from("lumiere_products").update(parsed).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings/products");
  revalidatePath("/planner");
  return { ok: true };
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("lumiere_products").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings/products");
  revalidatePath("/planner");
  return { ok: true };
}
