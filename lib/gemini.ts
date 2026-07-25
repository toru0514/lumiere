import "server-only";
import { GoogleGenAI } from "@google/genai";
import type {
  Background,
  CaptionResult,
  CarouselSlide,
  GenerateResult,
  Material,
  PostDesign,
  Product,
  ReelScript,
} from "@/types";
import {
  CTA_LIBRARY,
  GOAL_RULES,
  HASHTAG_RULES,
  THEME_GUIDES,
  findViolations,
  priceLabel,
  rulesBlock,
  violationInstruction,
} from "@/lib/brand";
import { plannedPostBlock, type PlannedPost } from "@/lib/postPlan";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

function productBlock(product: Product): string {
  const price = priceLabel(product.category, product.price_min);
  return [
    `- 名前: ${product.name}`,
    `- カテゴリ: ${product.category}`,
    product.material ? `- 素材: ${product.material}` : null,
    price ? `- 価格: ${price}（この表記のまま使う。断定した単一価格にしない）` : null,
    product.size_range ? `- サイズ: ${product.size_range}` : null,
    metalNote(product.metal),
    product.description ? `- 特徴: ${product.description}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

/** 金属使用状況を、そのまま投稿文に反映してよい形の指示にする。 */
function metalNote(metal: string | null): string {
  switch (metal) {
    case "none":
      return "- 金属: この商品は金属不使用。「金属不使用」と言い切ってよい（ただしブランド全体を金属不使用とは書かない）";
    case "resin_option":
      return "- 金属: 金属アレルギー対応パーツを使用。「樹脂フックやイヤリングへの変更もできます」の形で書く";
    case "metal":
      return [
        "- 金属: 金属パーツを使用（ネクタイピン・カフスは金具をゴールド／シルバーから選択可）。「金属不使用」とは書かない",
        "  金具に触れる場合は「金具はゴールドとシルバーからお選びいただけます」のように選べる利点として書く。",
        "  「金属アレルギーの方には向きません」のような否定的な注意書きは書かない（触れないでよい）",
      ].join("\n");
    default:
      return "- 金属: 未確認。この商品の金属使用の有無には触れない（ブランド共通の「金属アレルギー対応」「商品によって金属使用の有無が異なります」は使ってよい）";
  }
}

function backgroundBlock(backgrounds: Background[]): string {
  if (backgrounds.length === 0) return "（指定なし。商品単体での撮影を想定）";
  return backgrounds
    .map((bg, i) =>
      [
        `${i + 1}.`,
        `- 名前: ${bg.name}`,
        bg.tag ? `- タグ: ${bg.tag}` : null,
        bg.mood ? `- 雰囲気: ${bg.mood}` : null,
        bg.description ? `- メモ: ${bg.description}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n");
}

function materialBlock(material: Material | null): string {
  if (!material) return "（指定なし）";
  return [`- 木材: ${material.name}`, material.description ? `- 特徴: ${material.description}` : null]
    .filter(Boolean)
    .join("\n");
}

/** テーマ・目的・CTA候補を提示するブロック。 */
function designBlock(design: PostDesign): string {
  const guide = THEME_GUIDES[design.theme];
  const ctas = CTA_LIBRARY[design.goal];
  return `# この投稿の設計
- テーマ: ${design.theme}
- 読み手: ${guide.audience}
- フックの作り方: ${guide.hook}
- 本文の展開: ${guide.structure}
- 主目的: ${design.goal}（この行動を取ってもらうことだけを狙う。欲張らない）
- 主目的に応じた書き分け: ${GOAL_RULES[design.goal]}

# CTA（次のリストから最も自然な1つを選び、一字一句そのまま使う）
${ctas.map((c) => `- ${c}`).join("\n")}
CTAは自作しない。選んだ文を cta フィールドに出力し、投稿文（caption）の最終行にも同じ文を置く。`;
}

/** 投稿文の共通要件。 */
const CAPTION_SPEC = `- caption の構成（この順序を守る）:
  1行目: hook と同じ一文（35字以内・途中で改行しない）
  空行
  本文2〜3文（1〜2文ごとに空行）。素材・工程・質感・使い方など具体を必ず1つ以上入れる
  空行
  最終行: 選んだCTAを一字一句そのまま
- 全体で150〜250字程度
- hook フィールドには1行目と同じ文を入れる`;

const FORMAT_SPEC: Record<PostDesign["format"], string> = {
  feed: `# フォーマット: フィード（単写真）
1枚で完結させる。carousel と reel は null にする。`,
  carousel: `# フォーマット: カルーセル
carousel に6〜8枚分を出力する。各要素は { "visual": 撮るもの, "text": 画像に載せる文字 }。
- 1枚目は表紙。スワイプしたくなる問い or 断言を20字以内で
- 中盤は1枚1メッセージ。text は最大25字。長い説明を画像に載せない
- 最終スライドは必ず「該当商品＋価格（分かる場合）＋プロフィールのリンクから Creema へ」の構成にする
reel は null。`,
  reel: `# フォーマット: リール
reel に台本を出力する。
- hook: 0〜3秒で何を映し、どんなテキストを出すか（音を使わない前提でも成立させる）
- cuts: カットの流れを3〜5個の配列で。各要素は「何を撮るか＋秒数の目安」
- overlay: 画面に出すテキスト（1〜2本）
- audio: 音の指定（作業音のみ／BGM控えめ 等）と全体尺
撮影プラン（composition 等）はリールの主要カットの撮り方として書く。carousel は null。`,
};

export function buildPrompt(
  product: Product,
  material: Material | null,
  backgrounds: Background[],
  design: PostDesign,
  planned?: PlannedPost | null,
): string {
  return `あなたは木のアクセサリーブランドのSNS撮影ディレクター兼コピーライターです。
以下の設計に沿って、Instagram投稿用の撮影プランと投稿文・ハッシュタグを作成してください。

${rulesBlock()}

${designBlock(design)}
${planned ? `\n${plannedPostBlock(planned)}\n` : ""}
${FORMAT_SPEC[design.format]}

# 商品
${productBlock(product)}

# 木材
${materialBlock(material)}

# 背景素材
${backgroundBlock(backgrounds)}

# 撮影プランの要件
**簡潔に**。原則1〜2文。冗長な説明・前置き・修飾語は不要。
- 複数ポイントがある場合のみ箇条書きにする。各行を「・」で始め、改行（\\n）で区切る。各項目あたり最大3点、1点は短く（1行）
- composition: 構図（配置・アングル・余白）
- lighting: ライティング（光源の位置・数・ディフューズ）。商品が主役のカットでは「周囲を暗く落として商品を灯す」方向を基本にする
- props_arrangement: 小物・背景素材の配置
- mood: 仕上がりの雰囲気（短く）
- tips: 撮影のコツ（反射・奥行き・ピントなど）

# 投稿文（caption）の要件
${CAPTION_SPEC}
- 木材が指定されていれば、その特徴（色味・木目・質感）を自然に織り込む

# ハッシュタグ（hashtags）の要件
${HASHTAG_RULES}

# 出力フォーマット（厳守）
必ず次のJSON構造のみで出力すること。前置き・説明・Markdownのコードフェンスは一切付けない。
{
  "composition": "string",
  "lighting": "string",
  "props_arrangement": "string",
  "mood": "string",
  "tips": "string",
  "hook": "string",
  "caption": "string",
  "cta": "string",
  "hashtags": ["string", ...],
  "carousel": [{ "visual": "string", "text": "string" }] または null,
  "reel": { "hook": "string", "cuts": ["string"], "overlay": "string", "audio": "string" } または null
}`;
}

/** 生成テキストを GenerateResult にパース。失敗時はコードフェンス除去のうえ再パース。 */
export function parseGenerateResult(raw: string): GenerateResult {
  const obj = parseJson(raw);
  if (!obj) throw new Error("Gemini の出力をJSONとして解釈できませんでした。");
  return normalize(obj);
}

/** JSON文字列（コードフェンス付きも可）を素のオブジェクトに戻す。 */
function parseJson(raw: string): Record<string, unknown> | null {
  const tryParse = (s: string): Record<string, unknown> | null => {
    try {
      const parsed = JSON.parse(s);
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  };

  const direct = tryParse(raw);
  if (direct) return direct;

  // ```json ... ``` のようなフェンスを除去して再パース
  const stripped = raw
    .replace(/^[\s\S]*?```(?:json)?/i, "")
    .replace(/```[\s\S]*$/, "")
    .trim();
  const fenced = tryParse(stripped);
  if (fenced) return fenced;

  // 最初の { から最後の } までを抜き出して再パース
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return tryParse(raw.slice(start, end + 1));
  }
  return null;
}

function normalize(o: Record<string, unknown>): GenerateResult {
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  let hashtags: string[] = [];
  if (Array.isArray(o.hashtags)) {
    hashtags = o.hashtags.map((h) => String(h).trim().replace(/^#+/, "")).filter(Boolean);
  }

  let carousel: CarouselSlide[] | null = null;
  if (Array.isArray(o.carousel) && o.carousel.length > 0) {
    carousel = o.carousel
      .map((s) => {
        const slide = (s ?? {}) as Record<string, unknown>;
        return { visual: str(slide.visual), text: str(slide.text) };
      })
      .filter((s) => s.visual || s.text);
    if (carousel.length === 0) carousel = null;
  }

  let reel: ReelScript | null = null;
  if (o.reel && typeof o.reel === "object") {
    const r = o.reel as Record<string, unknown>;
    const cuts = Array.isArray(r.cuts) ? r.cuts.map((c) => String(c)).filter(Boolean) : [];
    const script = {
      hook: str(r.hook),
      cuts,
      overlay: str(r.overlay),
      audio: str(r.audio),
    };
    if (script.hook || cuts.length > 0) reel = script;
  }

  return {
    composition: str(o.composition),
    lighting: str(o.lighting),
    props_arrangement: str(o.props_arrangement),
    mood: str(o.mood),
    tips: str(o.tips),
    hook: str(o.hook),
    caption: str(o.caption),
    cta: str(o.cta),
    hashtags,
    carousel,
    reel,
  };
}

/** 表現ルール検査の対象になるテキストをすべて連結する。 */
function inspectableText(r: GenerateResult): string {
  return [
    r.hook,
    r.caption,
    r.cta,
    ...(r.carousel ?? []).flatMap((s) => [s.visual, s.text]),
    r.reel?.hook ?? "",
    ...(r.reel?.cuts ?? []),
    r.reel?.overlay ?? "",
  ].join("\n");
}

function client(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY が未設定です。");
  return new GoogleGenAI({ apiKey });
}

async function callGemini(
  ai: GoogleGenAI,
  contents: Parameters<GoogleGenAI["models"]["generateContent"]>[0]["contents"],
): Promise<string> {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents,
    config: { responseMimeType: "application/json", temperature: 0.9 },
  });
  const text = response.text ?? "";
  if (!text) throw new Error("Gemini から空のレスポンスが返りました。");
  return text;
}

/** 違反箇所を指摘して書き直させる指示文。 */
function retryPrompt(previous: string, instruction: string): string {
  return `直前の出力に、ブランドの表現ルール違反があります。

# 直前の出力
${previous}

# 修正が必要な箇所
${instruction}

指摘箇所だけを修正し、他の内容とJSON構造は維持したまま、同じJSON形式で全体を再出力してください。前置き・説明・コードフェンスは付けないこと。`;
}

export async function generatePlan(
  product: Product,
  material: Material | null,
  backgrounds: Background[],
  design: PostDesign,
  planned?: PlannedPost | null,
): Promise<GenerateResult & { warnings: string[] }> {
  const ai = client();
  const prompt = buildPrompt(product, material, backgrounds, design, planned);

  let raw = await callGemini(ai, prompt);
  let result = parseGenerateResult(raw);

  // 表現ルール違反はプロンプトだけでは防ぎきれないため、検出したら1度だけ書き直させる。
  const metalFree = product.metal === "none";
  let violations = findViolations(inspectableText(result), metalFree);
  if (violations.length > 0) {
    raw = await callGemini(ai, retryPrompt(raw, violationInstruction(violations)));
    result = parseGenerateResult(raw);
    violations = findViolations(inspectableText(result), metalFree);
  }

  return {
    ...result,
    warnings: violations.map((v) => `「${v.matched}」${v.reason}`),
  };
}

// =========================================================
// 写真から投稿文を生成（画像入力）
// =========================================================

/** Gemini に渡す画像（base64）。 */
export interface CaptionImageInput {
  mimeType: string;
  data: string;
}

export function buildCaptionPrompt(design: PostDesign, note?: string): string {
  const noteBlock = note?.trim()
    ? `\n# 補足（ユーザーからのメモ・優先して反映）\n${note.trim()}\n`
    : "";
  return `あなたは木のアクセサリーブランド「木材工房cloud9」の作り手に近い立場のSNS担当です。
添付された写真（1枚以上・同じ投稿に使う想定）を見て、Instagram投稿用の投稿文とハッシュタグを作成してください。

${rulesBlock()}
${noteBlock}
${designBlock(design)}

# 進め方
- まず写真から読み取れる要素（被写体・素材感・色味・光や陰影・小物や背景）を観察する
- その観察に基づいて書く。写真に写っていない事実（樹種・価格・在庫・金属の使用有無など）は断定しない。補足メモがあればその内容を優先する

# 投稿文（caption）の要件
${CAPTION_SPEC}
- 1行目には「木の指輪」「木のアクセサリー」など検索されそうな言葉を自然に含める

# ハッシュタグ（hashtags）の要件
${HASHTAG_RULES}

# 出力フォーマット（厳守）
必ず次のJSON構造のみで出力すること。前置き・説明・Markdownのコードフェンスは一切付けない。
photo_summary は写真から読み取った要素の要約（日本語で1〜2文）。
{
  "photo_summary": "string",
  "hook": "string",
  "caption": "string",
  "cta": "string",
  "hashtags": ["string", ...]
}`;
}

export function parseCaptionResult(raw: string): CaptionResult {
  const obj = parseJson(raw);
  if (!obj) throw new Error("Gemini の出力をJSONとして解釈できませんでした。");
  const result = normalize(obj);
  return {
    photo_summary: typeof obj.photo_summary === "string" ? obj.photo_summary : "",
    hook: result.hook,
    caption: result.caption,
    cta: result.cta,
    hashtags: result.hashtags,
  };
}

export async function generateCaptionFromImages(
  images: CaptionImageInput[],
  design: PostDesign,
  note?: string,
): Promise<CaptionResult & { warnings: string[] }> {
  if (images.length === 0) throw new Error("写真が添付されていません。");

  const ai = client();
  const parts = images.map((img) => ({
    inlineData: { mimeType: img.mimeType, data: img.data },
  }));

  let raw = await callGemini(ai, [{ text: buildCaptionPrompt(design, note) }, ...parts]);
  let result = parseCaptionResult(raw);

  // 写真からの生成でも表現ルールは同じ。違反したら1度だけ書き直させる。
  const inspect = (r: CaptionResult) => [r.hook, r.caption, r.cta].join("\n");
  let violations = findViolations(inspect(result));
  if (violations.length > 0) {
    raw = await callGemini(ai, [
      { text: retryPrompt(raw, violationInstruction(violations)) },
      ...parts,
    ]);
    result = parseCaptionResult(raw);
    violations = findViolations(inspect(result));
  }

  return {
    ...result,
    warnings: violations.map((v) => `「${v.matched}」${v.reason}`),
  };
}
