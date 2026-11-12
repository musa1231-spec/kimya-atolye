import type { Urun } from "./types";

// ════════════════════════════════════════════════════════════════
// ÜRETİM PROSESLERİ — Asistanın adım adım yol göstermesi için.
// Her adım reçeteden ölçeklenmiş miktarlarla gösterilir; süreler ve
// roller (kıvam/pH/saf su) öğrenciye açıklanır.
// Kaynak doğrulaması: areksan.com, megep.meb.gov.tr (Sabun/Deterjan
// Analizleri), kalekimya.com, dipolchem.com (Haziran 2026 web taraması).
// ════════════════════════════════════════════════════════════════

export interface Sorun { belirti: string; neden: string; cozum: string }

export interface ProsesAdim {
  tip: "guvenlik" | "ekle" | "karistir" | "olcum" | "devirdaim" | "dolum" | "bilgi" | "bitir";
  baslik: string;
  ekle?: string[];        // bu adımda eklenecek ham madde adları (miktar reçeteden)
  sureDk?: number;        // karıştırma süresi (dakika)
  not?: string;           // öğrenciye açıklama
  safSu?: boolean;        // saf/deiyonize su uyarısı
  dikkat?: string[];      // bu adıma özel dikkat noktaları (rehber.ts ile birleşir)
  sorun?: Sorun[];        // bu adıma özel olası sorun → çözüm
}

// ── Ham madde rolleri (her ekleme adımında ipucu) ─────────────
export const HM_ROL: Record<string, string> = {
  SLES: "🫧 Ana yüzey aktif — köpük ve temizlik sağlar",
  LABSA: "🧪 Ana yüzey aktif (asidiktir, nötralize edilmeli)",
  Betain: "🧴 Köpük + cilt yumuşatıcı (amfoterik, tahrişi azaltır)",
  "Kokamid DEA": "🫧 Köpük stabilize eder ve KIVAM artırır",
  Gliserin: "💧 Nemlendirici (cilde yumuşaklık)",
  Tuz: "🧂 KIVAM (viskozite) verir — en son, yavaş yavaş ekleyin",
  "Sitrik Asit": "⚗️ pH DÜŞÜRÜR — cilt pH'ına (≈5,5) ayarlar",
  Kostik: "⚠️ Nötralizasyon — pH YÜKSELTİR (aşındırıcı, dikkat)",
  "Sıvı Kostik": "⚠️ Nötralizasyon — pH YÜKSELTİR (aşındırıcı)",
  TEA: "⚗️ LABSA nötralizasyonu — pH ayarı",
  "Fosforik Asit": "⚗️ Asit — kireç/kir çözer (aşındırıcı)",
  HCl: "⚠️ Kuvvetli asit — suya yavaşça ekleyin (asla tersi)",
  HNO3: "⚠️ Kuvvetli asit — suya yavaşça ekleyin (asla tersi)",
  "Hipoklorit %16": "⚠️ Aktif klor — asitle ASLA karıştırmayın (zehirli gaz)",
  NP10: "🧴 Islatıcı / yüzey aktif — kiri sökmeye yardım eder",
  IPA: "💨 Çözücü — hızlı kurur, iz bırakmaz",
  "Etil Alkol": "💨 Çözücü / antiseptik (alev alır)",
  Koruyucu: "🛡️ Koruyucu — mikrop üremesini önler",
  Esans: "🌸 Koku verir",
  "Limon Esansı": "🌸 Limon kokusu",
  Boya: "🎨 Renk verir — az miktar, tona göre ayarlayın",
  "Köpük Kesici": "🫧 Köpüğü kırar (fazla köpüğü önler)",
  "Asit İnhibitörü": "🛡️ Asidin metale zararını azaltır",
  Zeytinyağı: "🫒 Sabun bazı (sabunlaşan yağ)",
  "Defne Yağı": "🌿 Halep sabununa özgü yağ",
};

// ── Saf/deiyonize su gerektiren ürünler ───────────────────────
// (Sertlik iyonları Ca/Mg bulanıklık/çökelme yapar; cilt ürünleri
// ve berraklık önemli ürünlerde saf su şart.)
export const SAF_SU = new Set([
  "sivi-sabun", "kopuk-sabun", "dezenfektan", "kolonya", "bulasik", "cam-silici",
]);

// ── Ekleme sırası (rol önceliği) — generic prosesi sıralamak için ─
function rolSira(ad: string): number {
  if (ad === "Su") return 0;
  if (["Etil Alkol", "IPA"].includes(ad)) return 1;
  if (["SLES", "LABSA", "NP10"].includes(ad)) return 2;
  if (["Betain", "Kokamid DEA", "Gliserin"].includes(ad)) return 3;
  if (["Kostik", "Sıvı Kostik", "TEA"].includes(ad)) return 4;     // nötralizasyon
  if (["Sitrik Asit", "Fosforik Asit", "HCl", "HNO3", "Asit İnhibitörü"].includes(ad)) return 5;
  if (["Hipoklorit %16"].includes(ad)) return 6;
  if (ad === "Köpük Kesici") return 7;
  if (["Koruyucu", "Esans", "Limon Esansı", "Boya"].includes(ad)) return 8;
  if (ad === "Tuz") return 9;                                       // KIVAM — en son
  return 5;
}

// ════════════════════════════════════════════════════════════════
// ÜRÜNE ÖZEL (elle yazılmış) PROSESLER
// ════════════════════════════════════════════════════════════════
const OZEL: Record<string, ProsesAdim[]> = {
  // Kullanıcı (atölye) tarafından verilen 900 kg kazan prosesi
  "sivi-sabun": [
    { tip: "ekle", baslik: "1) Ana karışım", ekle: ["Su", "SLES", "Kokamid DEA", "Betain"], sureDk: 180, safSu: true, not: "Saf/deiyonize su kullanın. Hepsini kazana alıp homojen olana dek 3 SAAT karıştırın.",
      dikkat: ["Ekleme sırası: önce su, karıştırıcı çalışırken SLES, o çözülünce Kokamid DEA, en son Betain.", "3 saat boyunca her 30 dakikada bir kazanın dibini kontrol edin; dipte çözünmemiş macun kalmamalı."] },
    { tip: "ekle", baslik: "2) pH ayarı — Sitrik Asit", ekle: ["Sitrik Asit"], not: "Cilt pH'ına (≈5,5) düşürür. 900 kg için ≈360 g." },
    { tip: "ekle", baslik: "3) Koruyucu + Esans", ekle: ["Koruyucu", "Esans"], sureDk: 15, not: "Koruyucuyu ve kokuyu ekleyip karıştırın." },
    { tip: "ekle", baslik: "4) Renk — Yeşil Boya", ekle: ["Boya"], not: "Az miktar yeşil boya; istenen tona göre ayarlayın." },
    { tip: "ekle", baslik: "5) Kıvam — Tuz", ekle: ["Tuz"], sureDk: 120, dikkat: ["Tuz bitince 2 saatlik sayacı başlatın; tuz eklerken geçen süre sayılmaz."], not: "🧂 ÇOK YAVAŞ ekleyin (≈30 kg). Kıvamı tuz verir. Ekledikten sonra 2 SAAT daha karıştırın." },
    { tip: "devirdaim", baslik: "Devir-daim (3 kova)", not: "Tuz dibe çökmesin diye 3 kova ile alttan üste devir-daim yapın." },
    { tip: "olcum", baslik: "pH & Viskozite Kontrol", not: "pH ≈5,0–6,5 ve viskoziteyi ölçün; Kalite Kontrol defterine kaydedin." },
    { tip: "dolum", baslik: "Dolum", not: "Değerler uygunsa bidonlara doldurun ve parti etiketi basın." },
  ],
  // Bulaşık deterjanı — LABSA nötralizasyonu
  "bulasik": [
    { tip: "ekle", baslik: "1) Su", ekle: ["Su"], safSu: true, not: "Deiyonize/saf su kullanın." },
    { tip: "ekle", baslik: "2) LABSA", ekle: ["LABSA"], sureDk: 20, not: "Asidik ana aktif. Karıştırarak tamamen çözün." },
    { tip: "ekle", baslik: "3) Nötralizasyon", ekle: ["Sıvı Kostik"], not: "LABSA'yı nötralize edin; pH 6,7–7,5 olana dek azar azar ekleyin.",
      dikkat: ["pH 6'ya yaklaşınca ilaveleri küçültün (birkaç yüz gram); bu bölgede pH çok hızlı yükselir."] },
    { tip: "olcum", baslik: "pH Kontrol", not: "pH 6,7–7,5 aralığında olmalı. Değilse nötralizatörü ayarlayın." },
    { tip: "ekle", baslik: "4) Yardımcı aktifler", ekle: ["SLES", "Kokamid DEA"], sureDk: 15, not: "Köpük ve performansı artırır." },
    { tip: "ekle", baslik: "5) Esans", ekle: ["Limon Esansı"], not: "Kokuyu ekleyin." },
    { tip: "ekle", baslik: "6) Renk — Sarı Boya", ekle: ["Boya"], not: "Az miktar sarı boya; istenen tona göre ayarlayın." },
    { tip: "ekle", baslik: "7) Kıvam — Tuz", ekle: ["Tuz"], sureDk: 30, not: "🧂 Yavaşça ekleyin; istenen kıvama ulaşana dek.",
      dikkat: ["Tuzdan ÖNCE pH'ın 6,7–7,5 aralığında olduğundan emin olun; pH değişince tuzun verdiği kıvam da değişir."] },
    { tip: "olcum", baslik: "Viskozite & pH Kontrol", not: "Değerleri Kalite Kontrol defterine kaydedin." },
    { tip: "dolum", baslik: "Dolum & Etiketleme", not: "Uygunsa bidonlara doldurun, parti etiketi basın." },
  ],
  // Kolonya — esans önce alkolde çözülür, su en son
  "kolonya": [
    { tip: "ekle", baslik: "1) Etil Alkol", ekle: ["Etil Alkol"], not: "Alkolü kapaklı, temiz ve kuru bir kaba alın." },
    { tip: "ekle", baslik: "2) Esans — alkolde çöz", ekle: ["Esans"], sureDk: 15, not: "Esansı ALKOLE ekleyip kapalı kapta tamamen çözünene dek karıştırın.", dikkat: ["Esans suya değil alkole eklenir; alkolde berrak çözünmesi gerekir."] },
    { tip: "ekle", baslik: "3) Su — en son, yavaşça", ekle: ["Su"], safSu: true, sureDk: 10, not: "Saf suyu ince akışla, karıştırarak ekleyin.", dikkat: ["Suyu bir kerede dökmeyin; hızlı eklenen su kolonyayı bulandırır."] },
    { tip: "bilgi", baslik: "Dinlendirme", not: "Kolonyayı kapalı kapta, serin ve karanlık yerde en az 24 saat (tercihen birkaç gün) dinlendirin. Koku olgunlaşır, varsa tortu dibe çöker." },
    { tip: "olcum", baslik: "Derece & Berraklık Kontrol", not: "Alkolmetreyle dereceyi ölçün, berraklığa bakın; Kalite Kontrol defterine kaydedin." },
    { tip: "dolum", baslik: "Süzme & Dolum", not: "Gerekirse süzgeç kâğıdından süzüp şişelere doldurun, parti etiketi basın." },
  ],
  // El dezenfektanı — alkol oranı kritik
  "dezenfektan": [
    { tip: "ekle", baslik: "1) Etil Alkol", ekle: ["Etil Alkol"], not: "Alkolü kapaklı, temiz ve kuru bir kaba alın." },
    { tip: "ekle", baslik: "2) Gliserin + Esans", ekle: ["Gliserin", "Esans"], sureDk: 10, not: "Gliserin ve esansı alkole ekleyip kapalı kapta karıştırın." },
    { tip: "ekle", baslik: "3) Su", ekle: ["Su"], safSu: true, sureDk: 5, not: "Saf suyu ekleyip karıştırın; kabı hemen kapatın." },
    { tip: "olcum", baslik: "Alkol Derecesi Kontrol", not: "Alkolmetreyle ölçün: en az %70 olmalı. Kalite Kontrol defterine kaydedin." },
    { tip: "dolum", baslik: "Dolum & Etiketleme", not: "Kapaklı şişelere doldurup parti etiketi basın; etikete 'Yanıcıdır' uyarısı yazın." },
  ],
  // Kıvamlı çamaşır suyu — hipoklorit soğuk çözeltiye
  "kivamli-camasir": [
    { tip: "ekle", baslik: "1) Su", ekle: ["Su"], not: "Kazana suyu alın." },
    { tip: "ekle", baslik: "2) Kostik", ekle: ["Kostik"], sureDk: 15, not: "Kostiği SUYA yavaşça ekleyip çözün. Çözelti ısınır." },
    { tip: "ekle", baslik: "3) SLES", ekle: ["SLES"], sureDk: 15, not: "Yavaş karıştırarak çözün; köpürtmeyin." },
    { tip: "ekle", baslik: "4) Köpük Kesici", ekle: ["Köpük Kesici"], not: "Köpüğü bastırır." },
    { tip: "bilgi", baslik: "Soğumayı bekle", not: "Çözeltinin oda sıcaklığına inmesini bekleyin (elle kazanın dışına dokunarak ya da termometreyle). Hipoklorit sıcakta bozulur." },
    { tip: "ekle", baslik: "5) Hipoklorit", ekle: ["Hipoklorit %16"], sureDk: 15, not: "Yavaşça ekleyip NAZİKÇE karıştırın; sıçratmayın." },
    { tip: "olcum", baslik: "Aktif Klor, pH & Kıvam Kontrol", not: "Değerleri ölçüp Kalite Kontrol defterine kaydedin." },
    { tip: "dolum", baslik: "Dolum", not: "Işık geçirmeyen bidonlara doldurun, parti etiketi basın." },
  ],
  // Çamaşır suyu — GÜVENLİK kritik
  "camasir-suyu": [
    { tip: "bilgi", baslik: "⚠️ KRİTİK GÜVENLİK", not: "Hipokloriti ASLA asit/tuz ruhu/kireç çözücü ile karıştırmayın — zehirli klor gazı çıkar! Çok iyi havalandırın, maske/gözlük takın." },
    { tip: "ekle", baslik: "1) Su", ekle: ["Su"], not: "Kazana suyu alın." },
    { tip: "ekle", baslik: "2) Hipoklorit", ekle: ["Hipoklorit %16"], sureDk: 15, not: "Yavaşça ekleyip NAZİKÇE karıştırın (köpürtmeyin, sıçratmayın)." },
    { tip: "olcum", baslik: "Aktif Klor & pH Kontrol", not: "Aktif klor oranını ve pH'ı kontrol edip kaydedin." },
    { tip: "dolum", baslik: "Dolum", not: "Işıktan korunan opak bidonlara doldurun, etiketleyin." },
  ],
};

// ── Katı sabun (sabunlaşma) prosesi — kategoriye göre ─────────
function katiSabunProses(urun: Urun): ProsesAdim[] {
  const yaglar = urun.ings.map(([ad]) => ad).filter((a) => a === "Zeytinyağı" || a === "Defne Yağı");
  return [
    { tip: "ekle", baslik: "1) Kostik çözeltisi — Su", ekle: ["Su"], not: "Kostik çözeltisi için suyu (soğuk) hazırlayın." },
    { tip: "ekle", baslik: "2) Kostik ekle", ekle: ["Kostik"], not: "⚠️ Kostiği SUYA ekleyin (asla suyu kostiğe değil!). Çözelti ısınır; havalandırın ve ≈40 °C'ye soğumaya bırakın." },
    { tip: "ekle", baslik: "3) Yağları hazırla", ekle: yaglar, not: "Yağları ≈40 °C'ye ısıtın." },
    { tip: "karistir", baslik: "4) Birleştir & iz al", sureDk: 20, not: "Kostik çözeltisini yağlara yavaşça ekleyip 'iz' (trace) alana kadar karıştırın." },
    ...(urun.id.includes("sicak")
      ? [{ tip: "karistir" as const, baslik: "5) Pişirme", sureDk: 90, not: "Karışımı düşük ateşte / su banyosunda pişirin; ara ara karıştırın. Vazelin gibi yarı saydam olunca hazırdır.", dikkat: ["Kabı yarıdan fazla doldurmayın; pişerken kabarabilir.", "Başından ayrılmayın; ateş yüksekse karışım taşar."] }]
      : []),
    { tip: "dolum", baslik: urun.id.includes("sicak") ? "6) Kalıpla & kurut" : "5) Kalıpla & kürlen", not: urun.id.includes("sicak")
      ? "Sıcak karışımı kalıplara bastırarak doldurun; 24 saat sonra kesin, birkaç hafta kurumaya bırakın. Parti etiketi basın."
      : "Kalıplara dökün; 24–48 saat dinlendirin, sonra 4–6 hafta kürlenmeye bırakın. Parti etiketi basın.",
      dikkat: ["Kalıbı sarsmadan, sıcak/soğuk hava akımından uzak bir yere koyun; üstünü örtün.", "Kesme zamanında eldiven takın; taze sabun hâlâ yakıcıdır."] },
    { tip: "olcum", baslik: "Kür Sonu Kontrol", not: "Kür sonunda pH'ı ölçün, sertlik ve görünüme bakın; Kalite Kontrol defterine kaydedin." },
  ];
}

// ── Genel (rol tabanlı) proses üretici ────────────────────────
function genericProses(urun: Urun): ProsesAdim[] {
  const steps: ProsesAdim[] = [];
  const safSu = SAF_SU.has(urun.id);
  const gruplar = new Map<number, string[]>();
  urun.ings.forEach(([ad]) => {
    const s = rolSira(ad);
    if (!gruplar.has(s)) gruplar.set(s, []);
    gruplar.get(s)!.push(ad);
  });
  const sirali = [...gruplar.keys()].sort((a, b) => a - b);
  let pHyapildi = false;
  for (const s of sirali) {
    const ad = gruplar.get(s)!;
    if (s === 0) {
      steps.push({ tip: "ekle", baslik: "Su", ekle: ad, safSu, not: safSu ? "Saf/deiyonize su kullanın." : "Kazana suyu alın." });
    } else if (s === 9) {
      steps.push({ tip: "ekle", baslik: "Kıvam — Tuz", ekle: ad, sureDk: 30, not: "🧂 Yavaş yavaş ekleyin; kıvamı (viskozite) tuz verir." });
    } else {
      const ipuc = ad.map((a) => HM_ROL[a]).filter(Boolean).join(" · ");
      steps.push({ tip: "ekle", baslik: ad.join(" + "), ekle: ad, sureDk: s <= 3 ? 15 : undefined, not: ipuc });
      const phVar = ad.some((a) => ["Kostik", "Sıvı Kostik", "TEA", "Sitrik Asit", "Fosforik Asit"].includes(a));
      if (phVar && !pHyapildi) { steps.push({ tip: "olcum", baslik: "pH Kontrol", not: "pH'ı ölçüp hedefe ayarlayın." }); pHyapildi = true; }
    }
  }
  const kivamli = urun.ings.some(([a]) => a === "Tuz" || a === "SLES");
  steps.push({ tip: "olcum", baslik: kivamli ? "pH & Viskozite Kontrol" : "Son Kontrol (pH / görünüm)", not: "Değerleri Kalite Kontrol defterine kaydedin." });
  steps.push({ tip: "dolum", baslik: "Dolum & Etiketleme", not: "Uygunsa bidonlara doldurup parti etiketi basın." });
  return steps;
}

// ── Dışa açık: ürünün prosesini döndür ────────────────────────
export function prosesUret(urun: Urun): ProsesAdim[] {
  if (OZEL[urun.id]) return OZEL[urun.id];
  if (urun.kat === "Katı Sabun") return katiSabunProses(urun);
  return genericProses(urun);
}
