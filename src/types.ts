// Uygulama içi veri şekilleri. DB sütunları db.ts içinde bu
// camelCase şekillere çevrilir (render kodu sade kalsın diye).

export interface Urun {
  id: string;
  ad: string;
  kat: string;
  yog: number;
  batch: number;
  ings: [string, number][];
}

export interface HamMadde {
  id: string;
  ad: string;
  b: string;
  f: number;
}

export interface Ogretmen {
  id: number;
  ad: string;
  gorev: string;
  tel: string;
  sif: string;
  gun: number;
  islem: number;
}

export interface Ogrenci {
  id: number;
  no: string;
  ad: string;
  sn: string;
  iban: string;
  gun: number;
}

export interface Musteri {
  id: number;
  ad: string;
  ilce: string;
  tel: string;
  adres: string;
  yetkili: string;
  tip: string;
}

export interface UretimKalem {
  urunId: string;
  esansId: string | null;
  kg: number;
  batch: number;
  ambLt: number;
  bidonAdet: number;
  koliAdet: number;
}

export interface UretimGun {
  id: number;
  tarih: string;
  not: string;
  kalemler: UretimKalem[];
  ogretmenler: number[];
  ogrenciler: number[];
}

export interface SiparisKalem {
  urunId: string;
  miktar: number;
  birim: string;
}

export type SiparisDurum = "bekliyor" | "hazırlanıyor" | "hazır" | "teslim edildi";

export interface Siparis {
  id: number;
  musteriId: number;
  tarih: string;
  teslimTarihi: string;
  not: string;
  durum: SiparisDurum;
  kalemler: SiparisKalem[];
  duzenleyen: string;
}

export interface SevkEkstra {
  urunId: string;
  miktar: number;
  birim: string;
}

export interface Sevkiyat {
  id: number;
  tarih: string;
  plaka: string;
  surucu: string;
  not: string;
  kim: string;
  siparisIds: number[];
  ekstralar: SevkEkstra[];
}

export interface IrsaliyeKalem {
  urunId: string;
  miktar: number;
  birim: string;
}

export interface Irsaliye {
  id: number;
  tarih: string;
  saat: string;
  musteriId: number;
  plaka: string;
  surucu: string;
  tasiyan: string;
  aliciVergi: string;
  not: string;
  kalemler: IrsaliyeKalem[];
  kim: string;
}

export interface Esans {
  id: string;
  ad: string;
  renk: string;
  aciklama: string;
  stok: number;
  minEsik: number;
}

export interface BidonHareket {
  id: number;
  t: string;
  tip: string;
  b1: number;
  b5: number;
  b20: number;
  n: string;
}

export interface KoliHareket {
  id: number;
  t: string;
  tip: string;
  a: number;
  kim: string;
  n: string;
}

export interface EsansHareket {
  id: number;
  t: string;
  eid: string;
  tip: string;
  m: number;
  n: string;
}

export type BelgeTur = "hammadde" | "urun" | "siparis" | "sevkiyat" | "fiyat-listesi";

export interface Belge {
  id: number;
  tur: BelgeTur;
  ref: string;
  dosyaAdi: string;
  yol: string;
  boyut: number;
  mime: string;
  yukleyen: string;
  olusturma: string;
}

export interface AuditKayit {
  id: number;
  kim: string;
  kimId: number;
  eylem: string;
  detay: string;
  zaman: string;
}

export interface UrunStokDeger {
  kg: number;
  min: number;
}
export interface HmStokDeger {
  m: number;
  min: number;
  fiyat: number;
}

export interface SatisFiyat {
  f5: number | null;
  f20: number | null;
  f1: number | null;
}

export interface AlisFatura {
  id: number;
  tarih: string;
  tedarikci: string;
  faturaNo: string;
  hmId: string;
  miktar: number;
  birimFiyat: number;
  tutar: number;
  kim: string;
}
export interface BidonStok {
  b1: number;
  b5: number;
  b20: number;
}

export interface Store {
  uretimGunleri: UretimGun[];
  siparisler: Siparis[];
  sevkiyatlar: Sevkiyat[];
  musteriler: Musteri[];
  ogretmenler: Ogretmen[];
  ogrenciler: Ogrenci[];
  urunStok: Record<string, UrunStokDeger>;
  hmStok: Record<string, HmStokDeger>;
  bidon: BidonStok;
  koliStok: number;
  esanslar: Esans[];
  eslestirmeler: Record<string, string[]>;
  bidonH: BidonHareket[];
  koliH: KoliHareket[];
  esansH: EsansHareket[];
  denetim: AuditKayit[];
  belgeler: Belge[];
  satisFiyat: Record<string, SatisFiyat>;
  alisFaturalari: AlisFatura[];
  irsaliyeler: Irsaliye[];
}
