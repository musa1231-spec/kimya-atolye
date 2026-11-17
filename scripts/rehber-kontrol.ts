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
import { KAZANLAR, URUN_AILE, ROLLER, ALTIN_KURAL, KURAL_BOLUMLERI, kazanPlaniDenetle, asistanKazanEngel, urunKazanTipi, VISKOZ_URUN, KAZAN_DISI_URUN, SAF_SU_DINAMO_UYARI } from "../src/atolyeDuzen";
{
  const dh: string[] = [];
  for (const u of URUNLER) if (!URUN_AILE[u.id]) dh.push(`URUN_AILE: '${u.id}' ailesi tanımsız`);
  for (const id of [...Object.keys(URUN_AILE), ...VISKOZ_URUN, ...KAZAN_DISI_URUN]) if (!URUNLER.some((u) => u.id === id)) dh.push(`'${id}' URUNLER'de yok`);
  if (KAZANLAR.length !== 4 || KAZANLAR.some((k) => k.kapasiteKg !== 900)) dh.push("4 kazan × 900 kg bekleniyordu");
  if (KAZANLAR.filter((k) => k.tip === "yuksek").map((k) => k.no).join() !== "K3,K4") dh.push("yüksek kazanlar K3 ve K4 olmalı (Musa Hocam, 17 Kas)");
  if (!KURAL_BOLUMLERI.some((k) => k.id === "cikis" && k.maddeler.length >= 10)) dh.push("çıkış kontrol listesi eksik");
  if (new Set(KAZANLAR.map((k) => k.no)).size !== KAZANLAR.length) dh.push("kazan numarası tekrarlıyor");
  if (new Set(ROLLER.map((r) => r.id)).size !== ROLLER.length) dh.push("rol kimliği tekrarlıyor");
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
  console.log(`✅ Atölye Düzeni: ${KAZANLAR.length} kazan, ${ROLLER.length} rol, ${KURAL_BOLUMLERI.length} kural bölümü; engeller çalışıyor`);
}
// WhatsApp metni bütün bölümleri içermeli (PDF ile aynı kaynak)
import { kurallarMetni } from "../src/atolyeDuzen";
{
  const t = kurallarMetni(), eksik: string[] = [];
  for (const k of KURAL_BOLUMLERI) if (!t.includes(k.baslik.toLocaleUpperCase("tr-TR"))) eksik.push(k.baslik);
  for (const r of ROLLER) if (!t.includes(r.ad)) eksik.push(r.ad);
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
    { tarih: "2026-11-10", roller: { "tasima-K3": "Ali, Veli", koli: "Ayşe" } },
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
  const kuralMetin = [...KURAL_BOLUMLERI.flatMap((k) => k.maddeler), ...ROLLER.flatMap((r) => r.gorevler)].join("\n");
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
