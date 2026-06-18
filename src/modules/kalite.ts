import { store, session } from "../state";
import { audit } from "../audit";
import { KALITE_SONUC } from "../constants";
import { insertKalite, deleteKalite } from "../db";
import { $, today, fmt, urunAd, urunSelect, val, numVal, setHTML, setText, setVal, showToast } from "../helpers";
import type { KaliteKontrol } from "../types";

const sonucBilgi = (v: string) => KALITE_SONUC.find((s) => s.v === v) || KALITE_SONUC[0];

// Modal hazırlığı
export function prepKalite(): void {
  setHTML("kk-urun", urunSelect());
  setVal("kk-tarih", today());
  ["kk-parti", "kk-ph", "kk-yog", "kk-gorunum", "kk-koku", "kk-visk", "kk-olcen", "kk-not"].forEach((x) => setVal(x, ""));
  setVal("kk-olcen", session.CU?.ad || "");
  const sel = $("kk-sonuc") as HTMLSelectElement;
  if (sel) sel.value = "uygun";
}

export async function saveKalite(): Promise<void> {
  const tarih = val("kk-tarih");
  const urunId = val("kk-urun");
  if (!tarih || !urunId) { alert("Tarih ve ürün zorunlu"); return; }
  const k: Omit<KaliteKontrol, "id"> = {
    tarih, urunId, partiNo: val("kk-parti"), uretimId: null,
    ph: val("kk-ph") ? numVal("kk-ph") : null,
    yogunluk: val("kk-yog") ? numVal("kk-yog") : null,
    gorunum: val("kk-gorunum"), koku: val("kk-koku"), viskozite: val("kk-visk"),
    sonuc: val("kk-sonuc"), olcen: val("kk-olcen"), notu: val("kk-not"),
  };
  const rec = await insertKalite(k);
  store.kaliteKayitlari.unshift(rec);
  audit("KALİTE", `${urunAd(urunId)} — ${sonucBilgi(k.sonuc).ad}${k.ph != null ? " · pH " + k.ph : ""}`);
  $("m-kalite").classList.remove("open");
  rKalite();
  showToast("Kalite kaydı eklendi ✓");
}

export async function delKalite(id: number): Promise<void> {
  await deleteKalite(id);
  store.kaliteKayitlari = store.kaliteKayitlari.filter((x) => x.id !== id);
  rKalite();
  showToast("Kalite kaydı silindi");
}

export function rKalite(): void {
  const fsel = $("kf-urun") as HTMLSelectElement;
  if (fsel && fsel.options.length <= 1) setHTML("kf-urun", `<option value="">Tüm ürünler</option>` + urunSelect());
  const fAy = val("kf-ay");
  const fUrun = val("kf-urun");
  let list = [...store.kaliteKayitlari].sort((a, b) => b.tarih.localeCompare(a.tarih));
  if (fAy) list = list.filter((k) => k.tarih.startsWith(fAy));
  if (fUrun) list = list.filter((k) => k.urunId === fUrun);

  const uygun = list.filter((k) => k.sonuc === "uygun").length;
  const sartli = list.filter((k) => k.sonuc === "sartli").length;
  const red = list.filter((k) => k.sonuc === "red").length;
  setText("kf-ozet", `${list.length} kayıt · ✅ ${uygun} · ⚠️ ${sartli} · ❌ ${red}`);

  if (!list.length) { setHTML("kalite-list", '<div class="tm" style="text-align:center;padding:25px">Kayıt yok. "+ Kalite Kaydı" ile ekleyin.</div>'); return; }
  setHTML("kalite-list", `<div class="tw"><table>
    <thead><tr><th>Tarih</th><th>Ürün</th><th>Parti</th><th class="tr">pH</th><th class="tr">Yoğ.</th><th>Görünüm/Koku</th><th>Sonuç</th><th>Ölçen</th><th></th></tr></thead>
    <tbody>${list.map((k) => {
    const sb = sonucBilgi(k.sonuc);
    return `<tr>
      <td>${fmt(k.tarih)}</td>
      <td style="font-weight:600">${urunAd(k.urunId)}</td>
      <td class="tm">${k.partiNo || "—"}</td>
      <td class="tr">${k.ph != null ? k.ph : "—"}</td>
      <td class="tr">${k.yogunluk != null ? k.yogunluk : "—"}</td>
      <td class="tm">${[k.gorunum, k.koku].filter(Boolean).join(" · ") || "—"}</td>
      <td><span class="chip" style="background:${sb.renk}1a;border:1px solid ${sb.renk}55;color:${sb.renk}">${sb.ad}</span></td>
      <td class="tm">${k.olcen || "—"}</td>
      <td><button class="x" onclick="eminMisin('Kalite kaydı silinecek',()=>delKalite(${k.id}))">✕</button></td>
    </tr>${k.notu ? `<tr><td></td><td colspan="8" class="tm" style="padding-top:0;color:var(--mut)">📝 ${k.notu}</td></tr>` : ""}`;
  }).join("")}</tbody></table></div>`);
}

// Yazdır / PDF
export function yazdirKalite(): void {
  const fAy = val("kf-ay");
  const fUrun = val("kf-urun");
  let list = [...store.kaliteKayitlari].sort((a, b) => b.tarih.localeCompare(a.tarih));
  if (fAy) list = list.filter((k) => k.tarih.startsWith(fAy));
  if (fUrun) list = list.filter((k) => k.urunId === fUrun);
  const baslik = `Kalite Kontrol Defteri${fAy ? " — " + fAy : ""}${fUrun ? " — " + urunAd(fUrun) : ""}`;
  const rows = list.map((k) => {
    const sb = sonucBilgi(k.sonuc);
    return `<tr><td>${fmt(k.tarih)}</td><td>${urunAd(k.urunId)}</td><td>${k.partiNo || ""}</td><td style="text-align:center">${k.ph ?? ""}</td><td style="text-align:center">${k.yogunluk ?? ""}</td><td>${[k.gorunum, k.koku, k.viskozite].filter(Boolean).join(", ")}</td><td>${sb.ad}</td><td>${k.olcen || ""}</td></tr>`;
  }).join("");
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<html><head><title>${baslik}</title><meta charset="utf-8"><style>
    body{font-family:Arial,sans-serif;padding:24px;color:#222}h1{font-size:18px;border-bottom:2px solid #1565C0;padding-bottom:8px;color:#1565C0}
    table{width:100%;border-collapse:collapse;font-size:12px;margin-top:14px}th,td{border:1px solid #bbb;padding:6px 8px;text-align:left}
    th{background:#1565C0;color:#fff}tr:nth-child(even){background:#f3f6fb}.ft{margin-top:18px;font-size:11px;color:#666;text-align:right}
  </style></head><body><h1>🧪 ${baslik}</h1>
    <table><thead><tr><th>Tarih</th><th>Ürün</th><th>Parti</th><th>pH</th><th>Yoğunluk</th><th>Görünüm/Koku</th><th>Sonuç</th><th>Ölçen</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="ft">Şehit Ahmet Benli MTAL — Kimya Üretim Atölyesi · ${list.length} kayıt · ${fmt(today())}</div>
    <script>window.onload=()=>window.print()</script></body></html>`);
  w.document.close();
}
