import type { Urun, HamMadde } from "./types";

// ── Ürün reçeteleri (sabit referans verisi) ──────────────────
export const URUNLER: Urun[] = [
  { id: "sivi-sabun", ad: "Sıvı El Sabunu", kat: "Kişisel Bakım", yog: 1.04, batch: 900, ings: [["Su", 88.53], ["SLES", 5.5], ["Betain", 1.0], ["Kokamid DEA", 1.0], ["Koruyucu", 0.1], ["Esans", 0.3], ["Sitrik Asit", 0.07], ["Tuz", 3.0]] },
  { id: "kopuk-sabun", ad: "Köpük Sabun", kat: "Kişisel Bakım", yog: 1.02, batch: 20, ings: [["Su", 88.8], ["SLES", 7.5], ["Betain", 1.2], ["Kokamid DEA", 1.2], ["Koruyucu", 0.12], ["Esans", 0.35], ["Sitrik Asit", 0.08], ["Gliserin", 0.75]] },
  { id: "dezenfektan", ad: "El Dezenfektanı", kat: "Kişisel Bakım", yog: 0.88, batch: 5, ings: [["Su", 24.38], ["Etil Alkol", 75.0], ["Gliserin", 0.5], ["Esans", 0.12]] },
  { id: "kolonya", ad: "Kolonya", kat: "Kişisel Bakım", yog: 0.88, batch: 100, ings: [["Su", 15.0], ["Etil Alkol", 83.0], ["Esans", 2.0]] },
  { id: "genel-temiz", ad: "Genel Temizlik", kat: "Ev Temizliği", yog: 1.0, batch: 5, ings: [["Su", 94.8], ["IPA", 3.0], ["NP10", 0.9], ["Koruyucu", 0.1], ["Esans", 0.4]] },
  { id: "cam-silici", ad: "Cam Silici", kat: "Ev Temizliği", yog: 1.0, batch: 900, ings: [["Su", 95.1], ["NP10", 0.6], ["IPA", 4.0], ["Koruyucu", 0.12]] },
  { id: "bulasik", ad: "Bulaşık Deterjanı", kat: "Ev Temizliği", yog: 1.04, batch: 4, ings: [["Su", 90.85], ["LABSA", 1.5], ["SLES", 4.5], ["TEA", 1.0], ["Kokamid DEA", 1.0], ["Sıvı Kostik", 0.9], ["Limon Esansı", 0.25], ["Tuz", 2.0]] },
  { id: "camasir-suyu", ad: "Çamaşır Suyu", kat: "Ev Temizliği", yog: 1.07, batch: 900, ings: [["Su", 77.8], ["Hipoklorit %16", 22.2]] },
  { id: "kivamli-camasir", ad: "Kıvamlı Çamaşır Suyu", kat: "Ev Temizliği", yog: 1.06, batch: 900, ings: [["Su", 71.875], ["Kostik", 3.0], ["SLES", 5.0], ["Köpük Kesici", 0.125], ["Hipoklorit %16", 20.0]] },
  { id: "yag-cozucu", ad: "Yağ Çözücü", kat: "Endüstriyel", yog: 1.05, batch: 400, ings: [["Su", 90.8], ["Kostik", 6.5], ["NP10", 2.5], ["Esans", 0.2]] },
  { id: "wc-banyo", ad: "WC/Banyo Temizleyici", kat: "Endüstriyel", yog: 1.08, batch: 20, ings: [["Su", 86.15], ["Fosforik Asit", 12.0], ["NP10", 1.5], ["Esans", 0.2], ["Asit İnhibitörü", 0.15]] },
  { id: "tuz-ruhu", ad: "Tuz Ruhu", kat: "Endüstriyel", yog: 1.15, batch: 30, ings: [["Su", 67.0], ["HCl", 33.0]] },
  { id: "kirec-coz", ad: "Kireç Çözücü", kat: "Endüstriyel", yog: 1.12, batch: 400, ings: [["Su", 67.0], ["HNO3", 33.0]] },
  { id: "kastilya-soguk", ad: "Kastilya Sabunu — Soğuk Proses", kat: "Katı Sabun", yog: 1.07, batch: 2, ings: [["Zeytinyağı", 66.5], ["Su", 25.0], ["Kostik", 8.5]] },
  { id: "kastilya-sicak", ad: "Kastilya Sabunu — Sıcak Proses", kat: "Katı Sabun", yog: 1.07, batch: 2, ings: [["Zeytinyağı", 70.0], ["Su", 21.0], ["Kostik", 9.0]] },
  { id: "halep-20", ad: "Halep Sabunu Klasik (%20 Defne)", kat: "Katı Sabun", yog: 1.07, batch: 2, ings: [["Zeytinyağı", 53.0], ["Defne Yağı", 13.0], ["Su", 25.5], ["Kostik", 8.5]] },
  { id: "halep-30", ad: "Halep Sabunu Standart (%30 Defne)", kat: "Katı Sabun", yog: 1.07, batch: 2, ings: [["Zeytinyağı", 46.0], ["Defne Yağı", 20.0], ["Su", 25.5], ["Kostik", 8.5]] },
  { id: "halep-40", ad: "Halep Sabunu Premium (%40 Defne)", kat: "Katı Sabun", yog: 1.07, batch: 2, ings: [["Zeytinyağı", 40.0], ["Defne Yağı", 26.5], ["Su", 25.0], ["Kostik", 8.5]] },
];

// ── Ham madde fiyatları (₺/kg) ────────────────────────────────
export const HM_FIYAT: Record<string, number> = {
  Su: 0.03, SLES: 115, Betain: 110, "Kokamid DEA": 90, Koruyucu: 120, Esans: 400,
  "Sitrik Asit": 85, Gliserin: 130, Tuz: 6, IPA: 260, NP10: 200, "Hipoklorit %16": 70,
  LABSA: 115, TEA: 140, "Sıvı Kostik": 40, Kostik: 70, "Fosforik Asit": 175, HCl: 40,
  HNO3: 75, "Etil Alkol": 250, "Köpük Kesici": 120, "Limon Esansı": 280,
  "Asit İnhibitörü": 200, Zeytinyağı: 180, "Defne Yağı": 600,
};

export const HM_LIST: HamMadde[] = Object.keys(HM_FIYAT).map((ad) => ({
  id: ad.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
  ad,
  b: "kg",
  f: HM_FIYAT[ad],
}));

export function rawKgHesap(urun: Urun): number {
  return urun.ings.reduce((s, [ad, pct]) => s + (HM_FIYAT[ad] || 0) * (pct / 100), 0);
}

// ── Hastane müşteri listesi (ilk kurulum tohumu) ──────────────
export const HASTANELER = [
  { ad: "Hatay Eğitim ve Araştırma Hastanesi", ilce: "Antakya", tel: "0326 229 44 00" },
  { ad: "Antakya Devlet Hastanesi", ilce: "Antakya", tel: "0326 214 00 00" },
  { ad: "Hatay Kadın Doğum ve Çocuk Hastalıkları Hastanesi", ilce: "Antakya", tel: "0326 216 30 00" },
  { ad: "MKÜ Eğitim ve Araştırma Hastanesi", ilce: "Antakya", tel: "0326 221 33 17" },
  { ad: "İskenderun Devlet Hastanesi", ilce: "İskenderun", tel: "0326 615 37 50" },
  { ad: "Dörtyol Devlet Hastanesi", ilce: "Dörtyol", tel: "0326 712 22 87" },
  { ad: "Kırıkhan Devlet Hastanesi", ilce: "Kırıkhan", tel: "0326 344 96 96" },
  { ad: "Reyhanlı Devlet Hastanesi", ilce: "Reyhanlı", tel: "0326 413 10 49" },
  { ad: "Altınözü Devlet Hastanesi", ilce: "Altınözü", tel: "0326 311 31 31" },
  { ad: "Arsuz Devlet Hastanesi", ilce: "Arsuz", tel: "0326 641 00 00" },
  { ad: "Belen Devlet Hastanesi", ilce: "Belen", tel: "0326 581 00 00" },
  { ad: "Defne Devlet Hastanesi", ilce: "Defne", tel: "0326 251 00 00" },
  { ad: "Erzin Devlet Hastanesi", ilce: "Erzin", tel: "0326 681 71 74" },
  { ad: "Hassa Devlet Hastanesi", ilce: "Hassa", tel: "0326 771 33 33" },
  { ad: "Kumlu Devlet Hastanesi", ilce: "Kumlu", tel: "0326 461 21 21" },
  { ad: "Payas Devlet Hastanesi", ilce: "Payas", tel: "0326 661 00 00" },
  { ad: "Samandağ Devlet Hastanesi", ilce: "Samandağ", tel: "0326 512 38 80" },
  { ad: "Yayladağı Devlet Hastanesi", ilce: "Yayladağı", tel: "0326 471 33 35" },
];

// koli başına bidon adedi
export const AMB_KOLI: Record<number, number> = { 1: 14, 5: 4, 20: 0 };

export const ESANS_INIT = [
  { id: "doven", ad: "Doven", renk: "#f59e0b", aciklama: "Sıvı sabun", stok: 0, minEsik: 5 },
  { id: "mislavand", ad: "Mislavand (Lavanta)", renk: "#8b5cf6", aciklama: "Yüzey temizleyici", stok: 0, minEsik: 5 },
  { id: "pine-fresh", ad: "Pine Fresh (Çam)", renk: "#10b981", aciklama: "Genel temizlik", stok: 0, minEsik: 5 },
  { id: "limon", ad: "Limon", renk: "#eab308", aciklama: "Bulaşık, genel", stok: 0, minEsik: 5 },
  { id: "okyanus", ad: "Okyanus", renk: "#0ea5e9", aciklama: "Genel temizlik", stok: 0, minEsik: 5 },
  { id: "gul", ad: "Gül", renk: "#f43f5e", aciklama: "El sabunu, kolonya", stok: 0, minEsik: 5 },
  { id: "yesil-elma", ad: "Yeşil Elma", renk: "#84cc16", aciklama: "Bulaşık", stok: 0, minEsik: 5 },
  { id: "bahar", ad: "Bahar Çiçeği", renk: "#ec4899", aciklama: "Kişisel bakım", stok: 0, minEsik: 5 },
  { id: "sedir", ad: "Sedir/Odun", renk: "#92400e", aciklama: "WC temizleyici", stok: 0, minEsik: 5 },
  { id: "mentol", ad: "Mentol/Nane", renk: "#06b6d4", aciklama: "Dezenfektan", stok: 0, minEsik: 5 },
];

export const ESL_INIT: Record<string, string[]> = {
  "sivi-sabun": ["doven", "gul", "bahar"],
  "kopuk-sabun": ["doven", "gul"],
  dezenfektan: ["mentol", "limon"],
  kolonya: ["gul", "bahar"],
  "genel-temiz": ["mislavand", "pine-fresh", "okyanus"],
  "cam-silici": ["limon", "okyanus"],
  bulasik: ["limon", "yesil-elma"],
  "yag-cozucu": ["pine-fresh", "sedir"],
  "wc-banyo": ["pine-fresh", "sedir", "mentol"],
};

export const AMB_KOLI_K: Record<number, number> = { 1: 14, 5: 4, 20: 0 };
export const SDUR = ["bekliyor", "hazırlanıyor", "hazır", "teslim edildi"] as const;

// Varsayılan ambalaj fiyatları (₺) — Maliyet Analizi başlangıç değerleri ve
// Fiyat Listesi'ndeki yaklaşık maliyet hesabı için.
export const AMB_FIYAT = { p5: 55, p20: 160, p1: 18, koli: 28 };

// Sevk irsaliyesinde "Gönderen" olarak basılacak atölye/okul bilgisi.
// Gerekirse buradan güncelleyin (VKN/Vergi Dairesi dahil).
export const ATOLYE_BILGI = {
  ad: "Şehit Ahmet Benli Mesleki ve Teknik Anadolu Lisesi — Kimya Üretim Atölyesi",
  adres: "Saraycık Mahallesi, Saray Sokak, Antakya - HATAY",
  tel: "0326 227 7323 - 0533 764 1102",
  eposta: "sehitahmetbenlimtal@gmail.com",
  vergi: "", // Vergi Dairesi / VKN (varsa)
};

// ── Etiket: ham madde tehlike/uyarı notları (GHS özet) ────────
// Reçetede bu ham maddeler varsa ürün etiketine ilgili uyarı eklenir.
export const HM_TEHLIKE: Record<string, string> = {
  Kostik: "Aşındırıcı — cilde ve göze ciddi zarar verir.",
  "Sıvı Kostik": "Aşındırıcı — cilde ve göze ciddi zarar verir.",
  HCl: "Aşındırıcı asit — solunmamalı, gözden/ciltten uzak tutun.",
  HNO3: "Aşındırıcı asit — solunmamalı, gözden/ciltten uzak tutun.",
  "Fosforik Asit": "Aşındırıcı — cilt/göz teması zararlıdır.",
  "Hipoklorit %16": "Asitle karıştırmayın — zehirli klor gazı açığa çıkar.",
  "Etil Alkol": "Yüksek oranda alev alır — ateşten uzak tutun.",
  IPA: "Kolay alev alır — ateşten uzak tutun.",
  NP10: "Tahriş edici — göz/cilt temasından kaçının.",
  LABSA: "Tahriş edici — göz/cilt temasından kaçının.",
  TEA: "Tahriş edici olabilir.",
};

// Etiket için varsayılan raf ömrü (ay) — kategoriye göre
export const RAF_OMRU: Record<string, number> = {
  "Kişisel Bakım": 24, "Ev Temizliği": 24, "Endüstriyel": 12, "Katı Sabun": 36,
};

// Kalite kontrol sonuç seçenekleri
export const KALITE_SONUC = [
  { v: "uygun", ad: "✅ Uygun", renk: "#00C853" },
  { v: "sartli", ad: "⚠️ Şartlı Kabul", renk: "#FF9800" },
  { v: "red", ad: "❌ Ret", renk: "#D32F2F" },
] as const;

// ── İlk kurulum öğretmen/öğrenci tohumu ───────────────────────
export const OGR_SEED = [
  { ad: "Musa Karabiber", gorev: "Üretim Öğretmeni", tel: "", sif: "musa123" },
  { ad: "Süleyman Yılmaz", gorev: "Üretim Öğretmeni", tel: "", sif: "suleyman123" },
  { ad: "Doğan Yıldız", gorev: "Üretim Öğretmeni", tel: "", sif: "dogan123" },
  { ad: "Mustafa Günal", gorev: "Üretim Öğretmeni", tel: "", sif: "mustafa123" },
  { ad: "Vedat Değirmenci", gorev: "Üretim Öğretmeni", tel: "", sif: "vedat123" },
  { ad: "Senem Sönmez Ay", gorev: "Üretim Öğretmeni", tel: "", sif: "senem123" },
];

export const OGC_SEED = [
  { no: "358", ad: "Yunus Emre Sezer", sn: "12/ATP" }, { no: "1783", ad: "Ömer Şahin", sn: "12/ATP" },
  { no: "1909", ad: "Saciddin Karadaş", sn: "12/ATP" }, { no: "1915", ad: "Mert Can Bekler", sn: "12/ATP" },
  { no: "1027", ad: "Burak Dokay", sn: "10/E" }, { no: "1057", ad: "Poyraz Seyyar", sn: "10/E" },
  { no: "4107", ad: "Feray Keser", sn: "9/E" }, { no: "4008", ad: "Buket Güney", sn: "9/E" },
  { no: "2134", ad: "Mehmet Güngör", sn: "12/ATP" }, { no: "2135", ad: "Mehmet Tagay", sn: "12/ATP" },
  { no: "2226", ad: "Abdullah Cihangir", sn: "12/ATP" }, { no: "51", ad: "İbrahim Buz", sn: "12/ATP" },
  { no: "1705", ad: "Yakup Cihangiroğlu", sn: "11/E" }, { no: "2038", ad: "Yusuf Sertel", sn: "9/B ATP" },
  { no: "1028", ad: "Cuma Çobanoğulları", sn: "11/E" }, { no: "5115", ad: "Savaş Özdemir", sn: "11/E" },
  { no: "2031", ad: "Mustafa Çevikkol", sn: "" }, { no: "2225", ad: "Ali Osman Karadaş", sn: "" },
  { no: "862", ad: "Nisanur Ekener", sn: "" }, { no: "9357", ad: "Ayşenur Tatar", sn: "" },
  { no: "2066", ad: "Yiğit Kaymakçı", sn: "9/A ATP" }, { no: "2015", ad: "Kadriye Baykal", sn: "9/B ATP" },
  { no: "4054", ad: "Belinay Kıyamet", sn: "9/E" }, { no: "2088", ad: "Melis Hatap", sn: "9/A ATP" },
  { no: "2118", ad: "Yetkin Tatlıcıoğlu", sn: "9/A ATP" }, { no: "2343", ad: "Mehmet Bulut", sn: "9/A ATP" },
  { no: "2107", ad: "Hüda Boyar", sn: "9/B ATP" }, { no: "", ad: "Fadıl Bilgin", sn: "9/A ATP" },
  { no: "", ad: "Memet Ali Özses", sn: "9/B ATP" }, { no: "", ad: "Hatice Yetkin", sn: "9/B ATP" },
  { no: "", ad: "Nisa Çanakçı", sn: "10/E" }, { no: "", ad: "Yağmur Karaduman", sn: "10/E" },
  { no: "", ad: "Selahaddin Savcı", sn: "10/E" }, { no: "2039", ad: "Yıldız Soner", sn: "9/A ATP" },
  { no: "80", ad: "Hanım Bulguoğlu", sn: "12/ATP" }, { no: "2066", ad: "Yiğit Kaymakçı", sn: "9/A ATP" },
  { no: "", ad: "Zübeyde Göçkün", sn: "9/A ATP" }, { no: "", ad: "Damla Demirtaş", sn: "9/A ATP" },
];
