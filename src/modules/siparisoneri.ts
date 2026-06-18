import { store } from "../state";
import { HM_LIST } from "../constants";
import { hmFiyatId } from "../fiyat";
import { fmt, today, numVal, setHTML, setText } from "../helpers";

const TL = (n: number) => "₺" + Math.round(n).toLocaleString("tr-TR");
const hmAd = (id: string) => HM_LIST.find((h) => h.id === id)?.ad || id;

interface Oneri { ad: string; birim: string; mevcut: number; min: number; oneri: number; fiyat: number; tutar: number; kritik: boolean; tip: string; }

function hesapla(): { liste: Oneri[]; toplam: number; kritikSay: number } {
  const kat = numVal("so-kat") || 2;
  const liste: Oneri[] = [];

  // Ham maddeler
  for (const [id, v] of Object.entries(store.hmStok)) {
    const hedef = v.min * kat;
    if (v.m >= hedef) continue;
    const oneri = Math.ceil(hedef - v.m);
    const fiyat = hmFiyatId(id);
    liste.push({ ad: hmAd(id), birim: "kg", mevcut: v.m, min: v.min, oneri, fiyat, tutar: oneri * fiyat, kritik: v.m < v.min, tip: "Ham Madde" });
  }
  // Esanslar
  for (const e of store.esanslar) {
    const hedef = e.minEsik * kat;
    if (e.stok >= hedef) continue;
    const oneri = Math.ceil(hedef - e.stok);
    liste.push({ ad: e.ad + " (esans)", birim: "kg", mevcut: e.stok, min: e.minEsik, oneri, fiyat: 0, tutar: 0, kritik: e.stok < e.minEsik, tip: "Esans" });
  }
  // Bidon / koli (eşik sabit)
  const amb = [
    { ad: "1 L Bidon", m: store.bidon.b1, min: 100 },
    { ad: "5 L Bidon", m: store.bidon.b5, min: 100 },
    { ad: "20 L Bidon", m: store.bidon.b20, min: 40 },
    { ad: "Karton Koli", m: store.koliStok, min: 50 },
  ];
  for (const a of amb) {
    const hedef = a.min * kat;
    if (a.m >= hedef) continue;
    liste.push({ ad: a.ad, birim: "adet", mevcut: a.m, min: a.min, oneri: Math.ceil(hedef - a.m), fiyat: 0, tutar: 0, kritik: a.m < a.min, tip: "Ambalaj" });
  }

  liste.sort((a, b) => Number(b.kritik) - Number(a.kritik) || b.tutar - a.tutar);
  return { liste, toplam: liste.reduce((s, o) => s + o.tutar, 0), kritikSay: liste.filter((o) => o.kritik).length };
}

export function rSiparisOneri(): void {
  const { liste, toplam, kritikSay } = hesapla();
  setText("so-ozet", `${liste.length} kalem öneriliyor · ${kritikSay} kritik · tahmini ${TL(toplam)}`);
  if (!liste.length) { setHTML("so-list", '<div class="tm" style="text-align:center;padding:25px">🎉 Tüm stoklar hedef seviyenin üzerinde — sipariş gerekmiyor.</div>'); return; }
  setHTML("so-list", `<div class="tw"><table>
    <thead><tr><th>Kalem</th><th>Tür</th><th class="tr">Mevcut</th><th class="tr">Min</th><th class="tr">Önerilen Alım</th><th class="tr">Birim ₺</th><th class="tr">Tutar</th><th>Durum</th></tr></thead>
    <tbody>${liste.map((o) => `<tr style="${o.kritik ? "background:rgba(211,47,47,.06)" : ""}">
      <td style="font-weight:600">${o.ad}</td><td class="tm">${o.tip}</td>
      <td class="tr">${o.mevcut.toLocaleString("tr-TR")} ${o.birim}</td>
      <td class="tr">${o.min}</td>
      <td class="tr" style="font-weight:800;color:var(--acc)">${o.oneri.toLocaleString("tr-TR")} ${o.birim}</td>
      <td class="tr">${o.fiyat ? TL(o.fiyat) : "—"}</td>
      <td class="tr">${o.tutar ? TL(o.tutar) : "—"}</td>
      <td>${o.kritik ? '<span class="chip" style="background:#D32F2F1a;border:1px solid #D32F2F55;color:#D32F2F">❌ Kritik</span>' : '<span class="chip" style="background:#FF98001a;border:1px solid #FF980055;color:#FF9800">⚠️ Az</span>'}</td>
    </tr>`).join("")}
    <tr style="font-weight:800;border-top:2px solid var(--acc)"><td colspan="6">TAHMİNİ TOPLAM (ham madde)</td><td class="tr">${TL(toplam)}</td><td></td></tr>
    </tbody></table></div>`);
}

export function yazdirSiparisOneri(): void {
  const { liste, toplam, kritikSay } = hesapla();
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<html><head><title>Satın Alma Önerisi</title><meta charset="utf-8"><style>
    body{font-family:Arial,sans-serif;padding:24px;color:#222}h1{color:#1565C0;font-size:18px;margin:0 0 2px}.sub{color:#666;font-size:12px;margin-bottom:14px}
    table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}th{background:#1565C0;color:#fff}.tr{text-align:right}
    .k{background:#fdecea}.ft{margin-top:16px;font-size:11px;color:#666}
  </style></head><body>
    <h1>🛒 Satın Alma Önerisi</h1>
    <div class="sub">Şehit Ahmet Benli MTAL — Kimya Üretim Atölyesi · ${fmt(today())} · ${kritikSay} kritik kalem</div>
    <table><thead><tr><th>Kalem</th><th>Tür</th><th class="tr">Mevcut</th><th class="tr">Önerilen Alım</th><th class="tr">Birim ₺</th><th class="tr">Tutar</th></tr></thead>
    <tbody>${liste.map((o) => `<tr class="${o.kritik ? "k" : ""}"><td>${o.ad}</td><td>${o.tip}</td><td class="tr">${o.mevcut.toLocaleString("tr-TR")} ${o.birim}</td><td class="tr">${o.oneri.toLocaleString("tr-TR")} ${o.birim}</td><td class="tr">${o.fiyat ? TL(o.fiyat) : ""}</td><td class="tr">${o.tutar ? TL(o.tutar) : ""}</td></tr>`).join("")}
    <tr style="font-weight:800"><td colspan="5">TAHMİNİ TOPLAM (ham madde)</td><td class="tr">${TL(toplam)}</td></tr></tbody></table>
    <div class="ft">Önerilen alım = (minimum × hedef katsayısı) − mevcut. Fiyatlar son alış fiyatından tahminidir.</div>
    <script>window.onload=()=>window.print()</script></body></html>`);
  w.document.close();
}
