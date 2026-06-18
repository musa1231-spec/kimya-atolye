import { store } from "../state";
import { audit } from "../audit";
import { insertMusteri, updateMusteri, deleteMusteri } from "../db";
import { $, val, intVal, setVal, setHTML, closeModal, musAd } from "../helpers";

export function rMus(): void {
  setHTML("mus-tb", store.musteriler.map((m) => {
    const sc = store.siparisler.filter((s) => s.musteriId == m.id).length;
    return `<tr><td><strong>${m.ad}</strong>${m.tip === "hastane" ? '<span class="ba bb" style="margin-left:4px">Hastane</span>' : ""}</td>
      <td>${m.ilce}</td><td class="mo2" style="font-size:.7rem">${m.tel || "—"}</td><td>${m.yetkili || "—"}</td>
      <td class="tr mo2">${sc}</td>
      <td style="display:flex;gap:3px"><button class="btn bg bsm" onclick="editMus(${m.id})">✏</button><button class="x" onclick="eminMisin('Müşteri silinecek',()=>delMus(${m.id}))">✕</button></td></tr>`;
  }).join(""));
}
export async function saveMus(): Promise<void> {
  const ad = val("mu-ad").trim();
  if (!ad) return;
  const eid = intVal("mu-id");
  const o = { ad, ilce: val("mu-il"), tel: val("mu-tel"), yetkili: val("mu-yetk"), adres: val("mu-adr") };
  if (eid) {
    await updateMusteri(eid, o);
    Object.assign(store.musteriler.find((m) => m.id === eid)!, o);
  } else {
    const yeni = await insertMusteri({ ...o, tip: "diger" });
    store.musteriler.push(yeni);
  }
  audit("MÜŞTERİ", `${eid ? "Düzenlendi" : "Eklendi"}: ${ad}`);
  closeModal("m-musteri");
  rMus();
}
export function editMus(id: number): void {
  const m = store.musteriler.find((x) => x.id === id);
  if (!m) return;
  setVal("mu-id", String(id));
  setVal("mu-ad", m.ad);
  setVal("mu-il", m.ilce || "");
  setVal("mu-tel", m.tel || "");
  setVal("mu-yetk", m.yetkili || "");
  setVal("mu-adr", m.adres || "");
  $("m-musteri").classList.add("open");
}
export async function delMus(id: number): Promise<void> {
  audit("MÜŞTERİ SİLİNDİ", musAd(id));
  await deleteMusteri(id);
  store.musteriler = store.musteriler.filter((m) => m.id !== id);
  rMus();
}
