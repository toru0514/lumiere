import "server-only";
import { GoogleGenAI } from "@google/genai";
import type {
  Background,
  CaptionResult,
  GenerateResult,
  Material,
  Product,
} from "@/types";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const BRAND_CONTEXT = `Cloud9（クラウドナイン）は手作りの木工アクセサリーブランド。
ウォルナットやメープルなどの無垢材を活かした、落ち着いた・あたたかい・大人な世界観。
派手さよりも素材の陰影と手仕事の温もりを伝えるトーンを大切にする。`;

function productBlock(product: Product): string {
  return [
    `- 名前: ${product.name}`,
    `- カテゴリ: ${product.category}`,
    product.material ? `- 素材: ${product.material}` : null,
    product.description ? `- 特徴: ${product.description}` : null,
  ]
    .filter(Boolean)
    .join("\n");
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

export function buildPrompt(
  product: Product,
  material: Material | null,
  backgrounds: Background[],
): string {
  return `あなたはハンドメイド木工アクセサリーブランドのSNS撮影ディレクター兼コピーライターです。
以下の商品・木材・背景素材から、Instagram投稿用の撮影プランと投稿文・ハッシュタグを作成してください。

# ブランド前提
${BRAND_CONTEXT}

# 商品
${productBlock(product)}

# 木材
${materialBlock(material)}

# 背景素材
${backgroundBlock(backgrounds)}

# 出力要件
撮影プラン（composition / lighting / props_arrangement / mood / tips）は**簡潔に**。
- 原則1〜2文。冗長な説明・前置き・修飾語は不要。要点だけ。
- 複数ポイントがある場合のみ箇条書きにする。各行を「・」で始め、改行（\\n）で区切る。各項目あたり最大3点、1点は短く（1行）。
- composition: 構図（配置・アングル・余白）
- lighting: ライティング。「周囲を暗く落として商品を灯す」系の指示を必ず含める（光源の位置・数・ディフューズ）
- props_arrangement: 小物・背景素材の配置
- mood: 仕上がりの雰囲気（短く）
- tips: 撮影のコツ（反射・奥行き・ピントなど）
- caption: 投稿文。日本語、120〜200字程度、絵文字は控えめ、Cloud9の世界観に合うトーン。木材が指定されていれば、その特徴（色味・木目・質感）を投稿文に自然に織り込む
- hashtags: ハッシュタグ。3〜5個（Instagram は1投稿5個までに制限されている）。投稿内容と関連の強いものだけを厳選し、木工・ハンドメイド・アクセサリーなどのジャンルとブランドタグ（cloud9等）を混在。地域名（都道府県・市区町村など）は使わない。各要素は先頭の#を付けずタグ文字列のみ

# 出力フォーマット（厳守）
必ず次のJSON構造のみで出力すること。前置き・説明・Markdownのコードフェンスは一切付けない。
{
  "composition": "string",
  "lighting": "string",
  "props_arrangement": "string",
  "mood": "string",
  "tips": "string",
  "caption": "string",
  "hashtags": ["string", ...]
}`;
}

/** 生成テキストを GenerateResult にパース。失敗時はコードフェンス除去のうえ再パース。 */
export function parseGenerateResult(raw: string): GenerateResult {
  const tryParse = (s: string): GenerateResult | null => {
    try {
      const obj = JSON.parse(s);
      return normalize(obj);
    } catch {
      return null;
    }
  };

  let result = tryParse(raw);
  if (result) return result;

  // ```json ... ``` のようなフェンスを除去して再パース
  const stripped = raw
    .replace(/^[\s\S]*?```(?:json)?/i, "")
    .replace(/```[\s\S]*$/, "")
    .trim();
  result = tryParse(stripped);
  if (result) return result;

  // 最初の { から最後の } までを抜き出して再パース
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    result = tryParse(raw.slice(start, end + 1));
    if (result) return result;
  }

  throw new Error("Gemini の出力をJSONとして解釈できませんでした。");
}

function normalize(obj: unknown): GenerateResult {
  const o = (obj ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  let hashtags: string[] = [];
  if (Array.isArray(o.hashtags)) {
    hashtags = o.hashtags
      .map((h) => String(h).trim().replace(/^#+/, ""))
      .filter(Boolean);
  }
  return {
    composition: str(o.composition),
    lighting: str(o.lighting),
    props_arrangement: str(o.props_arrangement),
    mood: str(o.mood),
    tips: str(o.tips),
    caption: str(o.caption),
    hashtags,
  };
}

export async function generatePlan(
  product: Product,
  material: Material | null,
  backgrounds: Background[],
): Promise<GenerateResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY が未設定です。");
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = buildPrompt(product, material, backgrounds);

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      temperature: 0.9,
    },
  });

  const text = response.text ?? "";
  if (!text) {
    throw new Error("Gemini から空のレスポンスが返りました。");
  }
  return parseGenerateResult(text);
}

// =========================================================
// 写真から投稿文を生成（画像入力）
// =========================================================

/** Gemini に渡す画像（base64）。 */
export interface CaptionImageInput {
  mimeType: string;
  data: string;
}

export function buildCaptionPrompt(note?: string): string {
  const noteBlock = note?.trim()
    ? `\n# 補足（ユーザーからのメモ・優先して反映）\n${note.trim()}\n`
    : "";
  return `あなたはハンドメイド木工アクセサリーブランド「Cloud9」の作り手に近い立場のSNS担当です。
添付された写真（1枚以上・同じ投稿に使う想定）を見て、Instagram投稿用の投稿文とハッシュタグを作成してください。

# ブランド前提
${BRAND_CONTEXT}
${noteBlock}
# 進め方
- まず写真から読み取れる要素（被写体・素材感・色味・光や陰影・小物や背景）を観察する。
- その観察に基づいて書く。写真に写っていない事実（樹種・価格・在庫など）は断定しない。補足メモがあればその内容を優先する。

# 投稿文（caption）の要件
- 日本語、150〜200字程度。作り手の一人称で、話し言葉に近い「です・ます」。淡々と、具体で語る。
- 構成：
  1. 冒頭1行（35字以内）：何の写真かが一目で分かる一文。「木の指輪」「ウォルナット」「ハンドメイドアクセサリー」など検索されそうな言葉を自然に含める。この行の途中で改行しない。
  2. 空白行を1行入れる。
  3. 本文2〜3文：素材・工程・質感・使い心地など、写真から分かる具体を1つ以上。1〜2文ごとに空白行を入れる。
  4. 締め（任意）：軽い一言か、押しつけがましくない問いかけ。毎回同じ定型文にしない。不要なら付けない。
- 絵文字は0〜2個。使わなくてもよい。

# 禁止事項（広告っぽさ・わざとらしさの排除）
- 擬人化や情緒過多な表現：「静かに佇む」「そっと寄り添う」「心に安らぎをもたらす」「優しく浮かび上がらせる」等
- 広告調の締め：「Cloud9が贈る」「〜をあなたに」「〜はいかがですか」等
- 中身のない誇張形容：「上質な」「特別な」「極上の」「唯一無二の」等
- 体言止めのポエム調を連発しない
- 写真にない事実の断定、絵文字の乱用

# ハッシュタグ（hashtags）の要件
- 3〜5個。投稿内容と関連の強いものだけを厳選する（Instagram は1投稿5個までに制限されている）。
- 「cloud9」などのブランドタグ1個＋カテゴリ（例：木のアクセサリー、木の指輪）＋ハンドメイド系から構成する。地域名（都道府県・市区町村など）は使わない。
- 各要素は先頭の#を付けず、タグ文字列のみ。

# 出力フォーマット（厳守）
必ず次のJSON構造のみで出力すること。前置き・説明・Markdownのコードフェンスは一切付けない。
photo_summary は写真から読み取った要素の要約（日本語で1〜2文）。
{
  "photo_summary": "string",
  "caption": "string",
  "hashtags": ["string", ...]
}`;
}

export function parseCaptionResult(raw: string): CaptionResult {
  const result = parseGenerateResult(raw);
  const o = (() => {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  })();
  const summary =
    typeof o.photo_summary === "string" ? o.photo_summary : "";
  return {
    photo_summary: summary,
    caption: result.caption,
    hashtags: result.hashtags,
  };
}

export async function generateCaptionFromImages(
  images: CaptionImageInput[],
  note?: string,
): Promise<CaptionResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY が未設定です。");
  }
  if (images.length === 0) {
    throw new Error("写真が添付されていません。");
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = buildCaptionPrompt(note);

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      { text: prompt },
      ...images.map((img) => ({
        inlineData: { mimeType: img.mimeType, data: img.data },
      })),
    ],
    config: {
      responseMimeType: "application/json",
      temperature: 0.9,
    },
  });

  const text = response.text ?? "";
  if (!text) {
    throw new Error("Gemini から空のレスポンスが返りました。");
  }
  return parseCaptionResult(text);
}
