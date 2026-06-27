"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";

export interface ProductInput {
  name: string;
  category: string;
  material: string | null;
  description: string | null;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
}

function parseInput(input: ProductInput): ProductInput | string {
  const name = input.name?.trim();
  const category = input.category?.trim();
  if (!name) return "商品名は必須です。";
  if (!category) return "カテゴリは必須です。";
  return {
    name,
    category,
    material: input.material?.trim() || null,
    description: input.description?.trim() || null,
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
