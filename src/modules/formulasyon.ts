import { URUNLER } from "../constants";
import { hmFiyatAd, rawKg } from "../fiyat";
import { $, val, urunSelect, setHTML, setText } from "../helpers";
import { alkolUyarla, alkolSecimHTML, alkolSecimOku, alkolNotHTML, urundeAlkolVar, DEZENFEKTAN_AD } from "../alkol";
import { ATLAMA_UYARI, atlamaRozet, atlamaUyariHTML, atlamaListesi, atlamaOzetHTML } from "../rehber";
import { bilesimBar, grupLejant } from "../lib/bilesen";

export function rFormulasyon(): void {
  setHTML("fl-tb", URUNLER.map((u) => `<tr>
    <td><strong>${u.ad}</strong></td><td><span class="ba bgr">${u.kat}</span></td>
    <td class="tr mo2">${u.batch}</td><td class="tr mo2">${u.yog} kg/L</td>
    <td style="font-size:.72rem;color:var(--mut);min-width:260px">${bilesimBar(u.ings)}${u.ings.map(([ad, pct]) => `${ad} %${pct}${atlamaRozet(u.id, ad)}`).join(", ")}</td>
  </tr>`).join(""));
  // Pek kullanılmayan ham maddeler: hangi üründe şart? (tablo altına)
  setHTML("fl-atla", `<div class="tm" style="margin:10px 0 2px">🎨 Şerit, formülün su dışındaki kısmını gösterir:</div>${grupLejant()}`
    + `<div class="tm" style="margin:12px 0 4px">⚠️ İşaretli ham maddeler atölyede çoğu zaman konmuyor. Kullanılmazsa ne olacağını görmek için <b>Bileşen Detayı</b>'nda ürünü seçin.</div>`
    + Object.keys(ATLAMA_UYARI).map((ad) => atlamaOzetHTML(ad, URUNLER)).join(""));
  setHTML("fd-urun", urunSelect());
}

export function rFormDetay(): void {
  const id = val("fd-urun");
  const u = URUNLER.find((x) => x.id === id);
  if (!u) {
    setHTML("fd-icerik", "");
    setText("fd-kazan-info", "");
    ($("fd-kazan") as HTMLInputElement).value = "";
    return;
  }
  ($("fd-kazan") as HTMLInputElement).value = String(u.batch);
  rFormDetayHesap();
}

export function rFormDetayHesap(): void {
  const id = val("fd-urun");
  const u = URUNLER.find((x) => x.id === id);
  if (!u) return;
  const kazan = parseFloat(val("fd-kazan")) || u.batch;
  // Alkol kaynağı seçeneği (IPA / etil alkol / eski el dezenfektanı)
  const aw = $("fd-alkol");
  let alkNot = "";
  let ru = u;
  if (urundeAlkolVar(u)) {
    if (!aw.innerHTML) setHTML("fd-alkol", alkolSecimHTML("fd", "rFormDetayHesap"));
    aw.style.display = "block";
    const s = alkolUyarla(u, alkolSecimOku("fd"));
    alkNot = alkolNotHTML(s);
    if (!s.engel) ru = s.urun;
  } else aw.style.display = "none";
  const fiyat = (ad: string) => ad.startsWith(DEZENFEKTAN_AD) ? 0 : hmFiyatAd(ad);
  const topMal = ru === u ? rawKg(u) : ru.ings.reduce((t, [ad, pct]) => t + (fiyat(ad) * pct) / 100, 0);
  setHTML("fd-kazan-info", `Varsayılan: <strong>${u.batch} kg</strong> · ${u.yog} kg/L · ≈ <strong>${(kazan / u.yog).toFixed(1)} L</strong>`);
  setHTML("fd-icerik", `${alkNot}
    <div class="card">
      <div class="ch"><span class="ct">${u.ad} — Formülasyon</span><span class="ba bgr">${u.kat} · Kazan: ${kazan} kg · ${u.yog} kg/L</span></div>
      ${bilesimBar(ru.ings, true)}${grupLejant(ru.ings)}
      <div class="tw"><table><thead><tr><th>Ham Madde</th><th class="tr">%</th><th class="tr">Kazan kg</th><th class="tr">₺/kg ham mad.</th><th class="tr">Kazan maliyeti ₺</th></tr></thead>
      <tbody>${ru.ings.map(([ad, pct]) => `<tr>
        <td>${ad}${atlamaRozet(u.id, ad)}${ad.startsWith(DEZENFEKTAN_AD) ? ` <span class="ba bgr" title="Eldeki stok — alış maliyeti yok">eldeki stok</span>` : ""}</td><td class="tr mo2">${pct}</td>
        <td class="tr mo2">${((kazan * pct) / 100).toFixed(3)}</td>
        <td class="tr mo2">${fiyat(ad).toFixed(2)}</td>
        <td class="tr mo2" style="color:var(--acc)">${((fiyat(ad) * kazan * pct) / 100).toFixed(2)}</td>
      </tr>`).join("")}
      <tr style="background:rgba(255,255,255,.03);font-weight:800">
        <td colspan="3">TOPLAM</td>
        <td class="tr mo2" style="color:var(--acc)">${topMal.toFixed(3)} ₺/kg</td>
        <td class="tr mo2" style="color:var(--acc)">${(topMal * kazan).toFixed(2)} ₺</td>
      </tr></tbody></table></div>
    </div>
    ${atlamaListesi(u.id, u.ings.map(([a]) => a)).map((x) => atlamaUyariHTML(u.id, x.ad)).join("")}`);
}
