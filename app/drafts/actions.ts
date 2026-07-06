"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import type { DraftStatus, ShootPlan } from "@/types";

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

export interface SaveDraftInput {
  product_id: string;
  material_id: string | null;
  background_ids: string[];
  shoot_plan: ShootPlan;
  caption: string;
  hashtags: string[];
}

export async function createDraft(input: SaveDraftInput): Promise<ActionResult> {
  if (!input.product_id) return { ok: false, error: "商品が選択されていません。" };
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("lumiere_drafts")
    .insert({
      product_id: input.product_id,
      material_id: input.material_id,
      background_ids: input.background_ids,
      shoot_plan: input.shoot_plan,
      caption: input.caption,
      hashtags: input.hashtags,
      status: "draft",
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/drafts");
  return { ok: true, id: data.id as string };
}

export interface SaveCaptionDraftInput {
  caption: string;
  hashtags: string[];
}

/**
 * 写真から生成した投稿文を下書きとして保存する。
 * 商品・木材・撮影プランは紐づかない（product_id は null）。
 */
export async function createCaptionDraft(
  input: SaveCaptionDraftInput,
): Promise<ActionResult> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("lumiere_drafts")
    .insert({
      product_id: null,
      material_id: null,
      background_ids: [],
      shoot_plan: null,
      caption: input.caption,
      hashtags: input.hashtags,
      status: "draft",
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/drafts");
  return { ok: true, id: data.id as string };
}

export async function updateDraftContent(
  id: string,
  caption: string,
  hashtags: string[],
): Promise<ActionResult> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("lumiere_drafts")
    .update({ caption, hashtags })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/drafts");
  revalidatePath(`/drafts/${id}`);
  return { ok: true };
}

export async function setDraftStatus(
  id: string,
  status: DraftStatus,
): Promise<ActionResult> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("lumiere_drafts").update({ status }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/drafts");
  revalidatePath(`/drafts/${id}`);
  return { ok: true };
}

export async function deleteDraft(id: string): Promise<ActionResult> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("lumiere_drafts").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/drafts");
  return { ok: true };
}
