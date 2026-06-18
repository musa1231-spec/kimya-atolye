import { sb } from "./supabase";
import { store } from "./state";
import {
  URUNLER, HM_LIST, HASTANELER, ESANS_INIT, ESL_INIT, OGR_SEED, OGC_SEED,
} from "./constants";
import type {
  Ogretmen, Ogrenci, Musteri, UretimGun, Siparis, Sevkiyat, Esans,
  BidonHareket, KoliHareket, EsansHareket, AuditKayit, SiparisDurum,
  Belge, BelgeTur, AlisFatura, Irsaliye, KaliteKontrol, Parti,
} from "./types";

const BUCKET = "belgeler";

// ════════════════════════════════════════════════════════════════
// SATIR → UYGULAMA ŞEKLİ EŞLEME
// ════════════════════════════════════════════════════════════════
const mapOgretmen = (r: any): Ogretmen => ({ id: r.id, ad: r.ad, gorev: r.gorev || "", tel: r.tel || "", sif: r.sifre || "", gun: r.gun || 0, islem: r.islem || 0 });
const mapOgrenci = (r: any): Ogrenci => ({ id: r.id, no: r.no || "", ad: r.ad, sn: r.sinif || "", iban: r.iban || "", gun: r.gun || 0 });
const mapMusteri = (r: any): Musteri => ({ id: r.id, ad: r.ad, ilce: r.ilce || "", tel: r.tel || "", adres: r.adres || "", yetkili: r.yetkili || "", tip: r.tip || "diger" });
const mapUretim = (r: any): UretimGun => ({ id: r.id, tarih: r.tarih, not: r.notu || "", kalemler: r.kalemler || [], ogretmenler: r.ogretmenler || [], ogrenciler: r.ogrenciler || [] });
const mapSiparis = (r: any): Siparis => ({ id: r.id, musteriId: r.musteri_id, tarih: r.tarih, teslimTarihi: r.teslim_tarihi, not: r.notu || "", durum: r.durum, kalemler: r.kalemler || [], duzenleyen: r.duzenleyen || "" });
const mapSevkiyat = (r: any): Sevkiyat => ({ id: r.id, tarih: r.tarih, plaka: r.plaka || "", surucu: r.surucu || "", not: r.notu || "", kim: r.kim || "", siparisIds: r.siparis_ids || [], ekstralar: r.ekstralar || [] });
const mapEsans = (r: any): Esans => ({ id: r.id, ad: r.ad, renk: r.renk || "#10b981", aciklama: r.aciklama || "", stok: Number(r.stok) || 0, minEsik: Number(r.min_esik) || 0 });
const mapBidonH = (r: any): BidonHareket => ({ id: r.id, t: r.tarih, tip: r.tip, b1: r.b1 || 0, b5: r.b5 || 0, b20: r.b20 || 0, n: r.notu || "" });
const mapKoliH = (r: any): KoliHareket => ({ id: r.id, t: r.tarih, tip: r.tip, a: r.adet || 0, kim: r.kim || "", n: r.notu || "" });
const mapEsansH = (r: any): EsansHareket => ({ id: r.id, t: r.tarih, eid: r.esans_id, tip: r.tip, m: Number(r.miktar) || 0, n: r.notu || "" });
const mapAudit = (r: any): AuditKayit => ({ id: r.id, kim: r.kim, kimId: r.kim_id, eylem: r.eylem, detay: r.detay, zaman: r.zaman });
const mapBelge = (r: any): Belge => ({ id: r.id, tur: r.tur, ref: r.ref, dosyaAdi: r.dosya_adi, yol: r.yol, boyut: Number(r.boyut) || 0, mime: r.mime || "", yukleyen: r.yukleyen || "", olusturma: r.created_at });
const mapAlis = (r: any): AlisFatura => ({ id: r.id, tarih: r.tarih, tedarikci: r.tedarikci || "", faturaNo: r.fatura_no || "", hmId: r.hm_id, miktar: Number(r.miktar) || 0, birimFiyat: Number(r.birim_fiyat) || 0, tutar: Number(r.tutar) || 0, kim: r.kim || "" });
const mapIrsaliye = (r: any): Irsaliye => ({ id: r.id, tarih: r.tarih, saat: r.saat || "", musteriId: r.musteri_id, plaka: r.plaka || "", surucu: r.surucu || "", tasiyan: r.tasiyan || "", aliciVergi: r.alici_vergi || "", not: r.notu || "", kalemler: r.kalemler || [], kim: r.kim || "" });
const mapKalite = (r: any): KaliteKontrol => ({ id: r.id, tarih: r.tarih, urunId: r.urun_id || "", partiNo: r.parti_no || "", uretimId: r.uretim_id ?? null, ph: r.ph === null ? null : Number(r.ph), yogunluk: r.yogunluk === null ? null : Number(r.yogunluk), gorunum: r.gorunum || "", koku: r.koku || "", viskozite: r.viskozite || "", sonuc: r.sonuc || "uygun", olcen: r.olcen || "", notu: r.notu || "" });
const mapParti = (r: any): Parti => ({ id: r.id, partiNo: r.parti_no, urunId: r.urun_id || "", tarih: r.tarih, uretimId: r.uretim_id ?? null, kg: Number(r.kg) || 0, ambLt: Number(r.amb_lt) || 0, rafOmruAy: Number(r.raf_omru_ay) || 0, skt: r.skt || "", ogrenciler: r.ogrenciler || [], ogretmenler: r.ogretmenler || [], notu: r.notu || "" });

// ════════════════════════════════════════════════════════════════
// TÜM VERİYİ YÜKLE
// ════════════════════════════════════════════════════════════════
export async function loadAll(): Promise<void> {
  const [
    ogr, ogc, mus, ure, sip, sev, ust, hst, gst, bh, kh, es, eh, esl, den, bel, sat, alis, irs, kal, par,
  ] = await Promise.all([
    sb.from("ogretmenler").select("*").order("id"),
    sb.from("ogrenciler").select("*").order("id"),
    sb.from("musteriler").select("*").order("id"),
    sb.from("uretim_gunleri").select("*").order("tarih", { ascending: false }),
    sb.from("siparisler").select("*").order("id"),
    sb.from("sevkiyatlar").select("*").order("id"),
    sb.from("urun_stok").select("*"),
    sb.from("hm_stok").select("*"),
    sb.from("genel_stok").select("*").eq("id", 1).maybeSingle(),
    sb.from("bidon_hareketleri").select("*").order("id"),
    sb.from("koli_hareketleri").select("*").order("id"),
    sb.from("esanslar").select("*").order("ad"),
    sb.from("esans_hareketleri").select("*").order("id"),
    sb.from("eslestirmeler").select("*"),
    sb.from("denetim").select("*").order("zaman", { ascending: false }).limit(2000),
    sb.from("belgeler").select("*").order("id", { ascending: false }),
    sb.from("satis_fiyatlari").select("*"),
    sb.from("alis_faturalari").select("*").order("id", { ascending: false }).limit(1000),
    sb.from("irsaliyeler").select("*").order("id", { ascending: false }),
    sb.from("kalite_kontrol").select("*").order("tarih", { ascending: false }),
    sb.from("partiler").select("*").order("tarih", { ascending: false }),
  ]);

  store.ogretmenler = (ogr.data || []).map(mapOgretmen);
  store.ogrenciler = (ogc.data || []).map(mapOgrenci);
  store.musteriler = (mus.data || []).map(mapMusteri);
  store.uretimGunleri = (ure.data || []).map(mapUretim);
  store.siparisler = (sip.data || []).map(mapSiparis);
  store.sevkiyatlar = (sev.data || []).map(mapSevkiyat);
  store.esanslar = (es.data || []).map(mapEsans);
  store.bidonH = (bh.data || []).map(mapBidonH);
  store.koliH = (kh.data || []).map(mapKoliH);
  store.esansH = (eh.data || []).map(mapEsansH);
  store.denetim = (den.data || []).map(mapAudit);
  store.belgeler = (bel.data || []).map(mapBelge);
  store.alisFaturalari = (alis.data || []).map(mapAlis);
  store.irsaliyeler = (irs.data || []).map(mapIrsaliye);
  store.kaliteKayitlari = (kal.data || []).map(mapKalite);
  store.partiler = (par.data || []).map(mapParti);
  store.satisFiyat = {};
  (sat.data || []).forEach((r: any) => (store.satisFiyat[r.urun_id] = { f5: r.f5 ?? null, f20: r.f20 ?? null, f1: r.f1 ?? null }));

  store.urunStok = {};
  (ust.data || []).forEach((r: any) => (store.urunStok[r.urun_id] = { kg: Number(r.kg) || 0, min: Number(r.min) || 0 }));
  store.hmStok = {};
  (hst.data || []).forEach((r: any) => (store.hmStok[r.hm_id] = { m: Number(r.miktar) || 0, min: Number(r.min) || 0, fiyat: Number(r.fiyat) || 0 }));
  store.eslestirmeler = {};
  (esl.data || []).forEach((r: any) => (store.eslestirmeler[r.urun_id] = r.esans_ids || []));

  const g = gst.data;
  store.bidon = { b1: g?.b1 || 0, b5: g?.b5 || 0, b20: g?.b20 || 0 };
  store.koliStok = g?.koli || 0;
}

// ════════════════════════════════════════════════════════════════
// İLK KURULUM TOHUMU (tablolar boşsa)
// ════════════════════════════════════════════════════════════════
export async function seedIfEmpty(): Promise<void> {
  const { count } = await sb.from("ogretmenler").select("id", { count: "exact", head: true });
  if (count && count > 0) return;

  await sb.from("ogretmenler").insert(
    OGR_SEED.map((o) => ({ ad: o.ad, gorev: o.gorev, tel: o.tel, sifre: o.sif, gun: 0, islem: 0 }))
  );

  // öğrenci tekrarsızlaştırma (ad soyadına göre)
  const seen = new Map<string, { no: string; ad: string; sn: string }>();
  OGC_SEED.forEach((o) => {
    const key = o.ad.toLowerCase().trim();
    if (!seen.has(key)) seen.set(key, { ...o });
    else {
      const ex = seen.get(key)!;
      if (o.no && !ex.no) ex.no = o.no;
      if (o.sn && !ex.sn) ex.sn = o.sn;
    }
  });
  await sb.from("ogrenciler").insert(
    [...seen.values()].map((o) => ({ no: o.no, ad: o.ad, sinif: o.sn, iban: "", gun: 0 }))
  );

  await sb.from("musteriler").insert(
    HASTANELER.map((h) => ({ ad: h.ad, ilce: h.ilce, tel: h.tel, adres: "", yetkili: "", tip: "hastane" }))
  );

  await sb.from("esanslar").insert(
    ESANS_INIT.map((e) => ({ id: e.id, ad: e.ad, renk: e.renk, aciklama: e.aciklama, stok: 0, min_esik: e.minEsik }))
  );
  await sb.from("eslestirmeler").insert(
    Object.entries(ESL_INIT).map(([urun_id, esans_ids]) => ({ urun_id, esans_ids }))
  );
  await sb.from("urun_stok").insert(URUNLER.map((u) => ({ urun_id: u.id, kg: 0, min: 500 })));
  await sb.from("hm_stok").insert(HM_LIST.map((h) => ({ hm_id: h.id, miktar: 0, min: 50, fiyat: h.f })));
  await sb.from("genel_stok").upsert({ id: 1, b1: 500, b5: 300, b20: 100, koli: 200 });
}

// ════════════════════════════════════════════════════════════════
// GENEL YARDIMCILAR
// ════════════════════════════════════════════════════════════════
async function ins(table: string, row: any): Promise<any> {
  const { data, error } = await sb.from(table).insert(row).select().single();
  if (error) throw error;
  return data;
}
async function upd(table: string, id: number | string, patch: any, idCol = "id"): Promise<void> {
  const { error } = await sb.from(table).update(patch).eq(idCol, id);
  if (error) throw error;
}
async function del(table: string, id: number | string, idCol = "id"): Promise<void> {
  const { error } = await sb.from(table).delete().eq(idCol, id);
  if (error) throw error;
}

// ── Öğretmen ──────────────────────────────────────────────────
export const insertOgretmen = async (o: { ad: string; gorev: string; tel: string; sif: string }): Promise<Ogretmen> =>
  mapOgretmen(await ins("ogretmenler", { ad: o.ad, gorev: o.gorev, tel: o.tel, sifre: o.sif, gun: 0, islem: 0 }));
export const updateOgretmen = (id: number, patch: { ad?: string; gorev?: string; tel?: string; sif?: string }) =>
  upd("ogretmenler", id, { ...(patch.ad !== undefined && { ad: patch.ad }), ...(patch.gorev !== undefined && { gorev: patch.gorev }), ...(patch.tel !== undefined && { tel: patch.tel }), ...(patch.sif !== undefined && { sifre: patch.sif }) });
export const deleteOgretmen = (id: number) => del("ogretmenler", id);
export const setOgretmenSayac = (id: number, gun: number, islem: number) => upd("ogretmenler", id, { gun, islem });

// ── Öğrenci ───────────────────────────────────────────────────
export const insertOgrenci = async (o: { no: string; ad: string; sn: string; iban: string }): Promise<Ogrenci> =>
  mapOgrenci(await ins("ogrenciler", { no: o.no, ad: o.ad, sinif: o.sn, iban: o.iban, gun: 0 }));
export const updateOgrenci = (id: number, patch: { no?: string; ad?: string; sn?: string; iban?: string }) =>
  upd("ogrenciler", id, { ...(patch.no !== undefined && { no: patch.no }), ...(patch.ad !== undefined && { ad: patch.ad }), ...(patch.sn !== undefined && { sinif: patch.sn }), ...(patch.iban !== undefined && { iban: patch.iban }) });
export const deleteOgrenci = (id: number) => del("ogrenciler", id);
export const setOgrenciGun = (id: number, gun: number) => upd("ogrenciler", id, { gun });

// ── Müşteri ───────────────────────────────────────────────────
export const insertMusteri = async (m: Omit<Musteri, "id">): Promise<Musteri> =>
  mapMusteri(await ins("musteriler", { ad: m.ad, ilce: m.ilce, tel: m.tel, adres: m.adres, yetkili: m.yetkili, tip: m.tip }));
export const updateMusteri = (id: number, m: Partial<Musteri>) =>
  upd("musteriler", id, { ad: m.ad, ilce: m.ilce, tel: m.tel, adres: m.adres, yetkili: m.yetkili });
export const deleteMusteri = (id: number) => del("musteriler", id);

// ── Üretim ────────────────────────────────────────────────────
export const insertUretim = async (g: Omit<UretimGun, "id">): Promise<UretimGun> =>
  mapUretim(await ins("uretim_gunleri", { tarih: g.tarih, notu: g.not, kalemler: g.kalemler, ogretmenler: g.ogretmenler, ogrenciler: g.ogrenciler }));
export const deleteUretim = (id: number) => del("uretim_gunleri", id);

// ── Sipariş ───────────────────────────────────────────────────
export const insertSiparis = async (s: Omit<Siparis, "id">): Promise<Siparis> =>
  mapSiparis(await ins("siparisler", { musteri_id: s.musteriId, tarih: s.tarih, teslim_tarihi: s.teslimTarihi, notu: s.not, durum: s.durum, kalemler: s.kalemler, duzenleyen: s.duzenleyen }));
export const updateSiparis = (id: number, s: Partial<Siparis>) =>
  upd("siparisler", id, {
    ...(s.musteriId !== undefined && { musteri_id: s.musteriId }),
    ...(s.tarih !== undefined && { tarih: s.tarih }),
    ...(s.teslimTarihi !== undefined && { teslim_tarihi: s.teslimTarihi }),
    ...(s.not !== undefined && { notu: s.not }),
    ...(s.durum !== undefined && { durum: s.durum }),
    ...(s.kalemler !== undefined && { kalemler: s.kalemler }),
    ...(s.duzenleyen !== undefined && { duzenleyen: s.duzenleyen }),
  });
export const setSiparisDurum = (id: number, durum: SiparisDurum, duzenleyen: string) =>
  upd("siparisler", id, { durum, duzenleyen });
export const deleteSiparis = (id: number) => del("siparisler", id);

// ── Sevkiyat ──────────────────────────────────────────────────
export const insertSevkiyat = async (s: Omit<Sevkiyat, "id">): Promise<Sevkiyat> =>
  mapSevkiyat(await ins("sevkiyatlar", { tarih: s.tarih, plaka: s.plaka, surucu: s.surucu, notu: s.not, kim: s.kim, siparis_ids: s.siparisIds, ekstralar: s.ekstralar }));
export const deleteSevkiyat = (id: number) => del("sevkiyatlar", id);

// ── Stok ──────────────────────────────────────────────────────
export const upsertUrunStok = async (urunId: string, kg: number, min: number) => {
  const { error } = await sb.from("urun_stok").upsert({ urun_id: urunId, kg, min });
  if (error) throw error;
};
export const upsertHmStok = async (hmId: string, miktar: number, min: number, fiyat: number) => {
  const { error } = await sb.from("hm_stok").upsert({ hm_id: hmId, miktar, min, fiyat });
  if (error) throw error;
};

export const insertAlisFatura = async (a: Omit<AlisFatura, "id">): Promise<AlisFatura> =>
  mapAlis(await ins("alis_faturalari", {
    tarih: a.tarih, tedarikci: a.tedarikci, fatura_no: a.faturaNo, hm_id: a.hmId,
    miktar: a.miktar, birim_fiyat: a.birimFiyat, tutar: a.tutar, kim: a.kim,
  }));

export const upsertSatisFiyat = async (urunId: string, f: { f5: number | null; f20: number | null; f1: number | null }) => {
  const { error } = await sb.from("satis_fiyatlari").upsert({ urun_id: urunId, f5: f.f5, f20: f.f20, f1: f.f1, guncelleme: new Date().toISOString() });
  if (error) throw error;
};

export const insertIrsaliye = async (i: Omit<Irsaliye, "id">): Promise<Irsaliye> =>
  mapIrsaliye(await ins("irsaliyeler", {
    tarih: i.tarih, saat: i.saat, musteri_id: i.musteriId, plaka: i.plaka, surucu: i.surucu,
    tasiyan: i.tasiyan, alici_vergi: i.aliciVergi, notu: i.not, kalemler: i.kalemler, kim: i.kim,
  }));
export const deleteIrsaliye = (id: number) => del("irsaliyeler", id);

// ── Kalite Kontrol ────────────────────────────────────────────
export const insertKalite = async (k: Omit<KaliteKontrol, "id">): Promise<KaliteKontrol> =>
  mapKalite(await ins("kalite_kontrol", {
    tarih: k.tarih, urun_id: k.urunId, parti_no: k.partiNo, uretim_id: k.uretimId,
    ph: k.ph, yogunluk: k.yogunluk, gorunum: k.gorunum, koku: k.koku, viskozite: k.viskozite,
    sonuc: k.sonuc, olcen: k.olcen, notu: k.notu,
  }));
export const deleteKalite = (id: number) => del("kalite_kontrol", id);

// ── Partiler ──────────────────────────────────────────────────
export const insertParti = async (p: Omit<Parti, "id">): Promise<Parti> =>
  mapParti(await ins("partiler", {
    parti_no: p.partiNo, urun_id: p.urunId, tarih: p.tarih, uretim_id: p.uretimId,
    kg: p.kg, amb_lt: p.ambLt, raf_omru_ay: p.rafOmruAy, skt: p.skt || null,
    ogrenciler: p.ogrenciler, ogretmenler: p.ogretmenler, notu: p.notu,
  }));
export const deleteParti = (id: number) => del("partiler", id);
export const updateGenelStok = async (patch: { b1?: number; b5?: number; b20?: number; koli?: number }) => {
  const { error } = await sb.from("genel_stok").upsert({ id: 1, ...patch });
  if (error) throw error;
};
export const insertBidonH = async (h: Omit<BidonHareket, "id">): Promise<BidonHareket> =>
  mapBidonH(await ins("bidon_hareketleri", { tarih: h.t, tip: h.tip, b1: h.b1, b5: h.b5, b20: h.b20, notu: h.n }));
export const insertKoliH = async (h: Omit<KoliHareket, "id">): Promise<KoliHareket> =>
  mapKoliH(await ins("koli_hareketleri", { tarih: h.t, tip: h.tip, adet: h.a, kim: h.kim, notu: h.n }));

// ── Esans ─────────────────────────────────────────────────────
export const insertEsans = async (e: Esans): Promise<Esans> =>
  mapEsans(await ins("esanslar", { id: e.id, ad: e.ad, renk: e.renk, aciklama: e.aciklama, stok: e.stok, min_esik: e.minEsik }));
export const setEsansStok = (id: string, stok: number) => upd("esanslar", id, { stok });
export const insertEsansH = async (h: Omit<EsansHareket, "id">): Promise<EsansHareket> =>
  mapEsansH(await ins("esans_hareketleri", { tarih: h.t, esans_id: h.eid, tip: h.tip, miktar: h.m, notu: h.n }));
export const upsertEslestirme = async (urunId: string, esansIds: string[]) => {
  const { error } = await sb.from("eslestirmeler").upsert({ urun_id: urunId, esans_ids: esansIds });
  if (error) throw error;
};

// ── Denetim ───────────────────────────────────────────────────
export const insertDenetim = async (a: { kim: string; kimId: number; eylem: string; detay: string }): Promise<AuditKayit> =>
  mapAudit(await ins("denetim", { kim: a.kim, kim_id: a.kimId, eylem: a.eylem, detay: a.detay }));
export const clearDenetim = async () => {
  const { error } = await sb.from("denetim").delete().gte("id", 0);
  if (error) throw error;
};

// ════════════════════════════════════════════════════════════════
// BELGELER (Storage + metadata)
// ════════════════════════════════════════════════════════════════
export function belgeUrl(yol: string): string {
  return sb.storage.from(BUCKET).getPublicUrl(yol).data.publicUrl;
}

export async function uploadBelge(tur: BelgeTur, ref: string, file: File, yukleyen: string): Promise<Belge> {
  const guvenliAd = file.name.replace(/[^\p{L}\p{N}.\-_ ]/gu, "_");
  const yol = `${tur}/${ref}/${Date.now()}_${guvenliAd}`;
  const up = await sb.storage.from(BUCKET).upload(yol, file, { upsert: false, contentType: file.type || undefined });
  if (up.error) throw up.error;
  return mapBelge(await ins("belgeler", {
    tur, ref, dosya_adi: file.name, yol, boyut: file.size, mime: file.type || "", yukleyen,
  }));
}

export async function deleteBelge(b: Belge): Promise<void> {
  await sb.storage.from(BUCKET).remove([b.yol]);
  await del("belgeler", b.id);
}

// ════════════════════════════════════════════════════════════════
// YEDEKTEN GERİ YÜKLEME
// Tüm tabloları siler ve anlık görüntüden yeniden kurar. Identity
// PK'ler nedeniyle eski ID'ler korunamaz; bu yüzden müşteri/öğretmen/
// öğrenci/sipariş ID'leri yeniden eşlenir (remap).
// ════════════════════════════════════════════════════════════════
import type { Store } from "./types";

async function wipe(table: string, idCol = "id", numeric = true) {
  const q = sb.from(table).delete();
  const { error } = numeric ? await q.gte(idCol, 0) : await q.neq(idCol, "___none___");
  if (error) throw error;
}

export async function restoreAll(snap: Store): Promise<void> {
  // 1) Temizle (çocuklar önce)
  for (const t of ["sevkiyatlar", "siparisler", "uretim_gunleri", "denetim", "bidon_hareketleri", "koli_hareketleri", "esans_hareketleri", "belgeler", "alis_faturalari", "irsaliyeler", "kalite_kontrol", "partiler"]) await wipe(t);
  for (const t of ["urun_stok"]) await wipe(t, "urun_id", false);
  await wipe("hm_stok", "hm_id", false);
  await wipe("satis_fiyatlari", "urun_id", false);
  await wipe("eslestirmeler", "urun_id", false);
  await wipe("esanslar", "id", false);
  for (const t of ["ogrenciler", "ogretmenler", "musteriler"]) await wipe(t);

  // 2) Parent kayıtlar + ID eşleme
  const musMap = new Map<number, number>();
  for (const m of snap.musteriler || []) {
    const r = await ins("musteriler", { ad: m.ad, ilce: m.ilce, tel: m.tel, adres: m.adres, yetkili: m.yetkili, tip: m.tip });
    musMap.set(m.id, r.id);
  }
  const ogrMap = new Map<number, number>();
  for (const o of snap.ogretmenler || []) {
    const r = await ins("ogretmenler", { ad: o.ad, gorev: o.gorev, tel: o.tel, sifre: o.sif, gun: o.gun, islem: o.islem });
    ogrMap.set(o.id, r.id);
  }
  const ogcMap = new Map<number, number>();
  for (const o of snap.ogrenciler || []) {
    const r = await ins("ogrenciler", { no: o.no, ad: o.ad, sinif: o.sn, iban: o.iban, gun: o.gun });
    ogcMap.set(o.id, r.id);
  }

  // 3) Esans / eşleştirme / stok
  if (snap.esanslar?.length) await sb.from("esanslar").insert(snap.esanslar.map((e) => ({ id: e.id, ad: e.ad, renk: e.renk, aciklama: e.aciklama, stok: e.stok, min_esik: e.minEsik })));
  const eslRows = Object.entries(snap.eslestirmeler || {}).map(([urun_id, esans_ids]) => ({ urun_id, esans_ids }));
  if (eslRows.length) await sb.from("eslestirmeler").insert(eslRows);
  const usRows = Object.entries(snap.urunStok || {}).map(([urun_id, v]) => ({ urun_id, kg: v.kg, min: v.min }));
  if (usRows.length) await sb.from("urun_stok").insert(usRows);
  const hmRows = Object.entries(snap.hmStok || {}).map(([hm_id, v]) => ({ hm_id, miktar: v.m, min: v.min, fiyat: v.fiyat || 0 }));
  if (hmRows.length) await sb.from("hm_stok").insert(hmRows);
  const sfRows = Object.entries(snap.satisFiyat || {}).map(([urun_id, v]) => ({ urun_id, f5: v.f5, f20: v.f20, f1: v.f1 }));
  if (sfRows.length) await sb.from("satis_fiyatlari").insert(sfRows);
  await sb.from("genel_stok").upsert({ id: 1, b1: snap.bidon?.b1 || 0, b5: snap.bidon?.b5 || 0, b20: snap.bidon?.b20 || 0, koli: snap.koliStok || 0 });

  // 4) Siparişler (müşteri remap) + ID eşleme
  const sipMap = new Map<number, number>();
  for (const s of snap.siparisler || []) {
    const r = await ins("siparisler", { musteri_id: musMap.get(s.musteriId) ?? null, tarih: s.tarih, teslim_tarihi: s.teslimTarihi, notu: s.not, durum: s.durum, kalemler: s.kalemler, duzenleyen: s.duzenleyen });
    sipMap.set(s.id, r.id);
  }

  // 5) Üretim günleri (personel remap)
  const ureRows = (snap.uretimGunleri || []).map((g) => ({
    tarih: g.tarih, notu: g.not, kalemler: g.kalemler,
    ogretmenler: (g.ogretmenler || []).map((id) => ogrMap.get(id)).filter((x) => x != null),
    ogrenciler: (g.ogrenciler || []).map((id) => ogcMap.get(id)).filter((x) => x != null),
  }));
  if (ureRows.length) await sb.from("uretim_gunleri").insert(ureRows);

  // 6) Sevkiyatlar (sipariş remap)
  const sevRows = (snap.sevkiyatlar || []).map((s) => ({
    tarih: s.tarih, plaka: s.plaka, surucu: s.surucu, notu: s.not, kim: s.kim,
    siparis_ids: (s.siparisIds || []).map((id) => sipMap.get(id)).filter((x) => x != null),
    ekstralar: s.ekstralar,
  }));
  if (sevRows.length) await sb.from("sevkiyatlar").insert(sevRows);

  // 7) Hareket geçmişleri + denetim
  if (snap.bidonH?.length) await sb.from("bidon_hareketleri").insert(snap.bidonH.map((h) => ({ tarih: h.t, tip: h.tip, b1: h.b1, b5: h.b5, b20: h.b20, notu: h.n })));
  if (snap.koliH?.length) await sb.from("koli_hareketleri").insert(snap.koliH.map((h) => ({ tarih: h.t, tip: h.tip, adet: h.a, kim: h.kim, notu: h.n })));
  if (snap.esansH?.length) await sb.from("esans_hareketleri").insert(snap.esansH.map((h) => ({ tarih: h.t, esans_id: h.eid, tip: h.tip, miktar: h.m, notu: h.n })));
  if (snap.denetim?.length) await sb.from("denetim").insert(snap.denetim.map((a) => ({ kim: a.kim, kim_id: ogrMap.get(a.kimId) ?? null, eylem: a.eylem, detay: a.detay, zaman: a.zaman })));
  if (snap.belgeler?.length) await sb.from("belgeler").insert(snap.belgeler.map((b) => ({ tur: b.tur, ref: b.ref, dosya_adi: b.dosyaAdi, yol: b.yol, boyut: b.boyut, mime: b.mime, yukleyen: b.yukleyen })));
  if (snap.alisFaturalari?.length) await sb.from("alis_faturalari").insert(snap.alisFaturalari.map((a) => ({ tarih: a.tarih, tedarikci: a.tedarikci, fatura_no: a.faturaNo, hm_id: a.hmId, miktar: a.miktar, birim_fiyat: a.birimFiyat, tutar: a.tutar, kim: a.kim })));
  if (snap.irsaliyeler?.length) await sb.from("irsaliyeler").insert(snap.irsaliyeler.map((i) => ({ tarih: i.tarih, saat: i.saat, musteri_id: musMap.get(i.musteriId) ?? null, plaka: i.plaka, surucu: i.surucu, tasiyan: i.tasiyan, alici_vergi: i.aliciVergi, notu: i.not, kalemler: i.kalemler, kim: i.kim })));
  // Kalite/Parti: üretim_id eski PK'ye dayandığı ve toplu insert'te yeni ID yakalanmadığı için null'lanır; öğrenci/öğretmen ID'leri remap edilir.
  if (snap.kaliteKayitlari?.length) await sb.from("kalite_kontrol").insert(snap.kaliteKayitlari.map((k) => ({ tarih: k.tarih, urun_id: k.urunId, parti_no: k.partiNo, uretim_id: null, ph: k.ph, yogunluk: k.yogunluk, gorunum: k.gorunum, koku: k.koku, viskozite: k.viskozite, sonuc: k.sonuc, olcen: k.olcen, notu: k.notu })));
  if (snap.partiler?.length) await sb.from("partiler").insert(snap.partiler.map((p) => ({ parti_no: p.partiNo, urun_id: p.urunId, tarih: p.tarih, uretim_id: null, kg: p.kg, amb_lt: p.ambLt, raf_omru_ay: p.rafOmruAy, skt: p.skt || null, ogrenciler: (p.ogrenciler || []).map((id) => ogcMap.get(id)).filter((x) => x != null), ogretmenler: (p.ogretmenler || []).map((id) => ogrMap.get(id)).filter((x) => x != null), notu: p.notu })));
}
