import { store, session } from "../state";
import { audit } from "../audit";
import { insertSevkiyat, deleteSevkiyat, setSiparisDurum } from "../db";
import {
  $, val, today, fmt, urunAd, musAd, urunSelect, setHTML, setVal, closeModal, showToast,
} from "../helpers";
import type { SevkEkstra } from "../types";
import { belgeBtn } from "./belge";

let svSN = 0;
let svEN = 0;

export function prepSevkiyat(): void {
  setVal("sv-tar", today());
  ["sv-pla", "sv-sur", "sv-not"].forEach((x) => setVal(x, ""));
  setHTML("sv-siparisler", "");
  setHTML("sv-ekstralar", "");
  addSvSip();
}

export function addSvSip(): void {
  const acik = store.siparisler.filter((s) => s.durum !== "teslim edildi");
  if (!acik.length) { alert("Tüm siparişler teslim edildi"); return; }
  svSN++;
  const div = document.createElement("div");
  div.style.cssText = "display:grid;grid-template-columns:1fr 28px;gap:6px;margin-bottom:6px;align-items:end;background:rgba(16,185,129,.05);border:1px solid rgba(0,200,83,.15);border-radius:7px;padding:7px";
  div.innerHTML = `<div><label>Sipariş</label><select class="mb0 sv-sp">
    ${acik.map((s) => `<option value="${s.id}">${musAd(s.musteriId)} — ${fmt(s.tarih)} · ${(s.kalemler || []).map((k) => urunAd(k.urunId)).join(", ")}</option>`).join("")}
  </select></div>
  <button class="x" style="height:33px;align-self:end" onclick="this.parentElement.remove()">✕</button>`;
  $("sv-siparisler").appendChild(div);
}

export function addSvEk(): void {
  svEN++;
  const div = document.createElement("div");
  div.style.cssText = "display:grid;grid-template-columns:1fr 90px 75px 28px;gap:6px;margin-bottom:6px;align-items:end;background:rgba(245,158,11,.05);border:1px solid rgba(21,101,192,.15);border-radius:7px;padding:7px";
  div.innerHTML = `<div><label>Ürün</label><select class="mb0 sv-eu">${urunSelect()}</select></div>
    <div><label>Miktar</label><input type="number" class="mb0 sv-em" value="50" min="1"></div>
    <div><label>Birim</label><select class="mb0 sv-eb"><option>L</option><option>kg</option></select></div>
    <button class="x" style="height:33px;align-self:end" onclick="this.parentElement.remove()">✕</button>`;
  $("sv-ekstralar").appendChild(div);
}

export async function saveSevkiyat(): Promise<void> {
  const tarih = val("sv-tar");
  if (!tarih) { alert("Tarih gerekli"); return; }
  const sipIds = [...document.querySelectorAll<HTMLSelectElement>("#sv-siparisler .sv-sp")].map((x) => parseInt(x.value)).filter((x) => x);
  const ekstralar: SevkEkstra[] = [...document.querySelectorAll<HTMLElement>("#sv-ekstralar > div")].map((d) => ({
    urunId: (d.querySelector(".sv-eu") as HTMLSelectElement).value,
    miktar: parseFloat((d.querySelector(".sv-em") as HTMLInputElement).value) || 0,
    birim: (d.querySelector(".sv-eb") as HTMLSelectElement).value,
  })).filter((k) => k.miktar > 0);
  if (!sipIds.length && !ekstralar.length) { alert("En az 1 sipariş veya ürün ekle"); return; }

  const sevk = await insertSevkiyat({ tarih, plaka: val("sv-pla"), surucu: val("sv-sur"), not: val("sv-not"), kim: session.CU?.ad || "", siparisIds: sipIds, ekstralar });
  store.sevkiyatlar.push(sevk);
  for (const sid of sipIds) {
    const s = store.siparisler.find((x) => x.id === sid);
    if (s) {
      s.durum = "teslim edildi";
      s.duzenleyen = `${session.CU?.ad || "?"} (sevkiyat) — ${new Date().toLocaleString("tr-TR")}`;
      await setSiparisDurum(sid, s.durum, s.duzenleyen);
    }
  }
  audit("SEVKİYAT", `${fmt(tarih)}: ${sipIds.length} sipariş, ${ekstralar.length} ekstra ürün`);
  closeModal("m-sevkiyat");
  rSevkiyat();
  showToast("Sevkiyat oluşturuldu ✓");
}

export function rSevkiyat(): void {
  setHTML("sv-list", [...store.sevkiyatlar].reverse().map((sv) => {
    const sipAd = (sv.siparisIds || []).map((id) => {
      const s = store.siparisler.find((x) => x.id === id);
      return s ? `<div class="svi"><span style="font-weight:700">${musAd(s.musteriId)}</span><span class="tm">${(s.kalemler || []).map((k) => urunAd(k.urunId) + " " + k.miktar + k.birim).join(", ")}</span></div>` : "";
    }).join("");
    const ekAd = (sv.ekstralar || []).map((e) => `<div class="svi"><span class="ba bam">Ekstra</span> <span>${urunAd(e.urunId)} ${e.miktar}${e.birim}</span></div>`).join("");
    return `<div class="sv-card">
      <div class="sv-hd">
        <div><div style="font-weight:800">🚚 ${fmt(sv.tarih)}</div>
          <div class="tm">${sv.plaka || "—"} · ${sv.surucu || "—"} · ${sv.kim || ""} ${sv.not ? "· " + sv.not : ""}</div></div>
        <div class="bgrp">
          <span class="ba bg2">teslim edildi</span>
          ${belgeBtn("sevkiyat", String(sv.id))}
          <button class="btn bg bsm" onclick="yazdirSevkiyat(${sv.id})">🖨</button>
          <button class="x" onclick="eminMisin('Sevkiyat kaydı silinecek',()=>delSv(${sv.id}))">✕</button>
        </div>
      </div>
      <div class="sv-bd">${sipAd || ""}${ekAd || ""}</div>
    </div>`;
  }).join("") || '<div class="tm" style="text-align:center;padding:25px">Sevkiyat yok</div>');
}

export async function delSv(id: number): Promise<void> {
  audit("SEVKİYAT SİLİNDİ", `#${id}`);
  await deleteSevkiyat(id);
  store.sevkiyatlar = store.sevkiyatlar.filter((s) => s.id !== id);
  rSevkiyat();
}
