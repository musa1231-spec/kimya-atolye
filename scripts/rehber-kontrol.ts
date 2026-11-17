// Tutarlılık testi: her formülasyonun üretim rehberi eksiksiz mi?
import { URUNLER, FIYAT_LISTESI_DUZEN, HM_FIYAT } from "../src/constants";
import { prosesUret } from "../src/proses";
import { HM_REHBER, URUN_REHBER, rehberTopla, ATLAMA_UYARI } from "../src/rehber";
import { HM_GRUP } from "../src/lib/bilesen";

const hatalar: string[] = [];
// Resmî fiyat listesi düzeni: reçeteli satır programda olmalı, reçetesiz satır olmamalı, kimlik tekrarı yok
{
  const goruldu = new Set<string>();
  for (const x of FIYAT_LISTESI_DUZEN) {
    if (goruldu.has(x.id)) hatalar.push(`FIYAT_LISTESI_DUZEN: '${x.id}' iki kez geçiyor`);
    goruldu.add(x.id);
    const var_ = URUNLER.some((u) => u.id === x.id);
    if (x.receteli && !var_) hatalar.push(`FIYAT_LISTESI_DUZEN: '${x.id}' reçeteli işaretli ama URUNLER'de yok`);
    if (!x.receteli && var_) hatalar.push(`FIYAT_LISTESI_DUZEN: '${x.id}' reçetesiz işaretli ama URUNLER'de reçetesi var`);
  }
}
// Pek kullanılmayan ham maddeler: reçetesinde geçen her ürünün seviyesi + gerekçesi olmalı,
// seviyesi yazılan her ürünün reçetesinde o ham madde geçmeli; asistanda bir adımda görünmeli.
for (const [ad, au] of Object.entries(ATLAMA_UYARI)) {
  if (!au.olmazsa.length || !au.yapilacaksa.length) hatalar.push(`ATLAMA_UYARI '${ad}': olmazsa/yapılacaksa boş`);
  for (const u of URUNLER) {
    const var_ = u.ings.some(([a]) => a === ad);
    if (var_ && !au.seviye[u.id]) hatalar.push(`${u.id}: reçetede '${ad}' var ama şart/önerilir seviyesi yok`);
    if (var_ && !au.gerekce[u.id]) hatalar.push(`${u.id}: '${ad}' için gerekçe yok`);
    if (!var_ && au.seviye[u.id]) hatalar.push(`${u.id}: '${ad}' seviyesi yazılmış ama reçetede yok`);
    if (var_ && !prosesUret(u).some((s) => s.ekle?.includes(ad))) hatalar.push(`${u.id}: '${ad}' uyarısı asistanda hiçbir adımda görünmez`);
  }
}
for (const u of URUNLER) {
  const ur = URUN_REHBER[u.id];
  if (!ur) hatalar.push(`${u.id}: URUN_REHBER kaydı yok`);
  else {
    if (!ur.hazirlik.dikkat?.length) hatalar.push(`${u.id}: hazırlık dikkat listesi boş`);
    if (!ur.kontrol.dikkat?.length) hatalar.push(`${u.id}: kontrol hedefi boş`);
  }
  for (const [ad] of u.ings) if (!HM_REHBER[ad]?.dikkat?.length) hatalar.push(`${u.id}: '${ad}' için HM_REHBER yok`);
  const adimlar = prosesUret(u);
  if (!adimlar.some((a) => a.tip === "olcum")) hatalar.push(`${u.id}: kontrol (olcum) adımı yok — ürüne özel kontrol rehberi görünmez`);
  const recAd = new Set(u.ings.map(([a]) => a));
  const eklenen = new Set<string>();
  for (const a of adimlar) {
    for (const ad of a.ekle || []) {
      if (!recAd.has(ad)) hatalar.push(`${u.id}: '${a.baslik}' adımındaki '${ad}' reçetede yok`);
      eklenen.add(ad);
    }
    const r = rehberTopla(a, u.id);
    if (a.tip !== "bitir" && a.tip !== "karistir" && a.tip !== "bilgi" && !r.dikkat.length) hatalar.push(`${u.id}: '${a.baslik}' adımında dikkat notu yok`);
  }
  for (const ad of recAd) if (!eklenen.has(ad)) hatalar.push(`${u.id}: reçetedeki '${ad}' hiçbir adımda eklenmiyor`);
}
// Bileşim şeridi: reçetedeki her ham maddenin kimyasal grubu tanımlı olmalı
for (const u of URUNLER) for (const [ad] of u.ings) if (!HM_GRUP[ad]) hatalar.push(`${u.id}: '${ad}' için HM_GRUP (bileşim rengi) yok`);
// Maliyet: reçetedeki her ham maddenin (su hariç) varsayılan fiyatı olmalı — yoksa maliyet sessizce düşük çıkar
for (const u of URUNLER) for (const [ad] of u.ings) if (ad !== "Su" && !(HM_FIYAT[ad] > 0)) hatalar.push(`${u.id}: '${ad}' için HM_FIYAT yok/0 (maliyet eksik hesaplanır)`);
// Her reçetenin toplamı %100 olmalı
for (const u of URUNLER) {
  const t = u.ings.reduce((s, [, p]) => s + p, 0);
  if (Math.abs(t - 100) > 0.01) hatalar.push(`${u.id}: reçete toplamı %${t.toFixed(3)} (100 olmalı)`);
}
// Stokiyometri (bağımsız referans): LABSA (%96 aktif, M≈322 g/mol) + serbest H2SO4 (%1,5; M=98, 2 H+)
// → NaOH (M=40) ; sıvı kostik %50. 1 kg LABSA için ≈0,263 kg sıvı kostik. Sapma ≤ %5.
const NAOH_KG_PER_LABSA = (0.96 / 322 + (0.015 / 98) * 2) * 40;
const SIVI_KOSTIK_ORAN = NAOH_KG_PER_LABSA / 0.5;
for (const u of URUNLER) {
  const labsa = u.ings.find(([a]) => a === "LABSA")?.[1], kostik = u.ings.find(([a]) => a === "Sıvı Kostik")?.[1];
  if (labsa && kostik) {
    const beklenen = labsa * SIVI_KOSTIK_ORAN;
    if (Math.abs(kostik - beklenen) / beklenen > 0.05) hatalar.push(`${u.id}: Sıvı Kostik %${kostik}, stokiyometrik ≈%${beklenen.toFixed(3)} (LABSA %${labsa})`);
  }
}
if (hatalar.length) { console.error("❌ Rehber tutarlılık hatası:\n  " + hatalar.join("\n  ")); process.exit(1); }
console.log(`✅ Rehber tutarlı: ${URUNLER.length} ürün, ${Object.keys(HM_REHBER).length} ham madde rehberi`);

// ── Alkol kaynağı uyarlaması — bağımsız referansla sayısal test ──
import { alkolUyarla, vvToWw, RECETE_SAFLIK, DEZENFEKTAN_AD } from "../src/alkol";
const ah: string[] = [];
const yakin = (a: number, b: number, tol = 0.01) => Math.abs(a - b) <= tol;
// Standart alkol tablosu referansı: %70 v/v = %62,4 w/w, %96 v/v = %93,8 w/w
if (!yakin(vvToWw(70), 0.624, 0.001)) ah.push(`vvToWw(70)=${vvToWw(70)} (beklenen 0,624)`);
if (!yakin(vvToWw(96), 0.938, 0.001)) ah.push(`vvToWw(96)=${vvToWw(96)} (beklenen 0,938)`);
const saflik = (ad: string, k: number) => ad === "Etil Alkol" || ad === "IPA" ? RECETE_SAFLIK[ad] : ad.startsWith(DEZENFEKTAN_AD) ? vvToWw(k) : ad === "Etil Alkol" ? vvToWw(96) : 0;
for (const u of URUNLER) {
  for (const k of [{ tur: "etil96" as const }, { tur: "dezenfektan" as const, derece: 70 }, { tur: "dezenfektan" as const, derece: 90 }]) {
    const s = alkolUyarla(u, k);
    if (s.engel) continue;
    const top0 = u.ings.reduce((t, [, p]) => t + p, 0), top1 = s.urun.ings.reduce((t, [, p]) => t + p, 0);
    if (!yakin(top0, top1, 0.01)) ah.push(`${u.id}/${k.tur}${"derece" in k ? k.derece : ""}: toplam % değişti ${top0} → ${top1}`);
    const saf0 = u.ings.reduce((t, [ad, p]) => t + p * saflik(ad, 96), 0);
    const saf1 = s.urun.ings.reduce((t, [ad, p]) => t + p * (ad === "Etil Alkol" ? vvToWw(96) : saflik(ad, "derece" in k ? k.derece! : 96)), 0);
    if (!yakin(saf0, saf1, 0.01)) ah.push(`${u.id}/${k.tur}: saf alkol korunmadı ${saf0.toFixed(3)} → ${saf1.toFixed(3)}`);
  }
}
// Elle hesaplanmış örnek: Cam silici IPA %4 (saf 3,96) ← %70'lik dezenfektan: 3,96/0,624 = %6,346; su 95,27 − 2,346 = %92,924
const cam = alkolUyarla(URUNLER.find((x) => x.id === "cam-silici")!, { tur: "dezenfektan", derece: 70 });
const camD = cam.urun.ings.find(([a]) => a.startsWith(DEZENFEKTAN_AD))?.[1] ?? -1, camSu = cam.urun.ings.find(([a]) => a === "Su")?.[1] ?? -1;
if (!yakin(camD, 6.346, 0.002) || !yakin(camSu, 92.924, 0.002)) ah.push(`cam-silici %70: dezenfektan ${camD} (6,346), su ${camSu} (92,924)`);
// Engel: 70°'lik dezenfektanla kolonya/dezenfektan yapılamaz; derece girilmeden hesap yok
for (const id of ["kolonya", "dezenfektan"]) if (!alkolUyarla(URUNLER.find((x) => x.id === id)!, { tur: "dezenfektan", derece: 70 }).engel) ah.push(`${id}: %70 kaynakla ENGEL bekleniyordu`);
if (!alkolUyarla(URUNLER.find((x) => x.id === "cam-silici")!, { tur: "dezenfektan" }).engel) ah.push("derece girilmeden ENGEL bekleniyordu");
if (ah.length) { console.error("❌ Alkol uyarlama hatası:\n  " + ah.join("\n  ")); process.exit(1); }
console.log("✅ Alkol uyarlaması: saf alkol korunuyor, toplam %100, engeller çalışıyor");

// ── Atölye Düzeni: kazan / ürün ailesi / roller / altın kural ──
import { KAZANLAR, URUN_AILE, ALTIN_KURAL, KURAL_BOLUMLERI, kazanPlaniDenetle, asistanKazanEngel, urunKazanTipi, VISKOZ_URUN, KAZAN_DISI_URUN, SAF_SU_DINAMO_UYARI } from "../src/atolyeDuzen";
{
  const dh: string[] = [];
  for (const u of URUNLER) if (!URUN_AILE[u.id]) dh.push(`URUN_AILE: '${u.id}' ailesi tanımsız`);
  for (const id of [...Object.keys(URUN_AILE), ...VISKOZ_URUN, ...KAZAN_DISI_URUN]) if (!URUNLER.some((u) => u.id === id)) dh.push(`'${id}' URUNLER'de yok`);
  if (KAZANLAR.length !== 4 || KAZANLAR.some((k) => k.kapasiteKg !== 900)) dh.push("4 kazan × 900 kg bekleniyordu");
  if (KAZANLAR.filter((k) => k.tip === "yuksek").map((k) => k.no).join() !== "K3,K4") dh.push("yüksek kazanlar K3 ve K4 olmalı (Musa Hocam, 17 Kas)");
  if (!KURAL_BOLUMLERI.some((k) => k.id === "cikis" && k.maddeler.length >= 10)) dh.push("çıkış kontrol listesi eksik");
  if (new Set(KAZANLAR.map((k) => k.no)).size !== KAZANLAR.length) dh.push("kazan numarası tekrarlıyor");
  if (!/HABERSİZ/.test(ALTIN_KURAL.baslik)) dh.push("altın kural başlığı değişmiş");
  const ss = KURAL_BOLUMLERI.find((k) => k.id === "safsu");
  if (!ss || !ss.maddeler.some((m) => /DİNAMO YANAR/.test(m)) || !/YANAR/.test(SAF_SU_DINAMO_UYARI)) dh.push("saf su dinamo kuralı eksik");
  const yk = KAZANLAR.find((k) => k.tip === "yuksek")!.no, ak = KAZANLAR.find((k) => k.tip === "alcak")!.no;
  // Bilerek hatalı planlar: engel çıkmalı
  if (!kazanPlaniDenetle([{ no: yk, urunId: "sivi-sabun", kg: 950 }]).engeller.length) dh.push("950 kg için ENGEL bekleniyordu");
  if (!kazanPlaniDenetle([{ no: ak, urunId: "sivi-sabun", kg: 900 }]).engeller.length) dh.push("viskoz ürün alçak kazanda ENGEL bekleniyordu");
  if (!kazanPlaniDenetle([{ no: ak, urunId: "halep-20", kg: 2 }]).engeller.length) dh.push("katı sabun kazanda ENGEL bekleniyordu");
  if (kazanPlaniDenetle([{ no: yk, urunId: "bulasik", kg: 900 }, { no: ak, urunId: "cam-silici", kg: 900 }]).engeller.length) dh.push("doğru plan engellendi");
  if (!kazanPlaniDenetle([{ no: yk, urunId: "cam-silici", kg: 900 }]).uyarilar.length) dh.push("akışkan ürün yüksek kazanda UYARI bekleniyordu");
  if (!kazanPlaniDenetle([{ no: ak, urunId: "camasir-suyu", kg: 900 }, { no: KAZANLAR[3].no, urunId: "tuz-ruhu", kg: 30 }]).uyarilar.some((u) => /KLOR/.test(u))) dh.push("klor+asit uyarısı bekleniyordu");
  if (!asistanKazanEngel("", "sivi-sabun", 900, null)) dh.push("kazan seçilmeden ENGEL bekleniyordu");
  if (!asistanKazanEngel(yk, "kolonya", 100, [{ no: yk, urunId: "sivi-sabun", kg: 900 }])) dh.push("plandaki farklı ürün için ENGEL bekleniyordu");
  if (asistanKazanEngel(yk, "sivi-sabun", 900, [{ no: yk, urunId: "sivi-sabun", kg: 900 }])) dh.push("plana uygun üretim engellendi");
  if (urunKazanTipi("sivi-sabun") !== "yuksek" || urunKazanTipi("camasir-suyu") !== "alcak") dh.push("viskozite sınıfı yanlış");
  if (dh.length) { console.error("❌ Atölye Düzeni hatası:\n  " + dh.join("\n  ")); process.exit(1); }
  console.log(`✅ Atölye Düzeni: ${KAZANLAR.length} kazan, ${KURAL_BOLUMLERI.length} kural bölümü; engeller çalışıyor`);
}
// WhatsApp metni bütün bölümleri içermeli (PDF ile aynı kaynak)
import { kurallarMetni } from "../src/atolyeDuzen";
{
  const t = kurallarMetni(), eksik: string[] = [];
  for (const k of KURAL_BOLUMLERI) if (!t.includes(k.baslik.toLocaleUpperCase("tr-TR"))) eksik.push(k.baslik);
  if (!t.includes(ALTIN_KURAL.baslik)) eksik.push("altın kural");
  if (eksik.length) { console.error("❌ WhatsApp kurallar metninde eksik: " + eksik.join(", ")); process.exit(1); }
  if (process.env.KURAL_METNI_YAZ) (await import("node:fs")).writeFileSync(process.env.KURAL_METNI_YAZ, t, "utf8");
  console.log(`✅ WhatsApp kurallar metni: ${t.length} karakter, bütün bölümler var`);
}
// ⚖️ Ağır iş adaleti: en az taşıyan öne alınır, aynı gün yük yayılır, elle yazılana dokunulmaz, İ/i aynı kişi sayılır
import { adilTasiyiciDagit, agirIsSayaci, adListesi, adNorm, TASIYICI_SAYISI } from "../src/atolyeDuzen";
{
  const ah: string[] = [];
  const gecmis = [
    { tarih: "2026-11-10", roller: { "tasima-K3": "Ali, Veli", "tasima-K2": "Ayşe" } },
    { tarih: "2026-11-12", roller: { "tasima-K1": "ali , Can", "tasima-K4": "Veli" } },
    { tarih: "2026-11-20", roller: { "tasima-K1": "Deniz" } },   // gelecekteki gün sayılmamalı
  ];
  const say = agirIsSayaci(gecmis, "2026-11-17");
  if (say.get(adNorm("Ali")) !== 2 || say.get(adNorm("Veli")) !== 2 || say.get(adNorm("Ayşe")) !== 1 || say.get(adNorm("Can")) !== 1 || say.has(adNorm("Deniz"))) ah.push("sayaç yanlış: " + JSON.stringify([...say]));
  if (adNorm("İREM  Şahin") !== adNorm("irem şahin")) ah.push("İ/i normalizasyonu");
  if (adListesi("Ali, ali ; Veli,,").join("|") !== "Ali|Veli") ah.push("adListesi tekrar/boş ayıklamıyor");
  const gelen = ["Ali", "Veli", "Ayşe", "Can", "Ece", "Fatih"];
  const d = adilTasiyiciDagit(gelen, ["K3", "K4"], say);
  // Ece ve Fatih hiç taşımadı → K3'e; sonra Ayşe ve Can (1'er) → K4
  if (d.K3.slice().sort().join() !== "Ece,Fatih" || d.K4.slice().sort().join() !== "Ayşe,Can") ah.push("adil dağıtım: " + JSON.stringify(d));
  if (Object.values(d).some((l) => l.length !== TASIYICI_SAYISI)) ah.push("kazan başı taşıyıcı sayısı");
  // Elle yazılan kazan korunur ve sayılır; aynı kişiler birden çok kazanda olabilir
  const d2 = adilTasiyiciDagit(gelen, ["K1", "K3"], say, { K1: ["Ece", "Fatih"] });
  if (d2.K1.join() !== "Ece,Fatih" || d2.K3.includes("Ece") || d2.K3.includes("Fatih")) ah.push("elle yazılan kazan: " + JSON.stringify(d2));
  const d3 = adilTasiyiciDagit(["Ali"], ["K1", "K2"], new Map());
  if (d3.K1.join() !== "Ali" || d3.K2.join() !== "Ali") ah.push("tek öğrenci iki kazanda taşıyabilmeli");
  if (ah.length) { console.error("❌ Ağır iş adaleti hatası:\n  " + ah.join("\n  ")); process.exit(1); }
  console.log("✅ Ağır iş adaleti: sayaç, normalizasyon, adil dağıtım ve elle seçim korunuyor");
}
// ── 📚 Üretim Rehberi bütünlüğü: sıvı ürün kartları elle yazılmaz, katı sabun yüzdeleri URUNLER ile aynı ──
import { readFileSync } from "node:fs";
import { YARDIM_SEKME, KATI_SABUN_KAT } from "../src/rehber";
{
  const yh: string[] = [];
  const html = readFileSync("index.html", "utf8");
  for (const u of URUNLER) if (u.kat !== KATI_SABUN_KAT && !YARDIM_SEKME[u.kat]) yh.push(`'${u.id}' kategorisi (${u.kat}) Rehber'de hiçbir sekmeye düşmüyor`);
  for (const sec of Object.values(YARDIM_SEKME)) {
    const a = html.indexOf(`<div id="${sec}"`), b = html.indexOf(`</div><!-- /${sec} -->`);
    if (a < 0 || b < 0) { yh.push(`${sec} sekmesi index.html'de yok`); continue; }
    if (/<table|<li|%\d/.test(html.slice(a, b))) yh.push(`${sec}: elle yazılmış reçete/adım var — kartlar yardim.ts ile üretilmeli`);
  }
  // Katı sabun: YÖNTEM n kartındaki % satırları → URUNLER
  const yontem: Record<number, string> = { 1: "kastilya-soguk", 2: "kastilya-sicak", 3: "halep-20", 4: "halep-30", 5: "halep-40" };
  for (const [n, id] of Object.entries(yontem)) {
    const a = html.indexOf(`YÖNTEM ${n} —`), b = html.indexOf("<!-- YÖNTEM", a + 10) > 0 ? html.indexOf("<!-- YÖNTEM", a + 10) : html.indexOf("<!-- KARŞILAŞTIRMA", a);
    const parca = html.slice(a, b);
    const yuz = [...parca.matchAll(/<td[^>]*>%(\d+(?:\.\d+)?)<\/td>/g)].map((m) => +m[1]).sort((x, y) => x - y);
    const gercek = URUNLER.find((u) => u.id === id)!.ings.map(([, p]) => p).sort((x, y) => x - y);
    if (yuz.join() !== gercek.join()) yh.push(`Katı sabun YÖNTEM ${n} (${id}): Rehber ${yuz.join("/")} ≠ reçete ${gercek.join("/")}`);
  }
  // Kurallar her ortamda (PDF + WhatsApp) doğru okunmalı; program yapmadığı şeyi vaat etmemeli
  const kuralMetin = KURAL_BOLUMLERI.flatMap((k) => k.maddeler).join("\n");
  if (/ilk sayfa/i.test(kuralMetin)) yh.push("kurallarda 'ilk sayfa' geçiyor (WhatsApp metninde sayfa yok)");
  if (/puanlar beceri karnesine/i.test(kuralMetin)) yh.push("kurallar Beceri Karnesi'nde olmayan puanlamayı vaat ediyor");
  if (yh.length) { console.error("❌ Üretim Rehberi / kural bütünlüğü:\n  " + yh.join("\n  ")); process.exit(1); }
  console.log("✅ Üretim Rehberi: sıvı kartlar tek kaynaktan, katı sabun yüzdeleri reçeteyle aynı, kural metni tutarlı");
}
// ── Ölü ham madde kaydı yok: rehber/rol/grup listesindeki her ham madde en az bir reçetede geçmeli ──
// (Musa Hocam, 17 Kas: "TEA yok bizde" — kullanılmayan madde rehberde/Asistan'da öğrenciyi yanıltır)
import { HM_ROL } from "../src/proses";
{
  const kullanilan = new Set(URUNLER.flatMap((u) => u.ings.map(([a]) => a)));
  const olu: string[] = [];
  for (const [ad_, liste] of [["HM_REHBER", Object.keys(HM_REHBER)], ["HM_ROL", Object.keys(HM_ROL)], ["HM_GRUP", Object.keys(HM_GRUP)]] as [string, string[]][])
    for (const ad of liste) if (!kullanilan.has(ad)) olu.push(`${ad_}: '${ad}'`);
  if (olu.length) { console.error("❌ Hiçbir reçetede kullanılmayan ham madde kaydı:\n  " + olu.join("\n  ")); process.exit(1); }
  console.log("✅ Ölü ham madde kaydı yok (rehber/rol/grup listelerindeki her madde bir reçetede kullanılıyor)");
}
// ── Saf su hortumu / sifonlama kuralı (Musa Hocam, 17 Kas — ÖNEMLİ) her yerde olmalı ──
import { maddeAyir, SAF_SU_DINAMO_UYARI as DINAMO_UYARI } from "../src/atolyeDuzen";
{
  const sf: string[] = [];
  const safsu = KURAL_BOLUMLERI.find((k) => k.id === "safsu")!;
  const hortum = safsu.maddeler.find((m) => /HORTUM/i.test(m) && /SİFON/i.test(m));
  if (!hortum || !maddeAyir(hortum).onemli) sf.push("Saf Su bölümünde ÖNEMLİ (!) hortum/sifonlama maddesi yok");
  if (!safsu.maddeler.some((m) => /DİNAMO YANAR/.test(m) && maddeAyir(m).onemli)) sf.push("dinamo maddesi ÖNEMLİ (!) işaretli değil");
  if (!/HORTUM/i.test(DINAMO_UYARI) || !/sifon/i.test(DINAMO_UYARI)) sf.push("Asistan/Rehber saf su uyarısında hortum-sifon yok");
  if (!KURAL_BOLUMLERI.find((k) => k.id === "cikis")!.maddeler.some((m) => /saf su hortumu/i.test(m))) sf.push("Çıkış listesinde saf su hortumu yok");
  const t = kurallarMetni();
  if (/[•☐] !/.test(t)) sf.push("WhatsApp metnine ham '!' işareti sızıyor");
  if (!/‼️ \*Kazana saf su eklendikten sonra/.test(t)) sf.push("WhatsApp metninde hortum kuralı ‼️ ile vurgulanmamış");
  if (sf.length) { console.error("❌ Saf su hortumu kuralı:\n  " + sf.join("\n  ")); process.exit(1); }
  console.log("✅ Saf su hortumu/sifonlama kuralı: Kurallar, Çıkış listesi, Asistan/Rehber uyarısı, WhatsApp");
}
// ── Musa Hocam düzeltmeleri (17 Kas): kazan no kolonda · ürün kartı asılmıyor · klor–asit "eklenmez" ──
import { KLOR_ASIT_KURAL, KATI_SABUN_KAZAN_KURAL } from "../src/atolyeDuzen";
{
  const dz: string[] = [];
  const hepsi = [...KURAL_BOLUMLERI.flatMap((k) => k.maddeler), kurallarMetni()].join("\n");
  if (/ellenmez/i.test(hepsi) || /ellenmez/i.test(readFileSync("src/modules/yardim.ts", "utf8"))) dz.push("'ellenmez' geçiyor (doğrusu: eklenmez)");
  // Katı / defne yağlı sabun 900 kg kazanda yapılmaz: kural metninde + bütün katı sabunlar kazan dışı
  if (!KURAL_BOLUMLERI.find((k) => k.id === "kazan")!.maddeler.includes("!" + KATI_SABUN_KAZAN_KURAL) || !/defne/i.test(KATI_SABUN_KAZAN_KURAL)) dz.push("katı/defne sabun kazan kuralı öğrenci kurallarında yok");
  for (const u of URUNLER) if ((u.kat === "Katı Sabun" || u.ings.some(([a]) => a === "Defne Yağı")) && urunKazanTipi(u.id) !== null) dz.push(`${u.ad} kazanda yapılabiliyor görünüyor`);
  if (!/eklenmez/.test(KLOR_ASIT_KURAL) || !KURAL_BOLUMLERI.find((k) => k.id === "kazan")!.maddeler.includes(KLOR_ASIT_KURAL)) dz.push("klor–asit kuralı tek metinden gelmiyor");
  if (/kartla asılır|ağzına o gün/i.test(hepsi)) dz.push("kazana ürün kartı asma maddesi geri gelmiş (atölyede yapılmıyor)");
  if (!/arkasındaki kolona/.test(hepsi)) dz.push("kazan numarasının kolonda olduğu yazmıyor");
  if (dz.length) { console.error("❌ Kazan kuralı düzeltmeleri:\n  " + dz.join("\n  ")); process.exit(1); }
  console.log("✅ Kazan kuralları: numara kolonda, kart asma yok, klor–asit 'eklenmez' (tek metin)");
}
// ── Musa Hocam (17 Kas): dolum kuralı sade · gözlük ihtiyaç hâlinde ──
import { GOZLUK_KURAL } from "../src/atolyeDuzen";
{
  const gd: string[] = [];
  const dolum = KURAL_BOLUMLERI.find((k) => k.id === "dolum")!.maddeler;
  if (dolum.length !== 1 || !/dolum çizgisine kadar/.test(dolum[0]) || !/israf/.test(dolum[0])) gd.push("Dolum bölümü tek madde olmalı: dolum çizgisine kadar, yere dökmeden, israf etmeden");
  const hepsi = KURAL_BOLUMLERI.flatMap((k) => k.maddeler).join("\n");
  if (/tepsi|ters çevir/i.test(hepsi)) gd.push("dolumda tepsi/ters çevirme maddesi geri gelmiş");
  if (/gözlük[^.]*üretim bitene kadar/i.test(hepsi)) gd.push("gözlük üretim boyunca takılı yazıyor");
  if (!/ihtiyaç hâlinde/.test(GOZLUK_KURAL) || !hepsi.includes(GOZLUK_KURAL)) gd.push("gözlük kuralı tek metinden gelmiyor");
  if (!readFileSync("src/modules/asistan.ts", "utf8").includes("GOZLUK_KURAL")) gd.push("Asistan güvenlik adımı gözlük kuralını kullanmıyor");
  if (gd.length) { console.error("❌ Dolum/gözlük kuralı:\n  " + gd.join("\n  ")); process.exit(1); }
  console.log("✅ Dolum kuralı sade (tek madde), gözlük ihtiyaç hâlinde (Kurallar + Asistan)");
}
// ── Musa Hocam (17 Kas): herkese 3 eldiven, fazlası öğretmenden · çıkan eldiven çöp kovasına ──
{
  const el = KURAL_BOLUMLERI.find((k) => k.id === "eldiven")!.maddeler.join("\n");
  const ed: string[] = [];
  if (!/Herkese 3 eldiven/.test(el) || !/öğretmenden istenir/.test(el)) ed.push("'herkese 3 eldiven, fazlası öğretmenden' maddesi yok");
  if (!/çöp kovasına atılır/.test(el)) ed.push("'çıkan eldiven çöp kovasına atılır' maddesi yok");
  if (/3 çift|eldiven kovası|KOVAYA atılır/.test(el)) ed.push("eski eldiven ifadesi (3 çift / eldiven kovası) kalmış");
  if (ed.length) { console.error("❌ Eldiven kuralı:\n  " + ed.join("\n  ")); process.exit(1); }
  console.log("✅ Eldiven: herkese 3, fazlası öğretmenden, çıkan eldiven çöp kovasına");
}
// ── Musa Hocam (17 Kas): taşıma için isim yazılmaz, "adalet gözetilir" denir; taşıyıcı adları PDF'e/mesaja girmez ──
{
  const tz: string[] = [];
  const tasima = KURAL_BOLUMLERI.find((k) => k.id === "tasima")!.maddeler.join("\n");
  if (!/adalet gözetilir/.test(tasima)) tz.push("Taşıma bölümünde adalet gözetilir yok");
  if (!/her kazanda sıra değişir/.test(tasima) || /her üretimde sıra/.test(tasima)) tz.push("Taşıma: sıra her KAZANDA değişir (Musa Hocam)");
  if (/taşıyıcıları vardır|günün planında kazanın yanında|program, önceki/i.test(tasima)) tz.push("Taşıma kuralında belirlenmiş taşıyıcı/isim ifadesi kalmış");
  const dz = readFileSync("src/modules/duzen.ts", "utf8");
  const pdf = dz.slice(dz.indexOf("function bloklar"), dz.indexOf("// ── PDF üret"));
  const msj = dz.slice(dz.indexOf("export async function dzMesajPaylas"));
  if (/TASIMA_ANAHTAR/.test(pdf)) tz.push("PDF taşıyıcı adlarını basıyor");
  if (/TASIMA_ANAHTAR/.test(msj)) tz.push("Günün planı mesajı taşıyıcı adlarını gönderiyor");
  if (tz.length) { console.error("❌ Taşıma kuralı:\n  " + tz.join("\n  ")); process.exit(1); }
  console.log("✅ Taşıma: 'adalet gözetilir', taşıyıcı adları PDF'e ve mesaja girmiyor");
}
// ── Musa Hocam (17 Kas): telefon şeflik odasına teslim · görevi olmayan atölyeye giremez ──
{
  const tf: string[] = [];
  const dav = KURAL_BOLUMLERI.find((k) => k.id === "davranis")!.maddeler.join("\n");
  const hepsi = KURAL_BOLUMLERI.flatMap((k) => k.maddeler).join("\n");
  if (!/telefon[^\n]*şeflik odasına teslim[^\n]*öğretmenden geri alınır/i.test(dav)) tf.push("telefon teslim maddesi yok");
  if (!dav.includes("Üretimde görevli olmayan hiçbir öğrenci üretim atölyesine giremez. Diğer bölümlerin öğrencileri özellikle giremez.")) tf.push("atölyeye giriş maddesi Musa Hocam'ın cümlesiyle değil");
  if (/cepte durur|telefona,/i.test(hepsi)) tf.push("telefonun atölyede olduğunu varsayan eski ifade kalmış");
  if (tf.length) { console.error("❌ Telefon/giriş kuralı:\n  " + tf.join("\n  ")); process.exit(1); }
  console.log("✅ Telefon şeflik odasında, görevi olmayan atölyeye giremez");
}
// ── Musa Hocam (17 Kas): soyunma odasında iş kıyafeti bırakılmaz · çizmeler iç odaya dizilir ──
{
  const so: string[] = [];
  const soy = KURAL_BOLUMLERI.find((k) => k.id === "soyunma")!.maddeler;
  const cik = KURAL_BOLUMLERI.find((k) => k.id === "cikis")!.maddeler;
  const kiyafet = soy.find((m) => /iş kıyafeti bırakılmaz/.test(m));
  if (!kiyafet || !maddeAyir(kiyafet).onemli) so.push("Soyunma: ÖNEMLİ (!) 'iş kıyafeti bırakılmaz' maddesi yok");
  if (!soy.some((m) => /Çizmeler iç odaya/.test(m))) so.push("Soyunma: çizmeler iç odaya maddesi yok");
  if (!cik.some((m) => /iş kıyafeti bırakılmamış/.test(m)) || !cik.some((m) => /Çizmeler iç odaya/.test(m))) so.push("Çıkış listesinde kıyafet/çizme maddesi yok");
  if (soy.some((m) => /Kıyafet asılır/.test(m))) so.push("çelişen 'Kıyafet asılır' maddesi geri gelmiş");
  if (so.length) { console.error("❌ Soyunma odası kuralı:\n  " + so.join("\n  ")); process.exit(1); }
  console.log("✅ Soyunma odası: iş kıyafeti bırakılmaz, çizmeler iç odaya (Kurallar + Çıkış listesi)");
}
// ── İmza: "Kimya Zümre Öğretmenleri" (tek öğretmen adı değil) — PDF + WhatsApp ──
import { IMZA_ZUMRE } from "../src/atolyeDuzen";
{
  const dzK = readFileSync("src/modules/duzen.ts", "utf8");
  const im: string[] = [];
  if (IMZA_ZUMRE !== "Kimya Zümre Öğretmenleri") im.push("imza metni değişmiş");
  if (!/class="imza"><div>\$\{IMZA_ZUMRE\}<\/div><\/div>/.test(dzK) || /Sorumlu Öğretmen<br>|Atölye Şefi/.test(dzK)) im.push("PDF imzası yalnız 'Kimya Zümre Öğretmenleri' olmalı (öğretmen adı / Atölye Şefi yok)");
  if (!kurallarMetni().trim().endsWith(IMZA_ZUMRE)) im.push("WhatsApp metni zümre imzasıyla bitmiyor");
  if (im.length) { console.error("❌ İmza:\n  " + im.join("\n  ")); process.exit(1); }
  console.log("✅ İmza: Kimya Zümre Öğretmenleri (PDF + WhatsApp)");
}
// ── Musa Hocam (17 Kas): görev dağılımı ve "Görevler ve Sorumluluklar" YOK (PDF, WhatsApp, ekran, kurallar) ──
{
  const gr: string[] = [];
  const dzS = readFileSync("src/modules/duzen.ts", "utf8"), adS = readFileSync("src/atolyeDuzen.ts", "utf8");
  if (/export const ROLLER|interface Rol\b/.test(adS)) gr.push("ROLLER/Rol tanımı geri gelmiş");
  if (/Bugünün Görev Dağılımı|Bugünün görev dağılımı|<h2>📌 Görevler ve Sorumluluklar|dz-r-/.test(dzS)) gr.push("Atölye Düzeni ekranında/PDF'te görev dağılımı ya da görevler bölümü var");
  if (/GÖREVLER/.test(kurallarMetni()) || /GÖREVLER/.test(dzS)) gr.push("WhatsApp metninde/mesajda GÖREVLER bölümü var");
  const km = [...KURAL_BOLUMLERI.flatMap((k) => k.maddeler), ...ALTIN_KURAL.sira, ...ALTIN_KURAL.maddeler].join(" ");
  if (/kazan sorumlusu|kontrolcü|temizlik başı/i.test(km)) gr.push("kurallar artık olmayan rollere atıf yapıyor (kazan sorumlusu/kontrolcü/temizlik başı)");
  if (/görev dağılımı/i.test(readFileSync("index.html", "utf8") + readFileSync("src/rehber.ts", "utf8"))) gr.push("index.html ya da rehber'de 'görev dağılımı' geçiyor");
  if (gr.length) { console.error("❌ Görev dağılımı kaldırma:\n  " + gr.join("\n  ")); process.exit(1); }
  console.log("✅ Görev dağılımı ve Görevler/Sorumluluklar her yerden kaldırıldı; kurallar rol atfı içermiyor");
}
// ── Musa Hocam (17 Kas): PDF başlığında "Üretim günü · Sorumlu öğretmen" satırı yok; mesajda öğretmen adı yok ──
{
  const dzS2 = readFileSync("src/modules/duzen.ts", "utf8");
  if (/Sorumlu öğretmen|Üretim günü: <b>|dz-ogretmen/.test(dzS2)) { console.error("❌ PDF/mesaj/ekranda 'Sorumlu öğretmen' ya da başlıkta 'Üretim günü' satırı var"); process.exit(1); }
  console.log("✅ PDF başlığında üretim günü/sorumlu öğretmen satırı yok; mesaj ve ekranda öğretmen adı yok");
}
// ── Musa Hocam (17 Kas): "dağınık eşyanın sahibi bellidir" ifadesi yok ──
if (/sahibi bellidir/.test(KURAL_BOLUMLERI.flatMap((k) => k.maddeler).join(" "))) { console.error("❌ 'sahibi bellidir' ifadesi geri gelmiş"); process.exit(1); }
console.log("✅ Soyunma odası: 'sahibi bellidir' ifadesi yok");
// ── Musa Hocam (17 Kas): Değerlendirme = üç başlık + "bir daha üretim faaliyetine alınmaz" ──
{
  const dg = KURAL_BOLUMLERI.find((k) => k.id === "puan")!.maddeler;
  if (dg.length !== 2 || !dg.includes("Düzeni bozan, kurallara uymayan öğrenci bir daha üretim faaliyetine alınmaz.") || /Beceri Karnesi|kazan ve dolum görevine/.test(dg.join(" "))) { console.error("❌ Değerlendirme bölümü Musa Hocam'ın istediği gibi değil"); process.exit(1); }
  console.log("✅ Değerlendirme: 2 madde, 'bir daha üretim faaliyetine alınmaz'");
}
// ── Musa Hocam (17 Kas): katı sabun tüpte 8 kg'lık kapta; tahta karıştırıcı/kalıp/düzleştirici + mala; kesim ayrıntılı; kap önerisi ──
import { KAP_VARSAYILAN_KG, kapPlani, kalipPlani, kapOnerisi, superyag, yagdanUrunKg, yagOrani, KATI_EKIPMAN } from "../src/katiSabun";
{
  const ks: string[] = [];
  if (KAP_VARSAYILAN_KG !== 8 || !KATI_SABUN_KAZAN_KURAL.includes("8 kg'lık kap") || !/tüp/.test(KATI_SABUN_KAZAN_KURAL)) ks.push("kural metni 8 kg'lık kap/tüp demiyor");
  if (!/ALÜMİNYUM/.test(KATI_EKIPMAN.join(" "))) ks.push("alüminyum kap yasağı ekipmanda yok");
  // Kap planı: soğuk 20 kg, 8 kg kap (en fazla 6 kg) → 4 parti × 5 kg; sıcak en fazla 4 kg
  const kp = kapPlani(20, 8, false);
  if (kp.kapSayisi !== 4 || Math.abs(kp.kapBasiKg - 5) > 1e-9) ks.push(`kap planı 20 kg/8 kg → ${kp.kapSayisi}×${kp.kapBasiKg}`);
  if (kapPlani(6, 8, false).kapSayisi !== 1 || kapPlani(6, 8, true).kapSayisi !== 2) ks.push("doluluk sınırı (soğuk %75 / sıcak %50) çalışmıyor");
  // Kap önerisi: 6+2 = 8 kg soğuk → en az 10,67 kg → 15 kg'lık kap; 6 kg → 8 kg'lık kap
  if (kapOnerisi(8, false).onerilenKg !== 15 || kapOnerisi(6, false).onerilenKg !== 8 || kapOnerisi(500, false).onerilenKg !== null) ks.push("kap önerisi yanlış");
  // Yağ miktarından ürün: kastilya-soğuk 6 kg yağ → 6/0,665 kg ürün
  const kas = URUNLER.find((u) => u.id === "kastilya-soguk")!;
  if (Math.abs(yagdanUrunKg(kas, 6) * yagOrani(kas) - 6) > 1e-9) ks.push("yağdan ürün hesabı tutarsız");
  // Kalıp: 6 kg, 30×40 → 1 kalıp, ≈4,7 cm, 5 cm kesim, 35 adet, ≈125 g
  const kl = kalipPlani(6, 1.07, 30, 40);
  if (kl.kalipSayisi !== 1 || Math.abs(kl.kalinlikCm - 4.67) > 0.01 || kl.kesimCm !== 5 || kl.kalipBasiAdet !== 35 || Math.abs(kl.kalipSabunG - 125) > 3) ks.push(`kalıp planı: ${JSON.stringify(kl)}`);
  if (kalipPlani(30, 1.07, 30, 40).kalinlikCm > 7) ks.push("kalın döküm ikinci kalıba bölünmüyor");
  for (const u of URUNLER.filter((x) => x.kat === "Katı Sabun")) {
    const sy = superyag(u);
    if (sy < 3 || sy > 10) ks.push(`${u.ad}: süperyağ %${sy.toFixed(1)} (3–10 dışında)`);
    const p = prosesUret(u), metin = JSON.stringify(p);
    for (const k of ["tahta karıştırıcı", "tahta kalıp", "düzleştirici", "mala", "tüp", "kesin", "Kürlemeye"]) if (!metin.toLocaleLowerCase("tr-TR").includes(k.toLocaleLowerCase("tr-TR"))) ks.push(`${u.ad}: proseste '${k}' yok`);
    if (/blender|mikser|spatula|kazan[ıa] (ekle|dök)/i.test(metin)) ks.push(`${u.ad}: proseste atölyede olmayan araç/kazan ifadesi`);
    if (p.some((a) => a.tip === "dolum")) ks.push(`${u.ad}: kalıplama 'dolum' tipinde (bidon dolum rehberi karışır)`);
    for (const k of ["kap", "kalip", "kesim"] as const) if (!p.some((a) => a.kati === k)) ks.push(`${u.ad}: '${k}' planı adımı yok`);
    const kesim = p.find((a) => a.kati === "kesim")!;
    if ((kesim.liste?.length || 0) < 6) ks.push(`${u.ad}: kesim yeterince ayrıntılı değil`);
  }
  const rehberMetin = JSON.stringify(URUN_REHBER["kastilya-soguk"]) + (readFileSync("index.html", "utf8").split('id="yh-katisabun"')[1] || "").split(/<div id="yh-(?!katisabun)/)[0];
  if (rehberMetin.length < 2000) ks.push("Rehber katı sabun bölümü okunamadı");
  if (/blender|çubuk mikser|Spatula/i.test(rehberMetin)) ks.push("Rehber'de atölyede olmayan araç (blender/mikser/spatula) geçiyor");
  if (ks.length) { console.error("❌ Katı sabun (kap/tüp/tahta ekipman):\n  " + ks.join("\n  ")); process.exit(1); }
  console.log("✅ Katı sabun: 8 kg'lık kap/tüp, kap önerisi (ürün ya da yağ miktarından), tahta kalıp + kesim planı, süperyağ %3–10");
}
// ── Musa Hocam (17 Kas): kostik tartılıp suya TEK SEFERDE eklenir, parça parça değil; dil testi yok ──
import { KOSTIK_COZME } from "../src/katiSabun";
{
  const kk: string[] = [];
  if (!/TEK SEFERDE/.test(KOSTIK_COZME) || !/parça parça eklenmez/.test(KOSTIK_COZME)) kk.push("KOSTIK_COZME metni tek seferde/parça parça demiyor");
  for (const u of URUNLER.filter((x) => x.kat === "Katı Sabun")) {
    const ad = prosesUret(u).find((a) => a.ekle?.includes("Kostik"));
    if (!ad?.not?.includes(KOSTIK_COZME)) kk.push(`${u.ad}: kostik adımı tek metinden gelmiyor`);
    if (/azar azar|yavaş yavaş|her eklemede/i.test(JSON.stringify(ad))) kk.push(`${u.ad}: kostik adımında parça parça ekleme ifadesi`);
  }
  const ks = (readFileSync("index.html", "utf8").split('id="yh-katisabun"')[1] || "").split(/<div id="yh-(?!katisabun)/)[0];
  if (/NaOH'u <b>soğuk suya<\/b> yavaşça|azar azar/.test(ks)) kk.push("Rehber katı sabunda kostik parça parça/yavaşça ekleniyor");
  if (/<b>Zap Testi:<\/b>|dile dokun/.test(readFileSync("index.html", "utf8"))) kk.push("Programda dil (zap) testi öneriliyor");
  if (kk.length) { console.error("❌ Kostik çözme:\n  " + kk.join("\n  ")); process.exit(1); }
  console.log("✅ Kostik suya tek seferde (Asistan + Rehber), dil testi yok");
}
// ── Musa Hocam (17 Kas): atölye yöntemi = SICAK PROSES (2 kez kabartma); yağa göre su + kostik ──
import { sicakMi, KABARTMA_SAYISI, HALEP_OLGUNLASMA, yagaGoreSuKostik } from "../src/katiSabun";
{
  const sp: string[] = [];
  const u = (id: string) => URUNLER.find((x) => x.id === id)!;
  for (const id of ["halep-20", "halep-30", "halep-40", "kastilya-sicak"]) {
    if (!sicakMi(u(id))) sp.push(`${id} sıcak proses değil`);
    const m = JSON.stringify(prosesUret(u(id)));
    if (KABARTMA_SAYISI !== 2 || !m.includes("2 kez kabart") || !m.includes("1. KABARMA") || !m.includes("2. KABARMA")) sp.push(`${id}: 2 kez kabartma adımı yok`);
    if (!/ısınan yağa yavaşça ekle/.test(m)) sp.push(`${id}: kostik çözeltisi ısınan yağa yavaşça eklenmiyor`);
  }
  if (sicakMi(u("kastilya-soguk")) || JSON.stringify(prosesUret(u("kastilya-soguk"))).includes("KABARMA")) sp.push("kastilya-soğuk kabartılıyor");
  // Yağa göre su/kostik: Halep %30, 6 kg yağ → su 6×25,5/66, kostik 6×8,5/66; yağ+su+kostik = ürün
  const sk = yagaGoreSuKostik(u("halep-30"), 6);
  if (Math.abs(sk.su - 6 * 25.5 / 66) > 1e-9 || Math.abs(sk.kostik - 6 * 8.5 / 66) > 1e-9) sp.push(`yağa göre su/kostik yanlış: ${JSON.stringify(sk)}`);
  for (const x of URUNLER.filter((y) => y.kat === "Katı Sabun")) { const s = yagaGoreSuKostik(x, 5); if (Math.abs(5 + s.su + s.kostik - yagdanUrunKg(x, 5)) > 1e-9) sp.push(`${x.id}: yağ+su+kostik ≠ ürün`); }
  const html = readFileSync("index.html", "utf8");
  if (/YÖNTEM [345] — Halep[^<]*Soğuk Proses/.test(html)) sp.push("Rehber'de Halep hâlâ soğuk proses");
  if (!/YÖNTEM 2[\s\S]{0,4000}<b>2 kez<\/b>/.test(html)) sp.push("Rehber Yöntem 2'de 2 kez kabartma yok");
  for (const [id, sure] of Object.entries(HALEP_OLGUNLASMA)) { const o = u(id).ings.find(([a]) => a === "Defne Yağı")![1]; const pct = Math.round(o / 66 * 10) * 10;
    if (!html.includes(`<td class="tc">%${pct}</td><td>${sure}</td>`)) sp.push(`${id}: olgunlaşma süresi Rehber tablosuyla aynı değil`); }
  if (sp.length) { console.error("❌ Sıcak proses / yağa göre su-kostik:\n  " + sp.join("\n  ")); process.exit(1); }
  console.log("✅ Atölye yöntemi sıcak proses (2 kez kabartma), yağa göre su + kostik, Rehber ile aynı");
}
