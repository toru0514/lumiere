# lumiere セットアップ手順

設計は [README.md](./README.md) を参照。ここでは実際に動かすための手順をまとめる。

## 1. 環境変数

`.env.local`（コミットされない）に既存 Supabase プロジェクトと Gemini の値を設定する。

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...      # サーバー側のみ
GEMINI_API_KEY=...                 # サーバー側のみ
```

- `SUPABASE_SERVICE_ROLE_KEY` と `GEMINI_API_KEY` はクライアントへ露出しない（API Route / Server Action 内でのみ使用）。
- 雛形は `.env.local.example` を参照。

## 2. データベースの初期化

`supabase/migrations/0001_init.sql` を Supabase の SQL Editor に貼り付けて実行する。
（3テーブル・トリガ・RLS を一括作成）

Supabase CLI を使う場合：

```bash
supabase db push   # もしくは psql で 0001_init.sql を流す
```

> RLS は読み取りのみ anon に開放し、書き込みはサーバー経由（service role）で行う。
> 画像は扱わない（テキストのマスタ管理のみ）。

## 3. 開発サーバー

```bash
npm install
npm run dev
# http://localhost:3000 → /planner へリダイレクト
```

## 4. 使い方

1. **商品マスター**（`/settings/products`）と**背景素材マスター**（`/settings/backgrounds`）を登録（名前・カテゴリ・素材・メモ）。
2. **撮影プランナー**（`/planner`）で商品を1つ＋背景素材を任意で選び、「プランを生成」。
   - 構図・ライティング・小物配置・雰囲気・Tips・投稿文・ハッシュタグを Gemini が生成。
3. 投稿文・ハッシュタグを編集して「下書き保存」。
4. **下書き**（`/drafts`）で詳細表示・編集・「キャプションをコピー」・投稿済み切替・削除。

## 5. デプロイ（Vercel）

```bash
vercel
```

環境変数（上記4つ）を Vercel プロジェクトにも設定する。

## アーキテクチャ要点

- 読み取り：Server Components（`lib/data.ts`）が service role で取得。
- 書き込み：Server Actions（`app/**/actions.ts`）。
- 生成：`app/api/generate`（`lib/gemini.ts`、`GEMINI_MODEL`（既定 `gemini-2.5-flash`）、JSON 厳格出力＋フォールバックパース）。
- 画像は扱わない（テキストのみのマスタ管理）。
- 単一ユーザー内部ツール想定のため UI 認証は未実装（RLS と service role で保護）。
