"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";

export interface MaterialInput {
  name: string;
  description: string | null;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
}

function parseInput(input: MaterialInput): MaterialInput | string {
  const name = input.name?.trim();
  if (!name) return "木材名は必須です。";
  return { name, description: input.description?.trim() || null };
}

export async function createMaterial(input: MaterialInput): Promise<ActionResult> {
  const parsed = parseInput(input);
  if (typeof parsed === "string") return { ok: false, error: parsed };
  const supabase = createServiceClient();
  const { error } = await supabase.from("lumiere_materials").insert(parsed);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings/materials");
  revalidatePath("/planner");
  return { ok: true };
}

export async function updateMaterial(
  id: string,
  input: MaterialInput,
): Promise<ActionResult> {
  const parsed = parseInput(input);
  if (typeof parsed === "string") return { ok: false, error: parsed };
  const supabase = createServiceClient();
  const { error } = await supabase.from("lumiere_materials").update(parsed).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings/materials");
  revalidatePath("/planner");
  return { ok: true };
}

export async function deleteMaterial(id: string): Promise<ActionResult> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("lumiere_materials").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings/materials");
  revalidatePath("/planner");
  return { ok: true };
}
