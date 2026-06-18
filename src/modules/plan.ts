import { store } from "../state";
import { URUNLER, HM_LIST, AMB_KOLI_K, AMB_FIYAT } from "../constants";
import { rawKg, hmFiyatAd, paketMaliyet } from "../fiyat";
import { $, urunSelect, setHTML, showToast } from "../helpers";
import { exportSheets, yazdir } from "./disaaktar";
import { acUretimGunWithLines } from "./uretim";

let planN = 0;
const ID_BY_AD: Record<string, string> = Object.fromEntries(HM_LIST.map((h) => [h.ad, h.id]));

interface HesapHM { ad: string; gerekli: number; mevcut: number; eksik: number; maliyet: number }
interface Hesap {
  toplamKg: number;
  hm: HesapHM[];
  bidon: Record<number, { need: number; mevcut: number }>;
  koli: { need: number; mevcut: number };
  hmMaliyet: number;
  toplamMaliyet: number;
  ciro: number;
}
let son: Hesap | null = null;

const bidonFiyat = (lt: number) => (lt === 1 ? AMB_FIYAT.p1 : lt === 5 ? AMB_FIYAT.p5 : AMB_FIYAT.p20);
const satisFiyat = (urunId: string, lt: number) => {
  const s = store.satisFiyat[urunId];
  return lt === 5 ? s?.f5 : lt === 20 ? s?.f20 : lt === 1 ? s?.f1 : null;
};

export function rPlan(): void {
  planN = 0;
  setHTML("plan-kalemler", "");
  addPlanK();
}

export function addPlanK(): void {
  const n = planN++;
  const div = document.createElement("div");
  div.id = `plk-${n}`;
  div.style.cssText = "display:grid;grid-template-columns:2fr 90px 110px 28px;gap:6px;margin-bottom:6px;align-items:end";
  div.innerHTML = `<div><label>Ürün</label><select class="mb0 plk-u" onchange="hesaplaPlan()">${urunSelect()}</select></div>
    <div><label>kg</label><input type="number" class="mb0 plk-kg" value="900" min="1" oninput="hesaplaPlan()"></div>
    <div><label>Ambalaj</label><select class="mb0 plk-amb" onchange="hesaplaPlan()"><option value="0">Ambalajsız</option><option value="1">1 L</option><option value="5" selected>5 L</option><option value="20">20 L</option></select></div>
    <button class="x" style="height:33px;align-self:end" onclick="document.getElementById('plk-${n}').remove();hesaplaPlan()">✕</button>`;
  $("plan-kalemler").appendChild(div);
  hesaplaPlan();
}

function planSatirlari(): { urunId: string; kg: number; ambLt: number }[] {
  return [...document.querySelectorAll<HTMLElement>("#plan-kalemler > div")].map((d) => ({
    urunId: (d.querySelector(".plk-u") as HTMLSelectElement).value,
    kg: parseFloat((d.querySelector(".plk-kg") as HTMLInputElement).value) || 0,
    ambLt: parseInt((d.querySelector(".plk-amb") as HTMLSelectElement).value) || 0,
  })).filter((l) => l.kg > 0);
}

// Plandaki kalemleri Üretim Günü modalına aktarır (çift giriş yok)
export function planiUretimeAktar(): void {
  const lines = planSatirlari();
  if (!lines.length) { showToast("Önce plana ürün ekleyin"); return; }
  acUretimGunWithLines(lines.map((l) => ({ urunId: l.urunId, kg: l.kg, ambLt: l.ambLt })));
}

export function hesaplaPlan(): void {
  const lines = planSatirlari();
  const hmNeed: Record<string, number> = {};
  const bidon: Record<number, { need: number; mevcut: number }> = {
    1: { need: 0, mevcut: store.bidon.b1 }, 5: { need: 0, mevcut: store.bidon.b5 }, 20: { need: 0, mevcut: store.bidon.b20 },
  };
  let koliNeed = 0, toplamKg = 0, toplamMaliyet = 0, ciro = 0;

  for (const l of lines) {
    const u = URUNLER.find((x) => x.id === l.urunId);
    if (!u) continue;
    toplamKg += l.kg;
    u.ings.forEach(([ad, pct]) => { hmNeed[ad] = (hmNeed[ad] || 0) + (l.kg * pct) / 100; });
    if (l.ambLt > 0) {
      const bidonAdet = Math.ceil(l.kg / (l.ambLt * u.yog));
      const koliPer = AMB_KOLI_K[l.ambLt] || 0;
      bidon[l.ambLt].need += bidonAdet;
      koliNeed += koliPer > 0 ? Math.ceil(bidonAdet / koliPer) : 0;
      const pm = paketMaliyet(u, l.ambLt, bidonFiyat(l.ambLt), koliPer, AMB_FIYAT.koli, "yok", 0, u.batch);
      toplamMaliyet += pm.top * bidonAdet;
      const sf = satisFiyat(u.id, l.ambLt);
      if (sf) ciro += sf * bidonAdet;
    } else {
      toplamMaliyet += rawKg(u) * l.kg;
    }
  }

  const hm: HesapHM[] = Object.entries(hmNeed).map(([ad, gerekli]) => {
    const id = ID_BY_AD[ad];
    const mevcut = id ? store.hmStok[id]?.m || 0 : 0;
    return { ad, gerekli, mevcut, eksik: Math.max(0, gerekli - mevcut), maliyet: gerekli * hmFiyatAd(ad) };
  }).sort((a, b) => b.gerekli - a.gerekli);
  const hmMaliyet = hm.reduce((s, h) => s + h.maliyet, 0);

  son = { toplamKg, hm, bidon, koli: { need: koliNeed, mevcut: store.koliStok }, hmMaliyet, toplamMaliyet, ciro };
  renderSonuc();
}

const f0 = (n: number) => n.toLocaleString("tr-TR", { maximumFractionDigits: 0 });
const f2 = (n: number) => n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function renderSonuc(): void {
  if (!son || son.hm.length === 0) {
    setHTML("plan-sonuc", '<div class="card tm" style="text-align:center;padding:25px">Plana ürün ekleyin — ihtiyaç burada hesaplanır</div>');
    return;
  }
  const s = son;
  const kar = s.ciro - s.toplamMaliyet;
  const eksikSayisi = s.hm.filter((h) => h.eksik > 0).length;

  const stat = `<div class="sg">
    <div class="sc"><div class="sl">Toplam Üretim</div><div class="sv2 c1">${f0(s.toplamKg)}</div><div class="ss">kg</div></div>
    <div class="sc"><div class="sl">Ham Madde Maliyeti</div><div class="sv2 c2">${f0(s.hmMaliyet)}</div><div class="ss">₺</div></div>
    <div class="sc"><div class="sl">Tahmini Maliyet</div><div class="sv2 c4">${f0(s.toplamMaliyet)}</div><div class="ss">₺ (ambalaj dahil)</div></div>
    <div class="sc"><div class="sl">Tahmini Ciro</div><div class="sv2 c3">${f0(s.ciro)}</div><div class="ss">₺</div></div>
    <div class="sc"><div class="sl">Tahmini Kâr</div><div class="sv2 ${kar >= 0 ? "c3" : "c4"}">${f0(kar)}</div><div class="ss">₺</div></div>
    <div class="sc"><div class="sl">Eksik Ham Madde</div><div class="sv2 ${eksikSayisi ? "c4" : "c3"}">${eksikSayisi}</div><div class="ss">kalem</div></div>
  </div>`;

  const hmRows = s.hm.map((h) => {
    const dur = h.eksik > 0 ? `<span class="ba br">${f2(h.eksik)} kg eksik</span>` : '<span class="ba bg2">Yeterli</span>';
    return `<tr style="${h.eksik > 0 ? "background:rgba(255,23,68,.05)" : ""}">
      <td><strong>${h.ad}</strong></td>
      <td class="tr mo2">${f2(h.gerekli)}</td>
      <td class="tr mo2">${f0(h.mevcut)}</td>
      <td class="tc">${dur}</td>
      <td class="tr mo2">${f0(h.maliyet)} ₺</td></tr>`;
  }).join("");
  const hmKart = `<div class="card"><div class="ch"><span class="ct">Ham Madde İhtiyacı</span></div>
    <div class="tw"><table><thead><tr><th>Ham Madde</th><th class="tr">Gerekli (kg)</th><th class="tr">Mevcut</th><th class="tc">Durum</th><th class="tr">Maliyet</th></tr></thead><tbody>${hmRows}</tbody></table></div></div>`;

  const ambSatir = (etiket: string, need: number, mevcut: number) => {
    if (need <= 0) return "";
    const eksik = Math.max(0, need - mevcut);
    return `<tr style="${eksik > 0 ? "background:rgba(255,23,68,.05)" : ""}"><td><strong>${etiket}</strong></td>
      <td class="tr mo2">${f0(need)}</td><td class="tr mo2">${f0(mevcut)}</td>
      <td class="tc">${eksik > 0 ? `<span class="ba br">${f0(eksik)} eksik</span>` : '<span class="ba bg2">Yeterli</span>'}</td></tr>`;
  };
  const ambRows = ambSatir("1 L Bidon", s.bidon[1].need, s.bidon[1].mevcut) +
    ambSatir("5 L Bidon", s.bidon[5].need, s.bidon[5].mevcut) +
    ambSatir("20 L Bidon", s.bidon[20].need, s.bidon[20].mevcut) +
    ambSatir("Karton Koli", s.koli.need, s.koli.mevcut);
  const ambKart = ambRows
    ? `<div class="card"><div class="ch"><span class="ct">Ambalaj İhtiyacı</span></div>
       <div class="tw"><table><thead><tr><th>Tür</th><th class="tr">Gerekli</th><th class="tr">Mevcut</th><th class="tc">Durum</th></tr></thead><tbody>${ambRows}</tbody></table></div></div>`
    : "";

  setHTML("plan-sonuc", stat + '<div class="g2">' + hmKart + ambKart + "</div>");
}

export function exportPlan(): void {
  if (!son || !son.hm.length) { showToast("Önce plana ürün ekleyin"); return; }
  const hmRows: (string | number)[][] = [["Ham Madde", "Gerekli (kg)", "Mevcut (kg)", "Eksik (kg)", "Maliyet (₺)"]];
  son.hm.forEach((h) => hmRows.push([h.ad, +h.gerekli.toFixed(2), +h.mevcut.toFixed(0), +h.eksik.toFixed(2), +h.maliyet.toFixed(0)]));
  const ambRows: (string | number)[][] = [["Tür", "Gerekli", "Mevcut", "Eksik"]];
  ([[1, "1 L Bidon"], [5, "5 L Bidon"], [20, "20 L Bidon"]] as [number, string][]).forEach(([lt, ad]) => {
    if (son!.bidon[lt].need > 0) ambRows.push([ad, son!.bidon[lt].need, son!.bidon[lt].mevcut, Math.max(0, son!.bidon[lt].need - son!.bidon[lt].mevcut)]);
  });
  if (son.koli.need > 0) ambRows.push(["Karton Koli", son.koli.need, son.koli.mevcut, Math.max(0, son.koli.need - son.koli.mevcut)]);
  void exportSheets(`uretim-plani-${new Date().toISOString().slice(0, 10)}.xlsx`, [
    { name: "Ham Madde İhtiyacı", rows: hmRows }, { name: "Ambalaj İhtiyacı", rows: ambRows },
  ]);
}

export function yazdirPlan(): void {
  if (!son || !son.hm.length) { showToast("Önce plana ürün ekleyin"); return; }
  const s = son;
  const kar = s.ciro - s.toplamMaliyet;
  const hmRows = s.hm.map((h) => `<tr><td>${h.ad}</td><td class="tr">${f2(h.gerekli)} kg</td><td class="tr">${f0(h.mevcut)} kg</td><td class="tr">${h.eksik > 0 ? f2(h.eksik) + " kg" : "—"}</td></tr>`).join("");
  const amb: string[] = [];
  ([[1, "1 L Bidon"], [5, "5 L Bidon"], [20, "20 L Bidon"]] as [number, string][]).forEach(([lt, ad]) => {
    if (s.bidon[lt].need > 0) amb.push(`<tr><td>${ad}</td><td class="tr">${f0(s.bidon[lt].need)}</td><td class="tr">${f0(s.bidon[lt].mevcut)}</td><td class="tr">${Math.max(0, s.bidon[lt].need - s.bidon[lt].mevcut) || "—"}</td></tr>`);
  });
  if (s.koli.need > 0) amb.push(`<tr><td>Karton Koli</td><td class="tr">${f0(s.koli.need)}</td><td class="tr">${f0(s.koli.mevcut)}</td><td class="tr">${Math.max(0, s.koli.need - s.koli.mevcut) || "—"}</td></tr>`);
  const govde = `<h1>KİMYA ÜRETİM ATÖLYESİ — ÜRETİM PLANI</h1>
    <div class="alt">Tarih: ${new Date().toLocaleDateString("tr-TR")} · Toplam: ${f0(s.toplamKg)} kg · Tahmini maliyet: ${f0(s.toplamMaliyet)} ₺ · Tahmini kâr: ${f0(kar)} ₺</div>
    <h2>Ham Madde İhtiyacı</h2>
    <table><thead><tr><th>Ham Madde</th><th class="tr">Gerekli</th><th class="tr">Mevcut</th><th class="tr">Eksik</th></tr></thead><tbody>${hmRows}</tbody></table>
    ${amb.length ? `<h2>Ambalaj İhtiyacı</h2><table><thead><tr><th>Tür</th><th class="tr">Gerekli</th><th class="tr">Mevcut</th><th class="tr">Eksik</th></tr></thead><tbody>${amb.join("")}</tbody></table>` : ""}`;
  yazdir("Üretim Planı", govde);
}
