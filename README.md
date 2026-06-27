# lumiere — 撮影プラン＆投稿文生成アプリ 設計ドキュメント

> Cloud9（木材工房Cloud9）のInstagram運用支援アプリ。
> 商品 × 背景素材の組み合わせから「どう撮るか（構図・ライティング）」を提案し、
> あわせて投稿文・ハッシュタグを生成。下書きとしてアプリ内に保存・コピーできる。

---

## 1. 目的・背景

- Cloud9のInstagramは更新が滞りがちで、訪問者数が少ない。
- 在庫は十分にあり、ボトルネックは「発信」側。
- カメラ（Nikon Zf 等）を導入したため、撮影の質を上げて発信を継続したい。
- 自動いいね/フォロー等の規約違反手法は採らない。投稿の質・発見性で勝負する方針。

### このアプリが解決すること
1. 「この商品をどう撮ろう」を毎回ゼロから考える負担をなくす（構図・ライティング提案）。
2. 投稿文・ハッシュタグ作成の手間をなくす（Gemini生成）。
3. 商品・背景素材をマスター管理し、組み合わせの幅を増やす。

---

## 2. スコープ

### MVP（このドキュメントの対象）
- 商品マスターのCRUD（画像つき）
- 背景素材マスターのCRUD（画像つき）
- 撮影プランナー（商品＋背景素材を選び、構図・ライティング・投稿文・ハッシュタグを生成）
- 下書き管理（アプリ内保存・キャプションのコピー）

### スコープ外（将来）
- Instagram APIによる自動下書き保存
  - 理由：個人アカウントでは Instagram Graph API の下書き機能が使えない（ビジネスアカウント限定）。
  - 代替：キャプション＋ハッシュタグのワンタップコピー、シェアシート連携。
- 自動投稿・スケジュール投稿
- 複数ユーザー対応（SaaS化）

---

## 3. 技術スタック

| 層 | 採用技術 |
|---|---|
| フロントエンド | Next.js (App Router) + TypeScript |
| ホスティング | Vercel |
| DB | Supabase (Postgres) ※既存プロジェクトに同居 |
| 画像保存 | Supabase Storage（microCMSは使わない） |
| 認証 | Supabase Auth（既存の仕組みを流用、単一ユーザー想定でも可） |
| AI生成 | Google Gemini API（gemini-2.0-flash） |
| テーブル表示 | TanStack Table（既存アプリと統一） |

### 環境変数（既存の `app_config` 方針に準拠）
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY      # サーバー側のみ
GEMINI_API_KEY                 # サーバー側のみ
```

---

## 4. データモデル

> 既存Supabaseプロジェクトに同居するため、テーブル名に `lumiere_` プレフィックスを付与して衝突を回避する。

### 4.1 products（商品マスター）
```sql
create table lumiere_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,                    -- 例: 「ウォルナットのバングル」
  category text not null,                -- 'bangle' | 'ring' | 'earcuff' など
  material text,                         -- 例: 「ウォルナット」「真鍮」
  description text,                       -- 商品の特徴メモ（生成プロンプトに使う）
  image_path text,                       -- Supabase Storage のパス
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### 4.2 backgrounds（背景素材マスター）
```sql
create table lumiere_backgrounds (
  id uuid primary key default gen_random_uuid(),
  name text not null,                    -- 例: 「アンティークの木製チェスト」
  tag text,                              -- 'furniture' | 'glass' | 'drink' など
  mood text,                             -- 例: 「シック」「あたたかい」
  description text,                       -- 雰囲気メモ（生成プロンプトに使う）
  image_path text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### 4.3 drafts（下書き）
```sql
create table lumiere_drafts (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references lumiere_products(id),
  background_ids uuid[],                  -- 複数の背景素材を組み合わせ可能
  shoot_plan jsonb,                       -- 構図・ライティング提案（生成結果）
  caption text,                          -- 投稿文（生成結果・編集可能）
  hashtags text[],                       -- ハッシュタグ（生成結果・編集可能）
  status text default 'draft',           -- 'draft' | 'posted'
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### 4.4 shoot_plan の JSON 構造（生成結果の型）
```json
{
  "composition": "斜め45度の俯瞰。バングルを左1/3に配置し、右に余白をとる",
  "lighting": "右斜め後ろから1灯。周囲を暗く落として商品にスポットを当てる。木目の陰影を強調",
  "props_arrangement": "アンティークチェストの上に直置き。横にウイスキーグラスを少しぼかして配置",
  "mood": "夜のバーカウンターのような、落ち着いた大人の雰囲気",
  "tips": "木目に光が反射しすぎないよう、光源にディフューザーを。手前にグラスを置くと奥行きが出る"
}
```

---

## 5. Supabase Storage 構成

```
バケット: lumiere-images（public 読み取り可・書き込みは認証必須）
├── products/{product_id}.jpg
└── backgrounds/{background_id}.jpg
```

### 注意点
- 無料枠：ファイルストレージ1GB、1ファイル上限50MB。
- アップロード前にクライアント側でリサイズ（長辺1200px目安）＋JPEG圧縮する。
  - RAWや高解像度をそのまま上げない。
- 画像削除はSQLではなくStorage APIで行う（孤児ファイル防止）。

---

## 6. 画面構成

### 6.1 設定（マスター管理）
- `/settings/products` — 商品の一覧・追加・編集・削除。画像アップロード。
- `/settings/backgrounds` — 背景素材の一覧・追加・編集・削除。画像アップロード。
- 一覧は TanStack Table。インライン編集・画像サムネ表示。

### 6.2 撮影プランナー（コア機能）
`/planner`
1. 商品を1つ選択（サムネ付きグリッド）。
2. 背景素材を1つ以上選択（任意）。
3. 「プランを生成」ボタン → Gemini で以下を生成：
   - 構図提案（composition）
   - ライティング提案（lighting）※「周りを暗くして商品を灯す」系の指示を含む
   - 小物配置（props_arrangement）
   - 雰囲気（mood）
   - 撮影Tips（tips）
   - 投稿文（caption）
   - ハッシュタグ（hashtags）
4. 生成結果を画面表示。caption と hashtags は編集可能。
5. 「下書き保存」 → `lumiere_drafts` に保存。

### 6.3 下書き管理
`/drafts`
- 下書き一覧（商品サムネ・キャプション冒頭・作成日）。
- 詳細：撮影プラン・投稿文・ハッシュタグを表示。
- 「キャプションをコピー」ボタン（投稿文＋ハッシュタグを結合してクリップボードへ）。
- ステータスを 'posted' に変更可能。

---

## 7. AI生成（Gemini）

### 7.1 呼び出し場所
- Next.js API Route（サーバー側）から呼ぶ。`GEMINI_API_KEY` はクライアントに露出させない。
- モデル：`gemini-2.0-flash`

### 7.2 入力に渡す情報
- 選択された商品：name / category / material / description
- 選択された背景素材（複数可）：name / tag / mood / description
- ブランド前提：Cloud9＝手作り木工アクセサリー、落ち着いた・あたたかい・大人な世界観

### 7.3 出力フォーマット
- **JSONのみ**を返すようプロンプトで厳格に指定（前置き・Markdownのコードフェンス禁止）。
- サーバー側でパースし、失敗時はフェンス除去のうえ再パース。

### 7.4 プロンプト方針（要約）
```
あなたはハンドメイド木工アクセサリーブランドのSNS撮影ディレクター兼コピーライターです。
以下の商品と背景素材から、Instagram投稿用の撮影プランと投稿文・ハッシュタグを作成してください。

# 商品
{商品情報}

# 背景素材
{背景素材情報}

# 出力要件
- 構図、ライティング（商品を引き立てる照明・周囲を落とす指示を含む）、小物配置、雰囲気、撮影Tipsを提案
- 投稿文は日本語、150〜300字程度、絵文字は控えめ、Cloud9の世界観に合うトーン
- ハッシュタグは10〜15個。木工・ハンドメイド・アクセサリー・愛知などのジャンルを混在
- 必ず指定のJSON構造のみで出力（前置き・コードフェンスなし）
```

---

## 8. ディレクトリ構成（提案）

```
lumiere/
├── app/
│   ├── settings/
│   │   ├── products/page.tsx
│   │   └── backgrounds/page.tsx
│   ├── planner/page.tsx
│   ├── drafts/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   └── api/
│       ├── generate/route.ts        # Gemini生成（plan + caption + hashtags）
│       └── upload/route.ts          # 画像アップロード（リサイズ後を受ける）
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   ├── gemini.ts
│   └── image.ts                     # クライアント側リサイズ/圧縮
├── components/
│   ├── ProductTable.tsx
│   ├── BackgroundTable.tsx
│   ├── ImageUploader.tsx
│   ├── PlanResult.tsx
│   └── DraftCard.tsx
└── types/
    └── index.ts                     # ShootPlan, Product, Background, Draft 型
```

---

## 9. 実装順序（Claude Code向け推奨ステップ）

1. **Supabaseセットアップ**：3テーブル作成 + Storageバケット `lumiere-images` 作成 + RLSポリシー。
2. **型定義**：`types/index.ts` に Product / Background / Draft / ShootPlan。
3. **画像アップロード**：`lib/image.ts`（リサイズ）→ `ImageUploader` → `api/upload`。
4. **マスター管理画面**：products / backgrounds の CRUD（TanStack Table）。
5. **Gemini生成**：`lib/gemini.ts` + `api/generate`（JSON厳格出力・パース）。
6. **撮影プランナー画面**：選択UI → 生成 → 結果表示・編集。
7. **下書き保存・管理**：drafts の保存・一覧・詳細・コピー機能。
8. **仕上げ**：エラーハンドリング、空状態、ローディング。

---

## 10. 受け入れ条件（MVP完成の定義）

- [ ] 商品・背景素材を画像つきで追加・編集・削除できる。
- [ ] 商品＋背景素材を選んで撮影プラン・投稿文・ハッシュタグが生成される。
- [ ] ライティング提案に「周囲を暗くして商品を灯す」系の具体的指示が含まれる。
- [ ] 投稿文・ハッシュタグを編集して下書き保存できる。
- [ ] 下書きからキャプション＋ハッシュタグをワンタップでコピーできる。
- [ ] 画像はSupabase Storageに保存され、無料枠（1GB/50MB）の範囲で運用できる。

---

## 付録：将来の拡張アイデア

- 撮影プランに合わせた「参考構図のサンプル画像」をGeminiの説明から自動でラフ生成。
- 投稿後のエンゲージメントを記録し、効いたハッシュタグを学習（few-shot化）。
- minne / Creema の商品ページ向けの文章生成も同じ商品マスターから流用。
- ビジネスアカウントへ移行した際の Instagram Graph API 連携（自動下書き）。
