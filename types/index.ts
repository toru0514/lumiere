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
  /** 最低価格（税込・円）。投稿文では「¥4,000〜（税込）」の下限として使う */
  price_min: number | null;
  /** 金属使用状況。表現ルール上、断定してよいのは明示された商品だけ */
  metal: MetalUsage | null;
  /** サイズ表記（例: 3〜25号） */
  size_range: string | null;
  created_at: string;
  updated_at: string;
}

/** 金属使用状況（レポートの3分類＋未確認）。 */
export type MetalUsage = "none" | "resin_option" | "metal" | "unknown";

export const METAL_OPTIONS = [
  { value: "unknown", label: "未確認（投稿文で触れない）" },
  { value: "none", label: "金属不使用" },
  { value: "resin_option", label: "金属アレルギー対応パーツ使用・樹脂／イヤリング変更可" },
  { value: "metal", label: "金属パーツ使用" },
] as const;

export function metalLabel(value: string | null | undefined): string {
  if (!value) return "";
  return METAL_OPTIONS.find((m) => m.value === value)?.label ?? value;
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

// =========================================================
// 投稿設計（テーマ × 主目的 × 形式）
//   出典: reports/1ヶ月目投稿計画・フェーズ2 Q10（KPI設計）
// =========================================================

export type PostTheme =
  | "process"
  | "wood_guide"
  | "metal_allergy"
  | "kikonshiki"
  | "product"
  | "care";

export const POST_THEMES = [
  { value: "process", label: "製作工程", hint: "リーチ獲得。リール向き" },
  { value: "wood_guide", label: "木材図鑑", hint: "保存獲得。/woods の資産を転用" },
  { value: "metal_allergy", label: "金属アレルギー", hint: "購入転換の主砲。常時需要" },
  { value: "kikonshiki", label: "木婚式・記念日", hint: "シェア獲得。贈る側に届く" },
  { value: "product", label: "商品・サイズ・着用", hint: "価格とサイズで不安を消す" },
  { value: "care", label: "お手入れ", hint: "保存獲得。購入後の安心" },
] as const;

/** 投稿の主目的。KPIと1対1で対応させ、CTAもこれで決まる。 */
export type PostGoal = "save" | "share" | "profile" | "reach";

export const POST_GOALS = [
  { value: "save", label: "保存", hint: "あとで見返す価値をつくる" },
  { value: "share", label: "シェア（送信）", hint: "第三者へ転送してもらう" },
  { value: "profile", label: "プロフィールアクセス", hint: "Creema への導線に送る" },
  { value: "reach", label: "非フォロワーリーチ", hint: "リールで新規に届ける" },
] as const;

/** 投稿フォーマット。出力する成果物の形が変わる。 */
export type PostFormat = "feed" | "carousel" | "reel";

export const POST_FORMATS = [
  { value: "feed", label: "フィード（単写真）", hint: "投稿文のみ" },
  { value: "carousel", label: "カルーセル", hint: "各スライドの画像内テキストまで生成" },
  { value: "reel", label: "リール", hint: "0-3秒フックと構成台本を生成" },
] as const;

export function themeLabel(value: string | null | undefined): string {
  if (!value) return "";
  return POST_THEMES.find((t) => t.value === value)?.label ?? value;
}

export function goalLabel(value: string | null | undefined): string {
  if (!value) return "";
  return POST_GOALS.find((g) => g.value === value)?.label ?? value;
}

export function formatLabel(value: string | null | undefined): string {
  if (!value) return "";
  return POST_FORMATS.find((f) => f.value === value)?.label ?? value;
}

/** リクエストの投稿設計を検証する。未指定・不正値は既定値に丸める。 */
export function parseDesign(body: Record<string, unknown>): PostDesign {
  const pick = <T extends string>(
    value: unknown,
    options: readonly { value: string }[],
    fallback: T,
  ): T =>
    typeof value === "string" && options.some((o) => o.value === value)
      ? (value as T)
      : fallback;

  return {
    theme: pick<PostTheme>(body.theme, POST_THEMES, "product"),
    goal: pick<PostGoal>(body.goal, POST_GOALS, "profile"),
    format: pick<PostFormat>(body.format, POST_FORMATS, "feed"),
  };
}

/** カルーセル1枚分の設計。 */
export interface CarouselSlide {
  /** 何を撮る・何を映すか */
  visual: string;
  /** 画像に載せる文字（短く。そのまま Canva に流せる粒度） */
  text: string;
}

/** リール台本。 */
export interface ReelScript {
  /** 0-3秒のフック（映像＋テキスト） */
  hook: string;
  /** カットの流れ */
  cuts: string[];
  /** 画面に出すテキストオーバーレイ */
  overlay: string;
  /** 尺・音の指定 */
  audio: string;
}

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
  /** 投稿設計（Phase2以降に生成した下書きのみ入る） */
  theme: PostTheme | null;
  goal: PostGoal | null;
  format: PostFormat | null;
  /** 投稿文の1行目に置くフック（編集・比較しやすいよう独立保持） */
  hook: string | null;
  /** 公式CTA集から選ばれた1文 */
  cta: string | null;
  carousel: CarouselSlide[] | null;
  reel: ReelScript | null;
  /** 投稿計画（lib/postPlan.ts）の番号。手動作成なら null */
  plan_ref: string | null;
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
  /** 投稿文の1行目（フック） */
  hook: string;
  /** フック＋本文＋CTA を連結した投稿文 */
  caption: string;
  /** 公式CTA集から選ばれた1文 */
  cta: string;
  hashtags: string[];
  /** format=carousel のときのみ */
  carousel: CarouselSlide[] | null;
  /** format=reel のときのみ */
  reel: ReelScript | null;
}

/** 生成リクエストの投稿設計部分。 */
export interface PostDesign {
  theme: PostTheme;
  goal: PostGoal;
  format: PostFormat;
}

/** 写真から投稿文を生成した結果（Gemini 画像入力・/api/caption のレスポンス） */
export interface CaptionResult {
  /** 写真から読み取った要素（被写体・雰囲気・光）。生成の根拠として表示する */
  photo_summary: string;
  hook: string;
  caption: string;
  cta: string;
  hashtags: string[];
}

/** 入力フォームで使う商品カテゴリ候補（価格表と対応。lib/brand.ts の PRICE_TABLE と同じキー） */
export const PRODUCT_CATEGORIES = [
  { value: "ring", label: "木の指輪" },
  { value: "crystal_ring", label: "クリスタルウッドリング" },
  { value: "earcuff", label: "イヤーカフ" },
  { value: "earring", label: "ピアス・イヤリング" },
  { value: "bangle", label: "バングル" },
  { value: "tiepin", label: "ネクタイピン" },
  { value: "cufflinks", label: "カフス" },
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
