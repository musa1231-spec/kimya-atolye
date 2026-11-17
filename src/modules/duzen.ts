// ════════════════════════════════════════════════════════════════
// 📋 ATÖLYE DÜZENİ — günün kazan planı + görev dağılımı + kurallar
// Öğrenci PDF'i (WhatsApp grubu için) bu sayfadan üretilir.
// İçerik tek kaynaktan: src/atolyeDuzen.ts
// ════════════════════════════════════════════════════════════════
import { URUNLER, ATOLYE_BILGI } from "../constants";
import {
  KAZANLAR, ROLLER, ALTIN_KURAL, KURAL_BOLUMLERI, URUN_AILE, AILE_AD, kazanPlaniDenetle,
  KAZAN_TIP_AD, kazanUrunleri, urunKazanTipi, kurallarMetni,
} from "../atolyeDuzen";
import type { KazanPlanSatir } from "../atolyeDuzen";
import { store, session } from "../state";
import { $, today, fmt, setHTML, showToast } from "../helpers";
import { whatsappPaylas } from "../lib/paylas";
import { audit } from "../audit";

// ── Plan (bu cihazda saklanır; PDF ile öğrencilere gider) ─────────
export interface DuzenPlan {
  tarih: string;
  ogretmen: string;
  kazan: KazanPlanSatir[];
  roller: Record<string, string>;   // rol id → "Ali, Veli"
}
const PLAN_KEY = "atolyeDuzenPlan";
const ONCEKI_KEY = "atolyeDuzenOnceki";

function bosPlan(): DuzenPlan {
  return { tarih: today(), ogretmen: session.CU?.ad || "", kazan: KAZANLAR.map((k) => ({ no: k.no, urunId: "", kg: k.kapasiteKg })), roller: {} };
}
function oku(key: string): DuzenPlan | null {
  try {
    const p = JSON.parse(localStorage.getItem(key) || "null") as DuzenPlan | null;
    if (!p || !Array.isArray(p.kazan)) return null;
    // Kazan listesi değiştiyse eksik kazanları tamamla
    p.kazan = KAZANLAR.map((k) => p.kazan.find((x) => x.no === k.no) || { no: k.no, urunId: "", kg: k.kapasiteKg });
    p.roller = p.roller || {};
    return p;
  } catch { return null; }
}
function yaz(key: string, p: DuzenPlan): void {
  try { localStorage.setItem(key, JSON.stringify(p)); } catch { /* sessiz */ }
}
const planDolu = (p: DuzenPlan) => p.kazan.some((k) => k.urunId) || Object.values(p.roller).some((v) => v.trim());

let plan: DuzenPlan = bosPlan();

/** Asistan için: bugünün planı (bu cihazda girilmişse). */
export function bugunKazanPlani(): KazanPlanSatir[] | null {
  const p = oku(PLAN_KEY);
  return p && p.tarih === today() ? p.kazan : null;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" } as Record<string, string>)[c]);
const urunAdi = (id: string) => URUNLER.find((u) => u.id === id)?.ad || "";

// ── Sayfa ─────────────────────────────────────────────────────────
export function rDuzen(): void {
  plan = oku(PLAN_KEY) || bosPlan();
  if (!plan.ogretmen && session.CU) plan.ogretmen = session.CU.ad;
  const onceki = oku(ONCEKI_KEY);
  const ogrAdlari = store.ogrenciler.map((o) => o.ad).sort((a, b) => a.localeCompare(b, "tr"));

  setHTML("dz-form", `
    <div class="dz-ust">
      <div class="fg"><label>Üretim tarihi</label><input type="date" id="dz-tarih" value="${plan.tarih}" onchange="dzKaydet()"></div>
      <div class="fg"><label>Sorumlu öğretmen</label><input type="text" id="dz-ogretmen" value="${esc(plan.ogretmen)}" list="dz-ogr-list" oninput="dzKaydet()" autocomplete="off">
        <datalist id="dz-ogr-list">${store.ogretmenler.map((o) => `<option value="${esc(o.ad)}">`).join("")}</datalist></div>
    </div>
    <div class="ch" style="margin-top:6px"><span class="ct">🛢️ Bugün hangi kazanda ne yapılıyor?</span></div>
    <div class="tw"><table class="dz-kazan"><thead><tr><th>Kazan</th><th>Ürün</th><th class="tr">Miktar (kg)</th><th>Tür</th></tr></thead><tbody>
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
        <td class="tm">${k.urunId ? AILE_AD[URUN_AILE[k.urunId]] || "" : ""}</td></tr>`;
    }).join("")}
    </tbody></table></div>
    <div id="dz-denetim"></div>
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
  setHTML("dz-onizleme", `<div class="pdfd">${pdfStil()}${bloklar().join("")}</div>`);
}

function formOku(): void {
  const tarih = (document.getElementById("dz-tarih") as HTMLInputElement | null)?.value || today();
  // Tarih değişince eski plan "geçen sefer" olur (dönüşümlü görev için)
  if (tarih !== plan.tarih && planDolu(plan)) yaz(ONCEKI_KEY, plan);
  plan.tarih = tarih;
  plan.ogretmen = (document.getElementById("dz-ogretmen") as HTMLInputElement | null)?.value || "";
  plan.kazan = plan.kazan.map((k, i) => ({
    no: k.no,
    urunId: (document.getElementById(`dz-k-u-${i}`) as HTMLSelectElement | null)?.value || "",
    kg: parseFloat((document.getElementById(`dz-k-kg-${i}`) as HTMLInputElement | null)?.value || "") || 0,
  }));
  for (const r of ROLLER) plan.roller[r.id] = (document.getElementById(`dz-r-${r.id}`) as HTMLInputElement | null)?.value || "";
}

let onizlemeZaman: number | null = null;
export function dzKaydet(): void {
  formOku();
  yaz(PLAN_KEY, plan);
  dzDenetimGoster();
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
  .pdfd .b{margin-bottom:12px}
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
  .pdfd .kb.safsu li:nth-child(4){color:#b71c1c;font-weight:800}
  .pdfd .kb.cikis{border-color:#2e7d32;background:#f1f8f1}
  .pdfd .kutu{display:grid;grid-template-columns:1fr 1fr;gap:3px 14px;margin-top:5px}
  .pdfd .kutu div{display:flex;gap:6px;align-items:flex-start}
  .pdfd .kutu span{font-size:15px;line-height:1.1;color:#2e7d32}
  .pdfd .imza{display:flex;justify-content:space-between;gap:20px;margin-top:8px;font-size:12px}
  .pdfd .imza div{flex:1;border-top:1px solid #556;padding-top:4px;text-align:center}
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
      ? `<div class="kutu">${k.maddeler.map((m) => `<div><span>☐</span>${m}</div>`).join("")}</div>`
      : `<ul>${k.maddeler.map((m) => `<li>${m}</li>`).join("")}</ul>`;
    const kutu = `<div class="kb ${k.id}"><div class="rb" style="font-weight:800;font-size:14px;color:#0b2a66">${k.ikon} ${k.baslik}</div>${liste}</div>`;
    b.push(`<div class="b">${i === 0 ? `<h2>📏 Kurallar</h2>` : ""}${kutu}</div>`);
  });

  b.push(`<div class="b"><div style="font-weight:700;margin:4px 0 22px">Bu kuralları okudum, anladım ve uyacağım.</div>
    <div class="imza"><div>Sorumlu Öğretmen<br>${esc(plan.ogretmen) || "&nbsp;"}</div><div>Atölye Şefi</div></div></div>`);
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
    const yukseklik = els.map((e) => e.offsetHeight + 12);
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
  yaz(PLAN_KEY, plan);
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
export function dzMesajPaylas(): void {
  if (engelVarMi()) return;
  yaz(PLAN_KEY, plan);
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
