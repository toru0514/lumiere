-- 投稿設計（テーマ×目的×形式）と商品の販売情報を保持する。
-- 出典: reports/フェーズ3_確定版・1ヶ月目投稿計画（2026-07-24）

-- =========================================================
-- 商品マスター: 価格・金属使用状況・サイズ
--   投稿文で価格や金属に言及する際の唯一の根拠になる。
-- =========================================================
alter table lumiere_products
  add column if not exists price_min integer,                    -- 最低価格（税込・円）。表記は「¥4,000〜」
  add column if not exists metal text default 'unknown',         -- none | resin_option | metal | unknown
  add column if not exists size_range text;                      -- 例: 3〜25号

-- =========================================================
-- 下書き: 投稿設計とカルーセル/リールの成果物
-- =========================================================
alter table lumiere_drafts
  add column if not exists theme text,        -- process | wood_guide | metal_allergy | kikonshiki | product | care
  add column if not exists goal text,         -- save | share | profile | reach
  add column if not exists format text,       -- feed | carousel | reel
  add column if not exists hook text,         -- 投稿文1行目
  add column if not exists cta text,          -- 公式CTA集から選ばれた1文
  add column if not exists carousel jsonb,    -- [{visual, text}, ...]
  add column if not exists reel jsonb,        -- {hook, cuts[], overlay, audio}
  add column if not exists plan_ref text;     -- 投稿計画の番号（例: post-02, pinned-01）
