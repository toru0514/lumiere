-- 木材マスター（商品に対して木材を選べるようにする）
create table if not exists lumiere_materials (
  id uuid primary key default gen_random_uuid(),
  name text not null,            -- 例: ウォルナット
  description text,              -- 特徴（色味・木目・質感など。生成プロンプトに使う）
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

drop trigger if exists trg_lumiere_materials_updated_at on lumiere_materials;
create trigger trg_lumiere_materials_updated_at
  before update on lumiere_materials
  for each row execute function lumiere_set_updated_at();

alter table lumiere_materials enable row level security;
drop policy if exists lumiere_materials_read on lumiere_materials;
create policy lumiere_materials_read on lumiere_materials
  for select using (true);

-- 下書きに選択木材を保持
alter table lumiere_drafts
  add column if not exists material_id uuid references lumiere_materials(id) on delete set null;
