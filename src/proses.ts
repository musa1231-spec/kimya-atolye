import type { Urun } from "./types";
import { kaynatmaMi, KAYNATMA_VERIM, KOSTIK_COZME, KABARTMA_SAYISI, HALEP_OLGUNLASMA, KATI_EKIPMAN,KAP_VARSAYILAN_KG, KAP_DOLULUK, KENAR_PAYI_CM, sicakMi, superyag, kalipBekleme, kurHafta } from "./katiSabun";

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
  liste?: string[];       // sırayla yapılacak alt işler (numaralı liste)
  kati?: "kap" | "kalip" | "kesim";   // katı sabun: Asistan bu adımda hesaplı planı gösterir
  rol?: Record<string, string>;        // bu adımda ham maddenin görevi (HM_ROL yerine; ör. tuzlamada tuz)
  hmRehberAtla?: boolean;              // ham madde rehberi (HM_REHBER) bu adıma uymuyor → gösterilmez
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
  if (["Kostik", "Sıvı Kostik"].includes(ad)) return 4;     // nötralizasyon
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
      dikkat: ["pH 6'ya yaklaşınca ilaveleri küçültün (900 kg'da birkaç yüz gram, 4 kg'da birkaç damla); bu bölgede pH çok hızlı yükselir. Çok az fazla kostik bile pH'ı 10'un üstüne çıkarır."] },
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
// Atölye ekipmanı: tüp ocağı + 8 kg'lık kap, tahta karıştırıcı, tahta kalıp,
// tahta düzleştirici, mala (katiSabun.ts). Miktar/kalıp/kesim sayıları Asistan'da hesaplanır.
function katiSabunProses(urun: Urun): ProsesAdim[] {
  const yaglar = urun.ings.map(([ad]) => ad).filter((a) => a === "Zeytinyağı" || a === "Defne Yağı");
  const sicak = sicakMi(urun);
  const defneli = yaglar.includes("Defne Yağı");
  const sy = superyag(urun).toLocaleString("tr-TR", { maximumFractionDigits: 1 });
  const bekle = kalipBekleme(urun);
  return [
    { tip: "bilgi", baslik: `Ekipman ve tüp hazırlığı`, kati: "kap",
      not: `Bu sabun 900 kg'lık kazanda değil, tüp ocağı üzerinde ${KAP_VARSAYILAN_KG} kg'lık kapta yapılır. Bütün su, kostik ve yağ TEK PARTİDE, aynı kapta işlenir; miktar kaba sığmıyorsa Asistan uygun kabı önerir.`,
      dikkat: [...KATI_EKIPMAN,
        "Ocağın başında her an bir öğrenci bulunur; ocak yanarken kimse oradan ayrılmaz. Yanında yangın tüpü hazır olur.",
        "Kabın, karıştırıcının ve kalıbın kuru olduğundan emin olun; su damlası kızgın yağa düşerse sıçratır."] },
    { tip: "bilgi", baslik: `Tahta kalıbı hazırla (karıştırmadan ÖNCE)`, kati: "kalip",
      not: "İz alındığında sabun hemen kalıba dökülmelidir; o anda kalıp hazırlamaya vakit yoktur. Bu yüzden kalıp en baştan hazırlanır.",
      liste: [
        "Kalıbın içini temiz ve kuru bir bezle silin.",
        "Yağlı kâğıdı (ya da kalın naylonu) kalıbın tabanına ve kenarlarına serin; köşeleri katlayarak kâğıdı kalıba oturtun, kenarlardan 3–4 cm taşırın (sonra tutup çekmek için).",
        "Kâğıt olmazsa kalıbın içi ince bir kat zeytinyağıyla yağlanır; ama kâğıtla çıkarmak çok daha kolaydır.",
        "Kalıbı, sabun kesilene kadar KIMILDATILMAYACAK düz bir zemine (raf/tezgâh) koyun; eğik zeminde sabunun bir yanı kalın, öbür yanı ince olur.",
        "Kalıbın yanına tahta düzleştiriciyi, malayı ve üstünü örtmek için kartonu hazır koyun.",
      ] },
    { tip: "ekle", baslik: `Kostik çözeltisi — Su`, ekle: ["Su"],
      not: "Suyu, kostik için ayrılmış plastik (PP) ya da paslanmaz kaba tartın. Soğuk su kullanın; saf su tercih edilir (musluk suyundaki kireç sabunu bulandırır).",
      dikkat: ["Kostik kabı TÜPE KONMAZ: kostik suda çözünürken kendisi ısınır (≈80–90 °C), ayrıca ısıtmak taşmaya yol açar."] },
    { tip: "ekle", baslik: `Kostiği suya ekle`, ekle: ["Kostik"],
      not: `⚠️ ${KOSTIK_COZME} Ayrı çubukla (tahta karıştırıcıyla değil) kostik tamamen çözünene kadar durmadan karıştırın. Bu iş açık pencerenin önünde yapılır; gözlük burada takılır (ihtiyaç hâli).`,
      dikkat: ["Kostik tek seferde girdiği için çözelti hızla ısınır (≈80–90 °C): kabı sağlam bir zemine koyun, döktükten sonra hemen karıştırmaya başlayın; karıştırılmazsa kostik dipte topaklanıp kabuk bağlar.",
        "Kabın dibinde çözünmemiş kostik tanesi kalmadığını kontrol edin; çözelti berraklaşınca çözünme tamamdır.","Çözeltiden yükselen buharı koklamayın, yüzünüzü kabın üstüne eğmeyin.", sicak ? "Çözeltiyi kenara koyup ≈50 °C'ye kadar soğumasını bekleyin; bu sürede yağı ısıtın." : "Çözeltiyi kenara koyup ≈40–45 °C'ye soğumaya bırakın (≈45–60 dk). Bu sürede yağı hazırlayın.", "Kostik çözeltisi tüpün ya da yağ kabının yanında DEVRİLMEYECEĞİ bir yerde durur."] },
    { tip: "ekle", baslik: `Yağları ${KAP_VARSAYILAN_KG} kg'lık kaba tart ve tüpte ${sicak ? "ısıt" : "ılıt"}`, ekle: yaglar,
      not: `Yağları sabun kabına tartın, tüpü EN KISIK ateşte yakıp yağı tahta karıştırıcıyla karıştırarak ${sicak ? "≈50–60 °C'ye ısıtın" : "≈40–45 °C'ye ılıtın"}, sonra ATEŞİ KAPATIN.${defneli ? " Defne yağı en son eklenir; kokusu ısıyla uçtuğu için aşırı ısıtılmaz." : ""}`,
      dikkat: ["Termometreyi kabın ortasına, dibe değdirmeden tutun.", sicak ? "Yağı kızdırmayın (70 °C'yi geçmesin); çok sıcak yağa kostik eklenince köpürüp taşar." : "Yağ 50 °C'yi geçerse ocaktan alıp soğumasını bekleyin; sıcak yağla iz çok hızlı ve düzensiz oluşur."] },
    { tip: "karistir", baslik: `Kostik çözeltisini ${sicak ? "ısınan " : ""}yağa yavaşça ekle`, sureDk: 5,
      not: (sicak ? "Kostik çözeltisi ısınmış yağa eklenir." : "Kostik çözeltisi ile yağ aynı sıcaklıkta (≈40–45 °C) olmalı.") + " Ateş KAPALI iken çözeltiyi YAVAŞÇA, ince bir akışla, tahta karıştırıcının üstünden süzdürerek yağa dökün; bu sırada başka bir öğrenci tahta karıştırıcıyla sürekli karıştırır.",
      dikkat: ["Çözeltiyi yüksekten dökmeyin; sıçrar.", "Bütün çözelti bitene kadar karıştırma durmaz."] },
    sicak
      ? { tip: "karistir", baslik: `Tahta karıştırıcıyla karıştır (hafif iz)`, sureDk: 20,
        not: "Karışım tahta karıştırıcıyla, ince muhallebi kıvamına (hafif iz) gelene dek karıştırılır. Sabunlaşmayı asıl tüpteki kabartmalar tamamlar; burada tam iz beklenmez.",
        liste: [
          "Tahta karıştırıcıyı kabın dibine değdirerek ve kenarları sıyırarak, \"8\" çizer gibi düzenli karıştırın; çırpmayın.",
          "Hafif iz testi: karıştırıcıdan damlayan sabun yüzeyde bir an iz bırakıyorsa yeterlidir.",
        ] }
      : { tip: "karistir", baslik: `Tahta karıştırıcıyla iz al`, sureDk: 60,
        not: "Elle karıştırma uzun sürer (zeytinyağı geç iz verir); öğrenciler sırayla karıştırır. Karışım muhallebi kıvamına gelip \"iz\" alınca hemen kalıba geçilir.",
        liste: [
          "Tahta karıştırıcıyı kabın dibine değdirerek ve kenarları sıyırarak, \"8\" çizer gibi düzenli karıştırın; çırpmayın (hava kabarcığı olur).",
          "5 dakika karıştırın, 5 dakika dinlendirin; bu döngüyü sürdürün. Dinlenmede sabunlaşma yine devam eder.",
          "İz testi: karıştırıcıyı kaldırıp sabunu yüzeye damlatın. Damla yüzeyde bir an iz bırakıp hemen kaybolmuyorsa İZ ALINDI.",
          "Su gibi akıyorsa iz yoktur, karıştırmaya devam. Çok koyulaşıp topaklanıyorsa beklemeden kalıba geçin.",
        ] },
    ...(sicak ? [{ tip: "karistir" as const, baslik: `Tüpte ${KABARTMA_SAYISI} kez kabart ve karıştır`, sureDk: 60,
      not: `Sabun tüpte EN KISIK ateşte ısıtılır; ısındıkça kabarır (yükselir, köpürür). Kabarınca tahta karıştırıcıyla karıştırılarak indirilir. Bu ${KABARTMA_SAYISI} KEZ yapılır. Süre değil, kıvam esastır.`,
      liste: [
        "Tüpü EN KISIK ateşte yakın; sabunu ara ara tahta karıştırıcıyla dipten kazıyarak karıştırın (dip tutmasın).",
        "1. KABARMA: Sabun kabarıp yükselmeye başlayınca, kabın ağzına ulaşmadan ateşi kısın ya da kapatın; tahta karıştırıcıyla dipten karıştırarak sabunu indirin.",
        "Ateşi yeniden en kısığa alın; sabunu ısıtmaya devam edin.",
        "2. KABARMA: Sabun yeniden kabarınca aynı şekilde ateşi kısıp karıştırarak indirin.",
        "İkinci kabartmadan sonra sabun koyu, parlak, VAZELİN GİBİ YARI SAYDAM bir hamur olur.",
        "Hazır olma testi: bir parça alın, soğutup üstüne 1 damla fenolftalein damlatın. Renksiz ya da çok soluk pembe ise hazırdır; koyu pembe olursa bir kez daha kabartın.",
        "Hazır olunca ateşi KAPATIN ve tüp vanasını kapatın; sabun bekletilmeden kalıba alınır.",
      ],
      dikkat: [`Kap en fazla yarıya kadar doldurulur (%${Math.round(KAP_DOLULUK.sicak * 100)}); kabarırken sabun yükselir, dolu kap taşar.`, "Ocağın başından ayrılmayın; kabarma hızlıdır, birkaç saniyede taşabilir.", "Sıcak sabun ciddi yanık yapar: uzun kollu önlük ve eldiven; yüzünüzü kabın üstüne eğmeyin.",
        ...(defneli ? ["Defne yağının kokusu ısıyla uçar; ateşi en kısıkta tutun, gereğinden uzun pişirmeyin."] : [])] }] : []),
    { tip: "bilgi", baslik: `Kalıba dök ve tahta düzleştiriciyle düzle`,
      not: sicak ? "Pişmiş sabun koyu bir hamurdur, dökülmez; malayla kalıba aktarılıp bastırılır." : "İz alan sabun hemen kalıba dökülür; beklerse kapta katılaşır.",
      liste: sicak ? [
        "Sabunu malayla kalıba aktarın; her malayı bir öncekine BASTIRARAK yerleştirin ki arada hava boşluğu kalmasın.",
        "Kabı malayla iyice sıyırın.",
        "Kalıbı birkaç kez tezgâha hafifçe vurun; boşluklar dolsun.",
        "Tahta düzleştiriciyi kalıbın iki kenarına dayayıp bastırarak tek yönde çekin; üst yüzey düz ve sıkı olsun.",
        "Üstünü karton ya da gazeteyle örtün.",
      ] : [
        "Sabunu kalıbın ortasına yavaş ve alçaktan dökün; kendiliğinden yayılsın.",
        "Kapta kalan sabunu malayla sıyırıp kalıba alın.",
        "Kalıbı 2–3 kez tezgâha hafifçe vurun; içerideki hava kabarcıkları yüzeye çıksın.",
        "Tahta düzleştiriciyi kalıbın iki kenarına dayayıp TEK YÖNDE, yavaşça çekin; fazlası öne toplanır, malayla alınır. Üst yüzey düz olursa kalıp sabunların hepsi aynı kalınlıkta olur.",
        "Kalıbın üstünü karton ya da gazeteyle örtün (yüzeyde beyaz soda külü oluşmasını azaltır) ve sarsmayın.",
      ],
      dikkat: ["Sabun bu hâlde hâlâ YAKICIDIR; eldivensiz dokunulmaz.", "Kabı, karıştırıcıyı ve malayı hemen sıcak suyla yıkamayın; sabun kalıntısını önce malayla sıyırın, 1 gün bekletip sabunlaşınca yıkayın (taze kostikle temas azalır)."] },
    { tip: "bilgi", baslik: `Kalıpta beklet (${bekle} saat)`,
      not: `Sabun kalıpta ${bekle} saat bekler. Kesim zamanı: parmakla bastırınca iz kalmayan, KAŞAR PEYNİRİ sertliğinde. Hâlâ yumuşaksa ve parmağa yapışıyorsa 12–24 saat daha bekleyin; çok beklenirse sertleşir, kesmesi zorlaşır ve kırılır.`,
      dikkat: ["Kalıp sıcak sobanın yanına ya da cereyana konmaz.", "Bu sürede kalıp yerinden oynatılmaz."] },
    { tip: "bilgi", baslik: `Kalıptan çıkar ve kes`, kati: "kesim",
      not: "Kesim eldivenle yapılır. Ölçüler bu partiye göre aşağıda hesaplandı.",
      liste: [
        "Kenarlardan taşan yağlı kâğıdı tutup sabun bloğunu kalıptan dikkatle yukarı çekin; kalıbın kenar tahtaları sökülebiliyorsa önce onları açın. Kâğıdı bloktan soyun.",
        "Bloğu temiz, düz bir tahtanın üstüne koyun.",
        `Bloğun dört kenarından ${KENAR_PAYI_CM.toLocaleString("tr-TR")}'er cm traşlayın: kenarlar eğri ve kâğıt izlidir. Traş artıkları ayrı bir kaba alınır, atılmaz: yeniden eritme yöntemiyle (Rehber › Katı Sabun › Yöntem 7) tekrar kalıplanır.`,
        "Cetvelle uzun kenar boyunca, aşağıda yazan aralıklarla işaret koyun; işaretleri malanın ucuyla sabunun üstüne hafifçe çizin. Aynısını kısa kenar için de yapın.",
        "Önce ŞERİTLERİ kesin: malayı (ya da uzun düz bıçağı) çizginin üstüne DİK tutun ve tek hamlede, iki elle aşağı BASTIRARAK kesin. Testere gibi ileri geri sürtmeyin; kesim yüzü pürüzlü olur.",
        "Şeritleri birer birer yatırıp aynı şekilde KALIP SABUNLARA kesin.",
        "Her kesimden sonra malanın ağzını nemli bezle silin; yapışan sabun bir sonraki kesimi bozar.",
        "Kesilen sabunları tartın; birkaçının ağırlığını Kalite Kontrol için not edin.",
      ],
      dikkat: ["Kesim sırasında sabun ufalanıyorsa çok beklenmiştir; kalan bloğu biraz ılık bir yerde bekletip yumuşatın.", "Mala keskin değildir ama iki elle bastırırken parmaklarınızı kesim çizgisinden uzak tutun."] },
    { tip: "bilgi", baslik: `Kürlemeye diz (en az ${kurHafta(urun)} hafta)`,
      not: `Kesilen sabunlar en az ${kurHafta(urun)} hafta kürlenir; kür bitmeden sabun kullanılmaz, satılmaz. Bu sürede sabunlaşma tamamlanır, su uçar, sabun sertleşir ve cilde yumuşak gelir (tahriş etmez).${HALEP_OLGUNLASMA[urun.id] ? ` Bu en az süredir; Halep sabunu ideal olarak ${HALEP_OLGUNLASMA[urun.id]} olgunlaştırılır — kür uzadıkça sertleşir, rengi yeşilden sarı-kahverengiye döner ve kalitesi artar.` : ""}`,
      liste: [
        "Sabunları tahta raf ya da ızgara üstüne, aralarında BİR PARMAK boşluk kalacak şekilde dizin; birbirine değmesin.",
        "Raf havadar, gölge ve kuru olmalı; güneş ve nem sabunu bozar.",
        "Her hafta sabunları çevirin; her yüzü havayla temas etsin.",
        "Raf etiketine ürün adı, parti numarası ve kesim tarihini yazın.",
        "Kür bitti mi? Aynı 3 sabunu her hafta tartın: ağırlık artık düşmüyorsa kür tamamdır.",
      ] },
    { tip: "olcum", baslik: "Kür Sonu Kontrol",
      not: `Kür sonunda pH'ı ölçün (ıslatılmış yüzeye pH kâğıdı; hedef 9–10), sertlik ve görünüme bakın; Kalite Kontrol defterine kaydedin. Bu reçete ≈%${sy} fazla yağ (süperyağ) bırakır: kostiğin tamamı sabuna dönüşür, sabun cildi kurutmaz.` },
  ];
}

// ── Kaynatma ve tuzlama (tam kaynatma) — dip yağı / kalitesiz zeytinyağı için ──
// Sıcak proses adımlarının üstüne: dip yağını hazırlama, kaynatma, tuzla ayırma, alt suyu atma,
// (gerekirse) yıkama ve son kaynatma. Fazla kostik, kir, renk ve koku alt suyla atılır.
function kaynatmaProses(urun: Urun): ProsesAdim[] {
  const temel = katiSabunProses(urun);
  const ad = (bas: string) => temel.findIndex((a) => a.baslik.startsWith(bas));
  const yagHazir: ProsesAdim = { tip: "bilgi", baslik: "Dip yağını hazırla (bir gün önceden)",
    not: "Bidonun dibinde kalan siyahlaşmış yağda tortu, su, çamur ve bozulmuş yağ (serbest yağ asidi) vardır. Önce temizlenir; tortu sabuna girerse sabun kirli, kokulu ve yumuşak olur.",
    liste: [
      "Yağı sabun kabına alıp tüpte EN KISIK ateşte ≈60 °C'ye ısıtın (akışkanlaşsın, tortu çöksün); ateşi kapatın.",
      "Kabın kapağını kapatıp bir gece DİNLENDİRİN; tortu ve su dibe çöker.",
      "Ertesi gün yağı üstten, dipteki çamuru karıştırmadan kepçeyle başka kaba alın; dipteki tortu ATILIR (öğretmene sorulur).",
      "Yağı tülbent ya da eski temiz bir bezden süzün; içinde parça kalmasın.",
      "Süzülmüş yağı TARTIN: Asistan'a bu miktarı \"yağ miktarına göre\" girin; su, kostik ve tuz buna göre hesaplanır.",
    ],
    dikkat: ["Bozulmuş yağ kostikle çok hızlı tepkir: kostik çözeltisi yağa yine YAVAŞÇA eklenir.", "Tortu, su ve rengin bir kısmı alt suyla gider; ama acı/ekşi kokan, iyice bozulmuş yağdan güzel kokulu tuvalet sabunu beklenmez — böyle sabun temizlik/çamaşır sabunu olarak değerlendirilir."] };
  const kaynat: ProsesAdim = { tip: "karistir", baslik: "Tüpte kaynat (sabunlaşma)", sureDk: 120,
    not: "Karışım tüpte EN KISIK ateşte, hafifçe fokurdayarak kaynatılır. Bu yöntemde su boldur; sabun koyu hamur değil, sulu bir lapa hâlindedir.",
    liste: [
      "15–20 dakikada bir tahta karıştırıcıyla dipten kazıyarak karıştırın.",
      "Su buharlaşıp karışım koyulaşırsa, kaybolan kadar SICAK su ekleyin (soğuk su kabı çatlatabilir, kaynamayı keser).",
      "Kabarırsa ateşi kısıp karıştırarak indirin.",
      "Sabunlaşma testi: bir kaşık karışımı bir bardak sıcak suya atın. Yüzeyde YAĞ DAMLASI kalmadan berrak/hafif bulanık çözünüyorsa sabunlaşma tamamdır; yağ damlası görülürse kaynatmaya devam.",
      "Fenolftalein bu aşamada KOYU PEMBE olur; normaldir (kostik bilerek fazla konur, tuzlamada atılır).",
    ],
    dikkat: ["Kap en fazla yarıya kadar doldurulur; kaynarken köpürür.", "Ocağın başından ayrılmayın.", "Kaynayan kostikli su ciddi yanık yapar: uzun kollu önlük, eldiven; yüzünüzü kabın üstüne eğmeyin."] };
  const tuzla: ProsesAdim = { tip: "ekle", baslik: "Tuzla ayır (tuzlama)", ekle: ["Tuz"], hmRehberAtla: true,
    rol: { Tuz: "🧂 Sabunu sudan AYIRIR — sabun üste toplanır; fazla kostik, gliserin, kir, renk ve koku alttaki suda kalır" },
    not: "Ateş EN KISIKTA, karışım sıcakken tuz serpe serpe eklenir ve tahta karıştırıcıyla karıştırılır. Tuz, sabunu çözeltiden ayırır.",
    liste: [
      "Tuzu bir avuç bir avuç serpin, her avuçtan sonra 1–2 dakika karıştırın.",
      "Sabun, lor peyniri gibi pütür pütür TANECİKLERE ayrılınca ve kabın kenarından alınan karışımda tanecikler ile ALTTA AYRI BİR SIVI görülünce TUZ YETMİŞTİR; kalan tuzu koymayın.",
      "Reçetedeki tuz üst sınırdır; ayrışma erken olursa azı yeter.",
      "Ateşi kapatın.",
    ],
    dikkat: ["Tuz eklerken sıçrama olabilir; elinizi kabın üstünde tutmayın.", "Ayrışma görülmeden kalıba geçilmez; ayrılmamış sabun kostiklidir ve yakar."] };
  const altSu: ProsesAdim = { tip: "bilgi", baslik: "Dinlendir ve alt suyu ayır",
    not: "Sabun üstte toplanıp soğuyunca katılaşır; alttaki koyu renkli tuzlu su (ALT SU) ayrılıp atılır. Kirin, rengin ve fazla kostiğin çoğu bu suyla gider.",
    liste: [
      "Kabın kapağını kapatıp bir gece dinlendirin; sabun üstte bir KEK gibi katılaşır.",
      "Malayı kabın kenarından dolaştırıp sabun kekini kenarlardan ayırın.",
      "Sabun kekini malayla kaldırıp temiz bir tahtanın üstüne alın; altındaki yumuşak, kirli tabakayı malayla kazıyıp ayırın.",
      "Kapta kalan ALT SUYU, öğretmenin gösterdiği yere, bol su akıtarak dökün.",
    ],
    dikkat: ["⚠️ Alt su KOSTİKLİDİR (yakıcı): eldivenle çalışın, sıçratmayın, gözünüzü koruyun.", "Alt su lavaboya dökülecekse musluk açık bırakılıp bolca suyla seyreltilir."] };
  const yika: ProsesAdim = { tip: "bilgi", baslik: "Yıkama — dip yağında 1 kez daha",
    not: "Dip yağı ya da çok koyu yağ kullanıldıysa sabun bir kez yıkanır: renk ve koku belirgin açılır. Temiz yağda bu adım atlanabilir.",
    liste: [
      "Sabun kekini parçalayıp kaba geri alın, sabunun yaklaşık YARISI kadar su ekleyin.",
      "Tüpte en kısık ateşte karıştırarak eritin ve 15–20 dakika hafifçe kaynatın.",
      "Öğretmenden alınan biraz tuzu serperek sabunu yeniden taneciklere ayırın (ilk tuzlamadaki gibi; reçetedeki tuzun dışındadır).",
      "Bir gece dinlendirin; kekini kaldırıp alt suyu yine ayırın.",
    ] };
  const son: ProsesAdim = { tip: "karistir", baslik: "Son kaynatma (düzeltme)", sureDk: 30,
    not: "Sabun keki kaba alınıp az suyla eritilir; pürüzsüz, parlak, kıvamlı bir hamura getirilip kalıba hazırlanır.",
    liste: [
      "Sabun kekini parçalayıp kaba alın, sabunun ≈%10'u kadar su ekleyin.",
      "Tüpte en kısık ateşte, tahta karıştırıcıyla karıştırarak eritin; topak kalmasın.",
      "Fenolftalein testi: soluk pembe olmalı. Koyu pembe ise az su ekleyip biraz daha kaynatın ya da yıkamayı tekrarlayın.",
      "Pürüzsüz ve parlak olunca ateşi ve tüp vanasını kapatın; sabun sıcakken kalıba alınır.",
    ],
    dikkat: [`Kalıba giren sabun yağın ≈${KAYNATMA_VERIM.toLocaleString("tr-TR")} katı kadardır (alt su atıldığı için reçete toplamından azdır).`] };
  const iz = ad("Tahta karıştırıcıyla karıştır"), kabart = ad("Tüpte "), kalip = ad("Tahta kalıbı");
  const sonuc = [...temel];
  sonuc.splice(iz, kabart - iz + 1, { ...temel[iz], baslik: "Tahta karıştırıcıyla karıştır", sureDk: 10,
    not: "Çözelti eklendikten sonra 10 dakika tahta karıştırıcıyla karıştırın; iz beklenmez (sulu karışımdır, sabunlaşma kaynatmada olur).", liste: undefined },
    kaynat, tuzla, altSu, yika, son);
  sonuc.splice(kalip, 0, yagHazir);   // bir gün önceden: ekipmandan hemen sonra
  return sonuc;
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
      const phVar = ad.some((a) => ["Kostik", "Sıvı Kostik", "Sitrik Asit", "Fosforik Asit"].includes(a));
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
  if (kaynatmaMi(urun)) return kaynatmaProses(urun);
  if (urun.kat === "Katı Sabun") return katiSabunProses(urun);
  return genericProses(urun);
}
