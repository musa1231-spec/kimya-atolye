// ════════════════════════════════════════════════════════════════
// 🧼 KATI SABUN — atölyedeki gerçek ekipmana göre (TEK KAYNAK)
// Musa Hocam (17 Kas 2026): katı sabunlar tüp üzerinde 8 kg'lık kaplarda
// yapılır (bazen farklı büyüklükte kaplar). Ekipman: tahta karıştırıcı,
// tahta kalıp, tahta düzleştirici, mala. Asistan, proses, Rehber ve
// öğrenci kuralı buradaki değerleri okur.
// ════════════════════════════════════════════════════════════════
import type { Urun } from "./types";

/** Atölyedeki olağan katı sabun kabı (kg). Asistan'da değiştirilebilir. */
export const KAP_VARSAYILAN_KG = 8;
/** Kabın en fazla ne kadarı doldurulur: soğuk proseste %75; sıcak proseste pişerken kabardığı için %50. */
export const KAP_DOLULUK = { soguk: 0.75, sicak: 0.5 } as const;
/** Tahta kalıbın varsayılan iç ölçüsü (cm). Asistan'da değiştirilebilir. */
export const KALIP_VARSAYILAN = { en: 30, boy: 40 } as const;
/** Kalıba en fazla bu kalınlıkta dökülür; fazlası ikinci kalıba (kalın blok zor kesilir, içi geç sertleşir). */
export const KALIP_EN_FAZLA_KALINLIK_CM = 7;
/** Hedef taze kalıp sabun ağırlığı (g); kürde ≈%10–12 su kaybedip ≈110 g olur. */
export const KALIP_SABUN_G = 125;
/** Kesimde bloğun her kenarından traşlanan pay (cm): kenarlar eğri ve kâğıt izlidir. */
export const KENAR_PAYI_CM = 0.5;

/** Sabunlaşma değerleri (g NaOH / g yağ). Zeytinyağı KOH 190 mg/g, defne yağı KOH 198 mg/g → ×40/56,1. */
export const SAP_NAOH: Record<string, number> = { "Zeytinyağı": 0.1354, "Defne Yağı": 0.1412 };

export const sicakMi = (u: Urun) => u.id.includes("sicak");

export const KATI_EKIPMAN: string[] = [
  `🍲 ${KAP_VARSAYILAN_KG} kg'lık PASLANMAZ ÇELİK ya da emaye kap (tüp üzerinde). ALÜMİNYUM, galvaniz, teflonlu kap KULLANILMAZ: kostik aşındırır, hidrojen gazı çıkar.`,
  "🔥 Tüp ocağı: düz ve sağlam zeminde; tüp dik ve ocaktan en az 1 m uzakta; hortum ve kelepçe sağlam (kaçak, sabunlu suyla kontrol edilir, ASLA çakmakla değil).",
  "🥄 Tahta karıştırıcı: YALNIZCA sabuna ayrılmıştır, başka işte kullanılmaz; iş bitince yıkanıp kurutulur.",
  "🧪 Kostik çözeltisi için AYRI, ısıya dayanıklı plastik (PP) ya da paslanmaz kap + ayrı karıştırma çubuğu. Bu kap tüpe KONMAZ.",
  "🪵 Tahta kalıp: içi yağlı kâğıt ya da naylonla kaplanır (sabun tahtaya yapışır, tahta suyu emer).",
  "📏 Tahta düzleştirici: kalıba dökülen sabunun üstünü düzlemek için.",
  "🧱 Mala: kabı sıyırmak, koyu sabunu kalıba aktarıp bastırmak ve kesmek için.",
  "🌡️ Termometre · ⚖️ tartı · 📐 cetvel/metre · pH kâğıdı ya da fenolftalein · eski gazete/karton (kalıbın üstünü örtmek için).",
];

/** Öğrenci kuralı (Atölye Düzeni) + Rehber + Asistan aynı cümleyi kullanır. */
export const KATI_SABUN_KAZAN_KURAL = `Katı sabunlar (kastilya ve defne yağlı Halep sabunları) 900 kg'lık kazanlarda YAPILMAZ; tüp ocağı üzerinde ${KAP_VARSAYILAN_KG} kg'lık kaplarda, küçük partilerle yapılır.`;

const yuvarla = (x: number, adim = 0.01) => Math.round(x / adim) * adim;

export interface KapPlani { kapKg: number; enFazlaKg: number; kapSayisi: number; kapBasiKg: number }
/** Hedef miktar kaç kapta yapılır? Her kap en fazla kapKg × doluluk alır; partiler eşit bölünür. */
export function kapPlani(hedefKg: number, kapKg: number, sicak: boolean): KapPlani {
  const enFazlaKg = kapKg * (sicak ? KAP_DOLULUK.sicak : KAP_DOLULUK.soguk);
  const kapSayisi = Math.max(1, Math.ceil(hedefKg / enFazlaKg - 1e-9));
  return { kapKg, enFazlaKg, kapSayisi, kapBasiKg: hedefKg / kapSayisi };
}

/** Kap önerisinde kullanılan olağan kap büyüklükleri (kg). */
export const KAP_BOYLARI = [5, 8, 10, 15, 20, 25, 30, 40, 50];

/** Reçetedeki yağların toplam oranı (0–1). */
export const yagOrani = (u: Urun) => u.ings.filter(([a]) => a in SAP_NAOH).reduce((t, [, p]) => t + p, 0) / 100;
/** Yağ miktarından toplam ürün miktarı (yağ + kostik çözeltisi). */
export const yagdanUrunKg = (u: Urun, yagKg: number) => yagKg / yagOrani(u);

export interface KapOnerisi { gerekliKg: number; onerilenKg: number | null }
/** Bu miktarı TEK SEFERDE alacak en küçük kap; listede yoksa null (birkaç partiye bölünür). */
export function kapOnerisi(hedefKg: number, sicak: boolean): KapOnerisi {
  const gerekliKg = hedefKg / (sicak ? KAP_DOLULUK.sicak : KAP_DOLULUK.soguk);
  return { gerekliKg, onerilenKg: KAP_BOYLARI.find((k) => k >= gerekliKg - 1e-9) ?? null };
}

export interface KalipPlani {
  en: number; boy: number; hacimCm3: number; kalipSayisi: number; kalinlikCm: number;
  kesimCm: number; seritSayisi: number; seritBasiAdet: number; kalipBasiAdet: number; toplamAdet: number; kalipSabunG: number;
}
/** Bir kabın sabunu tahta kalıba nasıl dökülür ve kaç kalıp sabun çıkar? */
export function kalipPlani(kg: number, yog: number, en: number, boy: number): KalipPlani {
  const hacimCm3 = (kg * 1000) / yog;
  const kalipSayisi = Math.max(1, Math.ceil(hacimCm3 / (en * boy * KALIP_EN_FAZLA_KALINLIK_CM) - 1e-9));
  const kalinlikCm = hacimCm3 / (kalipSayisi * en * boy);
  // Kare yüzlü kalıp sabun: kenar = √(hacim / kalınlık), 0,5 cm'ye yuvarlanır, 4–10 cm arasında tutulur
  const kesimCm = Math.min(10, Math.max(4, yuvarla(Math.sqrt(KALIP_SABUN_G / yog / kalinlikCm), 0.5)));
  const seritSayisi = Math.floor((en - 2 * KENAR_PAYI_CM) / kesimCm + 1e-9);
  const seritBasiAdet = Math.floor((boy - 2 * KENAR_PAYI_CM) / kesimCm + 1e-9);
  const kalipBasiAdet = seritSayisi * seritBasiAdet;
  return {
    en, boy, hacimCm3, kalipSayisi, kalinlikCm, kesimCm, seritSayisi, seritBasiAdet, kalipBasiAdet,
    toplamAdet: kalipBasiAdet * kalipSayisi, kalipSabunG: Math.round(kesimCm * kesimCm * kalinlikCm * yog),
  };
}

/** Süperyağ (fazla yağ) oranı: kostiğin sabunlaştıramadığı yağ yüzdesi. Cildi kurutmaması için %3–10 olmalı. */
export function superyag(u: Urun): number {
  const kostik = u.ings.find(([a]) => a === "Kostik")?.[1] || 0;
  const gerekli = u.ings.reduce((t, [a, p]) => t + (SAP_NAOH[a] || 0) * p, 0);
  return gerekli ? (1 - kostik / gerekli) * 100 : 0;
}

/** Kalıpta bekleme (saat): sıcak 24; soğuk zeytinyağı 48; defne oranı yüksekse 72. */
export function kalipBekleme(u: Urun): number {
  if (sicakMi(u)) return 24;
  const defne = u.ings.find(([a]) => a === "Defne Yağı")?.[1] || 0;
  return defne >= 20 ? 72 : 48;
}
/** Kür süresi (hafta). */
export function kurHafta(u: Urun): string {
  if (sicakMi(u)) return "2–3";
  return u.ings.some(([a]) => a === "Defne Yağı") ? "6–8" : "4–6";
}
