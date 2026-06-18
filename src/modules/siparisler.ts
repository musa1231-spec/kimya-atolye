import { store, session } from "../state";
import { audit } from "../audit";
import { SDUR } from "../constants";
import { insertSiparis, updateSiparis, setSiparisDurum, deleteSiparis } from "../db";
import {
  $, val, intVal, today, fmt, urunAd, musAd, stBadge, urunSelect,
  setHTML, setText, setVal, closeModal, showToast,
} from "../helpers";
import type { SiparisKalem, SiparisDurum } from "../types";
import { belgeBtn } from "./belge";
import { acUretimGunWithLines } from "./uretim";
import { acIrsaliyeWith } from "./irsaliye";
import { ATOLYE_BILGI } from "../constants";
import { cihazPaylas } from "../lib/paylas";

let sfilt = "hepsi";
let sipN = 0;

// "+ Yeni Sipariş" için modal hazırlığı (openModal'dan çağrılır)
export function prepSiparis(): void {
  setVal("sm-eid", "");
  setText("sip-modal-baslik", "📋 Yeni Sipariş");
  setVal("sm-tar", today());
  setVal("sm-tel", today(7));
  setVal("sm-not", "");
  setHTML("sm-kalemler", "");
  addSipK();
  setHTML("sm-mus", store.musteriler.map((m) => `<option value="${m.id}">${m.ad}</option>`).join(""));
}

export function rSiparisler(f: string = sfilt): void {
  sfilt = f;
  let list = [...store.siparisler].reverse();
  if (f !== "hepsi") list = list.filter((s) => s.durum === f);
  setHTML("sip-list", list.map((s) => {
    const m = store.musteriler.find((x) => x.id == s.musteriId);
    return `<div class="sip-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:7px;margin-bottom:7px;flex-wrap:wrap">
        <div><div style="font-weight:800">🏥 ${m?.ad || "—"}</div>
          <div class="tm">${m?.ilce || ""} · ${fmt(s.tarih)} → ${fmt(s.teslimTarihi)}</div>
          ${s.not ? `<div class="tm">${s.not}</div>` : ""}
          ${s.duzenleyen ? `<div class="tm" style="font-size:.63rem">Son düzenleme: ${s.duzenleyen}</div>` : ""}
        </div>
        <div class="bgrp">
          <span class="ba ${stBadge(s.durum)}">${s.durum}</span>
          ${s.durum !== "teslim edildi" ? `<button class="btn bg bsm" onclick="eminMisin('${s.durum === "bekliyor" ? "Hazırlanıyor" : "hazır"} durumuna geçirilecek',()=>nextSt(${s.id}))">→ İlerlet</button>` : ""}
          <button class="btn bg bsm" onclick="editSiparis(${s.id})">✏ Düzenle</button>
          <button class="btn bg bsm" title="Üretime aktar" onclick="siparisUretimeAktar(${s.id})">🏭</button>
          <button class="btn bg bsm" title="İrsaliye oluştur" onclick="siparisIrsaliyeAktar(${s.id})">🧾</button>
          ${belgeBtn("siparis", String(s.id))}
          <button class="btn bg bsm" onclick="yazdirSiparis(${s.id})">🖨</button>
          <button class="btn bg bsm" title="WhatsApp/E-posta ile paylaş" onclick="siparisPaylas(${s.id})">📲</button>
          <button class="x" onclick="eminMisin('Sipariş silinecek',()=>delSip(${s.id}))">✕</button>
        </div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:4px">
        ${(s.kalemler || []).map((k) => `<span class="ba bb mo2">${urunAd(k.urunId)}: ${k.miktar}${k.birim}</span>`).join("")}
      </div>
    </div>`;
  }).join("") || '<div class="tm" style="text-align:center;padding:25px">Sipariş yok</div>');
  setText("bb", String(store.siparisler.filter((s) => ["bekliyor", "hazırlanıyor"].includes(s.durum)).length || ""));
}

export async function nextSt(id: number): Promise<void> {
  const s = store.siparisler.find((x) => x.id === id);
  if (!s) return;
  const i = SDUR.indexOf(s.durum);
  if (i < 3) {
    s.durum = SDUR[i + 1] as SiparisDurum;
    s.duzenleyen = `${session.CU?.ad || "?"} — ${new Date().toLocaleString("tr-TR")}`;
    await setSiparisDurum(id, s.durum, s.duzenleyen);
    audit("SİPARİŞ DURUM", `#${s.id} → ${s.durum} (${musAd(s.musteriId)})`);
    rSiparisler(sfilt);
    showToast(`Sipariş: ${s.durum}`);
  }
}

export async function delSip(id: number): Promise<void> {
  const s = store.siparisler.find((x) => x.id === id);
  audit("SİPARİŞ SİLİNDİ", `#${id} ${s ? musAd(s.musteriId) : ""} silindi`);
  await deleteSiparis(id);
  store.siparisler = store.siparisler.filter((x) => x.id !== id);
  rSiparisler(sfilt);
}

export function editSiparis(id: number): void {
  const s = store.siparisler.find((x) => x.id === id);
  if (!s) return;
  setText("sip-modal-baslik", "✏ Sipariş Düzenle");
  setVal("sm-eid", String(id));
  setHTML("sm-mus", store.musteriler.map((m) => `<option value="${m.id}" ${m.id == s.musteriId ? "selected" : ""}>${m.ad}</option>`).join(""));
  setVal("sm-tar", s.tarih);
  setVal("sm-tel", s.teslimTarihi);
  setVal("sm-not", s.not || "");
  setHTML("sm-kalemler", "");
  (s.kalemler || []).forEach((k) => addSipK(k.urunId, k.miktar, k.birim));
  $("m-siparis").classList.add("open");
}

export function addSipK(uid = "", m = 100, b = "L"): void {
  sipN++;
  const div = document.createElement("div");
  div.style.cssText = "display:grid;grid-template-columns:1fr 90px 75px 28px;gap:6px;margin-bottom:6px;align-items:end";
  div.innerHTML = `<div><label>Ürün</label><select class="mb0 sk-u">${urunSelect(uid)}</select></div>
    <div><label>Miktar</label><input type="number" class="mb0 sk-m" value="${m}" min="1"></div>
    <div><label>Birim</label><select class="mb0 sk-b"><option ${b === "L" ? "selected" : ""}>L</option><option ${b === "kg" ? "selected" : ""}>kg</option><option ${b === "adet" ? "selected" : ""}>adet</option></select></div>
    <button class="x" style="height:33px;align-self:end" onclick="this.parentElement.remove()">✕</button>`;
  $("sm-kalemler").appendChild(div);
}

// Sipariş → Üretim Günü (kalemleri önceden doldurur)
export function siparisUretimeAktar(id: number): void {
  const s = store.siparisler.find((x) => x.id === id);
  if (!s) return;
  acUretimGunWithLines((s.kalemler || []).map((k) => ({ urunId: k.urunId, kg: k.miktar, ambLt: 5 })));
}

// Sipariş onayını WhatsApp/e-posta ile paylaş
export function siparisPaylas(id: number): void {
  const s = store.siparisler.find((x) => x.id === id);
  if (!s) return;
  const m = store.musteriler.find((x) => x.id === s.musteriId);
  const kalem = (s.kalemler || []).map((k) => `• ${urunAd(k.urunId)}: ${k.miktar}${k.birim}`).join("\n");
  const metin = `Sayın ${m?.ad || ""}, siparişiniz alınmıştır:\n\n${kalem}\n\nSipariş tarihi: ${fmt(s.tarih)}\nTeslim tarihi: ${fmt(s.teslimTarihi)}\nDurum: ${s.durum}\n\n${ATOLYE_BILGI.ad}\n${ATOLYE_BILGI.tel}`;
  cihazPaylas("Sipariş", metin, m?.tel);
}

// Sipariş → İrsaliye (müşteri + kalemleri önceden doldurur)
export function siparisIrsaliyeAktar(id: number): void {
  const s = store.siparisler.find((x) => x.id === id);
  if (!s) return;
  acIrsaliyeWith(s.musteriId, (s.kalemler || []).map((k) => ({ urunId: k.urunId, miktar: k.miktar, birim: k.birim })));
}

export async function saveSiparis(): Promise<void> {
  const eid = intVal("sm-eid");
  const mid = parseInt(val("sm-mus"));
  const kalemler: SiparisKalem[] = [...document.querySelectorAll<HTMLElement>("#sm-kalemler > div")].map((d) => ({
    urunId: (d.querySelector(".sk-u") as HTMLSelectElement).value,
    miktar: parseFloat((d.querySelector(".sk-m") as HTMLInputElement).value) || 0,
    birim: (d.querySelector(".sk-b") as HTMLSelectElement).value,
  })).filter((k) => k.miktar > 0);
  if (!mid || !kalemler.length) { alert("Müşteri + kalem gerekli"); return; }

  if (eid) {
    const s = store.siparisler.find((x) => x.id === eid)!;
    const patch = { musteriId: mid, tarih: val("sm-tar"), teslimTarihi: val("sm-tel"), not: val("sm-not"), kalemler, duzenleyen: `${session.CU?.ad || "?"} — ${new Date().toLocaleString("tr-TR")}` };
    await updateSiparis(eid, patch);
    Object.assign(s, patch);
    audit("SİPARİŞ DÜZENLEME", `#${eid} ${musAd(mid)} düzenlendi`);
    showToast("Sipariş güncellendi ✓");
  } else {
    const yeni = await insertSiparis({ musteriId: mid, tarih: val("sm-tar"), teslimTarihi: val("sm-tel"), not: val("sm-not"), durum: "bekliyor", kalemler, duzenleyen: "" });
    store.siparisler.push(yeni);
    audit("SİPARİŞ", `Yeni: ${musAd(mid)} — ${kalemler.map((k) => urunAd(k.urunId) + " " + k.miktar + k.birim).join(", ")}`);
    showToast("Sipariş oluşturuldu ✓");
  }
  setVal("sm-eid", "");
  closeModal("m-siparis");
  rSiparisler(sfilt);
}
