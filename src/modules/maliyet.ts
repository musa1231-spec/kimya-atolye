import { URUNLER } from "../constants";
import { store } from "../state";
import { rawKg, paketMaliyet, karHesap, type NakTip } from "../fiyat";
import { numVal, val, setHTML } from "../helpers";

function karRows(satis: number | null | undefined, maliyet: number): string {
  const k = karHesap(satis, maliyet);
  if (!k) return `<div class="frow"><span class="fl">Satış Fiyatı</span><span class="fv" style="color:var(--mut)">—</span></div>`;
  const renk = k.kar >= 0 ? "var(--acc3)" : "var(--acc4)";
  return `<div class="frow"><span class="fl">Satış Fiyatı</span><span class="fv">${satis!.toFixed(2)} ₺</span></div>
    <div class="frow"><span class="fl">Kâr</span><span class="fv" style="color:${renk}">${k.kar.toFixed(2)} ₺</span></div>
    <div class="frow"><span class="fl">Kâr Marjı</span><span class="fv" style="color:${renk}">%${k.marj.toFixed(1)}</span></div>`;
}

export function rMaliyet(): void {
  const p5 = numVal("mp5") || 55;
  const p20 = numVal("mp20") || 160;
  const p1 = numVal("mp1") || 18;
  const pk = numVal("mpk") || 28;
  const nakTip = (val("mnak-tip") || "yok") as NakTip;
  const nakTut = numVal("mnak-tut");
  const batch = numVal("mbatch") || 900;

  setHTML("maliyet-kartlar", URUNLER.map((u) => {
    const raw = rawKg(u);
    const c5 = paketMaliyet(u, 5, p5, 4, pk, nakTip, nakTut, batch);
    const c20 = paketMaliyet(u, 20, p20, 0, pk, nakTip, nakTut, batch);
    const c1 = paketMaliyet(u, 1, p1, 14, pk, nakTip, nakTut, batch);
    const sf = store.satisFiyat[u.id];
    const batchTop5 = raw * batch + c5.adet * p5 + Math.ceil(c5.adet / 4) * pk + (nakTip === "perset" ? nakTut : nakTip === "perkg" ? nakTut * batch : 0);

    return `<div class="fm-card">
      <div class="fm-hd">
        <div><div class="fm-name">${u.ad}</div><div class="tm">${u.kat} · Yoğunluk: ${u.yog} · Kazan: ${u.batch} kg</div></div>
        <div class="tr"><div class="mo2" style="color:var(--acc)">${raw.toFixed(3)} ₺/kg</div><div class="tm">ham madde</div></div>
      </div>
      <div class="fm-cols">
        <div class="fcol5">
          <div class="fm-col-title">📦 5 Litre Dolu Bidon</div>
          <div class="frow"><span class="fl">Ham madde (${c5.kgB.toFixed(3)} kg)</span><span class="fv">${c5.hamMad.toFixed(2)} ₺</span></div>
          <div class="frow"><span class="fl">Boş 5L bidon</span><span class="fv">${p5} ₺</span></div>
          <div class="frow"><span class="fl">Koli payı (÷4)</span><span class="fv">${c5.koliPay.toFixed(2)} ₺</span></div>
          <div class="frow"><span class="fl">Nakliye payı</span><span class="fv">${c5.nak.toFixed(2)} ₺</span></div>
          <div class="frow ftot"><span class="fl" style="font-weight:800">DOLU 5L MALİYET</span><span class="fv">${c5.top.toFixed(2)} ₺</span></div>
          ${karRows(sf?.f5, c5.top)}
          <div class="frow" style="margin-top:6px;color:var(--mut);font-size:.7rem"><span>${batch} kg kazan → ${c5.adet} bidon · ${Math.ceil(c5.adet / 4)} koli · Toplam: ${batchTop5.toFixed(0)} ₺</span></div>
        </div>
        <div class="fcol20">
          <div class="fm-col-title">🛢 20 Litre Dolu Bidon</div>
          <div class="frow"><span class="fl">Ham madde (${c20.kgB.toFixed(3)} kg)</span><span class="fv">${c20.hamMad.toFixed(2)} ₺</span></div>
          <div class="frow"><span class="fl">Boş 20L bidon</span><span class="fv">${p20} ₺</span></div>
          <div class="frow"><span class="fl">Koli payı</span><span class="fv">0 ₺</span></div>
          <div class="frow"><span class="fl">Nakliye payı</span><span class="fv">${c20.nak.toFixed(2)} ₺</span></div>
          <div class="frow ftot"><span class="fl" style="font-weight:800">DOLU 20L MALİYET</span><span class="fv">${c20.top.toFixed(2)} ₺</span></div>
          ${karRows(sf?.f20, c20.top)}
          <div class="frow"><span class="fl">₺/Litre maliyet</span><span class="fv">${c20.litreM.toFixed(3)} ₺</span></div>
        </div>
      </div>
      <div style="padding:8px 16px;border-top:1px solid var(--bord);background:rgba(0,0,0,.1)">
        <div class="frow" style="border:none;color:var(--mut);font-size:.7rem">
          <span>1L Bidon maliyet: ${c1.hamMad.toFixed(2)}+${p1}+${c1.koliPay.toFixed(2)} = <strong style="color:var(--txt)">${c1.top.toFixed(2)} ₺ (${c1.litreM.toFixed(3)} ₺/L)</strong>${sf?.f1 ? ` · Satış: ${sf.f1}₺ · Kâr: ${(sf.f1 - c1.top).toFixed(2)}₺` : ""}</span>
        </div>
      </div>
    </div>`;
  }).join(""));
}
