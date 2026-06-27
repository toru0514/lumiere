-- lumiere MVP schema
-- 既存Supabaseプロジェクトに同居するため lumiere_ プレフィックスで衝突回避。

-- =========================================================
-- 4.1 products（商品マスター）
-- =========================================================
create table if not exists lumiere_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  material text,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =========================================================
-- 4.2 backgrounds（背景素材マスター）
-- =========================================================
create table if not exists lumiere_backgrounds (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tag text,
  mood text,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =========================================================
-- 4.3 drafts（下書き）
-- =========================================================
create table if not exists lumiere_drafts (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references lumiere_products(id) on delete set null,
  background_ids uuid[],
  shoot_plan jsonb,
  caption text,
  hashtags text[],
  status text default 'draft',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =========================================================
-- updated_at 自動更新トリガ
-- =========================================================
create or replace function lumiere_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_lumiere_products_updated_at on lumiere_products;
create trigger trg_lumiere_products_updated_at
  before update on lumiere_products
  for each row execute function lumiere_set_updated_at();

drop trigger if exists trg_lumiere_backgrounds_updated_at on lumiere_backgrounds;
create trigger trg_lumiere_backgrounds_updated_at
  before update on lumiere_backgrounds
  for each row execute function lumiere_set_updated_at();

drop trigger if exists trg_lumiere_drafts_updated_at on lumiere_drafts;
create trigger trg_lumiere_drafts_updated_at
  before update on lumiere_drafts
  for each row execute function lumiere_set_updated_at();

-- =========================================================
-- Row Level Security
--   読み取りは public（anon）に許可。
--   書き込みはサーバ側の service role 経由（RLSをバイパス）で行うため、
--   anon に対する write ポリシーは付与しない。
-- =========================================================
alter table lumiere_products enable row level security;
alter table lumiere_backgrounds enable row level security;
alter table lumiere_drafts enable row level security;

drop policy if exists lumiere_products_read on lumiere_products;
create policy lumiere_products_read on lumiere_products
  for select using (true);

drop policy if exists lumiere_backgrounds_read on lumiere_backgrounds;
create policy lumiere_backgrounds_read on lumiere_backgrounds
  for select using (true);

drop policy if exists lumiere_drafts_read on lumiere_drafts;
create policy lumiere_drafts_read on lumiere_drafts
  for select using (true);
