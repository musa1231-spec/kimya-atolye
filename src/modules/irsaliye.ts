import { store, session } from "../state";
import { audit } from "../audit";
import { ATOLYE_BILGI } from "../constants";
import { insertIrsaliye, deleteIrsaliye } from "../db";
import { $, val, intVal, today, fmt, urunAd, musAd, urunSelect, setHTML, setVal, closeModal, showToast } from "../helpers";
import { yazdir } from "./disaaktar";
import { cihazPaylas } from "../lib/paylas";
import type { IrsaliyeKalem } from "../types";

let irkN = 0;
const irsNo = (id: number) => `İRS-${new Date().getFullYear()}-${String(id).padStart(4, "0")}`;

export function rIrsaliye(): void {
  setHTML("irs-list", store.irsaliyeler.map((i) => {
    const kalem = (i.kalemler || []).map((k) => `${urunAd(k.urunId)} ${k.miktar}${k.birim}`).join(", ");
    return `<div class="sv-card">
      <div class="sv-hd">
        <div><div style="font-weight:800">🧾 ${irsNo(i.id)} · ${musAd(i.musteriId)}</div>
          <div class="tm">${fmt(i.tarih)}${i.saat ? " " + i.saat : ""} · ${i.plaka || "—"}${i.surucu ? " · " + i.surucu : ""}</div></div>
        <div class="bgrp">
          <button class="btn bp bsm" onclick="yazdirIrsaliye(${i.id})">🖨 Yazdır</button>
          <button class="btn bg bsm" title="WhatsApp/E-posta ile paylaş" onclick="paylasIrsaliye(${i.id})">📲</button>
          <button class="x" onclick="eminMisin('İrsaliye silinecek',()=>delIrsaliye(${i.id}))">✕</button>
        </div>
      </div>
      <div class="sv-bd"><div class="tm">${kalem || "—"}</div>${i.not ? `<div class="tm">${i.not}</div>` : ""}</div>
    </div>`;
  }).join("") || '<div class="tm" style="text-align:center;padding:25px">Henüz irsaliye oluşturulmadı</div>');
}

export function prepIrsaliye(): void {
  setHTML("ir-mus", store.musteriler.map((m) => `<option value="${m.id}">${m.ad}</option>`).join(""));
  setVal("ir-tar", today());
  ["ir-plaka", "ir-surucu", "ir-tasiyan", "ir-vergi", "ir-not"].forEach((x) => setVal(x, ""));
  setHTML("ir-kalemler", "");
  addIrsK();
}

// Sipariş → İrsaliye: müşteri + kalemlerle önceden doldurup açar
export function acIrsaliyeWith(musteriId: number, kalemler: IrsaliyeKalem[]): void {
  setHTML("ir-mus", store.musteriler.map((m) => `<option value="${m.id}" ${m.id === musteriId ? "selected" : ""}>${m.ad}</option>`).join(""));
  setVal("ir-tar", today());
  ["ir-plaka", "ir-surucu", "ir-tasiyan", "ir-vergi", "ir-not"].forEach((x) => setVal(x, ""));
  setHTML("ir-kalemler", "");
  if (kalemler.length) kalemler.forEach((k) => addIrsK(k.urunId, k.miktar, k.birim));
  else addIrsK();
  $("m-irsaliye").classList.add("open");
}

export function addIrsK(uid = "", m = 1, b = "adet"): void {
  irkN++;
  const div = document.createElement("div");
  div.style.cssText = "display:grid;grid-template-columns:1fr 90px 80px 28px;gap:6px;margin-bottom:6px;align-items:end";
  div.innerHTML = `<div><label>Ürün / Mal Cinsi</label><select class="mb0 irk-u">${urunSelect(uid)}</select></div>
    <div><label>Miktar</label><input type="number" class="mb0 irk-m" value="${m}" min="1"></div>
    <div><label>Birim</label><select class="mb0 irk-b"><option ${b === "adet" ? "selected" : ""}>adet</option><option ${b === "L" ? "selected" : ""}>L</option><option ${b === "kg" ? "selected" : ""}>kg</option><option ${b === "koli" ? "selected" : ""}>koli</option></select></div>
    <button class="x" style="height:33px;align-self:end" onclick="this.parentElement.remove()">✕</button>`;
  $("ir-kalemler").appendChild(div);
}

// Seçili müşterinin açık siparişlerindeki ürünleri irsaliyeye doldurur
export function irsSiparistenDoldur(): void {
  const mid = intVal("ir-mus");
  const acik = store.siparisler.filter((s) => s.musteriId === mid && s.durum !== "teslim edildi");
  const kalemler = acik.flatMap((s) => s.kalemler || []);
  if (!kalemler.length) { alert("Bu müşterinin açık siparişi bulunamadı."); return; }
  setHTML("ir-kalemler", "");
  kalemler.forEach((k) => addIrsK(k.urunId, k.miktar, k.birim));
  showToast(`${kalemler.length} kalem siparişten eklendi`);
}

export async function saveIrsaliye(): Promise<void> {
  const mid = intVal("ir-mus");
  const kalemler: IrsaliyeKalem[] = [...document.querySelectorAll<HTMLElement>("#ir-kalemler > div")].map((d) => ({
    urunId: (d.querySelector(".irk-u") as HTMLSelectElement).value,
    miktar: parseFloat((d.querySelector(".irk-m") as HTMLInputElement).value) || 0,
    birim: (d.querySelector(".irk-b") as HTMLSelectElement).value,
  })).filter((k) => k.miktar > 0);
  if (!mid || !kalemler.length) { alert("Müşteri ve en az 1 kalem gerekli"); return; }
  const saat = new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  const yeni = await insertIrsaliye({
    tarih: val("ir-tar") || today(), saat, musteriId: mid, plaka: val("ir-plaka"), surucu: val("ir-surucu"),
    tasiyan: val("ir-tasiyan"), aliciVergi: val("ir-vergi"), not: val("ir-not"), kalemler, kim: session.CU?.ad || "",
  });
  store.irsaliyeler.unshift(yeni);
  audit("İRSALİYE", `${irsNo(yeni.id)} — ${musAd(mid)} (${kalemler.length} kalem)`);
  closeModal("m-irsaliye");
  rIrsaliye();
  showToast("İrsaliye oluşturuldu ✓");
  yazdirIrsaliye(yeni.id); // oluştur + yazdır
}

export async function delIrsaliye(id: number): Promise<void> {
  await deleteIrsaliye(id);
  store.irsaliyeler = store.irsaliyeler.filter((i) => i.id !== id);
  audit("İRSALİYE SİLİNDİ", irsNo(id));
  rIrsaliye();
}

export function paylasIrsaliye(id: number): void {
  const i = store.irsaliyeler.find((x) => x.id === id);
  if (!i) return;
  const m = store.musteriler.find((x) => x.id === i.musteriId);
  const kalem = (i.kalemler || []).map((k, x) => `${x + 1}. ${urunAd(k.urunId)} ${k.miktar}${k.birim}`).join("\n");
  const metin = `Sevk İrsaliyesi ${irsNo(i.id)}\nAlıcı: ${m?.ad || ""}\nTarih: ${fmt(i.tarih)} ${i.saat || ""}\n\n${kalem}\n\nPlaka: ${i.plaka || "—"} · Sürücü: ${i.surucu || "—"}\n${ATOLYE_BILGI.ad}`;
  cihazPaylas("Sevk İrsaliyesi", metin, m?.tel);
}

export function yazdirIrsaliye(id: number): void {
  const i = store.irsaliyeler.find((x) => x.id === id);
  if (!i) return;
  const m = store.musteriler.find((x) => x.id === i.musteriId);
  const satir = (i.kalemler || []).map((k, idx) => `<tr><td class="tc">${idx + 1}</td><td>${urunAd(k.urunId)}</td><td class="tr">${k.miktar}</td><td class="tc">${k.birim}</td></tr>`).join("");
  const govde = `
    <h1 style="text-align:center">SEVK İRSALİYESİ</h1>
    <div class="satir" style="margin-bottom:10px">
      <div><span class="lbl">İrsaliye No</span><br><b>${irsNo(i.id)}</b></div>
      <div><span class="lbl">Düzenleme Tarihi</span><br>${fmt(i.tarih)}</div>
      <div><span class="lbl">Fiili Sevk</span><br>${fmt(i.tarih)} ${i.saat || ""}</div>
    </div>
    <div class="satir">
      <div class="kutu" style="flex:1">
        <div class="lbl">Gönderen</div>
        <b>${ATOLYE_BILGI.ad}</b><br>${ATOLYE_BILGI.adres}<br>Tel: ${ATOLYE_BILGI.tel}${ATOLYE_BILGI.vergi ? `<br>VKN/Vergi D.: ${ATOLYE_BILGI.vergi}` : ""}
      </div>
      <div class="kutu" style="flex:1">
        <div class="lbl">Alıcı</div>
        <b>${m?.ad || "—"}</b><br>${[m?.ilce, m?.adres].filter(Boolean).join(" / ") || "—"}<br>${m?.tel ? "Tel: " + m.tel : ""}${i.aliciVergi ? `<br>VKN/TCKN: ${i.aliciVergi}` : ""}${m?.yetkili ? `<br>Yetkili: ${m.yetkili}` : ""}
      </div>
    </div>
    <table><thead><tr><th class="tc">Sıra</th><th>Malın Cinsi</th><th class="tr">Miktar</th><th class="tc">Birim</th></tr></thead><tbody>${satir}</tbody></table>
    <div class="kutu" style="margin-top:12px"><div class="satir">
      <div><span class="lbl">Taşıyan</span><br>${i.tasiyan || "—"}</div>
      <div><span class="lbl">Araç Plakası</span><br>${i.plaka || "—"}</div>
      <div><span class="lbl">Sürücü</span><br>${i.surucu || "—"}</div>
    </div></div>
    ${i.not ? `<div class="kutu" style="margin-top:8px"><span class="lbl">Not</span><br>${i.not}</div>` : ""}
    <div class="imza"><div>Teslim Eden<br>${i.kim || ""}</div><div>Taşıyan</div><div>Teslim Alan</div></div>
    <div style="margin-top:14px;font-size:10px;color:#5a6f99">Bu belge sevk irsaliyesidir, fatura yerine geçmez.</div>`;
  yazdir(`İrsaliye ${irsNo(i.id)}`, govde);
}
