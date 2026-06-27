import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import type { Background, Draft, DraftWithProduct, Product } from "@/types";

export async function getProducts(): Promise<Product[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("lumiere_products")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Product[];
}

export async function getBackgrounds(): Promise<Background[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("lumiere_backgrounds")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Background[];
}

export async function getDrafts(): Promise<DraftWithProduct[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("lumiere_drafts")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const drafts = (data ?? []) as Draft[];

  const productIds = [...new Set(drafts.map((d) => d.product_id).filter(Boolean))] as string[];
  const productMap = new Map<string, Product>();
  if (productIds.length > 0) {
    const { data: products } = await supabase
      .from("lumiere_products")
      .select("*")
      .in("id", productIds);
    for (const p of (products ?? []) as Product[]) productMap.set(p.id, p);
  }

  return drafts.map((d) => ({
    ...d,
    product: d.product_id ? productMap.get(d.product_id) ?? null : null,
  }));
}

export async function getDraft(id: string): Promise<DraftWithProduct | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("lumiere_drafts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const draft = data as Draft;

  let product: Product | null = null;
  if (draft.product_id) {
    const { data: p } = await supabase
      .from("lumiere_products")
      .select("*")
      .eq("id", draft.product_id)
      .maybeSingle();
    product = (p as Product) ?? null;
  }
  return { ...draft, product };
}

/** 下書き詳細で背景素材名を表示するための取得。 */
export async function getBackgroundsByIds(ids: string[]): Promise<Background[]> {
  if (ids.length === 0) return [];
  const supabase = createServiceClient();
  const { data } = await supabase.from("lumiere_backgrounds").select("*").in("id", ids);
  const map = new Map((data ?? []).map((b) => [b.id, b as Background]));
  return ids.map((id) => map.get(id)).filter(Boolean) as Background[];
}
