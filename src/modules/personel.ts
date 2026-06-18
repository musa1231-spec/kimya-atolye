import { store } from "../state";
import { audit } from "../audit";
import { initLoginScreen } from "../login";
import {
  insertOgretmen, updateOgretmen, deleteOgretmen,
  insertOgrenci, updateOgrenci, deleteOgrenci,
} from "../db";
import { $, val, intVal, setVal, setHTML, closeModal, ogrAd, ogcAd } from "../helpers";

// ── ÖĞRETMEN ──────────────────────────────────────────────────
export function rOgr(): void {
  setHTML("ogr-tb", store.ogretmenler.map((o) => `<tr>
    <td><strong>${o.ad}</strong></td><td>${o.gorev || "—"}</td>
    <td class="tm">${o.sif ? "••••••" : "-"}</td>
    <td class="tr mo2 c1">${o.gun || 0}</td><td class="tr mo2 c5">${o.islem || 0}</td>
    <td style="display:flex;gap:3px"><button class="btn bg bsm" onclick="editOgr(${o.id})">✏</button><button class="x" onclick="eminMisin('Öğretmen silinecek',()=>delOgr(${o.id}))">✕</button></td></tr>`).join(""));
}
export async function saveOgr(): Promise<void> {
  const ad = val("ot-ad").trim();
  if (!ad) return;
  const eid = intVal("ot-id");
  const gorev = val("ot-gv"), tel = val("ot-tel"), sif = val("ot-sif");
  if (eid) {
    const o = store.ogretmenler.find((x) => x.id === eid)!;
    await updateOgretmen(eid, { ad, gorev, tel, ...(sif ? { sif } : {}) });
    Object.assign(o, { ad, gorev, tel, ...(sif ? { sif } : {}) });
  } else {
    const yeni = await insertOgretmen({ ad, gorev, tel, sif });
    store.ogretmenler.push(yeni);
  }
  audit("ÖĞRETMEN", `${eid ? "Düzenlendi" : "Eklendi"}: ${ad}`);
  closeModal("m-ogr");
  rOgr();
  initLoginScreen();
}
export function editOgr(id: number): void {
  const o = store.ogretmenler.find((x) => x.id === id);
  if (!o) return;
  setVal("ot-id", String(id));
  setVal("ot-ad", o.ad);
  setVal("ot-gv", o.gorev || "");
  setVal("ot-tel", o.tel || "");
  setVal("ot-sif", "");
  $("m-ogr").classList.add("open");
}
export async function delOgr(id: number): Promise<void> {
  audit("ÖĞRETMEN SİLİNDİ", ogrAd(id));
  await deleteOgretmen(id);
  store.ogretmenler = store.ogretmenler.filter((o) => o.id !== id);
  rOgr();
  initLoginScreen();
}

// ── ÖĞRENCİ ───────────────────────────────────────────────────
export function rOgc(): void {
  setHTML("ogc-tb", store.ogrenciler.map((o) => `<tr>
    <td class="mo2">${o.no || "—"}</td><td><strong>${o.ad}</strong></td>
    <td><span class="ba bb">${o.sn || "—"}</span></td>
    <td class="mo2" style="font-size:.67rem">${o.iban || "—"}</td>
    <td class="tr mo2 c3">${o.gun || 0}</td>
    <td style="display:flex;gap:3px"><button class="btn bg bsm" onclick="editOgc(${o.id})">✏</button><button class="x" onclick="eminMisin('Öğrenci silinecek',()=>delOgc(${o.id}))">✕</button></td></tr>`).join(""));
}
export async function saveOgc(): Promise<void> {
  const ad = val("oc-ad").trim();
  if (!ad) return;
  const eid = intVal("oc-id");
  const no = val("oc-no"), sn = val("oc-sn"), iban = val("oc-ib");
  if (!eid) {
    const mevcut = store.ogrenciler.find((o) => o.ad.toLowerCase() === ad.toLowerCase());
    if (mevcut) {
      if (!confirm(`"${ad}" isimli öğrenci zaten kayıtlı. Bilgilerini güncellemek ister misiniz?`)) return;
      const yeniNo = no || mevcut.no, yeniSn = sn || mevcut.sn, yeniIban = iban || mevcut.iban;
      await updateOgrenci(mevcut.id, { no: yeniNo, sn: yeniSn, iban: yeniIban });
      Object.assign(mevcut, { no: yeniNo, sn: yeniSn, iban: yeniIban });
      audit("ÖĞRENCİ", "Mevcut öğrenci güncellendi: " + ad);
      closeModal("m-ogc");
      rOgc();
      return;
    }
  }
  if (eid) {
    const o = store.ogrenciler.find((x) => x.id === eid)!;
    await updateOgrenci(eid, { no, ad, sn, iban });
    Object.assign(o, { no, ad, sn, iban });
  } else {
    const yeni = await insertOgrenci({ no, ad, sn, iban });
    store.ogrenciler.push(yeni);
  }
  audit("ÖĞRENCİ", `${eid ? "Düzenlendi" : "Eklendi"}: ${ad}`);
  closeModal("m-ogc");
  rOgc();
}
export function editOgc(id: number): void {
  const o = store.ogrenciler.find((x) => x.id === id);
  if (!o) return;
  setVal("oc-id", String(id));
  setVal("oc-no", o.no || "");
  setVal("oc-ad", o.ad);
  setVal("oc-sn", o.sn || "");
  setVal("oc-ib", o.iban || "");
  $("m-ogc").classList.add("open");
}
export async function delOgc(id: number): Promise<void> {
  audit("ÖĞRENCİ SİLİNDİ", ogcAd(id));
  await deleteOgrenci(id);
  store.ogrenciler = store.ogrenciler.filter((o) => o.id !== id);
  rOgc();
}
