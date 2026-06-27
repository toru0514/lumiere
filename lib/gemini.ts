import "server-only";
import { GoogleGenAI } from "@google/genai";
import type { Background, GenerateResult, Material, Product } from "@/types";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const BRAND_CONTEXT = `Cloud9（クラウドナイン）は愛知の手作り木工アクセサリーブランド。
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
- hashtags: ハッシュタグ。10〜15個。木工・ハンドメイド・アクセサリー・愛知などのジャンルを混在。各要素は先頭の#を付けずタグ文字列のみ

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
