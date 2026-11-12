import type { ProsesAdim, Sorun } from "./proses";

// ════════════════════════════════════════════════════════════════
// ÜRETİM REHBERİ — Asistanın her adımda gösterdiği
//   📋 Dikkat Edilecekler  +  🛠️ Olası Sorunlar ve Çözümleri
// Tek kaynak: ham maddeye göre (HM_REHBER) ve adım türüne göre
// (TIP_REHBER). Ürüne özel ek bilgiler proses.ts'teki adımda
// (dikkat / sorun alanları) durur. rehberTopla() hepsini birleştirir.
// ════════════════════════════════════════════════════════════════

export interface Rehber { dikkat?: string[]; sorun?: Sorun[] }

const ESANS_REHBER: Rehber = {
  dikkat: [
    "Esansı ürün ılık/sıcakken eklemeyin; uçar ve koku zayıflar. Ürün oda sıcaklığındayken ekleyin.",
    "Esans suda çözünmez: önce bir kovada az miktar ürünle (ya da SLES ile) karıştırıp ön karışım yapın, sonra kazana verin.",
    "Gram hassasiyetinde tartın; fazla esans cildi tahriş eder, ürünü de bulandırabilir.",
  ],
  sorun: [
    { belirti: "Esanstan sonra ürün bulanıklaştı / yüzeyde yağ damlaları var", neden: "Esans yeterince dağılmadı (çözünmeyen yağ fazı)", cozum: "Karıştırmayı 10–15 dk uzatın. Sonraki partide esansı mutlaka SLES ile ön karışım yaparak ekleyin." },
    { belirti: "Koku zayıf", neden: "Esans sıcak ürüne eklendi ya da eksik tartıldı", cozum: "Kazana doğrudan ekleme yapmayın; önce 1 kg numunede orantılı deneyin, öğretmen onayıyla tamamlayın." },
  ],
};

const KUVVETLI_ASIT: Rehber = {
  dikkat: [
    "Asit SUYA eklenir, asla su aside dökülmez; tersi sıçrama ve ani ısınma yapar.",
    "Buhar çıkarır: çeker ocak ya da çok iyi havalandırma şart; yüzünüzü kabın üstüne eğmeyin.",
    "Hipokloritli (çamaşır suyu) ürünlerle aynı kovayı, hortumu, kepçeyi KULLANMAYIN.",
  ],
  sorun: [
    { belirti: "Çözelti ısındı, buhar çıkıyor", neden: "Asit çok hızlı eklendi", cozum: "Eklemeyi durdurun, soğumasını bekleyin, sonra daha ince akışla devam edin." },
    { belirti: "Asit cilde veya göze sıçradı", neden: "Koruyucu ekipman eksik ya da hızlı döküm", cozum: "En az 15 dakika bol akan suyla yıkayın (göz için göz duşu), öğretmene hemen haber verin." },
  ],
};

export const HM_REHBER: Record<string, Rehber> = {
  Su: {
    dikkat: [
      "Suyu TARTARAK (kg) alın; kazanın litre çizgisi göz kararıdır, yanıltır.",
      "Kazan temiz ve önceki üründen kalıntısız olmalı. Eski kalıntı rengi, kokuyu ve pH'ı bozar.",
      "Karıştırıcıyı ancak pervane suya batınca çalıştırın; boş kazanda pervane döndürülmez.",
    ],
    sorun: [
      { belirti: "Ürün sonradan bulanıklaşıyor ya da dipte beyaz çökelek oluşuyor", neden: "Musluk suyundaki kireç (Ca²⁺, Mg²⁺) yüzey aktiflerle çökelek yapar", cozum: "Saf/deiyonize su kullanın. Saf su yoksa üretimi ertelemek için öğretmeninize danışın." },
    ],
  },
  SLES: {
    dikkat: [
      "SLES %70 macun kıvamındadır: SUYUN İÇİNE ekleyin, SLES'in üstüne su dökmeyin.",
      "Karıştırıcı orta hızda olsun. Çok hızlı karıştırma girdap yapar, hava hapseder ve aşırı köpürtür.",
      "Macun tamamen çözünmeden sonraki adıma geçmeyin; kazanın dibini ve kenarlarını spatulayla yoklayın.",
    ],
    sorun: [
      { belirti: "Sakız/jöle gibi topaklar yüzüyor", neden: "SLES az suyla temas edince jel fazına geçer", cozum: "Azar azar su EKLEMEYİN (jeli büyütür). Karıştırmaya sabırla devam edin; topaklar zamanla çözülür. Ilık su (≈35–40 °C) çözünmeyi hızlandırır." },
      { belirti: "Kazanda kontrolsüz köpük", neden: "Karıştırıcı çok hızlı ya da pervane yüzeye çok yakın", cozum: "Hızı düşürün, pervaneyi derine indirin, köpüğün çökmesi için 15–30 dk bekleyin." },
    ],
  },
  LABSA: {
    dikkat: [
      "LABSA asidik ve yakıcıdır (pH ≈ 1): eldiven ve gözlük olmadan açmayın.",
      "Suya yavaş, ince bir akışla ekleyin (asit suya eklenir, asla tersi değil).",
      "Koyu ve yapışkandır: kabın içinde kalanı biraz reçete suyuyla çalkalayıp kazana aktarın, yoksa miktar eksik kalır.",
    ],
    sorun: [
      { belirti: "Ürün bulanık ve pH çok düşük", neden: "LABSA henüz tam nötralize edilmedi", cozum: "Sonraki adımda kostiği azar azar ekleyin; her ilaveden sonra 5 dk karıştırıp pH ölçün." },
      { belirti: "Ürün kahverengimsi, koyu renkte", neden: "Uzun beklemiş / oksitlenmiş LABSA", cozum: "Öğretmeninize gösterin; hammadde parti numarasını Kalite Kontrol defterine not edin." },
    ],
  },
  "Sıvı Kostik": {
    dikkat: [
      "AŞINDIRICI! Gözlük, eldiven ve önlük olmadan açmayın; göz duşunun yerini önceden bilin.",
      "Hepsini birden dökmeyin: reçete miktarını 3–4 parçaya bölün, her parçadan sonra 5 dk karıştırıp pH ölçün.",
      "Reçetedeki miktar ÜST SINIRDIR. pH hedefe gelince durun; artan kostiği üretim kaydına not edin.",
      "Nötralizasyon ısı verir; kazan belirgin ısınırsa biraz bekleyip devam edin.",
    ],
    sorun: [
      { belirti: "pH 8'in üzerine çıktı", neden: "Fazla kostik eklendi", cozum: "Çok az LABSA ya da suda çözülmüş sitrik asit ekleyin, 5 dk karıştırıp yeniden ölçün; adım adım geri getirin." },
      { belirti: "pH ölçümleri sürekli değişiyor", neden: "Kostik henüz kazana homojen dağılmadı", cozum: "5–10 dk daha karıştırın, numuneyi kazanın ortasından alın." },
      { belirti: "Kostik göze veya cilde sıçradı", neden: "Koruyucu ekipman eksik ya da hızlı döküm", cozum: "En az 15 dakika bol akan suyla yıkayın (göz için göz duşu), öğretmene hemen haber verin." },
    ],
  },
  Kostik: {
    dikkat: [
      "Kostiği SUYA ekleyin, asla suyu kostiğe dökmeyin; sıçrar ve kaynar.",
      "Çözelti 80–90 °C'ye kadar ısınabilir. Isıya dayanıklı plastik ya da paslanmaz kap kullanın; ALÜMİNYUM kap ASLA (yanıcı hidrojen gazı çıkar).",
      "Çözülürken çıkan buharı solumayın; havalandırın, yüzünüzü kabın üstünden çekin.",
    ],
    sorun: [
      { belirti: "Çözelti buhar çıkarıyor, öksürtüyor", neden: "Kostik hızlı eklendi, ortam havasız", cozum: "Eklemeyi durdurun, pencereleri açın, kabın başından uzaklaşın; çözelti soğuyunca devam edin." },
      { belirti: "Kostik göze veya cilde sıçradı", neden: "Koruyucu ekipman eksik", cozum: "En az 15 dakika bol akan suyla yıkayın, öğretmene hemen haber verin." },
    ],
  },
  TEA: {
    dikkat: ["Azar azar ekleyip her ilaveden sonra pH ölçün; hedefe gelince durun."],
  },
  Tuz: {
    dikkat: [
      "Hepsini birden EKLEMEYİN: önce yaklaşık yarısını, kalanını 3–4 parçada ekleyin. Her parçadan sonra 5–10 dk karıştırıp kıvama bakın.",
      "⚠️ TUZ EĞRİSİ: kıvam bir noktaya kadar artar, FAZLA tuzda ürün yeniden SULANIR. İstenen kıvama gelince reçetede tuz kalsa bile durun.",
      "Katı tuzu karıştırıcı çalışırken serpe serpe ekleyin. Daha iyisi: tuzu bir kovada biraz üründe çözüp kazana geri verin; katı tuz dibe çöker.",
      "Emin değilseniz önce küçükte deneyin: kazandan 100 g numune alın, reçete oranında tuz ekleyip kıvama bakın.",
      "Kıvamı oda sıcaklığında (≈20–25 °C) değerlendirin; soğuk ürün koyu, ılık ürün akışkan görünür.",
    ],
    sorun: [
      { belirti: "Tuz ekledikçe ürün SULANDI", neden: "Tuz eğrisinin tepe noktası aşıldı (fazla tuz)", cozum: "Tuz eklemeyi hemen bırakın. Ayrı kapta tuzsuz baz (su + yüzey aktif, aynı oranda) hazırlayıp azar azar ekleyerek tuz oranını düşürün; öğretmeninize danışın." },
      { belirti: "Tuz bitti ama kıvam yetersiz", neden: "Yüzey aktif oranı düşük ya da hammaddenin aktif madde oranı farklı", cozum: "Tuzu reçetenin üstüne çıkarmayın; az miktar Kokamid DEA ya da SLES kıvamı yükseltir. Miktarı öğretmen belirler." },
      { belirti: "Dipte tuz kristali / çökelme", neden: "Katı tuz çözünmeden dibe indi", cozum: "Karıştırmayı sürdürün ve kovayla alttan üste devir-daim yapın." },
      { belirti: "Tuzdan sonra ürün bulanıklaştı", neden: "Fazla tuz yüzey aktifi çöktürmeye başladı", cozum: "Tuz eklemeyi durdurun; 1 bardak numuneye biraz su ekleyince berraklaşıyorsa neden budur, bazla düzeltin." },
    ],
  },
  "Kokamid DEA": {
    dikkat: [
      "Koyu ve yapışkandır: kabını biraz reçete suyuyla çalkalayarak kazana boşaltın.",
      "Soğukta koyulaşır; ılık ortamda bekletilmiş hammadde daha kolay karışır.",
    ],
    sorun: [
      { belirti: "Yüzeyde yağlı tabaka ya da damlacıklar", neden: "Kokamid DEA tam dağılmadı", cozum: "Karıştırma süresini uzatın; pervanenin kazanın dibine kadar karıştırdığını kontrol edin." },
    ],
  },
  Betain: {
    dikkat: ["SLES çözündükten sonra eklenir; köpüğü artırır ve SLES'in cildi tahriş etmesini azaltır."],
  },
  Gliserin: {
    dikkat: ["Sudan ağırdır ve dibe çöker; ekledikten sonra kazanın dibinden iyice karıştırın."],
  },
  "Sitrik Asit": {
    dikkat: [
      "Katı sitrik asidi doğrudan kazana atmayın; ağırlığının ≈10 katı suda çözüp ekleyin.",
      "Miktar çok küçüktür (900 kg'da ≈360 g); gram hassasiyetli tartı kullanın.",
      "Ekledikten 5–10 dk sonra pH ölçün; hemen ölçülen değer yanıltır.",
    ],
    sorun: [
      { belirti: "pH 5'in altına düştü", neden: "Fazla sitrik asit", cozum: "Öğretmen gözetiminde çok seyreltik kostik çözeltisiyle damla damla düzeltin, her seferinde yeniden ölçün." },
      { belirti: "pH hiç değişmedi", neden: "Asit çözünmedi ya da karışmadı", cozum: "Karıştırmaya devam edin; dipte kristal var mı bakın." },
    ],
  },
  "Fosforik Asit": KUVVETLI_ASIT,
  HCl: KUVVETLI_ASIT,
  HNO3: KUVVETLI_ASIT,
  "Hipoklorit %16": {
    dikkat: [
      "ASLA asit, tuz ruhu, kireç çözücü ya da amonyaklı ürünle aynı kaba/hortuma değmesin; zehirli klor gazı çıkar.",
      "Metal kova/kepçe kullanmayın: klor metali aşındırır, metal iyonları da hipokloriti bozar. Plastik ekipman kullanın.",
      "Güneşten ve ısıdan uzak tutun; aktif klor zamanla azalır.",
    ],
    sorun: [
      { belirti: "Keskin klor kokusu, gözde yanma, öksürük", neden: "Asitle temas ya da yetersiz havalandırma", cozum: "Ortamı HEMEN terk edin, pencereleri açın, öğretmene haber verin. Kokuyu koklamaya çalışmayın." },
      { belirti: "Aktif klor beklenenden düşük", neden: "Eski ya da ısınmış hipoklorit", cozum: "Hammaddenin tarihini kontrol edin; oranı ölçüm sonucuna göre öğretmen ayarlar." },
    ],
  },
  "Etil Alkol": {
    dikkat: [
      "ALEV ALIR: ortamda ateş, kıvılcım, ısıtıcı olmasın.",
      "Buharlaşır: kapları açık bırakmayın, ekledikten sonra kazanı/kabı kapatın.",
    ],
    sorun: [
      { belirti: "Miktar / derece eksik çıktı", neden: "Alkol açık kapta buharlaştı", cozum: "Kapalı kaplarla çalışın; alkolmetreyle dereceyi ölçüp kayda geçin." },
    ],
  },
  IPA: {
    dikkat: [
      "ALEV ALIR: ortamda ateş, kıvılcım, ısıtıcı olmasın.",
      "Buharlaşır: kapları açık bırakmayın, buharını solumayın.",
    ],
  },
  NP10: {
    dikkat: ["Soğukta jelleşebilir; suya yavaşça, karıştırarak ekleyin."],
  },
  "Köpük Kesici": {
    dikkat: ["Çok az miktardır; fazlası yüzeyde yağlı lekeler yapar. Tam tartın."],
  },
  Koruyucu: {
    dikkat: [
      "Miktarı çok azdır ama ürünün raf ömrünü belirler; atlanmamalı.",
      "Isıya duyarlıdır; ürün soğukken ekleyin. Çıplak elle tutmayın.",
    ],
    sorun: [
      { belirti: "Ürün haftalar sonra kokuyor, küf ya da bulanıklık var", neden: "Koruyucu eksik ya da ekipman/kap kirli (mikrop bulaşması)", cozum: "Partiyi Kalite Kontrol defterine 'uygun değil' kaydedin; ekipmanı ve bidonları temizleyip dezenfekte edin." },
    ],
  },
  Esans: ESANS_REHBER,
  "Limon Esansı": ESANS_REHBER,
  Boya: {
    dikkat: [
      "Boya çok güçlüdür; gram düzeyinde tartın.",
      "Önce bir bardak ılık saf suda çözün, sonra azar azar ekleyin.",
      "Tonu beyaz kâğıt önünde, şeffaf bardaktaki numuneyle kontrol edin. Koyu rengi geri almak çok zordur, azdan başlayın.",
    ],
    sorun: [
      { belirti: "Renk çok koyu oldu", neden: "Fazla boya", cozum: "Rengi geri almanın tek yolu boyasız ürünle seyreltmektir; öğretmeninize danışın." },
      { belirti: "Benek benek renk / lekeler", neden: "Boya çözünmeden eklendi", cozum: "Karıştırmayı uzatın; sonraki partide boyayı önceden suda çözün." },
      { belirti: "Renk günler içinde soldu ya da değişti", neden: "Işık ya da pH etkisi", cozum: "Ürünü ışık geçirmeyen bidonda saklayın; pH'ı kontrol edin." },
    ],
  },
  "Asit İnhibitörü": {
    dikkat: ["Asit eklendikten sonra eklenir; çok küçük miktardır, gram hassasiyetinde tartın. Asidin metal yüzeyleri aşındırmasını azaltır."],
  },
  Zeytinyağı: {
    dikkat: ["Yağı ≈40 °C'ye ısıtın, termometreyle kontrol edin; aşırı ısıtmayın."],
  },
  "Defne Yağı": {
    dikkat: ["Zeytinyağıyla birlikte ≈40 °C'ye ısıtın; kokusu uçmasın diye aşırı ısıtmayın."],
  },
};

export const TIP_REHBER: Partial<Record<ProsesAdim["tip"], Rehber>> = {
  guvenlik: {
    dikkat: [
      "Göz duşunun, lavabonun ve yangın tüpünün yerini öğrenin.",
      "Uzun saç toplanır; yüzük ve bilezik çıkarılır.",
      "Tartıyı düz zemine koyup dara (sıfır) alın.",
      "Bütün hammaddeleri tartıp etiketleyerek ekleme sırasıyla tezgâha dizin; böylece sıra karışmaz.",
      "Reçeteyi ve adımları baştan sona bir kez okuyun; görev dağılımını yapın (tartan, ekleyen, kaydeden).",
    ],
    sorun: [
      { belirti: "Bir hammadde yok ya da yetersiz", neden: "Stok eksik", cozum: "Üretime BAŞLAMAYIN; yarım kalan parti bozulur. Sipariş Önerisi sayfasından eksikleri görün." },
      { belirti: "Tartı sabit durmuyor / farklı değer gösteriyor", neden: "Zemin eğik, dara alınmamış ya da kalibrasyon bozuk", cozum: "Düz zemine alın, dara yapın, bilinen bir ağırlıkla deneyin; düzelmezse başka tartı kullanın." },
    ],
  },
  ekle: {
    dikkat: ["Çift kontrol: biri tartar, diğeri tartıyı okuyup onaylar. Eklenen her hammaddeyi listeden işaretleyin."],
    sorun: [
      { belirti: "Yanlış hammadde ya da fazla miktar eklendi", neden: "Tartım veya sıra hatası", cozum: "DURUN, karıştırıcıyı kapatın, öğretmene haber verin; ne kadar eklendiğini yazın. Kendi başınıza düzeltmeye çalışmayın." },
    ],
  },
  olcum: {
    dikkat: [
      "pH metreyi kullanmadan önce pH 4 ve pH 7 tampon çözeltileriyle kalibre edin.",
      "Numuneyi en az 10 dk karıştırdıktan sonra kazanın ortasından alın.",
      "Ölçüm oda sıcaklığında (≈25 °C) yapılır; sıcak numune hatalı sonuç verir.",
      "Elektrodu her ölçümden sonra saf suyla durulayın, kâğıt mendille hafifçe dokunarak kurulayın (silmeyin).",
      "Sonucu hemen Kalite Kontrol defterine yazın.",
    ],
    sorun: [
      { belirti: "Değer sürekli oynuyor", neden: "Elektrot kirli/kurumuş ya da ürün homojen değil", cozum: "Elektrodu durulayın, saklama çözeltisinde bekletin; kazanı 10 dk daha karıştırıp yeni numune alın." },
      { belirti: "Değer hedef aralığın dışında", neden: "Hammadde miktarı ya da kalitesi farklı", cozum: "İlgili adıma dönüp küçük ilavelerle düzeltin, yeniden ölçün. Aralığa girmeden DOLUM YAPILMAZ." },
      { belirti: "pH kâğıdının rengi okunmuyor", neden: "Ürün renkli/koyu", cozum: "pH metre kullanın." },
    ],
  },
  devirdaim: {
    dikkat: [
      "Kovayı kazanın en dibinden doldurup yüzeye yavaşça boşaltın; sıçratmayın.",
      "Yalnızca bu ürüne ayrılmış temiz kovaları kullanın.",
    ],
    sorun: [
      { belirti: "Dipten alınan numune üsttekinden daha koyu", neden: "Tuz/aktif madde dibe çöktü", cozum: "Alttan ve üstten alınan numunelerin kıvamı aynı olana dek devir-daime devam edin." },
    ],
  },
  dolum: {
    dikkat: [
      "Bidonlar temiz, kuru ve etiketli olmalı.",
      "Bidonu ağzına kadar doldurmayın; ≈%5 boşluk bırakın.",
      "Hortumu bidonun dibine indirerek doldurun; köpük oluşmaz.",
      "Partiden 1 numune şişesi ayırıp parti numarasıyla saklayın (şahit numune).",
    ],
    sorun: [
      { belirti: "Dolumda köpük taşıyor", neden: "Akış hızlı ya da ürün yukarıdan dökülüyor", cozum: "Akışı yavaşlatın, hortumu dibe indirin, taşan köpüğün çökmesini bekleyin." },
      { belirti: "Ürünün içinde hava kabarcıkları var", neden: "Hızlı karıştırma ile hapsolan hava", cozum: "Dolumdan önce kazanı 1–2 saat bekletin; kabarcıklar yüzeye çıkar." },
      { belirti: "Bidon ağırlıkları birbirini tutmuyor", neden: "Göz kararı dolum", cozum: "Her 5 bidondan birini terazide tartarak kontrol edin." },
    ],
  },
};

// ════════════════════════════════════════════════════════════════
// ÜRÜNE ÖZEL REHBER — her formülasyon için
//   hazirlik → Güvenlik & Hazırlık adımında (hedef, özel riskler)
//   kontrol  → ölçüm/kontrol adımlarında (hedef değerler, tipik sorunlar)
// ════════════════════════════════════════════════════════════════
export interface UrunRehber { hazirlik: Rehber; kontrol: Rehber }

const SOGUK_SABUN_SORUN: Sorun[] = [
  { belirti: "İz (trace) bir türlü oluşmuyor", neden: "Yağ/kostik sıcaklığı düşük ya da elle karıştırma yetersiz", cozum: "Her ikisini ≈40 °C'de birleştirin; çubuk mikserle kısa aralıklarla (30 sn çalıştır, 30 sn dur) karıştırın." },
  { belirti: "Karışım çok hızlı katılaştı, kalıba dökülemiyor", neden: "Sıcaklık yüksek ya da aşırı karıştırma", cozum: "Spatula ile hızla kalıba bastırın; sonraki partide daha düşük sıcaklıkta çalışın." },
  { belirti: "Kalıpta yağ ayrıştı, üstte sıvı yağ birikti", neden: "Karıştırma iz alınmadan kesildi ya da tartım hatası", cozum: "Sabunu kullanmayın; öğretmen gözetiminde kesip tekrar eritip karıştırarak kurtarılabilir." },
  { belirti: "Yüzeyde beyaz toz tabakası", neden: "Soda külü (kostiğin havadaki CO₂ ile tepkimesi); zararsızdır", cozum: "Kür sonunda bıçakla kazıyın ya da buharla silin; sonraki partide kalıbın üstünü streç filmle örtün." },
  { belirti: "Sabun cildi yakıyor / dil testi yapılmaz, pH 10'un üstünde", neden: "Fazla kostik ya da kür süresi tamamlanmadı", cozum: "Kür süresini uzatın ve yeniden ölçün; düzelmezse partiyi 'uygun değil' kaydedin, kişisel kullanıma vermeyin." },
  { belirti: "Sabun ufalanıyor, çatlıyor", neden: "Fazla kostik ya da kalıpta aşırı ısınma", cozum: "Tartımları kontrol edin; kalıbı sıcak yerde bırakmayın." },
];

const HALEP_HAZIRLIK: Rehber = {
  dikkat: [
    "Defne yağı pahalıdır ve kokusu ısıyla uçar; zeytinyağıyla birlikte en fazla ≈40 °C'ye ısıtın.",
    "Defne oranı arttıkça (%20 → %40) iz daha geç oluşur; sabırla karıştırın.",
    "Halep sabunu uzun kür ister: en az 6 hafta, geleneksel olarak aylarca. Kesilen kalıplar havadar rafta, aralıklı dizilir.",
  ],
};

export const URUN_REHBER: Record<string, UrunRehber> = {
  "sivi-sabun": {
    hazirlik: { dikkat: [
      "🎯 Hedef: pH 5,0–6,5 · bal kıvamında, berrak, yeşil, köpüklü.",
      "900 kg'lık parti uzun sürer (≈5–6 saat): karıştırıcının başında nöbet sırası belirleyin.",
      "Saf su şarttır; kazan ve bidonlar önceki üründen tamamen arındırılmış olmalı.",
    ] },
    kontrol: {
      dikkat: ["🎯 pH 5,0–6,5 · viskozite: kaşıktan bal gibi akmalı, pompadan rahat çıkmalı.", "Kıvamı ürün oda sıcaklığına inince değerlendirin."],
      sorun: [
        { belirti: "Sabun pompadan zor çıkıyor (çok koyu)", neden: "Tuz eğrisinin tepesine çok yakın", cozum: "Çok az saf su ekleyip karıştırın; 1 bardak numunede önce deneyin." },
        { belirti: "Cildi kurutuyor / el yakıyor", neden: "pH yüksek ya da SLES fazla", cozum: "pH'ı ölçün; 6,5 üstündeyse suda çözülmüş sitrik asitle düşürün." },
        { belirti: "Köpük az", neden: "SLES/Betain eksik tartılmış ya da su sert", cozum: "Tartım kayıtlarını kontrol edin; saf su kullanıldığından emin olun." },
      ],
    },
  },
  "kopuk-sabun": {
    hazirlik: { dikkat: [
      "🎯 Hedef: pH 5,0–6,5 · SU GİBİ AKIŞKAN. Köpük pompası koyu sıvıyı köpürtemez, bu yüzden reçetede tuz YOK; kıvam vermeye çalışmayın.",
      "Saf su şarttır; köpük pompalı şişeler temiz ve kuru olmalı.",
    ] },
    kontrol: {
      dikkat: ["🎯 pH 5,0–6,5 · pompaya basınca yoğun, ince gözenekli köpük çıkmalı."],
      sorun: [
        { belirti: "Pompa köpük yerine sıvı veriyor ya da tıkanıyor", neden: "Ürün fazla koyu ya da pompa yanlış tip", cozum: "Bir şişede pompayı deneyin; koyuysa saf su ile hafifçe seyreltin. Tuz eklenmediğini kontrol edin." },
        { belirti: "Köpük seyrek ve çabuk sönüyor", neden: "Yüzey aktif oranı düşük", cozum: "Tartımları kontrol edin; SLES/Betain eksikse öğretmen onayıyla tamamlayın." },
      ],
    },
  },
  dezenfektan: {
    hazirlik: { dikkat: [
      "🎯 Hedef: son üründe alkol en az %70 (hacimce). %70'in altındaki dezenfektan mikrop öldürmede yetersizdir.",
      "ALEV ALIR: ortamda ateş, kıvılcım, ısıtıcı, sigara olmaz; yangın tüpü yakında durur.",
      "Kullanılan etil alkolün derecesini (%96 mı?) etiketten ya da alkolmetreyle önceden kontrol edin.",
    ] },
    kontrol: {
      dikkat: ["🎯 Alkolmetreyle 20 °C'de ölçün: en az %70. Görünüm berrak olmalı.", "Kabı ölçüm dışında hep kapalı tutun."],
      sorun: [
        { belirti: "Alkol derecesi %70'in altında", neden: "Hammadde alkolün derecesi düşük ya da buharlaşma", cozum: "DOLUM YAPMAYIN; hesaplanan miktarda alkol eklenmesi için öğretmene danışın, sonra yeniden ölçün." },
        { belirti: "Elde yapış yapış his", neden: "Gliserin fazla", cozum: "Tartım kaydını kontrol edin; sonraki partide gliserini azaltın." },
        { belirti: "Ürün bulanık", neden: "Esans ya da gliserin karışmadı", cozum: "Kapalı kapta birkaç dakika daha çalkalayın." },
      ],
    },
  },
  kolonya: {
    hazirlik: { dikkat: [
      "🎯 Hedef: 80 derece kolonya, berrak ve tortusuz.",
      "SIRA ÖNEMLİ: esans önce ALKOLDE çözülür, su EN SON ve yavaşça eklenir. Su önce gelirse esans çözünmez, kolonya bulanır.",
      "ALEV ALIR: ortamda ateş ve kıvılcım olmaz; kaplar kapalı tutulur.",
    ] },
    kontrol: {
      dikkat: ["🎯 Alkolmetreyle 20 °C'de ≈80°. Kolonya berrak olmalı, dipte tortu olmamalı."],
      sorun: [
        { belirti: "Kolonya bulanık / sütümsü", neden: "Su hızlı ya da esanstan önce eklendi; kolonya soğuk", cozum: "Birkaç gün serin ve karanlık yerde dinlendirip süzgeç kâğıdından süzün." },
        { belirti: "Derece düşük", neden: "Fazla su ya da buharlaşma", cozum: "Alkolmetreyle ölçüp eksik alkolü hesaplatın (öğretmen)." },
        { belirti: "Koku kısa sürede kayboluyor", neden: "Esans düşük ya da kolonya dinlendirilmeden şişelendi", cozum: "Dolumdan önce en az birkaç gün kapalı kapta dinlendirin." },
      ],
    },
  },
  "genel-temiz": {
    hazirlik: { dikkat: [
      "🎯 Hedef: pH ≈7 (nötr), berrak, mor renkli; yüzeyde iz bırakmadan kurur.",
      "IPA alev alır; kapakları açık bırakmayın, ısıtıcıdan uzak çalışın.",
    ] },
    kontrol: {
      dikkat: ["🎯 pH 6,5–8 · cam ya da fayansa sıkıp silin: iz bırakmamalı."],
      sorun: [
        { belirti: "Yüzeyde iz/leke kalıyor", neden: "NP10 fazla ya da sert su", cozum: "Tartımı kontrol edin; saf su kullanın." },
        { belirti: "Fazla köpük yapıyor", neden: "Hızlı karıştırma", cozum: "Yavaş karıştırın, köpüğün çökmesini bekleyip doldurun." },
      ],
    },
  },
  "cam-silici": {
    hazirlik: { dikkat: [
      "🎯 Hedef: su berraklığında, mavi; camda çizgi ve iz bırakmadan kurur.",
      "Saf su ŞART: musluk suyundaki kireç camda beyaz lekeler bırakır.",
      "IPA alev alır; kapaklar kapalı, ortam havalandırılmış olmalı.",
    ] },
    kontrol: {
      dikkat: ["🎯 Bir cama sıkıp kâğıt havluyla silin: çizgi, iz, köpük kalmamalı."],
      sorun: [
        { belirti: "Camda çizgi/iz kalıyor", neden: "Musluk suyu kullanıldı ya da NP10 fazla", cozum: "Saf su kullanın; tartımı kontrol edin." },
        { belirti: "Camda köpük oluşuyor", neden: "NP10 fazla", cozum: "Sonraki partide NP10'u reçete değerine çekin." },
        { belirti: "Ürün geç kuruyor", neden: "IPA eksik ya da buharlaşmış", cozum: "Kabı kapalı tutun; tartım kaydına bakın." },
      ],
    },
  },
  bulasik: {
    hazirlik: { dikkat: [
      "🎯 Hedef: pH 6,7–7,5 · berrak, sarı, akıcı ama sulu olmayan kıvam, bol köpük.",
      "LABSA (asit) ve sıvı kostik (baz) aşındırıcıdır: gözlük + eldiven + önlük şart, göz duşunun yerini bilin.",
      "pH metre hazır ve kalibre edilmiş olmalı; nötralizasyonda sık sık ölçeceksiniz.",
    ] },
    kontrol: {
      dikkat: ["🎯 pH 6,7–7,5 · kaşıktan yavaşça akan kıvam · ürün berrak."],
      sorun: [
        { belirti: "Elleri kurutuyor, kayganlık hissi var", neden: "pH yüksek (fazla kostik)", cozum: "Az LABSA ya da sitrik asitle pH'ı 7,5'in altına indirin." },
        { belirti: "Ürün bulanık", neden: "Nötralizasyon eksik, sert su ya da fazla tuz", cozum: "Önce pH'ı ölçün; aralıktaysa tuz fazlalığından şüphelenin (Tuz adımındaki çözümlere bakın)." },
        { belirti: "Köpük az, yağı sökmüyor", neden: "LABSA/SLES eksik ya da yanlış tartım", cozum: "Tartım kayıtlarını kontrol edin; öğretmene danışın." },
      ],
    },
  },
  "camasir-suyu": {
    hazirlik: { dikkat: [
      "🎯 Hedef: aktif klor etiket değerinde, pH ≈11–12, berrak, açık sarı.",
      "Yalnız plastik ekipman; asitli ürünlerin kova, hortum ve kepçeleri bu üretime yaklaştırılmaz.",
      "Ortam çok iyi havalandırılır; maske + gözlük + eldiven.",
    ] },
    kontrol: {
      dikkat: ["🎯 Aktif klor ölçümünü (iyodometrik titrasyon ya da test kiti) kaydedin; pH 11–12."],
      sorun: [
        { belirti: "Aktif klor hedefin altında", neden: "Hipoklorit eski, ısınmış ya da güneşte kalmış", cozum: "Hammaddeyi yeniden ölçün; oranı öğretmen ayarlar." },
        { belirti: "Bidonlar şişiyor", neden: "Hipoklorit bozunurken gaz çıkarır (ısı/ışık)", cozum: "Serin, karanlık yerde saklayın; bidonu ağzına kadar doldurmayın." },
      ],
    },
  },
  "kivamli-camasir": {
    hazirlik: { dikkat: [
      "🎯 Hedef: kıvamlı (jel gibi akan), aktif klor etiket değerinde, pH ≈12–13.",
      "SIRA ÖNEMLİ: kostik suda çözülünce çözelti ısınır. Hipoklorit SICAKTA BOZULUR, bu yüzden çözelti oda sıcaklığına inmeden hipoklorit eklenmez.",
      "Yalnız plastik ekipman; asitli ürünlerle hiçbir ekipman paylaşılmaz.",
    ] },
    kontrol: {
      dikkat: ["🎯 Aktif klor ve pH ölçülüp kaydedilir; kıvam kaşıktan yavaş akmalı."],
      sorun: [
        { belirti: "Kıvam günler içinde düşüyor", neden: "Hipoklorit yüzey aktifi zamanla parçalar", cozum: "Normaldir ama hızlıysa depolama sıcaklığını kontrol edin; raf ömrünü kısa tutun." },
        { belirti: "Aktif klor düşük çıktı", neden: "Hipoklorit sıcak çözeltiye eklendi", cozum: "Sonraki partide çözeltinin soğumasını bekleyin; mevcut partiyi öğretmen değerlendirir." },
      ],
    },
  },
  "yag-cozucu": {
    hazirlik: { dikkat: [
      "🎯 Hedef: güçlü alkali (pH ≈12–13), berrak.",
      "Kostik suya eklenince çözelti ISINIR; esansı çözelti soğuyunca ekleyin.",
      "Alüminyum kap ve ekipman KULLANILMAZ (kostik alüminyumu aşındırır, hidrojen çıkar).",
    ] },
    kontrol: {
      dikkat: ["🎯 pH 12–13. Etikete 'Alüminyum ve boyalı yüzeylerde kullanmayın, eldivenle kullanın' uyarısı yazılır."],
      sorun: [
        { belirti: "Ürün bulanık ya da yüzeyde yağ", neden: "NP10 çözünmedi ya da esans ayrıştı", cozum: "Karıştırmayı uzatın; esansı az NP10 ile ön karışım yaparak ekleyin." },
        { belirti: "Yağı yeterince sökmüyor", neden: "Kostik eksik tartılmış", cozum: "pH'ı ölçün; 12'nin altındaysa öğretmene danışın." },
      ],
    },
  },
  "wc-banyo": {
    hazirlik: { dikkat: [
      "🎯 Hedef: asidik (pH ≈1–2), kireç ve pası çözen temizleyici.",
      "Fosforik asit SUYA eklenir; gözlük + eldiven + önlük şart.",
      "Çamaşır suyu ekipmanlarıyla temas etmez; etikete 'Çamaşır suyuyla karıştırmayın' yazılır.",
    ] },
    kontrol: {
      dikkat: ["🎯 pH 1–2. Kireçli bir fayansta küçük deneme: köpürerek kireci çözmeli."],
      sorun: [
        { belirti: "Kireci yeterince çözmüyor", neden: "Asit eksik tartılmış", cozum: "pH'ı ölçün; öğretmen onayıyla tamamlayın." },
        { belirti: "Ürün bulanık", neden: "NP10 asitte iyi dağılmadı", cozum: "Karıştırmayı uzatın." },
      ],
    },
  },
  "tuz-ruhu": {
    hazirlik: { dikkat: [
      "🎯 Hedef: seyreltilmiş hidroklorik asit çözeltisi.",
      "Derişik HCl DUMAN çıkarır (HCl gazı): çeker ocakta ya da açık havada çalışın, maske takın.",
      "Asit SUYA eklenir; metal ekipman KULLANILMAZ, yalnız asite dayanıklı plastik (HDPE) bidon.",
    ] },
    kontrol: {
      dikkat: ["🎯 Yoğunluk/derişimi ölçüp kaydedin. Etikete 'Çamaşır suyuyla asla karıştırmayın — zehirli gaz' uyarısı yazılır."],
      sorun: [
        { belirti: "Ortamda keskin duman, öksürük", neden: "HCl buharı, havalandırma yetersiz", cozum: "Kabı kapatın, ortamı terk edip havalandırın, öğretmene haber verin." },
        { belirti: "Bidon kapağı çevresinde paslanma/sararma", neden: "Metal kapak ya da sızıntı", cozum: "Yalnız plastik kapaklı, contalı bidon kullanın." },
      ],
    },
  },
  "kirec-coz": {
    hazirlik: { dikkat: [
      "🎯 Hedef: seyreltilmiş nitrik asit çözeltisi.",
      "Nitrik asit hem asit hem güçlü YÜKSELTGENDİR: alkol, esans, yağ, talaş gibi organik maddelerle temas ettirmeyin.",
      "Asit SUYA eklenir; çeker ocak, gözlük, eldiven ve önlük şart.",
    ] },
    kontrol: {
      dikkat: ["🎯 Derişimi ölçüp kaydedin; plastik (HDPE) bidona doldurun, etikete asit uyarısı yazın."],
      sorun: [
        { belirti: "Kahverengi-turuncu gaz çıkıyor", neden: "Nitrik asit metal ya da organik maddeyle tepkimeye girdi (zehirli NO₂)", cozum: "HEMEN ortamı terk edin, havalandırın, öğretmene haber verin." },
        { belirti: "Ürün sararıyor", neden: "Işıkta bozunma", cozum: "Işık geçirmeyen bidonda, serin yerde saklayın." },
      ],
    },
  },
  "kastilya-soguk": {
    hazirlik: { dikkat: [
      "🎯 Hedef: %100 zeytinyağlı, sert, beyazımsı sabun; kür sonrası pH 9–10.",
      "Kostik çözeltisini ÖNCEDEN hazırlayıp ≈40 °C'ye soğutun; yağ da ≈40 °C olmalı (termometre şart).",
      "Kür: 4–6 hafta havadar rafta. Kür bitmeden sabun kullanılmaz.",
    ] },
    kontrol: { dikkat: ["🎯 Kür sonunda pH 9–10 (pH kâğıdı ile ıslatılmış yüzeyden)."], sorun: SOGUK_SABUN_SORUN },
  },
  "kastilya-sicak": {
    hazirlik: { dikkat: [
      "🎯 Hedef: sıcak proses Kastilya sabunu; kür süresi soğuk prosese göre kısadır.",
      "İz alındıktan sonra karışım düşük ateşte/su banyosunda ≈1–2 saat PİŞİRİLİR; vazelin gibi yarı saydam olunca kalıba alınır.",
      "Pişirirken karışım kabarabilir; kabı yarıdan fazla doldurmayın, başından ayrılmayın.",
    ] },
    kontrol: {
      dikkat: ["🎯 Kalıptan sonra pH 9–10; birkaç hafta kurumaya bırakılır."],
      sorun: [
        { belirti: "Pişirirken karışım taşıyor/kabarıyor", neden: "Ateş yüksek", cozum: "Ateşi kısın, karıştırarak bastırın." },
        ...SOGUK_SABUN_SORUN.slice(2),
      ],
    },
  },
  "halep-20": { hazirlik: HALEP_HAZIRLIK, kontrol: { dikkat: ["🎯 Kür sonunda pH 9–10; kesit yeşilimsi, dış yüzey zamanla sarı-kahverengine döner (normaldir)."], sorun: SOGUK_SABUN_SORUN } },
  "halep-30": { hazirlik: HALEP_HAZIRLIK, kontrol: { dikkat: ["🎯 Kür sonunda pH 9–10; kesit yeşilimsi, dış yüzey zamanla sarı-kahverengine döner (normaldir)."], sorun: SOGUK_SABUN_SORUN } },
  "halep-40": { hazirlik: HALEP_HAZIRLIK, kontrol: { dikkat: ["🎯 Kür sonunda pH 9–10; kesit yeşilimsi, dış yüzey zamanla sarı-kahverengine döner (normaldir)."], sorun: SOGUK_SABUN_SORUN } },
};

// ════════════════════════════════════════════════════════════════
// ATÖLYEDE PEK KULLANILMAYAN HAM MADDELER — "kullanmazsak ne olur?"
// (Musa Hocam 12 Kas 2026: koruyucu ve köpük kesici çoğu zaman konmuyor.)
// Formülasyon › Bileşen Detayı ve Üretim Asistanı aynı kaynaktan okur.
// ════════════════════════════════════════════════════════════════
export type AtlamaSeviye = "sart" | "onerilir";
export interface AtlamaUyari {
  ne: string;                                  // ne işe yarar (tek cümle)
  seviye: Record<string, AtlamaSeviye>;        // ürün id → şart / önerilir
  gerekce: Record<string, string>;             // ürün id → neden bu seviyede
  olmazsa: string[];                           // kullanılmazsa ne olur
  yapilacaksa: string[];                       // yine de konmayacaksa en azından
  gereksiz?: string;                           // hangi ürünlerde zaten gerekmez
}

export const ATLAMA_UYARI: Record<string, AtlamaUyari> = {
  Koruyucu: {
    ne: "Su bazlı üründe bakteri, maya ve küf üremesini önler; ürünün raf ömrünü belirler.",
    seviye: { "sivi-sabun": "sart", "kopuk-sabun": "sart", "genel-temiz": "onerilir", "cam-silici": "onerilir" },
    gerekce: {
      "sivi-sabun": "Ürünün %90'ı su; SLES, betain ve kokamid DEA mikroplar için besindir. Pompa ağzından ve ıslak ellerden sürekli mikrop girer, ürün cilde sürülür.",
      "kopuk-sabun": "Sıvı sabundan da seyreltik ve köpük pompası havayla temas ettirir. Ürün cilde sürülür.",
      "genel-temiz": "%3 IPA mikropları durdurmaya yetmez (koruyucu etki için ≈%15–20 alkol gerekir). Cilde sürülmediği için risk daha düşük, ama bidonda bozulabilir.",
      "cam-silici": "%4 IPA koruma için yetersiz; büyük partide (900 kg) ürün aylarca depoda bekler.",
    },
    olmazsa: [
      "2–8 hafta içinde (yazın daha çabuk) bakteri, maya ya da küf ürer.",
      "Koku bozulur: ekşi, çürük, rutubet kokusu; esans bu kokuyu bir süre örter.",
      "Ürün bulanıklaşır, dibe tortu çöker, yüzeyde ya da kapak altında küf lekeleri görülür.",
      "Kıvam DÜŞER: mikroplar yüzey aktifi ve kıvam vericiyi parçalar, sabun sulanır.",
      "Renk değişir; bidon gaz yapıp şişebilir.",
      "Sabunlarda asıl tehlike: mikroplu ürün cilde, açık yaraya, çocukların eline sürülür (ör. Pseudomonas ciltte ve gözde enfeksiyon yapabilir).",
      "Satılan kozmetik ürünün mikrobiyolojik açıdan güvenli olması gerekir. Bozulan parti iade ve itibar kaybı demektir.",
    ],
    yapilacaksa: [
      "Yalnız SAF/deiyonize su kullanın; mümkünse kaynatılıp soğutulmuş saf su.",
      "Kazanı, karıştırıcıyı, hortumu ve bidonları üretimden önce yıkayıp %70 alkolle (eldeki dezenfektanla) silin.",
      "Küçük partiler yapın, ürünü en geç 1 ayda tüketin; etikete üretim tarihini yazın.",
      "Serin ve gölge yerde saklayın; açılmış bidonu uzun bekletmeyin.",
      "Her partiden 1 şahit numune ayırıp 2–4 hafta gözleyin (koku, bulanıklık, kıvam); bozulma görülürse aynı partiyi dağıtmayın.",
      "Sıvı sabunun pH'ını 5,0–5,5'e yakın tutmak mikrop üremesini biraz yavaşlatır ama koruyucunun yerini TUTMAZ.",
    ],
    gereksiz: "Kolonya ve el dezenfektanı (yüksek alkol), çamaşır suyu (hipoklorit), yağ çözücü (pH 12–13), tuz ruhu, kireç çözücü ve WC temizleyici (asit) kendi kendini korur; bunlara koruyucu gerekmez.",
  },
  "Köpük Kesici": {
    ne: "Karıştırma ve dolum sırasında oluşan köpüğü kırar; köpüğün kalıcı olmasını önler.",
    seviye: { "kivamli-camasir": "onerilir" },
    gerekce: {
      "kivamli-camasir": "Üründe %5 SLES var; kostikli, kıvamlı ortamda oluşan köpük kolay sönmez. Köpük kesici ürünün güvenliğini değil, üretimin ve kullanımın rahatlığını etkiler.",
    },
    olmazsa: [
      "Karıştırırken kazanda köpük kabarır, kazan ağzından taşabilir. Taşan sıvı hipokloritli ve kostiklidir: cilde ve göze zarar verir.",
      "Kıvamlı üründe hapsolan hava kabarcıkları günlerce çıkmaz; ürün bulutlu, köpüklü görünür.",
      "Dolum yavaşlar; bidon köpükle dolar, köpük sönünce bidon EKSİK görünür (eksik hacim, müşteri şikâyeti).",
      "Kullanımda, özellikle bol suyla ya da makinede kullanılırsa fazla köpük yapar, durulama uzar.",
      "Ürünün temizleme/beyazlatma gücü DEĞİŞMEZ; köpük kesicinin yokluğu güvenlik değil, kullanım ve görünüş sorunudur.",
    ],
    yapilacaksa: [
      "Karıştırıcıyı yavaş çalıştırın, pervaneyi kazanın derinine indirin; girdap oluşturmayın.",
      "SLES'i karıştırıcı çalışırken suyun içine ekleyin, yukarıdan dökmeyin.",
      "Dolumdan önce kazanı birkaç saat (tercihen bir gece) bekletin; kabarcıklar yüzeye çıkar.",
      "Hortumu bidonun dibine indirerek doldurun, bidonları köpük sönünce tamamlayın.",
      "Yüzeydeki köpüğü plastik kepçeyle alın; köpüğü söndürmek için su püskürtmeyin (ürünü sulandırır).",
    ],
  },
};

const SEVIYE_YAZI: Record<AtlamaSeviye, string> = { sart: "ŞART", onerilir: "ÖNERİLİR" };

/** Bir üründe atlanması riskli ham maddeler (reçetede geçen ve ATLAMA_UYARI'da olanlar). */
export function atlamaListesi(urunId: string, ingAdlari: string[]): { ad: string; u: AtlamaUyari; sv: AtlamaSeviye }[] {
  return ingAdlari.filter((ad) => ATLAMA_UYARI[ad]?.seviye[urunId])
    .map((ad) => ({ ad, u: ATLAMA_UYARI[ad], sv: ATLAMA_UYARI[ad].seviye[urunId] }));
}

/** Küçük rozet: "⚠️ ŞART" / "ÖNERİLİR" */
export function atlamaRozet(urunId: string, ad: string): string {
  const sv = ATLAMA_UYARI[ad]?.seviye[urunId];
  return sv ? ` <span class="atl-rozet atl-${sv}" title="Atölyede çoğu zaman konmuyor — kullanılmazsa ne olur? Ayrıntı aşağıda.">${sv === "sart" ? "⚠️ " : ""}${SEVIYE_YAZI[sv]}</span>` : "";
}

/** Ayrıntılı uyarı kutusu. kisa=true → yalnız başlık + gerekçe (kurulum ekranı için). */
export function atlamaUyariHTML(urunId: string, ad: string, kisa = false): string {
  const u = ATLAMA_UYARI[ad]; const sv = u?.seviye[urunId];
  if (!u || !sv) return "";
  const bas = `<div class="atl-bas">${sv === "sart" ? "⛔" : "⚠️"} ${ad} bu üründe <b>${SEVIYE_YAZI[sv]}</b></div>
    <div class="atl-ne">${u.ne} ${u.gerekce[urunId] || ""}</div>`;
  if (kisa) return `<div class="atl-kutu atl-${sv}">${bas}</div>`;
  return `<div class="atl-kutu atl-${sv}">${bas}
    <details ${sv === "sart" ? "open" : ""}><summary>❓ ${ad} kullanılmazsa ne olur?</summary>
      <ul>${u.olmazsa.map((x) => `<li>${x}</li>`).join("")}</ul></details>
    <details><summary>🛡️ Yine de kullanılmayacaksa en azından…</summary>
      <ul>${u.yapilacaksa.map((x) => `<li>${x}</li>`).join("")}</ul></details>
  </div>`;
}

/** Bütün ürünler için özet tablo: hangi üründe şart / önerilir / gereksiz */
export function atlamaOzetHTML(ad: string, urunler: { id: string; ad: string; ings: [string, number][] }[]): string {
  const u = ATLAMA_UYARI[ad]; if (!u) return "";
  const satir = urunler.filter((x) => x.ings.some(([a]) => a === ad))
    .map((x) => `<tr><td>${x.ad}</td><td>${atlamaRozet(x.id, ad)}</td><td style="font-size:.74rem">${u.gerekce[x.id] || ""}</td></tr>`).join("");
  return `<div class="card" style="margin-top:14px"><div class="ch"><span class="ct">${ad} hangi ürünlerde şart?</span></div>
    <div class="tw"><table><thead><tr><th>Ürün</th><th>Durum</th><th>Neden</th></tr></thead><tbody>${satir}</tbody></table></div>
    ${u.gereksiz ? `<div class="tm" style="margin-top:8px">ℹ️ ${u.gereksiz}</div>` : ""}</div>`;
}

/** Ürüne özel + adımın kendi notları + ham madde rehberi + adım türü rehberini birleştirir (tekrarsız). */
export function rehberTopla(adim: ProsesAdim, urunId?: string): { dikkat: string[]; sorun: Sorun[] } {
  const ur = urunId ? URUN_REHBER[urunId] : undefined;
  const urunKismi: Rehber = !ur ? {} : adim.tip === "guvenlik" ? ur.hazirlik : adim.tip === "olcum" ? ur.kontrol : {};
  const kaynaklar: Rehber[] = [
    urunKismi,
    { dikkat: adim.dikkat, sorun: adim.sorun },
    ...(adim.ekle || []).map((ad) => HM_REHBER[ad] || {}),
    TIP_REHBER[adim.tip] || {},
  ];
  const dikkat: string[] = [];
  const sorun: Sorun[] = [];
  const gorulen = new Set<string>();
  for (const k of kaynaklar) {
    (k.dikkat || []).forEach((d) => { if (!gorulen.has(d)) { gorulen.add(d); dikkat.push(d); } });
    (k.sorun || []).forEach((s) => { if (!gorulen.has(s.belirti)) { gorulen.add(s.belirti); sorun.push(s); } });
  }
  return { dikkat, sorun };
}
