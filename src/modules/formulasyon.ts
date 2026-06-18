import { URUNLER } from "../constants";
import { hmFiyatAd, rawKg } from "../fiyat";
import { $, val, urunSelect, setHTML, setText } from "../helpers";

export function rFormulasyon(): void {
  setHTML("fl-tb", URUNLER.map((u) => `<tr>
    <td><strong>${u.ad}</strong></td><td><span class="ba bgr">${u.kat}</span></td>
    <td class="tr mo2">${u.batch}</td><td class="tr mo2">${u.yog} kg/L</td>
    <td style="font-size:.72rem;color:var(--mut)">${u.ings.map(([ad, pct]) => `${ad} %${pct}`).join(", ")}</td>
  </tr>`).join(""));
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
  const topMal = rawKg(u);
  setHTML("fd-kazan-info", `Varsayılan: <strong>${u.batch} kg</strong> · ${u.yog} kg/L · ≈ <strong>${(kazan / u.yog).toFixed(1)} L</strong>`);
  setHTML("fd-icerik", `
    <div class="card">
      <div class="ch"><span class="ct">${u.ad} — Formülasyon</span><span class="ba bgr">${u.kat} · Kazan: ${kazan} kg · ${u.yog} kg/L</span></div>
      <div class="tw"><table><thead><tr><th>Ham Madde</th><th class="tr">%</th><th class="tr">Kazan kg</th><th class="tr">₺/kg ham mad.</th><th class="tr">Kazan maliyeti ₺</th></tr></thead>
      <tbody>${u.ings.map(([ad, pct]) => `<tr>
        <td>${ad}</td><td class="tr mo2">${pct}</td>
        <td class="tr mo2">${((kazan * pct) / 100).toFixed(3)}</td>
        <td class="tr mo2">${hmFiyatAd(ad).toFixed(2)}</td>
        <td class="tr mo2" style="color:var(--acc)">${((hmFiyatAd(ad) * kazan * pct) / 100).toFixed(2)}</td>
      </tr>`).join("")}
      <tr style="background:rgba(255,255,255,.03);font-weight:800">
        <td colspan="3">TOPLAM</td>
        <td class="tr mo2" style="color:var(--acc)">${topMal.toFixed(3)} ₺/kg</td>
        <td class="tr mo2" style="color:var(--acc)">${(topMal * kazan).toFixed(2)} ₺</td>
      </tr></tbody></table></div>
    </div>`);
}
