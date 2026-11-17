-- Atölye Düzeni: günün kazan planı + görev dağılımı (her tarih için bir satır; bütün cihazlar ortak görür)
-- Supabase panelinde SQL Editor'e yapıştırıp Run deyin. Birden çok kez çalıştırmak zararsızdır.
create table if not exists atolye_planlari (
  tarih       date primary key,
  ogretmen    text default '',
  kazan       jsonb not null default '[]'::jsonb,
  roller      jsonb not null default '{}'::jsonb,
  guncelleyen text default '',
  updated_at  timestamptz default now(),
  constraint kazan_dizi check (jsonb_typeof(kazan) = 'array'),
  constraint roller_nesne check (jsonb_typeof(roller) = 'object')
);
alter table atolye_planlari enable row level security;
drop policy if exists "anon_all" on atolye_planlari;
create policy "anon_all" on atolye_planlari for all to anon, authenticated using (true) with check (true);
