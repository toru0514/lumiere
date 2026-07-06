// lumiere ドメイン型定義

/** 撮影プラン（Gemini 生成結果・4.4 の JSON 構造） */
export interface ShootPlan {
  composition: string;
  lighting: string;
  props_arrangement: string;
  mood: string;
  tips: string;
}

export const SHOOT_PLAN_KEYS: (keyof ShootPlan)[] = [
  "composition",
  "lighting",
  "props_arrangement",
  "mood",
  "tips",
];

export const SHOOT_PLAN_LABELS: Record<keyof ShootPlan, string> = {
  composition: "構図",
  lighting: "ライティング",
  props_arrangement: "小物配置",
  mood: "雰囲気",
  tips: "撮影Tips",
};

/** 商品マスター（lumiere_products） */
export interface Product {
  id: string;
  name: string;
  category: string;
  material: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

/** 背景素材マスター（lumiere_backgrounds） */
export interface Background {
  id: string;
  name: string;
  tag: string | null;
  mood: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

/** 木材マスター（lumiere_materials） */
export interface Material {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export type DraftStatus = "draft" | "posted";

/** 下書き（lumiere_drafts） */
export interface Draft {
  id: string;
  product_id: string | null;
  material_id: string | null;
  background_ids: string[] | null;
  shoot_plan: ShootPlan | null;
  caption: string | null;
  hashtags: string[] | null;
  status: DraftStatus;
  created_at: string;
  updated_at: string;
}

/** 一覧用に商品情報を join した下書き */
export interface DraftWithProduct extends Draft {
  product: Product | null;
  material: Material | null;
}

/** Gemini 生成 API のレスポンス（プラン + 投稿文 + ハッシュタグ） */
export interface GenerateResult extends ShootPlan {
  caption: string;
  hashtags: string[];
}

/** 写真から投稿文を生成した結果（Gemini 画像入力・/api/caption のレスポンス） */
export interface CaptionResult {
  /** 写真から読み取った要素（被写体・雰囲気・光）。生成の根拠として表示する */
  photo_summary: string;
  caption: string;
  hashtags: string[];
}

/** 入力フォームで使う商品カテゴリ候補 */
export const PRODUCT_CATEGORIES = [
  { value: "bangle", label: "バングル" },
  { value: "ring", label: "リング" },
  { value: "earcuff", label: "イヤーカフ" },
  { value: "earring", label: "イヤリング・ピアス" },
  { value: "necklace", label: "ネックレス" },
  { value: "other", label: "その他" },
] as const;

/** 入力フォームで使う背景素材タグ候補 */
export const BACKGROUND_TAGS = [
  { value: "furniture", label: "家具・什器" },
  { value: "glass", label: "ガラス・食器" },
  { value: "drink", label: "ドリンク" },
  { value: "plant", label: "植物・グリーン" },
  { value: "fabric", label: "ファブリック" },
  { value: "nature", label: "自然・屋外" },
  { value: "other", label: "その他" },
] as const;

export function categoryLabel(value: string | null | undefined): string {
  if (!value) return "";
  return PRODUCT_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function tagLabel(value: string | null | undefined): string {
  if (!value) return "";
  return BACKGROUND_TAGS.find((t) => t.value === value)?.label ?? value;
}
