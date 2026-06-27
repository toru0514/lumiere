"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";

export interface BackgroundInput {
  name: string;
  tag: string | null;
  mood: string | null;
  description: string | null;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
}

function parseInput(input: BackgroundInput): BackgroundInput | string {
  const name = input.name?.trim();
  if (!name) return "名前は必須です。";
  return {
    name,
    tag: input.tag?.trim() || null,
    mood: input.mood?.trim() || null,
    description: input.description?.trim() || null,
  };
}

export async function createBackground(input: BackgroundInput): Promise<ActionResult> {
  const parsed = parseInput(input);
  if (typeof parsed === "string") return { ok: false, error: parsed };
  const supabase = createServiceClient();
  const { error } = await supabase.from("lumiere_backgrounds").insert(parsed);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings/backgrounds");
  revalidatePath("/planner");
  return { ok: true };
}

export async function updateBackground(
  id: string,
  input: BackgroundInput,
): Promise<ActionResult> {
  const parsed = parseInput(input);
  if (typeof parsed === "string") return { ok: false, error: parsed };
  const supabase = createServiceClient();
  const { error } = await supabase.from("lumiere_backgrounds").update(parsed).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings/backgrounds");
  revalidatePath("/planner");
  return { ok: true };
}

export async function deleteBackground(id: string): Promise<ActionResult> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("lumiere_backgrounds").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings/backgrounds");
  revalidatePath("/planner");
  return { ok: true };
}
