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
