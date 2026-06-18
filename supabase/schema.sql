-- ════════════════════════════════════════════════════════════════
-- Kimya Üretim Atölyesi Yönetim Programı — Normalize Şema (v6)
-- ════════════════════════════════════════════════════════════════
-- Eski sürüm tüm veriyi tek bir "veri" satırında JSON blob olarak
-- tutuyordu; bu yüzden iki kullanıcı aynı anda kaydedince biri
-- diğerinin verisini eziyordu. Bu şemada her kayıt kendi satırında
-- durur, alt kalemler (sipariş/üretim kalemleri) jsonb sütununda
-- tutulur. Böylece eşzamanlı kullanımda veri kaybı olmaz.
--
-- Not: "not" SQL'de ayrılmış sözcük olduğu için sütun adı "notu".
-- ════════════════════════════════════════════════════════════════

-- ── Personel ──────────────────────────────────────────────────
create table if not exists ogretmenler (
  id        bigint generated always as identity primary key,
  ad        text not null,
  gorev     text default '',
  tel       text default '',
  sifre     text default '',
  gun       integer default 0,
  islem     integer default 0,
  created_at timestamptz default now()
);

create table if not exists ogrenciler (
  id     bigint generated always as identity primary key,
  no     text default '',
  ad     text not null,
  sinif  text default '',
  iban   text default '',
  gun    integer default 0
);

-- ── Müşteriler ────────────────────────────────────────────────
create table if not exists musteriler (
  id      bigint generated always as identity primary key,
  ad      text not null,
  ilce    text default '',
  tel     text default '',
  adres   text default '',
  yetkili text default '',
  tip     text default 'diger'
);

-- ── Üretim günleri (kalemler + personel jsonb) ────────────────
create table if not exists uretim_gunleri (
  id          bigint generated always as identity primary key,
  tarih       date not null,
  notu        text default '',
  kalemler    jsonb default '[]'::jsonb,
  ogretmenler jsonb default '[]'::jsonb,
  ogrenciler  jsonb default '[]'::jsonb,
  created_at  timestamptz default now()
);

-- ── Siparişler (kalemler jsonb) ───────────────────────────────
create table if not exists siparisler (
  id            bigint generated always as identity primary key,
  musteri_id    bigint references musteriler(id) on delete set null,
  tarih         date,
  teslim_tarihi date,
  notu          text default '',
  durum         text default 'bekliyor',
  kalemler      jsonb default '[]'::jsonb,
  duzenleyen    text default '',
  created_at    timestamptz default now()
);

-- ── Sevkiyatlar ───────────────────────────────────────────────
create table if not exists sevkiyatlar (
  id         bigint generated always as identity primary key,
  tarih      date,
  plaka      text default '',
  surucu     text default '',
  notu       text default '',
  kim        text default '',
  siparis_ids jsonb default '[]'::jsonb,
  ekstralar  jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

-- ── Stok: ürün / ham madde (key-value) ────────────────────────
create table if not exists urun_stok (
  urun_id text primary key,
  kg      numeric default 0,
  min     numeric default 500
);

create table if not exists hm_stok (
  hm_id  text primary key,
  miktar numeric default 0,
  min    numeric default 50
);

-- ── Genel stok: bidon + koli (tek satır) ──────────────────────
create table if not exists genel_stok (
  id   integer primary key default 1,
  b1   integer default 0,
  b5   integer default 0,
  b20  integer default 0,
  koli integer default 0,
  constraint genel_stok_tek_satir check (id = 1)
);

create table if not exists bidon_hareketleri (
  id    bigint generated always as identity primary key,
  tarih date,
  tip   text,
  b1    integer default 0,
  b5    integer default 0,
  b20   integer default 0,
  notu  text default '',
  created_at timestamptz default now()
);

create table if not exists koli_hareketleri (
  id    bigint generated always as identity primary key,
  tarih date,
  tip   text,
  adet  integer default 0,
  kim   text default '',
  notu  text default '',
  created_at timestamptz default now()
);

-- ── Esans ─────────────────────────────────────────────────────
create table if not exists esanslar (
  id       text primary key,
  ad       text not null,
  renk     text default '#10b981',
  aciklama text default '',
  stok     numeric default 0,
  min_esik numeric default 5
);

create table if not exists esans_hareketleri (
  id       bigint generated always as identity primary key,
  tarih    date,
  esans_id text,
  tip      text,
  miktar   numeric default 0,
  notu     text default '',
  created_at timestamptz default now()
);

-- ürün → esans eşleştirme
create table if not exists eslestirmeler (
  urun_id   text primary key,
  esans_ids jsonb default '[]'::jsonb
);

-- ── Denetim kaydı ─────────────────────────────────────────────
create table if not exists denetim (
  id     bigint generated always as identity primary key,
  kim    text,
  kim_id bigint,
  eylem  text,
  detay  text,
  zaman  timestamptz default now()
);

create index if not exists denetim_zaman_idx on denetim (zaman desc);
create index if not exists uretim_tarih_idx on uretim_gunleri (tarih desc);
create index if not exists siparis_durum_idx on siparisler (durum);

-- ════════════════════════════════════════════════════════════════
-- RLS — Basit giriş (öğretmen + şifre) korunduğu için güvenlik
-- modeli eskisiyle aynı: anon anahtarla tam erişim. İleride Supabase
-- Auth'a geçilirse bu politikalar daraltılmalı.
-- ════════════════════════════════════════════════════════════════
do $$
declare t text;
begin
  foreach t in array array[
    'ogretmenler','ogrenciler','musteriler','uretim_gunleri','siparisler',
    'sevkiyatlar','urun_stok','hm_stok','genel_stok','bidon_hareketleri',
    'koli_hareketleri','esanslar','esans_hareketleri','eslestirmeler','denetim'
  ]
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists "anon_all" on %I;', t);
    execute format(
      'create policy "anon_all" on %I for all to anon, authenticated using (true) with check (true);',
      t
    );
  end loop;
end $$;
