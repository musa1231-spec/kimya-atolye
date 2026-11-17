// ════════════════════════════════════════════════════════════════
// ATÖLYE VE ÜRETİM DÜZENİ — TEK KAYNAK
// Kazanlar, öğrenci rolleri ve kurallar burada tanımlanır.
// "Atölye Düzeni" sayfası, öğrenci PDF'i ve Üretim Asistanı buradan okur.
// (DOM yok → scripts/rehber-kontrol.ts içinde test edilir.)
// ════════════════════════════════════════════════════════════════
import { URUNLER } from "./constants";

// ── Kazanlar (atölyede 4 kazan, her biri 900 kg) ─────────────────
// İki kazan YÜKSEK (viskoz ürünler), ikisi ALÇAK (akışkan ürünler).
// Musa Hocam, 17 Kas 2026: 3 ve 4 numaralı kazanlar YÜKSEK.
export type KazanTip = "yuksek" | "alcak";
export interface Kazan { no: string; kapasiteKg: number; tip: KazanTip }
export const KAZANLAR: Kazan[] = [
  { no: "K1", kapasiteKg: 900, tip: "alcak" },
  { no: "K2", kapasiteKg: 900, tip: "alcak" },
  { no: "K3", kapasiteKg: 900, tip: "yuksek" },
  { no: "K4", kapasiteKg: 900, tip: "yuksek" },
];
export const KAZAN_TIP_AD: Record<KazanTip, string> = { yuksek: "Yüksek kazan · viskoz ürünler", alcak: "Alçak kazan · akışkan ürünler" };

// ── Viskozite sınıfı: hangi ürün hangi tip kazanda yapılır ───────
// Viskoz (kıvamlı) ürünler YÜKSEK kazanda; akışkan ürünler ALÇAK kazanda.
// Katı sabunlar kazanda yapılmaz (2 kg'lık tencere işi).
export const VISKOZ_URUN = new Set(["sivi-sabun", "bulasik", "kivamli-camasir"]);
export const KAZAN_DISI_URUN = new Set(["kastilya-soguk", "kastilya-sicak", "halep-20", "halep-30", "halep-40"]);
export const urunKazanTipi = (urunId: string): KazanTip | null =>
  KAZAN_DISI_URUN.has(urunId) ? null : VISKOZ_URUN.has(urunId) ? "yuksek" : "alcak";
/** Kazan planında seçilebilecek ürünler. */
export const kazanUrunleri = () => URUNLER.filter((u) => !KAZAN_DISI_URUN.has(u.id));

/** Ürün–kazan tipi uyumu: engel (viskoz ürün alçak kazanda / kazan dışı ürün) ya da uyarı. */
export function kazanUyum(kazanNo: string, urunId: string): { engel: string; uyari: string } {
  const k = KAZANLAR.find((x) => x.no === kazanNo);
  const u = URUNLER.find((x) => x.id === urunId);
  if (!k || !u) return { engel: "", uyari: "" };
  const t = urunKazanTipi(urunId);
  if (t === null) return { engel: `${u.ad} kazanda yapılmaz (küçük partiyle tencerede yapılır).`, uyari: "" };
  if (t === "yuksek" && k.tip === "alcak") {
    const yk = KAZANLAR.filter((x) => x.tip === "yuksek").map((x) => x.no).join(" / ");
    return { engel: `${u.ad} viskoz (kıvamlı) bir ürün; YÜKSEK kazanda yapılır (${yk}). ${k.no} alçak kazan.`, uyari: "" };
  }
  if (t === "alcak" && k.tip === "yuksek") {
    const ak = KAZANLAR.filter((x) => x.tip === "alcak").map((x) => x.no).join(" / ");
    return { engel: "", uyari: `${u.ad} akışkan bir ürün; normalde ALÇAK kazanda (${ak}) yapılır. Yüksek kazanlar viskoz ürünler içindir.` };
  }
  return { engel: "", uyari: "" };
}

// ── Ürün aileleri (kazan/ekipman güvenliği için) ─────────────────
// Klorlu ürün ile asitli ürün aynı kova/hortum/huniyle ellenirse ZEHİRLİ KLOR GAZI çıkar.
export type Aile = "klor" | "asit" | "alkol" | "kostik" | "deterjan";
export const URUN_AILE: Record<string, Aile> = {
  "camasir-suyu": "klor", "kivamli-camasir": "klor",
  "wc-banyo": "asit", "tuz-ruhu": "asit", "kirec-coz": "asit",
  dezenfektan: "alkol", kolonya: "alkol",
  "yag-cozucu": "kostik",
  "kastilya-soguk": "kostik", "kastilya-sicak": "kostik",
  "halep-20": "kostik", "halep-30": "kostik", "halep-40": "kostik",
  "sivi-sabun": "deterjan", "kopuk-sabun": "deterjan", "genel-temiz": "deterjan",
  "cam-silici": "deterjan", bulasik: "deterjan",
};
/** Gözlük: üretim boyunca değil, ihtiyaç hâlinde (Musa Hocam, 17 Kas). Kurallar + Asistan güvenlik adımı. */
export const GOZLUK_KURAL = "ihtiyaç hâlinde kullanılır (asit, kostik, LABSA, çamaşır suyu gibi göze sıçrayabilecek maddelerle çalışırken)";
/** Klor–asit kuralı (tek metin: Kurallar, Üretim Rehberi kartları, kazan planı uyarısı). */
export const KLOR_ASIT_KURAL = "Çamaşır suyu (klorlu) ile tuz ruhu, kireç sökücü ve WC temizleyici (asitli) birbirine eklenmez. Karışırsa zehirli gaz çıkar.";
export const AILE_AD: Record<Aile, string> = {
  klor: "☣️ Klorlu", asit: "🧪 Asitli", alkol: "🔥 Alkollü (yanıcı)", kostik: "⚠️ Kostikli (yakıcı)", deterjan: "🫧 Deterjan / sabun",
};

// ── Günlük kazan planı denetimi (ENGEL + uyarı) ──────────────────
export interface KazanPlanSatir { no: string; urunId: string; kg: number }
export interface PlanDenetim { engeller: string[]; uyarilar: string[] }

export function kazanPlaniDenetle(plan: KazanPlanSatir[]): PlanDenetim {
  const engeller: string[] = [], uyarilar: string[] = [];
  const dolu = plan.filter((p) => p.urunId);
  for (const p of dolu) {
    const k = KAZANLAR.find((x) => x.no === p.no);
    const u = URUNLER.find((x) => x.id === p.urunId);
    if (!k) { engeller.push(`${p.no}: böyle bir kazan yok`); continue; }
    if (!u) { engeller.push(`${p.no}: ürün bulunamadı`); continue; }
    if (!(p.kg > 0)) engeller.push(`${k.no} (${u.ad}): miktar girilmedi`);
    if (p.kg > k.kapasiteKg) engeller.push(`${k.no} (${u.ad}): ${p.kg} kg, kazan kapasitesini (${k.kapasiteKg} kg) aşıyor`);
    const uy = kazanUyum(p.no, p.urunId);
    if (uy.engel) engeller.push(`${k.no}: ${uy.engel}`);
    if (uy.uyari) uyarilar.push(`${k.no}: ${uy.uyari}`);
  }
  const aileler = new Set(dolu.map((p) => URUN_AILE[p.urunId]));
  if (aileler.has("klor") && aileler.has("asit"))
    uyarilar.push(`Bugün hem KLORLU hem ASİTLİ ürün var. ${KLOR_ASIT_KURAL}`);
  if (aileler.has("alkol"))
    uyarilar.push("Alkollü ürün var: atölyede ateş, kıvılcım, ısıtıcı yok; kapaklar açık bırakılmaz.");
  return { engeller, uyarilar };
}

/** Asistan için: seçilen kazan + miktar + (varsa) günün planı → engel mesajı ya da "". */
export function asistanKazanEngel(kazanNo: string, urunId: string, kg: number, plan: KazanPlanSatir[] | null): string {
  const k = KAZANLAR.find((x) => x.no === kazanNo);
  if (!k) return "Önce kazanı seçin. Hangi kazanda çalışıldığı bilinmeden üretime başlanmaz.";
  if (kg > k.kapasiteKg) return `${k.no} kazanının kapasitesi ${k.kapasiteKg} kg. ${kg} kg bu kazana sığmaz.`;
  const uy = kazanUyum(kazanNo, urunId);
  if (uy.engel) return uy.engel;
  const p = plan?.find((x) => x.no === kazanNo && x.urunId);
  if (p && p.urunId !== urunId) {
    const ad = URUNLER.find((u) => u.id === p.urunId)?.ad || p.urunId;
    return `Bugünkü planda ${k.no} kazanında «${ad}» yapılıyor. Başka ürün için öğretmen önce Atölye Düzeni'nden planı değiştirmeli.`;
  }
  return "";
}

/** Asistanda saf su adımında gösterilen dinamo uyarısı (KURAL_BOLUMLERI › safsu ile aynı kural). */
export const SAF_SU_DINAMO_UYARI = "Dinamoyu çalıştırmadan önce mavi deponun ALT MUSLUĞUNU ve bu kazanın saf su VANASINI açın. Dinamo çalışırken vanaların hepsi kapalı kalırsa DİNAMO YANAR. Bitince sıra: dinamo → kazan vanası → depo musluğu. Su bitince saf su HORTUMUNU HEMEN KAZANDAN ÇIKARIN: içeride kalırsa sifonla kazandaki karışım mavi saf su deposuna çekilir.";

// ── Öğrenci rolleri ──────────────────────────────────────────────
export interface Rol { id: string; ikon: string; ad: string; kisi: string; gorevler: string[] }
export const ROLLER: Rol[] = [
  { id: "kazan", ikon: "⚖️", ad: "Kazan Sorumlusu", kisi: "1–2 öğrenci", gorevler: [
    "Hammaddeyi tartar ve numaralı kaba koyar. Tartıyı her seferinde sıfırlar.",
    "Kazana HİÇBİR ŞEYİ öğretmen «tamam» demeden dökmez.",
    "Saf su basarken: önce mavi deponun alt musluğu ve kazanın saf su vanası açılır, sonra dinamo çalıştırılır.",
    "Saf su bitince hortumu HEMEN kazandan çıkarır. İçeride kalırsa kazandaki karışım mavi depoya geri çekilir.",
    "Karıştırma sürerken kazanın başından ayrılmaz, süreyi takip eder.",
    "Kazan boşalınca kazanı ve tartıyı yıkar.",
  ] },
  { id: "kontrol", ikon: "✅", ad: "Kontrolcü", kisi: "1 öğrenci", gorevler: [
    "Reçeteden maddeyi ve miktarı yüksek sesle okur: «3 numara, SLES, 50 kg».",
    "Kabın üstündeki adı ve tartıdaki rakamı gözüyle kontrol eder.",
    "Her madde için öğretmeni çağırır; onaydan sonra listede işaretler.",
    "Yükleme bitince listeyi kazan sorumlusuyla birlikte imzalar.",
  ] },
  { id: "dolum", ikon: "🛢️", ad: "Dolum ve Kapak", kisi: "2 öğrenci", gorevler: [
    "Bidonları dolum çizgisine kadar doldurur; ürünü yere döküp israf etmez.",
    "Kapağı sıkar, doldurduğu bidonları sayar.",
  ] },
  { id: "koli", ikon: "📦", ad: "Koli ve Taşıma", kisi: "2 öğrenci", gorevler: [
    "Bidonları koliye yerleştirir, koliyi bantlar.",
    "Kolileri düzgün istifler, depoya taşır.",
    "Yükü dizlerini bükerek kaldırır; ağır yükü iki kişi taşır.",
    "İşi biten boş beklemez, öğretmene «başka iş var mı?» diye sorar.",
  ] },
  { id: "etiket", ikon: "🏷️", ad: "Etiket ve Kayıt", kisi: "2 öğrenci", gorevler: [
    "Doğru etiketi doğru ürüne, düz ve kabarcıksız yapıştırır.",
    "Parti numarasını ve tarihi etikete/koliye yazar.",
    "Bidon ve koli sayısını sayar, öğretmene bildirir.",
  ] },
  { id: "temizlik", ikon: "🧹", ad: "Temizlik ve Düzen Başı", kisi: "1 öğrenci (her üretimde değişir)", gorevler: [
    "Temizlik bölgelerini dağıtır ve bittiğini tek tek kontrol eder.",
    "Soyunma odasının düzenini en son kontrol eder.",
    "Çıkış kontrol listesini öğretmenle birlikte madde madde işaretler.",
    "Herkese 3 eldiven dağıtır; fazlasını isteyeni öğretmene yönlendirir. Çıkan eldivenlerin çöp kovasına atıldığını kontrol eder.",
    "Her şey bitince öğretmene «temizlik tamam» der. Öğretmen onaylamadan kimse çıkmaz.",
  ] },
];

// ── Kurallar ─────────────────────────────────────────────────────
export const ALTIN_KURAL = {
  baslik: "ÖĞRETMENDEN HABERSİZ HİÇBİR KAZANA HİÇBİR HAMMADDE EKLENMEZ",
  maddeler: [
    "Bir damla bile, su bile eklenmez. «Azalmış, ben tamamlarım» denmez.",
    "Kıvam, renk ya da koku düzeltmek de öğretmenin işidir.",
    "Bu kural bozulursa üretim o anda durdurulur.",
  ],
  sira: [
    "Öğretmen maddeyi ve miktarı söyler",
    "Kazan sorumlusu tartar",
    "Kontrolcü okur ve kontrol eder",
    "Öğretmen «tamam» der",
    "Kazana yüklenir",
    "Listede işaretlenir",
  ],
};

const noListe = (t: KazanTip) => KAZANLAR.filter((k) => k.tip === t).map((k) => k.no).join(", ");
const adListe = (viskoz: boolean) => kazanUrunleri().filter((u) => VISKOZ_URUN.has(u.id) === viskoz).map((u) => u.ad.toLocaleLowerCase("tr-TR")).join(", ");

/** Başında "!" olan kural maddesi ÖNEMLİdir: PDF'te kırmızı-kalın, WhatsApp'ta ‼️ ile gösterilir. */
export function maddeAyir(m: string): { onemli: boolean; metin: string } {
  return m.startsWith("!") ? { onemli: true, metin: m.slice(1) } : { onemli: false, metin: m };
}

export interface KuralBolum { id: string; ikon: string; baslik: string; maddeler: string[] }
export const KURAL_BOLUMLERI: KuralBolum[] = [
  { id: "kazan", ikon: "🛢️", baslik: "Kazanlar", maddeler: [
    `Atölyede ${KAZANLAR.length} kazan var: ${KAZANLAR.map((k) => k.no).join(", ")}. Her biri ${KAZANLAR[0].kapasiteKg} kg alır.`,
    `YÜKSEK kazanlarda (${noListe("yuksek")}) viskoz (kıvamlı) ürünler yapılır: ${adListe(true)}.`,
    `ALÇAK kazanlarda (${noListe("alcak")}) akışkan ürünler yapılır: ${adListe(false)}.`,
    "Her kazanın numarası, kazanın arkasındaki kolona yazılıdır. Bugün hangi kazanda ne yapıldığını öğretmenin paylaştığı günün planından (Atölye Düzeni belgesindeki kazan tablosundan) öğren.",
    "Yanlış kazana ya da yanlış madde koyarsan SAKLAMA, hemen öğretmene söyle. Saklanan hata 900 kg ürünü çöpe attırır.",
    KLOR_ASIT_KURAL,
    "Kazan boşalınca yıkanır. Başka ürüne geçmeden önce durulanır.",
  ] },
  { id: "safsu", ikon: "💧", baslik: "Saf Su Sistemi (Cihaz, Mavi Depo, Dinamo)", maddeler: [
    "Saf su cihazı çalışırken cihazın BÜTÜN VANALARI AÇIK olmalıdır.",
    "Saf su, 3 ton kapasiteli MAVİ DEPODA toplanır. Kazanlara saf suyu bu deponun dinamosu basar.",
    "Dinamoyu çalıştırmadan ÖNCE mavi deponun ALT MUSLUĞU açılır.",
    "!Dinamo çalışırken kazanlara giden saf su vanalarından EN AZ BİRİ AÇIK olmalıdır. Hepsi kapalıysa DİNAMO YANAR.",
    "!Kazana saf su eklendikten sonra saf su HORTUMU KAZANIN İÇİNDE BIRAKILMAZ, hemen çıkarılır. Hortum içeride kalırsa SİFONLAMA olur: kazandaki karışım geri akıp MAVİ SAF SU DEPOSUNA çekilir ve bütün saf su bozulur.",
    "Kapatma sırası: önce dinamo kapatılır, sonra kazan vanası, en son mavi deponun alt musluğu kapatılır.",
    "Saf su sistemine yalnızca öğretmenin izniyle ve görevli öğrenci dokunur.",
  ] },
  { id: "dolum", ikon: "🧴", baslik: "Dolum", maddeler: [
    "Bidonlar dolum çizgisine kadar doldurulur. Ürün yere dökülmez, israf edilmez.",
  ] },
  { id: "eldiven", ikon: "🧤", baslik: "Eldiven ve Koruyucu Donanım", maddeler: [
    "Önlük ve eldiven üretimin başında takılır.",
    `Gözlük ${GOZLUK_KURAL}.`,
    "Eldiven YALNIZCA şu durumlarda değiştirilir: SLES, LABSA, kostik ya da asit yükledikten sonra; eldiven yırtılınca; eldiven kirlenince.",
    "Bunun dışında eldiven çıkarılmaz. Sürekli tak-çıkar israftır.",
    "Herkese 3 eldiven verilir. Bunun dışında eldiven gerekirse öğretmenden istenir.",
    "Çıkan eldiven çöp kovasına atılır. Yere, masaya ya da kazanın kenarına atılmaz.",
    "Eldivenle yüze ve göze dokunulmaz.",
  ] },
  { id: "tasima", ikon: "💪", baslik: "Taşıma ve Ağır İş", maddeler: [
    "Taşıma işinde adalet gözetilir: ağır işi hep aynı öğrenciler yapmaz, her üretimde sıra değişir. Bugün taşımayan bir sonraki sefer taşır.",
    "Öğretmen uygun görürse ya da bir öğrenci gönüllü olursa aynı kişiler birden fazla kazanda taşıyabilir.",
    "Yük dizler bükülerek, bel düz tutularak kaldırılır.",
    "Ağır ya da büyük yük iki kişiyle taşınır.",
    "İşini bitiren boş beklemez, öğretmene başka iş olup olmadığını sorar.",
  ] },
  { id: "temizlik", ikon: "🧽", baslik: "Atölye Temizliği", maddeler: [
    "Atölye bölgelere ayrılır: kazanlar, dolum yeri, depo ve koliler, zemin, lavabo.",
    "Her bölge bir öğrenciye verilir. Bölgen temiz değilse sorumlusu sensin.",
    "Temizlik bitmeden kimse üstünü değiştirmez, kimse atölyeden çıkmaz.",
    "Temizliği bitiren, temizlik başına haber verir. Son onayı öğretmen verir.",
  ] },
  { id: "soyunma", ikon: "🚪", baslik: "Soyunma Odası", maddeler: [
    "Herkes kendi askısını ve yerini kullanır.",
    "Kıyafet asılır, ayakkabı yerine konur, çöp çöpe atılır.",
    "Odayı en son temizlik başı kontrol eder. Dağınık bırakılan eşyanın sahibi bellidir.",
  ] },
  { id: "cikis", ikon: "🔒", baslik: "Çıkış Kontrol Listesi (üretim bitince)", maddeler: [
    "Bütün pencereler ve kapılar kapalı.",
    "Duvardaki elektrikli sobalar kapalı.",
    "Havalandırma sistemleri kapalı.",
    "Lambalar kapalı.",
    "Çekpaslar lavabonun yanında.",
    "Dolum hortumları mavi saf su deposunun yanında.",
    "!Saf su hortumu hiçbir kazanın içinde bırakılmamış.",
    "Hammadde kovaları yıkanmış, temiz ve mavi deponun yanında.",
    "Lavabonun yanında beher, kaşık ve benzeri malzeme bırakılmamış; hepsi yıkanıp yerine konmuş.",
    "Eldivenler ve koli bantları şeflik odasına bırakılmış.",
    "Anahtar, pense, tornavida gibi aletler temizlenip takım çantasına konmuş.",
    "Saf su sistemi kapalı: dinamo kapalı, kazan vanaları ve mavi deponun alt musluğu kapalı.",
  ] },
  { id: "davranis", ikon: "🤝", baslik: "Genel Davranış", maddeler: [
    "Atölyede koşulmaz, şaka yapılmaz, yemek yenmez.",
    "Cep telefonları üretim başlamadan şeflik odasına teslim edilir, üretim boyunca orada bekletilir ve üretim bitince öğretmenden geri alınır.",
    "Üretimde görevi olmayan hiç kimse, başka bölümlerin öğrencileri de dahil, üretim atölyesine giremez.",
    "Hata yaptıysan hemen söyle. Hatasını kendisi söyleyen ceza almaz; saklayan alır.",
  ] },
  { id: "puan", ikon: "🏅", baslik: "Değerlendirme", maddeler: [
    "Her üretimden sonra öğretmen herkesi üç başlıkta değerlendirir: görevini yaptı mı, dikkatli miydi (hata, dökülme), düzen ve temizlik. Bu değerlendirme uygulama notunda dikkate alınır.",
    "Katıldığın üretim günleri programdaki Beceri Karnesi'ne işlenir.",
    "Kuralı tekrar tekrar bozan öğrenci bir sonraki üretimde kazan ve dolum görevine alınmaz.",
  ] },
];

// ── WhatsApp grubu için kuralların tam metni (WhatsApp biçimi: *kalın*) ──
export function kurallarMetni(): string {
  const s: string[] = [];
  s.push(`🧪 *KİMYA ÜRETİM ATÖLYESİ*\n*ÜRETİM VE ATÖLYE KURALLARI*`);
  s.push(`⛔ *${ALTIN_KURAL.baslik}* ⛔\n${ALTIN_KURAL.maddeler.map((m) => `• ${m}`).join("\n")}\n\n*Yükleme sırası:*\n${ALTIN_KURAL.sira.map((x, i) => `${i + 1}. ${x}`).join("\n")}`);
  s.push(`👥 *GÖREVLER*\n` + ROLLER.map((r) => `\n${r.ikon} *${r.ad}* (${r.kisi})\n${r.gorevler.map((g) => `• ${g}`).join("\n")}`).join("\n"));
  for (const k of KURAL_BOLUMLERI) {
    const isaret = k.id === "cikis" ? "☐" : "•";
    s.push(`${k.ikon} *${k.baslik.toLocaleUpperCase("tr-TR")}*\n${k.maddeler.map((m) => {
      const { onemli, metin } = maddeAyir(m);
      return onemli ? `${isaret} ‼️ *${metin}*` : `${isaret} ${metin}`;
    }).join("\n")}`);
  }
  s.push(`✍️ Herkes okusun, anlamadığı yeri öğretmenine sorsun.`);
  return s.join("\n\n");
}

// ════════════════════════════════════════════════════════════════
// ⚖️ AĞIR İŞ ADALETİ — kazan başına taşıyıcılar
// Her üretim gününe farklı öğrenci grubu gelir. Geçmiş planlarda kimin kaç kez
// ağır iş (kazan taşıyıcısı ya da Koli ve Taşıma görevi) yaptığı sayılır;
// öneri en az yapanlardan başlar. Öğretmen/gönüllü isterse aynı kişiyi yine yazabilir.
// Planda saklama: roller["tasima-K1"] = "Ali, Veli" · roller["gelenler"] = "…"
// ════════════════════════════════════════════════════════════════
export const TASIMA_ANAHTAR = (kazanNo: string) => `tasima-${kazanNo}`;
export const GELENLER_ANAHTAR = "gelenler";
export const TASIYICI_SAYISI = 2;
/** Ağır iş sayılan roller (taşıyıcı anahtarlarına ek olarak). */
export const AGIR_ROLLER = ["koli"];

/** Ad karşılaştırması: Türkçe küçük harf + boşluk sadeleştirme (İ/i kayması mükerrer saymasın). */
export const adNorm = (s: string) => s.toLocaleLowerCase("tr-TR").replace(/\s+/g, " ").trim();
/** "Ali, Veli ; Ayşe" → ["Ali","Veli","Ayşe"] (tekrarsız, ilk yazılış korunur) */
export function adListesi(s: string | undefined): string[] {
  const goruldu = new Set<string>(), out: string[] = [];
  for (const p of (s || "").split(/[,;\n]+/)) {
    const ad = p.replace(/\s+/g, " ").trim();
    if (ad && !goruldu.has(adNorm(ad))) { goruldu.add(adNorm(ad)); out.push(ad); }
  }
  return out;
}

interface PlanBenzeri { tarih: string; roller: Record<string, string> }
/** Bir plandaki ağır iş yapanlar (bir kişi aynı gün iki kazanda taşıdıysa 2 sayılır). */
export function agirIsYapanlar(p: PlanBenzeri): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(p.roller || {}))
    if (k.startsWith("tasima-") || AGIR_ROLLER.includes(k)) out.push(...adListesi(v));
  return out;
}
/** tarih'ten ÖNCEKİ planlarda kişi başı ağır iş sayısı (anahtar: adNorm). */
export function agirIsSayaci(planlar: PlanBenzeri[], tarih: string): Map<string, number> {
  const m = new Map<string, number>();
  for (const p of planlar) if (p.tarih < tarih) for (const ad of agirIsYapanlar(p)) m.set(adNorm(ad), (m.get(adNorm(ad)) || 0) + 1);
  return m;
}

/**
 * Bugün gelen öğrencileri kazanlara adil dağıtır: her kazan için en az ağır iş yapmış
 * TASIYICI_SAYISI kişi seçilir; seçilenin sayısı artar, böylece aynı gün de yük yayılır.
 * Eşitlikte `karistir` sırası kullanılır (testte sabit, ekranda rastgele).
 * Sabit (öğretmenin elle yazdığı/kilitlediği) kazanlara dokunulmaz ama sayılırlar.
 */
export function adilTasiyiciDagit(
  gelenler: string[], kazanNolar: string[], sayac: Map<string, number>,
  sabit: Record<string, string[]> = {}, karistir: (a: string[]) => string[] = (a) => a,
): Record<string, string[]> {
  const say = new Map(sayac);
  const art = (ad: string) => say.set(adNorm(ad), (say.get(adNorm(ad)) || 0) + 1);
  Object.values(sabit).forEach((l) => l.forEach(art));
  const sonuc: Record<string, string[]> = {};
  const n = Math.min(TASIYICI_SAYISI, gelenler.length);
  for (const no of kazanNolar) {
    if (sabit[no]?.length) { sonuc[no] = sabit[no]; continue; }
    const sira = karistir([...gelenler]).sort((a, b) => (say.get(adNorm(a)) || 0) - (say.get(adNorm(b)) || 0));
    sonuc[no] = sira.slice(0, n);
    sonuc[no].forEach(art);
  }
  return sonuc;
}
