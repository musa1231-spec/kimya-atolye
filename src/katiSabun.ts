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

/**
 * Sabunlaşma değerleri (g NaOH / g yağ). Doğrulama 17 Kas 2026:
 *  · Zeytinyağı 0,1353 (KOH 190 mg/g; Certified Lye tablosu 0,1353; hesaplayıcılarda 0,133–0,136).
 *  · Defne (meyve) yağı 0,1426 (KOH 200 mg/g; analiz sertifikası 190–210, ort. 200; tedarikçi tablosu 198–206).
 */
export const SAP_NAOH: Record<string, number> = { "Zeytinyağı": 0.1353, "Defne Yağı": 0.1426 };
/** Reçetenin karma SAP'ı (yağ ağırlıklı ortalama, g NaOH / g yağ) — Rehber kartlarında gösterilir. */
export function karmaSap(u: Urun): number {
  const yag = u.ings.filter(([a]) => a in SAP_NAOH);
  return yag.reduce((t, [a, p]) => t + SAP_NAOH[a] * p, 0) / yag.reduce((t, [, p]) => t + p, 0);
}

/**
 * Atölye yöntemi (Musa Hocam 17 Kas): su + kostik tek seferde çözülür, ısınan yağa yavaşça eklenir,
 * tahta karıştırıcıyla karıştırılır, tüpte 2 KEZ KABARTILIP karıştırılır, kalıba dökülür → SICAK PROSES.
 * Halep sabunları da böyle (geleneksel Halep sabunu da pişirilerek yapılır). Yalnız "Kastilya — Soğuk Proses" pişirilmez.
 */
export const SOGUK_PROSES = new Set(["kastilya-soguk"]);
export const sicakMi = (u: Urun) => !SOGUK_PROSES.has(u.id);
/** Sıcak proseste kabartma sayısı (atölye uygulaması). */
export const KABARTMA_SAYISI = 2;

/** Halep sabununun ideal olgunlaşma süresi (Rehber'deki tabloyla aynı). Kullanıma hazır olması için en az kurHafta yeter. */
export const HALEP_OLGUNLASMA: Record<string, string> = { "halep-20": "3–6 ay", "halep-30": "6–9 ay", "halep-40": "9–12 ay" };

/** Yağ miktarına göre katılacak su, kostik (ve kaynatmada tuz) — reçete oranlarıyla. Hepsi TEK PARTİDİR. */
export function yagaGoreSuKostik(u: Urun, yagKg: number): { su: number; kostik: number; tuz: number } {
  const yagP = u.ings.filter(([a]) => a in SAP_NAOH).reduce((t, [, p]) => t + p, 0);
  const p = (ad: string) => u.ings.find(([a]) => a === ad)?.[1] || 0;
  return { su: (yagKg * p("Su")) / yagP, kostik: (yagKg * p("Kostik")) / yagP, tuz: (yagKg * p("Tuz")) / yagP };
}

// ── Kaynatma ve tuzlama (tam kaynatma) — dip yağı / kalitesiz yağ için ──
// Kostik bilerek ≈%5 FAZLA konur (bütün yağ sabunlaşsın); fazlası, kir, renk ve koku tuzlamada ALT SUYLA atılır.
export const KAYNATMA_URUN = new Set(["zy-kaynatma"]);
export const kaynatmaMi = (u: Urun) => KAYNATMA_URUN.has(u.id);
/** Kaynatmada kalıba giren sabun ≈ yağ × 1,5 (alt su atıldığı için reçete toplamından azdır). */
export const KAYNATMA_VERIM = 1.5;
/** Kalıba girecek sabun miktarı (kg). */
export const kalibaGirenKg = (u: Urun, hedefKg: number) => kaynatmaMi(u) ? hedefKg * yagOrani(u) * KAYNATMA_VERIM : hedefKg;

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
export const KATI_SABUN_KAZAN_KURAL = `Katı sabunlar (kastilya, defne yağlı Halep ve kaynatma zeytinyağı sabunları) 900 kg'lık kazanlarda YAPILMAZ; tüp ocağı üzerinde ${KAP_VARSAYILAN_KG} kg'lık kaplarda, küçük partilerle yapılır.`;

/** Atölye uygulaması (Musa Hocam 17 Kas): su ve kostik ayrı tartılır, tartılan kostiğin TAMAMI suya TEK SEFERDE eklenir; parça parça eklenmez. */
export const KOSTIK_COZME = "Tartılmış kostiğin TAMAMI, tartılmış SUYUN İÇİNE TEK SEFERDE eklenir (parça parça eklenmez) ve hemen karıştırılarak çözülür. Kostik daima suya eklenir; asla suyu kostiğin üstüne dökmeyin!";

const yuvarla = (x: number, adim = 0.01) => Math.round(x / adim) * adim;

export interface KapPlani { kapKg: number; enFazlaKg: number; sigar: boolean }
/**
 * Musa Hocam (17 Kas): üretim TEK PARTİDİR — bütün kostik bütün suya tek seferde, çözelti bütün yağa.
 * Program partiye BÖLMEZ; miktar seçili kaba sığmıyorsa üretim başlamaz, uygun kap önerilir.
 */
export function kapPlani(hedefKg: number, kapKg: number, sicak: boolean): KapPlani {
  const enFazlaKg = kapKg * (sicak ? KAP_DOLULUK.sicak : KAP_DOLULUK.soguk);
  return { kapKg, enFazlaKg, sigar: hedefKg <= enFazlaKg + 1e-9 };
}

/** Kap önerisinde kullanılan olağan kap büyüklükleri (kg). */
export const KAP_BOYLARI = [5, 8, 10, 15, 20, 25, 30, 40, 50];

/** Reçetedeki yağların toplam oranı (0–1). */
export const yagOrani = (u: Urun) => u.ings.filter(([a]) => a in SAP_NAOH).reduce((t, [, p]) => t + p, 0) / 100;
/** Yağ miktarından reçete toplamı (yağ + su + kostik [+ tuz]). */
export const yagdanUrunKg = (u: Urun, yagKg: number) => yagKg / yagOrani(u);

export interface KapOnerisi { gerekliKg: number; onerilenKg: number | null }
/** Bu miktarı TEK SEFERDE alacak en küçük kap; listede yoksa null (miktar azaltılmalı). */
export function kapOnerisi(hedefKg: number, sicak: boolean): KapOnerisi {
  const gerekliKg = hedefKg / (sicak ? KAP_DOLULUK.sicak : KAP_DOLULUK.soguk);
  return { gerekliKg, onerilenKg: KAP_BOYLARI.find((k) => k >= gerekliKg - 1e-9) ?? null };
}

/** Miktara göre otomatik seçilecek kap (kg): tek seferde alacak en küçük olağan kap; yoksa null. */
export const otomatikKap = (u: Urun, hedefKg: number): number | null =>
  hedefKg > 0 ? kapOnerisi(hedefKg, sicakMi(u)).onerilenKg : null;

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

/** Kalıpta bekleme (saat): sıcak 24; soğuk ve kaynatma (sulu) 48. */
export function kalipBekleme(u: Urun): number {
  return kaynatmaMi(u) ? 48 : sicakMi(u) ? 24 : 48;
}
/** En az kür süresi (hafta) — kullanıma hazır olması için. Defneli sabun pişirilse de uzun kür ister. */
export function kurHafta(u: Urun): string {
  if (u.ings.some(([a]) => a === "Defne Yağı")) return "6–8";
  if (kaynatmaMi(u)) return "3–4";
  return sicakMi(u) ? "2–3" : "4–6";
}
