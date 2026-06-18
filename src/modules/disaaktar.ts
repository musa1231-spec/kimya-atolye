import { store } from "../state";
import { URUNLER, HM_LIST } from "../constants";
import { hmFiyatAd, hmFiyatId, yaklasikMaliyet, karHesap } from "../fiyat";
import { fmt, urunAd, musAd, esansAd, ogrAd, ogcAd, val, showToast } from "../helpers";

// ════════════════════════════════════════════════════════════════
// EXCEL (.xlsx) — tablo verileri
// ════════════════════════════════════════════════════════════════
type Sheet = { name: string; rows: (string | number)[][] };

export async function exportSheets(filename: string, sheets: Sheet[]): Promise<void> {
  const XLSX = await import("xlsx"); // yalnızca dışa aktarırken yüklenir
  const wb = XLSX.utils.book_new();
  for (const s of sheets) {
    const ws = XLSX.utils.aoa_to_sheet(s.rows);
    XLSX.utils.book_append_sheet(wb, ws, s.name.substring(0, 31));
  }
  XLSX.writeFile(wb, filename);
  showToast("Excel indirildi ✓");
}

const damga = () => new Date().toISOString().slice(0, 10);

export function exportAylik(): void {
  const yil = val("ay-yil") || "2025";
  const AYLAR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
  const ozet: (string | number)[][] = [["Ay", "Üretim (kg)", "Gün", "Çeşit"]];
  AYLAR.forEach((ay, i) => {
    const pref = `${yil}-${String(i + 1).padStart(2, "0")}`;
    const lst = store.uretimGunleri.filter((g) => g.tarih.startsWith(pref));
    const kg = lst.reduce((s, g) => s + g.kalemler.reduce((t, k) => t + k.kg, 0), 0);
    const cesit = new Set(lst.flatMap((g) => g.kalemler.map((k) => k.urunId))).size;
    ozet.push([ay, kg, lst.length, cesit]);
  });
  const um: Record<string, number> = {};
  store.uretimGunleri.filter((g) => g.tarih.startsWith(yil)).flatMap((g) => g.kalemler).forEach((k) => { um[k.urunId] = (um[k.urunId] || 0) + k.kg; });
  const urun: (string | number)[][] = [["Ürün", "Toplam (kg)"]];
  Object.entries(um).sort((a, b) => b[1] - a[1]).forEach(([id, kg]) => urun.push([urunAd(id), kg]));
  exportSheets(`aylik-rapor-${yil}.xlsx`, [{ name: "Aylık Özet", rows: ozet }, { name: "Ürün Bazlı", rows: urun }]);
}

export function exportUretim(): void {
  const filtre = val("uf-ay") || "";
  let list = [...store.uretimGunleri].sort((a, b) => b.tarih.localeCompare(a.tarih));
  if (filtre) list = list.filter((g) => g.tarih.startsWith(filtre));
  const rows: (string | number)[][] = [["Tarih", "Ürün", "kg", "Ambalaj", "Bidon", "Koli", "Kazan", "Esans", "Öğretmenler", "Öğrenciler", "Not"]];
  list.forEach((g) => {
    const ogr = (g.ogretmenler || []).map(ogrAd).join(", ");
    const ogc = (g.ogrenciler || []).map(ogcAd).join(", ");
    g.kalemler.forEach((k) => rows.push([
      fmt(g.tarih), urunAd(k.urunId), k.kg, k.ambLt ? k.ambLt + "L" : "—",
      k.bidonAdet || 0, k.koliAdet || 0, k.batch, k.esansId ? esansAd(k.esansId) : "—", ogr, ogc, g.not || "",
    ]));
  });
  exportSheets(`uretim-${filtre || "tum"}-${damga()}.xlsx`, [{ name: "Üretim", rows }]);
}

export function exportSiparisler(): void {
  const rows: (string | number)[][] = [["No", "Müşteri", "İlçe", "Sipariş Tarihi", "Teslim Tarihi", "Durum", "Kalemler", "Not"]];
  [...store.siparisler].reverse().forEach((s) => {
    const m = store.musteriler.find((x) => x.id === s.musteriId);
    rows.push([
      s.id, m?.ad || "—", m?.ilce || "", fmt(s.tarih), fmt(s.teslimTarihi), s.durum,
      (s.kalemler || []).map((k) => `${urunAd(k.urunId)} ${k.miktar}${k.birim}`).join(", "), s.not || "",
    ]);
  });
  exportSheets(`siparisler-${damga()}.xlsx`, [{ name: "Siparişler", rows }]);
}

export function exportMusteri(): void {
  const rows: (string | number)[][] = [["Kurum", "İlçe", "Telefon", "Yetkili", "Adres", "Tip", "Sipariş Sayısı"]];
  store.musteriler.forEach((m) => rows.push([
    m.ad, m.ilce || "", m.tel || "", m.yetkili || "", m.adres || "", m.tip,
    store.siparisler.filter((s) => s.musteriId === m.id).length,
  ]));
  exportSheets(`musteriler-${damga()}.xlsx`, [{ name: "Müşteriler", rows }]);
}

export function exportUrunStok(): void {
  const rows: (string | number)[][] = [["Ürün", "Kategori", "Stok (kg)", "Litre", "Min", "Durum"]];
  URUNLER.forEach((u) => {
    const st = store.urunStok[u.id] || { kg: 0, min: 500 };
    rows.push([u.ad, u.kat, st.kg, +(st.kg / u.yog).toFixed(0), st.min, st.kg === 0 ? "Yok" : st.kg < st.min ? "Az" : "Yeterli"]);
  });
  exportSheets(`urun-stok-${damga()}.xlsx`, [{ name: "Ürün Stok", rows }]);
}

export function exportHmStok(): void {
  const rows: (string | number)[][] = [["Ham Madde", "Birim", "Stok", "Min", "₺/birim", "Değer (₺)", "Durum"]];
  HM_LIST.forEach((h) => {
    const st = store.hmStok[h.id] || { m: 0, min: 50, fiyat: 0 };
    const f = hmFiyatId(h.id);
    rows.push([h.ad, h.b, st.m, st.min, f, +(st.m * f).toFixed(0), st.m === 0 ? "Yok" : st.m < st.min ? "Az" : "Yeterli"]);
  });
  exportSheets(`ham-madde-stok-${damga()}.xlsx`, [{ name: "Ham Madde", rows }]);
}

const tl = (n: number) => "₺" + n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function exportFiyatListesi(): void {
  const rows: (string | number)[][] = [["Ürün", "Satış 5L", "Satış 20L", "Satış 1L", "Maliyet 5L", "Kâr% 5L", "Maliyet 20L", "Kâr% 20L"]];
  URUNLER.forEach((u) => {
    const s = store.satisFiyat[u.id];
    if (!s || (!s.f5 && !s.f20 && !s.f1)) return;
    const m5 = yaklasikMaliyet(u, 5), m20 = yaklasikMaliyet(u, 20);
    const k5 = karHesap(s.f5, m5), k20 = karHesap(s.f20, m20);
    rows.push([
      u.ad, s.f5 || "", s.f20 || "", s.f1 || "",
      +m5.toFixed(2), k5 ? +k5.marj.toFixed(1) : "", +m20.toFixed(2), k20 ? +k20.marj.toFixed(1) : "",
    ]);
  });
  exportSheets(`fiyat-listesi-${damga()}.xlsx`, [{ name: "Fiyat Listesi", rows }]);
}

export function yazdirFiyatListesi(): void {
  const sat = URUNLER.filter((u) => { const s = store.satisFiyat[u.id]; return s && (s.f5 || s.f20 || s.f1); });
  const satir = sat.map((u) => {
    const s = store.satisFiyat[u.id]!;
    return `<tr><td>${u.ad}</td><td class="tc">${s.f5 ? tl(s.f5) : ""}</td><td class="tc">${s.f20 ? tl(s.f20) : ""}</td></tr>`;
  }).join("");
  const govde = `
    <h1 style="text-align:center;font-size:15px">ŞEHİT AHMET BENLİ MESLEKİ VE TEKNİK ANADOLU LİSESİ</h1>
    <div style="text-align:center;font-weight:700;font-size:13px">KİMYA ATÖLYELERİNDE ÜRETİLEN TEMİZLİK MALZEMELERİ</div>
    <div style="text-align:center;font-weight:700;font-size:13px;margin-bottom:12px">FİYAT LİSTESİ</div>
    <table><thead><tr><th>ÜRÜN</th><th class="tc">5 Litre</th><th class="tc">20 Litre</th></tr></thead><tbody>${satir}</tbody></table>
    <div style="margin-top:14px;font-size:11px;line-height:1.7">
      <div style="text-align:right">${new Date().toLocaleDateString("tr-TR")}</div>
      <b>NOT:</b><br>
      1- Fiyatlarımıza KDV dahil değildir.<br>
      2- Fiyatlara nakliye dahil değildir.<br>
      3- Ürünlerimiz TSE Belgeli ham maddeler ile üretilmektedir.<br>
      4- Diğer ambalaj ebatları için fiyat alınız.<br>
      5- Liste dışı ürünler için lütfen fiyat alınız.
    </div>
    <div style="margin-top:18px;font-size:11px"><b>Adres:</b> Şehit Ahmet Benli Mesleki ve Teknik Anadolu Lisesi, Saraycık Mahallesi, Saray Sokak Antakya - HATAY<br>
    <b>Tel:</b> 0326 227 7323 - 0533 764 1102 · <b>E-posta:</b> sehitahmetbenlimtal@gmail.com</div>`;
  yazdir("Fiyat Listesi", govde);
}

// ════════════════════════════════════════════════════════════════
// YAZDIR / PDF — biçimli belgeler
// ════════════════════════════════════════════════════════════════
const PRINT_CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;color:#0d1b3e;padding:28px;font-size:13px}
h1{font-size:18px;margin-bottom:2px}
.alt{color:#5a6f99;font-size:12px;margin-bottom:14px}
.kutu{border:1px solid #c8dbff;border-radius:8px;padding:12px 14px;margin-bottom:12px}
.satir{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap}
table{width:100%;border-collapse:collapse;margin-top:8px}
th,td{border:1px solid #c8dbff;padding:6px 8px;text-align:left;font-size:12px}
th{background:#f0f6ff;text-transform:uppercase;font-size:10px;letter-spacing:.5px}
.tr{text-align:right}.tc{text-align:center}
.lbl{color:#5a6f99;font-size:11px;text-transform:uppercase;letter-spacing:.5px}
.imza{margin-top:40px;display:flex;justify-content:space-between;gap:40px}
.imza div{flex:1;border-top:1px solid #0d1b3e;padding-top:5px;text-align:center;font-size:11px;color:#5a6f99}
h2{font-size:14px;margin:14px 0 4px}
@media print{body{padding:0}}
`;

export function yazdir(baslik: string, govde: string): void {
  const w = window.open("", "_blank");
  if (!w) { alert("Yazdırma penceresi engellendi. Tarayıcı pop-up iznini açın."); return; }
  w.document.write(`<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>${baslik}</title><style>${PRINT_CSS}</style></head><body>${govde}<script>window.onload=function(){window.focus();window.print();}<\/script></body></html>`);
  w.document.close();
}

const ust = (baslik: string, alt: string) =>
  `<h1>KİMYA ÜRETİM ATÖLYESİ — ${baslik}</h1><div class="alt">${alt}</div>`;

// Üretim Föyü: reçete kırılımıyla üretim çalışma kâğıdı
export function foyUretim(id: number): void {
  const g = store.uretimGunleri.find((x) => x.id === id);
  if (!g) return;
  const bloklar = g.kalemler.map((k) => {
    const u = URUNLER.find((x) => x.id === k.urunId);
    const ings = u ? u.ings.map(([ad, pct]) => `<tr><td>${ad}</td><td class="tr">%${pct}</td><td class="tr">${(k.kg * pct / 100).toFixed(2)} kg</td><td class="tr">${hmFiyatAd(ad).toFixed(2)} ₺/kg</td></tr>`).join("") : "";
    return `<div class="kutu">
      <div class="satir"><h2>${urunAd(k.urunId)}</h2><div>${k.kg.toLocaleString()} kg · ${k.batch} kazan${k.ambLt ? ` · ${k.bidonAdet}×${k.ambLt}L` : ""}${k.koliAdet ? ` · ${k.koliAdet} koli` : ""}${k.esansId ? ` · Esans: ${esansAd(k.esansId)}` : ""}</div></div>
      <table><thead><tr><th>Ham Madde</th><th class="tr">Oran</th><th class="tr">Miktar</th><th class="tr">Birim Fiyat</th></tr></thead><tbody>${ings}</tbody></table>
    </div>`;
  }).join("");
  const govde = ust("ÜRETİM FÖYÜ", `Tarih: ${fmt(g.tarih)}${g.not ? " · " + g.not : ""}`) +
    `<div class="kutu"><div class="lbl">Görevliler</div><div>${(g.ogretmenler || []).map(ogrAd).join(", ") || "—"}${(g.ogrenciler || []).length ? " · Öğrenciler: " + (g.ogrenciler || []).map(ogcAd).join(", ") : ""}</div></div>` +
    bloklar +
    `<div class="imza"><div>Hazırlayan</div><div>Kontrol</div><div>Onay</div></div>`;
  yazdir(`Üretim Föyü ${fmt(g.tarih)}`, govde);
}

export function yazdirSiparis(id: number): void {
  const s = store.siparisler.find((x) => x.id === id);
  if (!s) return;
  const m = store.musteriler.find((x) => x.id === s.musteriId);
  const sat = (s.kalemler || []).map((k, i) => `<tr><td class="tc">${i + 1}</td><td>${urunAd(k.urunId)}</td><td class="tr">${k.miktar}</td><td class="tc">${k.birim}</td></tr>`).join("");
  const govde = ust("SİPARİŞ FORMU", `Sipariş No: #${s.id} · Durum: ${s.durum}`) +
    `<div class="kutu"><div class="satir">
       <div><div class="lbl">Müşteri</div><b>${m?.ad || "—"}</b><br>${m?.ilce || ""} ${m?.tel ? "· " + m.tel : ""}</div>
       <div><div class="lbl">Sipariş Tarihi</div>${fmt(s.tarih)}<br><div class="lbl">Teslim Tarihi</div>${fmt(s.teslimTarihi)}</div>
     </div></div>` +
    `<table><thead><tr><th class="tc">#</th><th>Ürün</th><th class="tr">Miktar</th><th class="tc">Birim</th></tr></thead><tbody>${sat}</tbody></table>` +
    (s.not ? `<div class="kutu" style="margin-top:12px"><div class="lbl">Not</div>${s.not}</div>` : "") +
    `<div class="imza"><div>Sipariş Veren</div><div>Teslim Alan</div></div>`;
  yazdir(`Sipariş #${s.id}`, govde);
}

export function yazdirSevkiyat(id: number): void {
  const sv = store.sevkiyatlar.find((x) => x.id === id);
  if (!sv) return;
  let i = 0;
  const sipSat = (sv.siparisIds || []).map((sid) => {
    const s = store.siparisler.find((x) => x.id === sid);
    if (!s) return "";
    return (s.kalemler || []).map((k) => `<tr><td class="tc">${++i}</td><td>${musAd(s.musteriId)}</td><td>${urunAd(k.urunId)}</td><td class="tr">${k.miktar} ${k.birim}</td></tr>`).join("");
  }).join("");
  const ekSat = (sv.ekstralar || []).map((e) => `<tr><td class="tc">${++i}</td><td>Ekstra</td><td>${urunAd(e.urunId)}</td><td class="tr">${e.miktar} ${e.birim}</td></tr>`).join("");
  const govde = ust("SEVK İRSALİYESİ", `İrsaliye No: #${sv.id} · Tarih: ${fmt(sv.tarih)}`) +
    `<div class="kutu"><div class="satir">
       <div><div class="lbl">Araç Plakası</div>${sv.plaka || "—"}</div>
       <div><div class="lbl">Sürücü</div>${sv.surucu || "—"}</div>
       <div><div class="lbl">Düzenleyen</div>${sv.kim || "—"}</div>
     </div></div>` +
    `<table><thead><tr><th class="tc">#</th><th>Müşteri</th><th>Ürün</th><th class="tr">Miktar</th></tr></thead><tbody>${sipSat}${ekSat}</tbody></table>` +
    (sv.not ? `<div class="kutu" style="margin-top:12px"><div class="lbl">Not</div>${sv.not}</div>` : "") +
    `<div class="imza"><div>Teslim Eden</div><div>Taşıyan</div><div>Teslim Alan</div></div>`;
  yazdir(`İrsaliye #${sv.id}`, govde);
}
