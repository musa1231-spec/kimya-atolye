import { store } from "../state";
import { URUNLER } from "../constants";
import { rawKg } from "../fiyat";
import { fmt, today, urunAd, ogrAd, ogcAd, val, setHTML, setText } from "../helpers";

const AYLAR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const TL = (n: number) => "₺" + Math.round(n).toLocaleString("tr-TR");

// Ürünün 1 kg satış değeri (mevcut satış fiyatından tahmini)
function satisKg(urunId: string): number {
  const u = URUNLER.find((x) => x.id === urunId);
  const sf = store.satisFiyat[urunId];
  if (!u || !sf) return 0;
  if (sf.f5) return sf.f5 / (5 * u.yog);
  if (sf.f20) return sf.f20 / (20 * u.yog);
  if (sf.f1) return sf.f1 / (1 * u.yog);
  return 0;
}

interface RaporVeri {
  yil: string; topKg: number; gun: number; cesit: number; maliyet: number; ciro: number;
  aylik: { ay: number; kg: number; gun: number }[];
  urunler: { urunId: string; kg: number; maliyet: number; ciro: number }[];
  ogretmenler: { id: number; gun: number }[];
  ogrenciler: { id: number; gun: number }[];
  sipToplam: number; sipTeslim: number;
}

function hesapla(yil: string): RaporVeri {
  const gunler = store.uretimGunleri.filter((g) => g.tarih.startsWith(yil));
  const aylik = AYLAR.map((_, i) => ({ ay: i, kg: 0, gun: 0 }));
  const urunMap = new Map<string, { kg: number; maliyet: number; ciro: number }>();
  const ogrMap = new Map<number, number>();
  const ogcMap = new Map<number, number>();
  let topKg = 0;

  for (const g of gunler) {
    const ay = parseInt(g.tarih.substring(5, 7)) - 1;
    let gunKg = 0;
    for (const k of g.kalemler) {
      const u = URUNLER.find((x) => x.id === k.urunId);
      const mal = u ? rawKg(u) * k.kg : 0;
      const cir = satisKg(k.urunId) * k.kg;
      const cur = urunMap.get(k.urunId) || { kg: 0, maliyet: 0, ciro: 0 };
      cur.kg += k.kg; cur.maliyet += mal; cur.ciro += cir;
      urunMap.set(k.urunId, cur);
      gunKg += k.kg; topKg += k.kg;
    }
    if (ay >= 0 && ay < 12) { aylik[ay].kg += gunKg; aylik[ay].gun += 1; }
    for (const id of g.ogretmenler || []) ogrMap.set(id, (ogrMap.get(id) || 0) + 1);
    for (const id of g.ogrenciler || []) ogcMap.set(id, (ogcMap.get(id) || 0) + 1);
  }

  const urunler = [...urunMap.entries()].map(([urunId, v]) => ({ urunId, ...v })).sort((a, b) => b.kg - a.kg);
  const maliyet = urunler.reduce((s, u) => s + u.maliyet, 0);
  const ciro = urunler.reduce((s, u) => s + u.ciro, 0);
  const sip = store.siparisler.filter((s) => (s.tarih || "").startsWith(yil));
  return {
    yil, topKg, gun: gunler.length, cesit: urunMap.size, maliyet, ciro,
    aylik, urunler,
    ogretmenler: [...ogrMap.entries()].map(([id, gun]) => ({ id, gun })).sort((a, b) => b.gun - a.gun),
    ogrenciler: [...ogcMap.entries()].map(([id, gun]) => ({ id, gun })).sort((a, b) => b.gun - a.gun),
    sipToplam: sip.length, sipTeslim: sip.filter((s) => s.durum === "teslim edildi").length,
  };
}

export function rRapor(): void {
  const yil = val("rp-yil") || String(new Date().getFullYear());
  const d = hesapla(yil);

  setHTML("rp-stats", [
    ["Toplam Üretim", d.topKg.toLocaleString("tr-TR"), "kg", "c1"],
    ["Üretim Günü", String(d.gun), "gün", "c3"],
    ["Ürün Çeşidi", String(d.cesit), "çeşit", "c5"],
    ["Ham Madde Maliyeti", TL(d.maliyet), "tahmini", "c2"],
    ["Tahmini Ciro", TL(d.ciro), "tahmini", "c1"],
    ["Brüt Katkı", TL(d.ciro - d.maliyet), "tahmini", "c3"],
    ["Sipariş (yıl içi)", `${d.sipTeslim}/${d.sipToplam}`, "teslim", "c5"],
  ].map(([lbl, deg, alt, c]) => `<div class="sc"><div class="sl">${lbl}</div><div class="sv2 ${c}">${deg}</div><div class="ss">${alt}</div></div>`).join(""));

  setHTML("rp-ay", d.aylik.map((a) => `<tr><td>${AYLAR[a.ay]}</td><td class="tr">${a.kg.toLocaleString("tr-TR")}</td><td class="tr">${a.gun}</td></tr>`).join("")
    + `<tr style="font-weight:800;border-top:2px solid var(--acc)"><td>TOPLAM</td><td class="tr">${d.topKg.toLocaleString("tr-TR")}</td><td class="tr">${d.gun}</td></tr>`);

  setHTML("rp-urun", d.urunler.length
    ? d.urunler.map((u) => `<tr><td style="font-weight:600">${urunAd(u.urunId)}</td><td class="tr">${u.kg.toLocaleString("tr-TR")}</td><td class="tr">${TL(u.maliyet)}</td><td class="tr">${u.ciro ? TL(u.ciro) : "—"}</td></tr>`).join("")
    : `<tr><td colspan="4" class="tm" style="text-align:center;padding:18px">Bu yıl üretim yok</td></tr>`);

  const persRow = (ad: string, gun: number) => `<tr><td>${ad}</td><td class="tr">${gun} gün</td></tr>`;
  setHTML("rp-pers", `<div class="g2"><div><div class="ct" style="margin-bottom:6px">👨‍🏫 Öğretmen Katkısı</div><div class="tw"><table><tbody>${d.ogretmenler.map((o) => persRow(ogrAd(o.id), o.gun)).join("") || '<tr><td class="tm">—</td></tr>'}</tbody></table></div></div>`
    + `<div><div class="ct" style="margin-bottom:6px">🎓 Öğrenci Katkısı (ilk 15)</div><div class="tw"><table><tbody>${d.ogrenciler.slice(0, 15).map((o) => persRow(ogcAd(o.id), o.gun)).join("") || '<tr><td class="tm">—</td></tr>'}</tbody></table></div></div></div>`);

  setText("rp-baslik", `${yil} Yılı Faaliyet Raporu`);
}

export function yazdirRapor(): void {
  const yil = val("rp-yil") || String(new Date().getFullYear());
  const d = hesapla(yil);
  const w = window.open("", "_blank");
  if (!w) return;
  const stat = (lbl: string, deg: string) => `<div class="s"><div class="v">${deg}</div><div class="l">${lbl}</div></div>`;
  w.document.write(`<html><head><title>${yil} Faaliyet Raporu</title><meta charset="utf-8"><style>
    body{font-family:Arial,sans-serif;padding:26px;color:#222}h1{color:#1565C0;font-size:20px;margin:0 0 2px}
    .sub{color:#666;font-size:12px;margin-bottom:16px}
    .stats{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:18px}
    .s{border:1px solid #cdd6e6;border-radius:8px;padding:9px 14px;min-width:130px}.s .v{font-size:16px;font-weight:800;color:#1565C0}.s .l{font-size:10.5px;color:#666}
    h2{font-size:14px;color:#1565C0;border-bottom:1px solid #cdd6e6;padding-bottom:5px;margin-top:20px}
    table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #ccc;padding:5px 8px;text-align:left}th{background:#1565C0;color:#fff}.tr{text-align:right}
    .cols{display:flex;gap:18px}.cols>div{flex:1}.ft{margin-top:22px;font-size:10.5px;color:#666;text-align:center}
  </style></head><body>
    <h1>${yil} Yılı Faaliyet Raporu</h1>
    <div class="sub">Şehit Ahmet Benli MTAL — Kimya Üretim Atölyesi · Döner Sermaye Üretim Özeti</div>
    <div class="stats">${stat("Toplam Üretim", d.topKg.toLocaleString("tr-TR") + " kg")}${stat("Üretim Günü", String(d.gun))}${stat("Ürün Çeşidi", String(d.cesit))}${stat("Ham Madde Maliyeti", TL(d.maliyet))}${stat("Tahmini Ciro", TL(d.ciro))}${stat("Brüt Katkı", TL(d.ciro - d.maliyet))}</div>
    <div class="cols">
      <div><h2>Aylık Üretim</h2><table><thead><tr><th>Ay</th><th class="tr">kg</th><th class="tr">Gün</th></tr></thead><tbody>${d.aylik.map((a) => `<tr><td>${AYLAR[a.ay]}</td><td class="tr">${a.kg.toLocaleString("tr-TR")}</td><td class="tr">${a.gun}</td></tr>`).join("")}<tr style="font-weight:800"><td>TOPLAM</td><td class="tr">${d.topKg.toLocaleString("tr-TR")}</td><td class="tr">${d.gun}</td></tr></tbody></table></div>
      <div><h2>Ürün Bazlı</h2><table><thead><tr><th>Ürün</th><th class="tr">kg</th><th class="tr">Maliyet</th></tr></thead><tbody>${d.urunler.map((u) => `<tr><td>${urunAd(u.urunId)}</td><td class="tr">${u.kg.toLocaleString("tr-TR")}</td><td class="tr">${TL(u.maliyet)}</td></tr>`).join("")}</tbody></table></div>
    </div>
    <h2>Personel Üretim Katkısı</h2>
    <div class="cols"><div><table><thead><tr><th>Öğretmen</th><th class="tr">Gün</th></tr></thead><tbody>${d.ogretmenler.map((o) => `<tr><td>${ogrAd(o.id)}</td><td class="tr">${o.gun}</td></tr>`).join("")}</tbody></table></div>
    <div><table><thead><tr><th>Öğrenci</th><th class="tr">Gün</th></tr></thead><tbody>${d.ogrenciler.map((o) => `<tr><td>${ogcAd(o.id)}</td><td class="tr">${o.gun}</td></tr>`).join("")}</tbody></table></div></div>
    <div class="ft">Bu rapor ${fmt(today())} tarihinde otomatik üretilmiştir. Ciro/maliyet değerleri tahminidir.</div>
    <script>window.onload=()=>window.print()</script></body></html>`);
  w.document.close();
}
