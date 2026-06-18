import QRCode from "qrcode";
import { store } from "../state";
import { audit } from "../audit";
import { URUNLER, RAF_OMRU, HM_TEHLIKE, ATOLYE_BILGI } from "../constants";
import { insertParti, deleteParti } from "../db";
import { $, today, fmt, urunAd, ogcAd, ogrAd, urunSelect, val, numVal, intVal, setHTML, setText, setVal, showToast } from "../helpers";
import type { Parti } from "../types";

// Seçili üretim gününden taşınan personel (etikette üreten olarak görünür)
let partiOgr: number[] = [];
let partiOgc: number[] = [];

const urunKod = (id: string) => (URUNLER.find((u) => u.id === id)?.ad || id).replace(/[^A-Za-zÇĞİÖŞÜçğıöşü]/g, "").substring(0, 3).toUpperCase();

function addMonths(dateStr: string, ay: number): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + ay);
  return d.toISOString().split("T")[0];
}

// Parti no: ÜRN-YYMMDD-NN
function partiNoUret(urunId: string, tarih: string): string {
  const ymd = tarih.replace(/-/g, "").substring(2);
  const ayniGun = store.partiler.filter((p) => p.urunId === urunId && p.tarih === tarih).length;
  return `${urunKod(urunId)}-${ymd}-${String(ayniGun + 1).padStart(2, "0")}`;
}

export function prepParti(): void {
  partiOgr = [];
  partiOgc = [];
  // Üretim günü seçeneği (son 60 gün)
  const ugOpts = [`<option value="">— (opsiyonel) üretim gününe bağla —</option>`]
    .concat([...store.uretimGunleri].slice(0, 60).map((g) => `<option value="${g.id}">${fmt(g.tarih)} · ${g.kalemler.map((k) => urunAd(k.urunId)).join(", ").substring(0, 40)}</option>`))
    .join("");
  setHTML("pt-uretim", ugOpts);
  setHTML("pt-urun", urunSelect());
  setVal("pt-tarih", today());
  setVal("pt-kg", "");
  setVal("pt-not", "");
  const ambSel = $("pt-amb") as HTMLSelectElement; if (ambSel) ambSel.value = "5";
  partiSktGuncelle();
  partiNoGuncelle();
}

// Üretim günü seçilince ürün/tarih/kg + personeli doldur
export function partiFromUretim(): void {
  const id = parseInt(val("pt-uretim"));
  const g = store.uretimGunleri.find((x) => x.id === id);
  if (!g) { partiOgr = []; partiOgc = []; return; }
  setVal("pt-tarih", g.tarih);
  partiOgr = g.ogretmenler || [];
  partiOgc = g.ogrenciler || [];
  if (g.kalemler.length) {
    const k = g.kalemler[0];
    setVal("pt-urun", k.urunId);
    setVal("pt-kg", String(k.kg));
    const ambSel = $("pt-amb") as HTMLSelectElement; if (ambSel && k.ambLt) ambSel.value = String(k.ambLt);
  }
  partiSktGuncelle();
  partiNoGuncelle();
}

export function partiNoGuncelle(): void {
  setVal("pt-no", partiNoUret(val("pt-urun"), val("pt-tarih")));
}

export function partiSktGuncelle(): void {
  const urun = URUNLER.find((u) => u.id === val("pt-urun"));
  const ay = RAF_OMRU[urun?.kat || ""] || 24;
  setVal("pt-raf", String(ay));
  setVal("pt-skt", addMonths(val("pt-tarih") || today(), ay));
}

// Ürün/tarih değişince parti no + SKT yenile
export function partiUrunDegisti(): void {
  partiSktGuncelle();
  partiNoGuncelle();
}
export function partiRafDegisti(): void {
  setVal("pt-skt", addMonths(val("pt-tarih") || today(), intVal("pt-raf") || 24));
}

export async function saveParti(): Promise<void> {
  const tarih = val("pt-tarih");
  const urunId = val("pt-urun");
  if (!tarih || !urunId) { alert("Tarih ve ürün zorunlu"); return; }
  const p: Omit<Parti, "id"> = {
    partiNo: val("pt-no") || partiNoUret(urunId, tarih),
    urunId, tarih, uretimId: val("pt-uretim") ? parseInt(val("pt-uretim")) : null,
    kg: numVal("pt-kg"), ambLt: intVal("pt-amb"), rafOmruAy: intVal("pt-raf") || 24,
    skt: val("pt-skt"), ogrenciler: partiOgc, ogretmenler: partiOgr, notu: val("pt-not"),
  };
  const rec = await insertParti(p);
  store.partiler.unshift(rec);
  audit("PARTİ", `${rec.partiNo} — ${urunAd(urunId)} ${p.kg}kg`);
  $("m-parti").classList.remove("open");
  rParti();
  showToast("Parti kaydedildi ✓");
}

export async function delParti(id: number): Promise<void> {
  await deleteParti(id);
  store.partiler = store.partiler.filter((x) => x.id !== id);
  rParti();
  showToast("Parti silindi");
}

export function rParti(): void {
  const fsel = $("ptf-urun") as HTMLSelectElement;
  if (fsel && fsel.options.length <= 1) setHTML("ptf-urun", `<option value="">Tüm ürünler</option>` + urunSelect());
  const fAy = val("ptf-ay");
  const fUrun = val("ptf-urun");
  let list = [...store.partiler].sort((a, b) => b.tarih.localeCompare(a.tarih) || b.id - a.id);
  if (fAy) list = list.filter((p) => p.tarih.startsWith(fAy));
  if (fUrun) list = list.filter((p) => p.urunId === fUrun);
  setText("ptf-ozet", `${list.length} parti · ${list.reduce((s, p) => s + p.kg, 0).toLocaleString()} kg`);
  if (!list.length) { setHTML("parti-list", '<div class="tm" style="text-align:center;padding:25px">Parti yok. "+ Yeni Parti" ile kayıt açın.</div>'); return; }
  const bugun = today();
  setHTML("parti-list", `<div class="tw"><table>
    <thead><tr><th>Parti No</th><th>Ürün</th><th>Üretim</th><th>SKT</th><th class="tr">kg</th><th>Üreten</th><th></th></tr></thead>
    <tbody>${list.map((p) => {
    const gecti = p.skt && p.skt < bugun;
    const ureten = [...p.ogretmenler.map((id) => ogrAd(id)), ...p.ogrenciler.map((id) => ogcAd(id))].filter(Boolean);
    return `<tr>
      <td style="font-weight:700;font-family:'IBM Plex Mono',monospace">${p.partiNo}</td>
      <td>${urunAd(p.urunId)}</td>
      <td class="tm">${fmt(p.tarih)}</td>
      <td class="tm" style="${gecti ? "color:var(--acc4);font-weight:700" : ""}">${p.skt ? fmt(p.skt) : "—"}${gecti ? " ⚠" : ""}</td>
      <td class="tr">${p.kg.toLocaleString()}</td>
      <td class="tm" style="max-width:200px">${ureten.length ? ureten.slice(0, 3).join(", ") + (ureten.length > 3 ? ` +${ureten.length - 3}` : "") : "—"}</td>
      <td><button class="btn bg bsm" onclick="etiketParti(${p.id})">🏷️ Etiket</button> <button class="x" onclick="eminMisin('Parti silinecek',()=>delParti(${p.id}))">✕</button></td>
    </tr>`;
  }).join("")}</tbody></table></div>`);
}

// İzlenebilirlik verisini herkese açık izle.html bağlantısına kodla
function izleUrl(payload: Record<string, unknown>): string {
  const json = JSON.stringify(payload);
  const enc = encodeURIComponent(btoa(unescape(encodeURIComponent(json))));
  return `${location.origin}${import.meta.env.BASE_URL}izle.html#${enc}`;
}

// ── Yazdırılabilir ürün etiketi (QR'lı) ───────────────────────
export async function etiketParti(id: number): Promise<void> {
  const p = store.partiler.find((x) => x.id === id);
  if (!p) return;
  const urun = URUNLER.find((u) => u.id === p.urunId);
  const icindekiler = urun ? urun.ings.map(([ad]) => ad).filter((a) => a !== "Su").join(", ") : "";
  const uyarilar = urun
    ? [...new Set(urun.ings.map(([ad]) => HM_TEHLIKE[ad]).filter(Boolean))]
    : [];
  const ureten = [...p.ogretmenler.map((i) => ogrAd(i)), ...p.ogrenciler.map((i) => ogcAd(i))].filter(Boolean);

  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<html><head><meta charset="utf-8"><title>Etiket ${p.partiNo}</title></head><body style="font-family:Arial;text-align:center;padding:40px;color:#666">QR hazırlanıyor…</body></html>`);

  // QR: izle.html bağlantısı (veri QR'ın içinde — giriş/internet gerektirmez)
  const url = izleUrl({
    a: urun?.ad || urunAd(p.urunId), k: urun?.kat || "", p: p.partiNo, t: p.tarih, s: p.skt,
    m: p.ambLt ? p.ambLt + " L" : p.kg + " kg", i: icindekiler ? "Su, " + icindekiler : "",
    u: uyarilar, ur: ureten, atl: ATOLYE_BILGI.ad, adr: ATOLYE_BILGI.adres, tel: ATOLYE_BILGI.tel,
  });
  let qr = "";
  try { qr = await QRCode.toDataURL(url, { margin: 1, width: 220, errorCorrectionLevel: "M" }); } catch { /* QR olmadan da bas */ }

  w.document.open();
  w.document.write(`<html><head><title>Etiket ${p.partiNo}</title><meta charset="utf-8"><style>
    body{font-family:Arial,sans-serif;margin:0;padding:18px;background:#eef2f7}
    .lbl{width:340px;border:2px solid #1565C0;border-radius:12px;padding:16px 18px;background:#fff;margin:auto}
    .lbl h2{margin:0 0 2px;color:#1565C0;font-size:19px}
    .kat{font-size:11px;color:#888;margin-bottom:10px}
    .row{display:flex;justify-content:space-between;font-size:12px;padding:3px 0;border-bottom:1px dashed #ddd}
    .row b{color:#444}
    .ic{font-size:11px;color:#555;margin-top:9px;line-height:1.4}
    .uy{margin-top:9px;background:#fff3e0;border:1px solid #ffcc80;border-radius:7px;padding:7px 9px;font-size:10.5px;color:#a15c00;line-height:1.45}
    .pn{font-family:'Courier New',monospace;font-weight:bold;letter-spacing:1px;font-size:15px}
    .ft{margin-top:11px;font-size:9.5px;color:#666;text-align:center;line-height:1.4}
    .qr{margin-top:11px;padding-top:11px;border-top:1px dashed #ddd;text-align:center}
    .qr img{width:120px;height:120px}
    .qr .q-t{font-size:9.5px;color:#666;margin-top:3px}
    @media print{body{background:#fff}}
  </style></head><body><div class="lbl">
    <h2>${urun?.ad || urunAd(p.urunId)}</h2>
    <div class="kat">${urun?.kat || ""} · Şehit Ahmet Benli MTAL Kimya Üretim Atölyesi</div>
    <div class="row"><b>Parti No</b><span class="pn">${p.partiNo}</span></div>
    <div class="row"><b>Üretim Tarihi</b><span>${fmt(p.tarih)}</span></div>
    <div class="row"><b>Son Kullanma</b><span>${p.skt ? fmt(p.skt) : "—"}</span></div>
    <div class="row"><b>Net Miktar</b><span>${p.ambLt ? p.ambLt + " L" : p.kg + " kg"}</span></div>
    ${icindekiler ? `<div class="ic"><b>İçindekiler:</b> Su, ${icindekiler}.</div>` : ""}
    ${uyarilar.length ? `<div class="uy">⚠️ <b>Uyarılar:</b> ${uyarilar.join(" ")} Çocuklardan uzak tutun. Gıda değildir.</div>` : `<div class="uy">⚠️ Çocuklardan uzak tutun. Gıda değildir.</div>`}
    ${ureten.length ? `<div class="ft">Üreten: ${ureten.join(", ")}</div>` : ""}
    ${qr ? `<div class="qr"><img src="${qr}" alt="QR"><div class="q-t">📱 Okutarak ürünü doğrulayın</div></div>` : ""}
    <div class="ft">${ATOLYE_BILGI.adres}<br>${ATOLYE_BILGI.tel}</div>
  </div><script>window.onload=()=>window.print()</script></body></html>`);
  w.document.close();
}
