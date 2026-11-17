// ════════════════════════════════════════════════════════════════
// 📋 ATÖLYE DÜZENİ — günün kazan planı + görev dağılımı + kurallar
// Öğrenci PDF'i (WhatsApp grubu için) bu sayfadan üretilir.
// İçerik tek kaynaktan: src/atolyeDuzen.ts
// ════════════════════════════════════════════════════════════════
import { URUNLER, ATOLYE_BILGI } from "../constants";
import {
  KAZANLAR, ROLLER, ALTIN_KURAL, KURAL_BOLUMLERI, URUN_AILE, AILE_AD, kazanPlaniDenetle,
  KAZAN_TIP_AD, kazanUrunleri, urunKazanTipi, kurallarMetni,
  maddeAyir, IMZA_ZUMRE, TASIMA_ANAHTAR, GELENLER_ANAHTAR, TASIYICI_SAYISI, adListesi, adNorm, agirIsYapanlar, agirIsSayaci, adilTasiyiciDagit,
} from "../atolyeDuzen";
import type { KazanPlanSatir } from "../atolyeDuzen";
import { store, session } from "../state";
import { $, today, fmt, setHTML, showToast } from "../helpers";
import { planTablo, upsertAtolyePlan, getAtolyePlan } from "../db";
import type { AtolyePlan } from "../types";
import { whatsappPaylas } from "../lib/paylas";
import { audit } from "../audit";

// ── Plan: veritabanında (atolye_planlari, tarih başına bir satır) → bütün cihazlar ortak görür.
// Tablo yoksa (henüz açılmadıysa) bu cihazda saklanır; tablo açılınca cihazdaki plan otomatik taşınır.
export type DuzenPlan = AtolyePlan;
const PLAN_KEY = "atolyeDuzenPlan";
const ONCEKI_KEY = "atolyeDuzenOnceki";

const kazanTamamla = (kz: KazanPlanSatir[] | undefined): KazanPlanSatir[] =>
  KAZANLAR.map((k) => (kz || []).find((x) => x.no === k.no) || { no: k.no, urunId: "", kg: k.kapasiteKg });
function bosPlan(tarih = today()): DuzenPlan {
  return { tarih, ogretmen: session.CU?.ad || "", kazan: kazanTamamla([]), roller: {} };
}
function yerelOku(key: string): DuzenPlan | null {
  try {
    const p = JSON.parse(localStorage.getItem(key) || "null") as DuzenPlan | null;
    if (!p || !Array.isArray(p.kazan)) return null;
    return { ...p, kazan: kazanTamamla(p.kazan), roller: p.roller || {} };
  } catch { return null; }
}
function yerelYaz(key: string, p: DuzenPlan): void {
  try { localStorage.setItem(key, JSON.stringify(p)); } catch { /* sessiz */ }
}
function yerelSil(key: string): void {
  try { localStorage.removeItem(key); } catch { /* sessiz */ }
}
const planDolu = (p: DuzenPlan) => p.kazan.some((k) => k.urunId) || Object.values(p.roller).some((v) => (v || "").trim());
const kopya = (p: DuzenPlan): DuzenPlan => ({ ...p, kazan: p.kazan.map((k) => ({ ...k })), roller: { ...p.roller } });

/** Veritabanındaki (önbellekteki) plan. */
function kayitli(tarih: string): DuzenPlan | null {
  const p = store.atolyePlanlari.find((x) => x.tarih === tarih);
  return p ? { ...kopya(p), kazan: kazanTamamla(p.kazan) } : null;
}
function onbellegeYaz(p: DuzenPlan): void {
  const i = store.atolyePlanlari.findIndex((x) => x.tarih === p.tarih);
  if (i >= 0) store.atolyePlanlari[i] = kopya(p); else store.atolyePlanlari.push(kopya(p));
  store.atolyePlanlari.sort((a, b) => b.tarih.localeCompare(a.tarih));
}
function planiBul(tarih: string): DuzenPlan {
  const db = kayitli(tarih);
  if (db) return db;
  const yerel = yerelOku(PLAN_KEY);
  if (yerel && yerel.tarih === tarih) return yerel;
  return bosPlan(tarih);
}
/** "Geçen sefer" — bu tarihten önceki en son dolu plan (görevleri değiştirmek için). */
function oncekiPlan(tarih: string): DuzenPlan | null {
  if (planTablo.var) return store.atolyePlanlari.find((p) => p.tarih < tarih && planDolu(p)) || null;
  const o = yerelOku(ONCEKI_KEY);
  return o && o.tarih < tarih ? o : null;
}

let plan: DuzenPlan = bosPlan();
let gosterilenTarih = "";

/** Asistan için: bugünün planı (önbellekten, eşzamanlı). */
export function bugunKazanPlani(): KazanPlanSatir[] | null {
  const p = kayitli(today()) || (() => { const y = yerelOku(PLAN_KEY); return y && y.tarih === today() ? y : null; })();
  return p && p.kazan.some((k) => k.urunId) ? p.kazan : null;
}
/** Asistan başlarken: başka cihazda yapılan değişiklikleri görmek için planı veritabanından taze oku. */
export async function bugunKazanPlaniTaze(): Promise<KazanPlanSatir[] | null> {
  if (planTablo.var) {
    try {
      const p = await getAtolyePlan(today());
      if (p) onbellegeYaz(p);
      else store.atolyePlanlari = store.atolyePlanlari.filter((x) => x.tarih !== today());
    } catch { /* bağlantı yoksa önbellekteki plan kullanılır */ }
  }
  return bugunKazanPlani();
}

// ── Kaydetme (yazarken her tuşta değil, kısa gecikmeyle) ──────────
let kayitZaman: number | null = null;
let kayitSuruyor: Promise<void> | null = null;
function durumYaz(html: string): void { setHTML("dz-durum", html); }
const durumOrtak = () => `<span style="color:#2e7d32">✓ Kaydedildi — bütün cihazlar bu planı görür</span>`;
const durumYerel = () => `<span style="color:#a15c00">⚠️ Ortak plan tablosu henüz açılmadı: plan yalnızca BU cihazda saklanıyor</span>`;

async function dbKaydet(p: DuzenPlan): Promise<void> {
  if (!planTablo.var) return;
  durumYaz(`<span class="tm">Kaydediliyor…</span>`);
  try {
    const k = await upsertAtolyePlan(p, session.CU?.ad || "");
    onbellegeYaz(k);
    durumYaz(durumOrtak());
  } catch (e) {
    console.error(e);
    yerelYaz(PLAN_KEY, p);   // veri kaybolmasın
    durumYaz(`<span style="color:#b71c1c">⛔ Veritabanına kaydedilemedi (${esc((e as Error).message || "bağlantı")}). Plan bu cihazda tutuldu; sayfayı yenileyip tekrar deneyin.</span>`);
  }
}
/** Bekleyen kaydı hemen yap (PDF/mesaj öncesi, tarih değişmeden önce). */
async function bekleyeniYaz(): Promise<void> {
  if (kayitZaman) { clearTimeout(kayitZaman); kayitZaman = null; kayitSuruyor = dbKaydet(kopya(plan)); }
  if (kayitSuruyor) await kayitSuruyor;
}

/** Tablo açıldıysa cihazda kalmış planı veritabanına taşı (bir kez). */
async function yereliTasi(): Promise<void> {
  if (!planTablo.var) return;
  const y = yerelOku(PLAN_KEY);
  if (!y || !planDolu(y)) { yerelSil(PLAN_KEY); return; }
  if (kayitli(y.tarih)) { yerelSil(PLAN_KEY); return; }   // veritabanındaki geçerli
  try { onbellegeYaz(await upsertAtolyePlan(y, session.CU?.ad || "")); yerelSil(PLAN_KEY); yerelSil(ONCEKI_KEY); showToast("Bu cihazdaki plan ortak tabloya taşındı"); }
  catch { /* sonra tekrar denenir */ }
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" } as Record<string, string>)[c]);
const urunAdi = (id: string) => URUNLER.find((u) => u.id === id)?.ad || "";

// ── Sayfa ─────────────────────────────────────────────────────────
export function rDuzen(): void {
  if (!gosterilenTarih) gosterilenTarih = today();
  plan = planiBul(gosterilenTarih);
  if (!plan.ogretmen && session.CU) plan.ogretmen = session.CU.ad;
  const onceki = oncekiPlan(plan.tarih);
  const ogrAdlari = store.ogrenciler.map((o) => o.ad).sort((a, b) => a.localeCompare(b, "tr"));

  setHTML("dz-form", `
    <div class="dz-ust">
      <div class="fg"><label>Üretim tarihi</label><input type="date" id="dz-tarih" value="${plan.tarih}" onchange="dzTarihDegisti()"></div>
      <div class="fg"><label>Sorumlu öğretmen</label><input type="text" id="dz-ogretmen" value="${esc(plan.ogretmen)}" list="dz-ogr-list" oninput="dzKaydet()" autocomplete="off">
        <datalist id="dz-ogr-list">${store.ogretmenler.map((o) => `<option value="${esc(o.ad)}">`).join("")}</datalist></div>
    </div>
    <div id="dz-durum" class="dz-durum">${planTablo.var ? (kayitli(plan.tarih) ? durumOrtak() : `<span class="tm">Bu gün için henüz plan yok — girdiğiniz anda ortak kaydedilir.</span>`) : durumYerel()}</div>
    <div class="ch" style="margin-top:6px"><span class="ct">🛢️ Bugün hangi kazanda ne yapılıyor?</span></div>
    <div class="tw"><table class="dz-kazan"><thead><tr><th>Kazan</th><th>Ürün</th><th class="tr">Miktar (kg)</th><th>🏋️ Taşıyıcılar</th><th>Tür</th></tr></thead><tbody>
    ${plan.kazan.map((k, i) => {
      const kz = KAZANLAR.find((x) => x.no === k.no)!;
      const kap = kz.kapasiteKg;
      const uygun = kazanUrunleri().filter((u) => urunKazanTipi(u.id) === kz.tip);
      const diger = kazanUrunleri().filter((u) => urunKazanTipi(u.id) !== kz.tip);
      const opt = (u: { id: string; ad: string }) => `<option value="${u.id}" ${u.id === k.urunId ? "selected" : ""}>${u.ad}</option>`;
      return `<tr>
        <td><b class="dz-kno">${k.no}</b><div class="tm">${kap} kg · ${kz.tip === "yuksek" ? "⬆️ yüksek" : "⬇️ alçak"}</div></td>
        <td><select id="dz-k-u-${i}" onchange="dzKaydet()" style="margin:0"><option value="">— Boş / kullanılmıyor —</option>
          <optgroup label="${KAZAN_TIP_AD[kz.tip]}">${uygun.map(opt).join("")}</optgroup>
          <optgroup label="Diğer (uygun değil)">${diger.map(opt).join("")}</optgroup></select></td>
        <td class="tr"><input type="number" id="dz-k-kg-${i}" value="${k.kg || ""}" min="1" max="${kap}" oninput="dzKaydet()" style="margin:0;width:90px;text-align:right"></td>
        <td><input type="text" id="dz-k-t-${i}" value="${esc(plan.roller[TASIMA_ANAHTAR(k.no)] || "")}" list="dz-ogc-list" oninput="dzKaydet()" placeholder="Taşıyıcılar" autocomplete="off" style="margin:0;min-width:150px"></td>
        <td class="tm">${k.urunId ? AILE_AD[URUN_AILE[k.urunId]] || "" : ""}</td></tr>`;
    }).join("")}
    </tbody></table></div>
    <div id="dz-denetim"></div>
    <div class="dz-adalet">
      <div class="ch" style="margin:0 0 6px"><span class="ct">⚖️ Ağır iş adaleti — kazan taşıyıcıları</span><span class="tm">🔒 Yalnız öğretmen için: bu adlar PDF'e ve gruba giden mesaja girmez</span></div>
      <div class="fg" style="margin-bottom:6px"><label>Bugün gelen öğrenciler (virgülle)</label>
        <input type="text" id="dz-gelenler" value="${esc(plan.roller[GELENLER_ANAHTAR] || "")}" list="dz-ogc-list" oninput="dzKaydet();dzSayacGoster()" placeholder="Örn. Ali Yılmaz, Veli Kaya, …" autocomplete="off"></div>
      <div class="bgrp" style="margin-bottom:6px"><button class="btn bp" onclick="dzAdilDagit()">⚖️ Taşıyıcıları adil dağıt</button>
        <span class="tm">Her kullanılan kazana ${TASIYICI_SAYISI} kişi; önceki günlerde en az ağır iş yapan öne alınır. Elle yazılan kazana dokunulmaz. Öğretmen ya da gönüllü isterse aynı kişiyi birden çok kazana yazabilir.</span></div>
      <div id="dz-sayac"></div>
    </div>
    <div class="ch" style="margin-top:12px"><span class="ct">👥 Bugünün görev dağılımı</span><span class="tm">Adları virgülle yazın. Her üretimde görevleri değiştirin.</span></div>
    <datalist id="dz-ogc-list">${ogrAdlari.map((a) => `<option value="${esc(a)}">`).join("")}</datalist>
    <div class="dz-roller">
    ${ROLLER.map((r) => `<div class="fg dz-rol">
      <label>${r.ikon} ${r.ad} <span class="tm">(${r.kisi})</span></label>
      <input type="text" id="dz-r-${r.id}" value="${esc(plan.roller[r.id] || "")}" list="dz-ogc-list" oninput="dzKaydet()" placeholder="Öğrenci adları" autocomplete="off">
      ${onceki?.roller[r.id] ? `<div class="dz-onceki">Geçen sefer (${fmt(onceki.tarih)}): ${esc(onceki.roller[r.id])}</div>` : ""}
    </div>`).join("")}
    </div>`);
  dzDenetimGoster();
  dzSayacGoster();
  setHTML("dz-onizleme", `<div class="pdfd">${pdfStil()}${bloklar().join("")}</div>`);
  // Cihazda kalmış eski plan varsa ortak tabloya taşı, sonra ekranı tazele
  if (planTablo.var && yerelOku(PLAN_KEY)) void yereliTasi().then(() => { if (gosterilenTarih === plan.tarih) rDuzenSessiz(); });
}
function rDuzenSessiz(): void { if ($("pg-duzen")?.classList.contains("active")) rDuzen(); }

/** Tarih değişince o günün planı açılır (yoksa boş plan). */
export async function dzTarihDegisti(): Promise<void> {
  const yeni = (document.getElementById("dz-tarih") as HTMLInputElement | null)?.value || today();
  await bekleyeniYaz();
  if (!planTablo.var && planDolu(plan) && yeni > plan.tarih) yerelYaz(ONCEKI_KEY, plan);   // tablo yokken "geçen sefer"
  gosterilenTarih = yeni;
  rDuzen();
}

function formOku(): void {
  plan.ogretmen = (document.getElementById("dz-ogretmen") as HTMLInputElement | null)?.value || "";
  plan.kazan = plan.kazan.map((k, i) => ({
    no: k.no,
    urunId: (document.getElementById(`dz-k-u-${i}`) as HTMLSelectElement | null)?.value || "",
    kg: parseFloat((document.getElementById(`dz-k-kg-${i}`) as HTMLInputElement | null)?.value || "") || 0,
  }));
  for (const r of ROLLER) plan.roller[r.id] = (document.getElementById(`dz-r-${r.id}`) as HTMLInputElement | null)?.value || "";
  plan.kazan.forEach((k, i) => { plan.roller[TASIMA_ANAHTAR(k.no)] = (document.getElementById(`dz-k-t-${i}`) as HTMLInputElement | null)?.value || ""; });
  plan.roller[GELENLER_ANAHTAR] = (document.getElementById("dz-gelenler") as HTMLInputElement | null)?.value || "";
}

// ── ⚖️ Ağır iş adaleti ────────────────────────────────────────────
/** Geçmiş günlerin ağır iş sayacı (ortak tablo yoksa yalnızca bu cihazdaki geçen sefer). */
function gecmisSayac(): Map<string, number> {
  const kaynak = planTablo.var ? store.atolyePlanlari : [oncekiPlan(plan.tarih)].filter(Boolean) as DuzenPlan[];
  return agirIsSayaci(kaynak, plan.tarih);
}
export function dzSayacGoster(): void {
  const gelen = adListesi((document.getElementById("dz-gelenler") as HTMLInputElement | null)?.value ?? plan.roller[GELENLER_ANAHTAR]);
  if (!gelen.length) { setHTML("dz-sayac", `<div class="tm">Gelen öğrencileri yazınca, her birinin önceki günlerde kaç kez ağır iş yaptığı burada görünür.</div>`); return; }
  const say = gecmisSayac();
  const bugun = new Map<string, number>();
  for (const ad of agirIsYapanlar({ tarih: plan.tarih, roller: plan.roller })) bugun.set(adNorm(ad), (bugun.get(adNorm(ad)) || 0) + 1);
  const sirali = [...gelen].sort((a, b) => (say.get(adNorm(a)) || 0) - (say.get(adNorm(b)) || 0) || a.localeCompare(b, "tr"));
  setHTML("dz-sayac", `<div class="tm" style="margin-bottom:4px">Önceki günlerde ağır iş sayısı${planTablo.var ? "" : " (ortak tablo yok: yalnızca bu cihazdaki geçen sefer sayılıyor)"} · <b>+bugün</b></div>
    <div class="dz-chips">${sirali.map((ad) => {
      const g = say.get(adNorm(ad)) || 0, b = bugun.get(adNorm(ad)) || 0;
      return `<span class="dz-chip ${b ? "bugun" : ""}">${esc(ad)} <b>${g}</b>${b ? ` <em>+${b}</em>` : ""}</span>`;
    }).join("")}</div>`);
}

const karistir = (a: string[]) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export function dzAdilDagit(): void {
  formOku();
  const gelen = adListesi(plan.roller[GELENLER_ANAHTAR]);
  if (!gelen.length) { alert("Önce «Bugün gelen öğrenciler» kutusuna o gün atölyeye gelen öğrencileri yazın."); return; }
  const aktif = plan.kazan.filter((k) => k.urunId).map((k) => k.no);
  if (!aktif.length) { alert("Önce hangi kazanda ne yapılacağını seçin. Taşıyıcılar yalnızca kullanılan kazanlara dağıtılır."); return; }
  let sabit: Record<string, string[]> = {};
  for (const no of aktif) { const l = adListesi(plan.roller[TASIMA_ANAHTAR(no)]); if (l.length) sabit[no] = l; }
  if (Object.keys(sabit).length === aktif.length) {
    if (!confirm("Bütün kazanların taşıyıcıları zaten yazılı.\n\nHepsini silip yeniden adil dağıtayım mı?")) return;
    sabit = {};
  }
  const sonuc = adilTasiyiciDagit(gelen, aktif, gecmisSayac(), sabit, karistir);
  plan.kazan.forEach((k, i) => {
    const el = document.getElementById(`dz-k-t-${i}`) as HTMLInputElement | null;
    if (el) el.value = k.urunId ? (sonuc[k.no] || []).join(", ") : "";
  });
  dzKaydet();
  dzSayacGoster();
  showToast("Taşıyıcılar dağıtıldı — istediğiniz adı elle değiştirebilirsiniz");
}

let onizlemeZaman: number | null = null;
export function dzKaydet(): void {
  formOku();
  if (planTablo.var) {
    onbellegeYaz(plan);
    durumYaz(`<span class="tm">Kaydediliyor…</span>`);
    if (kayitZaman) clearTimeout(kayitZaman);
    kayitZaman = window.setTimeout(() => { kayitZaman = null; kayitSuruyor = dbKaydet(kopya(plan)); }, 700);
  } else {
    yerelYaz(PLAN_KEY, plan);
  }
  dzDenetimGoster();
  dzSayacGoster();
  // Tür sütununu ve önizlemeyi tazele (yazarken takılmasın diye kısa gecikmeyle)
  plan.kazan.forEach((k, i) => {
    const td = (document.getElementById(`dz-k-u-${i}`)?.closest("tr")?.lastElementChild) as HTMLElement | null;
    if (td) td.textContent = k.urunId ? AILE_AD[URUN_AILE[k.urunId]] || "" : "";
  });
  if (onizlemeZaman) clearTimeout(onizlemeZaman);
  onizlemeZaman = window.setTimeout(() => setHTML("dz-onizleme", `<div class="pdfd">${pdfStil()}${bloklar().join("")}</div>`), 300);
}

function dzDenetimGoster(): void {
  const d = kazanPlaniDenetle(plan.kazan);
  setHTML("dz-denetim",
    d.engeller.map((e) => `<div class="as-uyari dz-engel">⛔ ${esc(e)}</div>`).join("")
    + d.uyarilar.map((u) => `<div class="as-uyari">⚠️ ${esc(u)}</div>`).join(""));
}

// ── PDF içeriği (bloklar) ─────────────────────────────────────────
function pdfStil(): string {
  return `<style>
  .pdfd{font-family:'Plus Jakarta Sans',Arial,sans-serif;color:#0d1b3e;background:#fff;font-size:13px;line-height:1.45}
  .pdfd *{box-sizing:border-box}
  .pdfd .b{margin-bottom:10px}
  .pdfd .bas{display:flex;gap:12px;align-items:center;border-bottom:3px solid #0b2a66;padding-bottom:10px}
  .pdfd .bas img{width:62px;height:62px;object-fit:contain}
  .pdfd .bas .o{font-size:11px;color:#5a6f99;font-weight:700}
  .pdfd .bas h1{margin:2px 0;font-size:21px;color:#0b2a66}
  .pdfd .bas .t{font-size:12px;color:#334}
  .pdfd .altin{border:3px solid #c62828;background:#fff1f1;border-radius:10px;padding:12px 14px}
  .pdfd .altin .ab{color:#b71c1c;font-weight:900;font-size:16.5px;text-align:center;letter-spacing:.2px}
  .pdfd .altin ul{margin:8px 0 6px 18px;padding:0}
  .pdfd .altin li{margin:2px 0;font-weight:600}
  .pdfd .sira{display:flex;flex-wrap:wrap;gap:4px;justify-content:center;margin-top:6px}
  .pdfd .sira span{background:#fff;border:1.5px solid #c62828;border-radius:14px;padding:3px 9px;font-size:11.5px;font-weight:700;color:#7f1010}
  .pdfd h2{font-size:15px;margin:0 0 6px;color:#0b2a66;border-left:5px solid #1565C0;padding-left:8px}
  .pdfd table{width:100%;border-collapse:collapse}
  .pdfd th,.pdfd td{border:1px solid #9fb6e0;padding:6px 8px;text-align:left;vertical-align:top}
  .pdfd th{background:#e8f0ff;font-size:12px}
  .pdfd td.kno{font-weight:900;font-size:17px;text-align:center;width:62px;color:#0b2a66}
  .pdfd td.bos{color:#99a;font-style:italic}
  .pdfd .uy{background:#fff8e1;border:1.5px solid #f9a825;border-radius:8px;padding:7px 10px;margin-top:6px;font-weight:700;font-size:12px}
  .pdfd .rol{border:1.5px solid #c8dbff;border-radius:9px;padding:8px 10px;background:#f7faff}
  .pdfd .rol .rb{font-weight:800;font-size:14px;color:#0b2a66}
  .pdfd .rol .rk{font-size:11px;color:#5a6f99;font-weight:700}
  .pdfd .rol ul,.pdfd .kb ul{margin:4px 0 0 18px;padding:0}
  .pdfd .rol li,.pdfd .kb li{margin:2px 0}
  .pdfd .ikili{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .pdfd .kb{border:1.5px solid #c8dbff;border-radius:9px;padding:9px 12px}
  .pdfd .kb.safsu{border-color:#1565C0;background:#eef6ff}
  .pdfd .onemli{color:#b71c1c;font-weight:800}
  .pdfd .kb.cikis{border-color:#2e7d32;background:#f1f8f1}
  .pdfd .kutu{display:grid;grid-template-columns:1fr 1fr;gap:3px 14px;margin-top:5px}
  .pdfd .kutu div{display:flex;gap:6px;align-items:flex-start}
  .pdfd .kutu span{font-size:15px;line-height:1.1;color:#2e7d32}
  .pdfd .imza{display:flex;justify-content:center;margin-top:8px;font-size:12px}
  .pdfd .imza div{width:50%;border-top:1px solid #556;padding-top:4px;text-align:center;font-weight:700}
  </style>`;
}

function bloklar(): string[] {
  const logo = `${import.meta.env.BASE_URL}okul-logo.png`;
  const b: string[] = [];
  b.push(`<div class="b bas"><img src="${logo}" alt=""><div>
    <div class="o">${esc(ATOLYE_BILGI.ad)}</div>
    <h1>Atölye ve Üretim Düzeni</h1>
    <div class="t">Üretim günü: <b>${fmt(plan.tarih)}</b>${plan.ogretmen ? ` · Sorumlu öğretmen: <b>${esc(plan.ogretmen)}</b>` : ""}</div>
  </div></div>`);

  b.push(`<div class="b altin"><div class="ab">⛔ ${ALTIN_KURAL.baslik} ⛔</div>
    <ul>${ALTIN_KURAL.maddeler.map((m) => `<li>${m}</li>`).join("")}</ul>
    <div class="sira">${ALTIN_KURAL.sira.map((s, i) => `<span>${i + 1}. ${s}</span>`).join("")}</div></div>`);

  const d = kazanPlaniDenetle(plan.kazan);
  if (!plan.kazan.some((k) => k.urunId)) {
    // Plan girilmemiş → genel kazan tablosu (tür + yapılan ürünler)
    b.push(`<div class="b"><h2>🛢️ Kazanlar</h2>
      <table><thead><tr><th>Kazan</th><th>Tür</th><th>Bu kazanlarda yapılan ürünler</th></tr></thead><tbody>
      ${KAZANLAR.map((k) => `<tr><td class="kno">${k.no}</td><td><b>${k.tip === "yuksek" ? "⬆️ YÜKSEK" : "⬇️ ALÇAK"}</b><div style="font-size:11px;color:#5a6f99">${k.kapasiteKg} kg</div></td>
        <td>${kazanUrunleri().filter((u) => urunKazanTipi(u.id) === k.tip).map((u) => u.ad).join(", ")}</td></tr>`).join("")}
      </tbody></table>
      <div class="uy">Üretim günü hangi kazanda hangi ürünün yapılacağını öğretmen ayrıca bildirir.</div></div>`);
  } else
  b.push(`<div class="b"><h2>🛢️ Bugün Hangi Kazanda Ne Yapılıyor?</h2>
    <table><thead><tr><th>Kazan</th><th>Ürün</th><th>Miktar</th><th>Dikkat</th></tr></thead><tbody>
    ${plan.kazan.map((k) => {
      const kz = KAZANLAR.find((x) => x.no === k.no)!;
      const tip = `<div style="font-size:9.5px;font-weight:700;color:#5a6f99">${kz.tip === "yuksek" ? "YÜKSEK" : "ALÇAK"}</div>`;
      return k.urunId
        ? `<tr><td class="kno">${k.no}${tip}</td><td><b>${esc(urunAdi(k.urunId))}</b></td><td>${k.kg ? `${k.kg} kg` : "—"}</td><td>${AILE_AD[URUN_AILE[k.urunId]] || ""}</td></tr>`
        : `<tr><td class="kno">${k.no}${tip}</td><td class="bos">Bugün kullanılmıyor (kapasite ${kz.kapasiteKg} kg)</td><td></td><td></td></tr>`;
    }).join("")}
    </tbody></table>
    ${d.uyarilar.map((u) => `<div class="uy">⚠️ ${esc(u)}</div>`).join("")}</div>`);

  b.push(`<div class="b"><h2>👥 Bugünün Görev Dağılımı</h2>
    <table><thead><tr><th style="width:38%">Görev</th><th>Öğrenci</th></tr></thead><tbody>
    ${ROLLER.map((r) => `<tr><td><b>${r.ikon} ${r.ad}</b></td><td>${esc(plan.roller[r.id] || "") || "&nbsp;"}</td></tr>`).join("")}
    </tbody></table></div>`);

  // Bölüm başlığı ilk kutuyla aynı blokta: sayfa sonunda başlık yalnız kalmasın
  for (let i = 0; i < ROLLER.length; i += 2) {
    b.push(`<div class="b">${i === 0 ? `<h2>📌 Görevler ve Sorumluluklar</h2>` : ""}<div class="ikili">${ROLLER.slice(i, i + 2).map((r) => `<div class="rol">
      <div class="rb">${r.ikon} ${r.ad}</div><div class="rk">${r.kisi}</div>
      <ul>${r.gorevler.map((g) => `<li>${g}</li>`).join("")}</ul></div>`).join("")}</div></div>`);
  }

  KURAL_BOLUMLERI.forEach((k, i) => {
    const liste = k.id === "cikis"
      ? `<div class="kutu">${k.maddeler.map((m) => { const x = maddeAyir(m); return `<div class="${x.onemli ? "onemli" : ""}"><span>☐</span>${x.onemli ? "‼️ " : ""}${x.metin}</div>`; }).join("")}</div>`
      : `<ul>${k.maddeler.map((m) => { const x = maddeAyir(m); return `<li class="${x.onemli ? "onemli" : ""}">${x.onemli ? "‼️ " : ""}${x.metin}</li>`; }).join("")}</ul>`;
    const kutu = `<div class="kb ${k.id}"><div class="rb" style="font-weight:800;font-size:14px;color:#0b2a66">${k.ikon} ${k.baslik}</div>${liste}</div>`;
    // Son kural kutusu imza satırıyla aynı blokta: imza tek başına yeni sayfaya düşmesin
    const imza = i === KURAL_BOLUMLERI.length - 1
      ? `<div style="font-weight:700;margin:10px 0 18px">Bu kuralları okudum, anladım ve uyacağım.</div>
         <div class="imza"><div>${IMZA_ZUMRE}</div></div>` : "";
    b.push(`<div class="b">${i === 0 ? `<h2>📏 Kurallar</h2>` : ""}${kutu}${imza}</div>`);
  });

  return b;
}

// ── PDF üret (A4, bloklar sayfaya bölünmeden yerleşir) ────────────
const A4_W = 794, A4_H = 1123, KENAR = 38;

async function pdfUret(): Promise<Blob> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
  const kap = document.createElement("div");
  kap.style.cssText = `position:fixed;left:-10000px;top:0;width:${A4_W}px;background:#fff;z-index:-1`;
  document.body.appendChild(kap);
  try {
    // 1) Ölç
    const ic = A4_W - 2 * KENAR;
    kap.innerHTML = `<div class="pdfd" style="width:${ic}px">${pdfStil()}${bloklar().join("")}</div>`;
    await resimlerYuklensin(kap);
    const els = [...kap.querySelectorAll<HTMLElement>(".pdfd > .b")];
    const yukseklik = els.map((e) => e.offsetHeight + 10);
    // 2) Sayfalara dağıt (son satıra sayfa numarası için yer bırak)
    const sayfaIc = A4_H - 2 * KENAR - 22;
    const sayfalar: number[][] = [[]];
    let dol = 0;
    yukseklik.forEach((h, i) => {
      const s = sayfalar[sayfalar.length - 1];
      if (dol + h > sayfaIc && s.length) { sayfalar.push([i]); dol = h; } else { s.push(i); dol += h; }
    });
    const html = bloklar();
    const pdf = new jsPDF({ unit: "pt", format: "a4", compress: true });
    const pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight();
    for (let si = 0; si < sayfalar.length; si++) {
      kap.innerHTML = `<div class="pdfd" style="width:${A4_W}px;height:${A4_H}px;padding:${KENAR}px;position:relative">${pdfStil()}
        ${sayfalar[si].map((i) => html[i]).join("")}
        <div style="position:absolute;left:0;right:0;bottom:${KENAR - 14}px;text-align:center;font-size:11px;color:#5a6f99">Atölye ve Üretim Düzeni · ${fmt(plan.tarih)} · Sayfa ${si + 1} / ${sayfalar.length}</div></div>`;
      await resimlerYuklensin(kap);
      const canvas = await html2canvas(kap.firstElementChild as HTMLElement, { scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false });
      if (si > 0) pdf.addPage();
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.9), "JPEG", 0, 0, pw, ph);
    }
    return pdf.output("blob");
  } finally {
    kap.remove();
  }
}

function resimlerYuklensin(el: HTMLElement): Promise<void> {
  const imgs = [...el.querySelectorAll("img")];
  return Promise.all(imgs.map((im) => im.complete ? Promise.resolve() : new Promise<void>((r) => { im.onload = im.onerror = () => r(); }))).then(() => undefined);
}

const dosyaAdi = () => `Atolye-Duzeni-${plan.tarih}.pdf`;

function engelVarMi(): boolean {
  formOku();
  const d = kazanPlaniDenetle(plan.kazan);
  if (d.engeller.length) { alert("⛔ Kazan planında düzeltilmesi gereken yer var:\n\n" + d.engeller.join("\n")); return true; }
  return false;
}

async function uretVeYap(isim: string, is: (b: Blob) => Promise<void>): Promise<void> {
  if (engelVarMi()) return;
  await bekleyeniYaz();
  showToast("PDF hazırlanıyor…");
  try {
    const blob = await pdfUret();
    await is(blob);
    audit("Atölye Düzeni PDF", `${isim} · ${fmt(plan.tarih)}`);
  } catch (e) {
    console.error(e);
    alert("PDF oluşturulamadı: " + (e as Error).message);
  }
}

function indir(blob: Blob): void {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = dosyaAdi();
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
}

export function dzPdfIndir(): void {
  void uretVeYap("indirildi", async (blob) => { indir(blob); showToast("PDF indirildi"); });
}

/** Telefonda paylaşım menüsünü açar (WhatsApp seçilir); bilgisayarda PDF'i indirir. */
export function dzPdfPaylas(): void {
  void uretVeYap("paylaşıldı", async (blob) => {
    const file = new File([blob], dosyaAdi(), { type: "application/pdf" });
    const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
    if (nav.canShare && nav.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: "Atölye ve Üretim Düzeni" }); return; }
      catch (e) { if ((e as Error).name === "AbortError") return; }
    }
    indir(blob);
    alert("PDF indirildi.\n\nBilgisayarda: WhatsApp Web'de öğrenci grubunu açın, 📎 → Belge ile indirilen PDF'i seçin.");
  });
}

/** PDF'in yanında gruba atılacak kısa metin (günün kazan planı + görevler). */
export async function dzMesajPaylas(): Promise<void> {
  if (engelVarMi()) return;
  await bekleyeniYaz();
  // Taşıyıcı adları gruba gitmez (Musa Hocam): yalnız öğretmenin adalet aracında durur
  const kaz = plan.kazan.map((k) => `${k.no}: ${k.urunId ? `${urunAdi(k.urunId)}${k.kg ? ` (${k.kg} kg)` : ""}` : "boş"}`).join("\n");
  const rol = ROLLER.filter((r) => (plan.roller[r.id] || "").trim()).map((r) => `${r.ikon} ${r.ad}: ${plan.roller[r.id]}`).join("\n");
  const metin = `🧪 ATÖLYE ÜRETİM GÜNÜ — ${fmt(plan.tarih)}\n${plan.ogretmen ? `Sorumlu öğretmen: ${plan.ogretmen}\n` : ""}\n🛢️ KAZANLAR\n${kaz}\n${rol ? `\n👥 GÖREVLER\n${rol}\n` : ""}\n⛔ ${ALTIN_KURAL.baslik}\n\nKurallar PDF'te. Herkes okusun.`;
  whatsappPaylas(metin);
}

export async function dzKurallarPaylas(): Promise<void> {
  const metin = kurallarMetni();
  let kopyalandi = false;
  try { await navigator.clipboard.writeText(metin); kopyalandi = true; } catch { /* izin yoksa geç */ }
  const nav = navigator as Navigator & { share?: (d: { title?: string; text?: string }) => Promise<void> };
  if (nav.share && /Android|iPhone|iPad/i.test(navigator.userAgent)) {
    try { await nav.share({ title: "Atölye Kuralları", text: metin }); return; } catch { /* iptal */ }
  }
  if (kopyalandi) showToast("Kurallar metni kopyalandı — WhatsApp'ta gruba yapıştırın");
  whatsappPaylas(metin);
}

// Sayfa ilk açıldığında DOM hazır değilse sessiz geç
export function dzVarMi(): boolean { return !!$("dz-form"); }
