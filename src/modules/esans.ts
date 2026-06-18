import { store } from "../state";
import { audit } from "../audit";
import { URUNLER } from "../constants";
import { insertEsans, setEsansStok, insertEsansH, upsertEslestirme } from "../db";
import { $, val, numVal, setVal, today, esansAd, setHTML, closeModal } from "../helpers";

export function rEsans(): void {
  setHTML("esans-kartlar", store.esanslar.map((e) => {
    const pct = e.minEsik > 0 ? Math.min(100, (e.stok / e.minEsik) * 100) : 100;
    const dur = e.stok === 0 ? "br" : e.stok < e.minEsik ? "bam" : "bg2";
    return `<div class="card" style="border-left:3px solid ${e.renk}">
      <div style="display:flex;align-items:center;gap:7px;margin-bottom:5px">
        <div style="width:9px;height:9px;border-radius:50%;background:${e.renk};flex-shrink:0"></div>
        <div style="font-weight:800;font-size:.82rem;flex:1">${e.ad}</div>
        <span class="ba ${dur}">${e.stok}kg</span>
      </div>
      <div class="tm">${e.aciklama || ""}</div>
      <div class="progress mt8"><div class="pb" style="background:${e.renk};width:${pct}%"></div></div>
      <div class="tm" style="margin-top:3px">Min: ${e.minEsik}kg</div>
      <div class="bgrp mt8">
        <button class="btn bg bsm" onclick="hEsans('${e.id}','giris')">+ Giriş</button>
        <button class="btn bd bsm" style="padding:4px 8px" onclick="hEsans('${e.id}','cikis')">− Çıkış</button>
      </div></div>`;
  }).join(""));
  setHTML("esl-tb", URUNLER.map((u) => {
    const esl = store.eslestirmeler[u.id] || [];
    return `<tr><td><strong>${u.ad}</strong></td><td>${esl.map((id) => `<span class="ba bpu2" style="margin-right:3px">${esansAd(id)}</span>`).join("") || "—"}</td></tr>`;
  }).join(""));
}

export function hEsans(id: string, tip: string): void {
  setHTML("eg-e", store.esanslar.map((e) => `<option value="${e.id}" ${e.id === id ? "selected" : ""}>${e.ad}</option>`).join(""));
  setVal("eg-t", tip);
  $("m-esans-giris").classList.add("open");
}

export async function saveEsansGiris(): Promise<void> {
  const eid = val("eg-e");
  const tip = val("eg-t");
  const m = numVal("eg-m");
  const e = store.esanslar.find((x) => x.id === eid);
  if (!e) return;
  e.stok = tip === "giris" ? e.stok + m : Math.max(0, e.stok - m);
  await setEsansStok(eid, e.stok);
  const h = await insertEsansH({ t: today(), eid, tip, m, n: val("eg-n") });
  store.esansH.push(h);
  audit("ESANS", `${e.ad}: ${tip} ${m}kg`);
  closeModal("m-esans-giris");
  rEsans();
}

export async function saveEsansTanim(): Promise<void> {
  const ad = val("et-ad").trim();
  if (!ad) return;
  const id = ad.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const yeni = { id, ad, renk: val("et-rk"), aciklama: val("et-ac"), stok: 0, minEsik: numVal("et-e") || 5 };
  const ins = await insertEsans(yeni);
  store.esanslar.push(ins);
  audit("ESANS TANIM", `Yeni esans: ${ad}`);
  closeModal("m-esans-tanim");
  rEsans();
}

export async function saveEslestirme(): Promise<void> {
  for (const u of URUNLER) {
    const ids = [...document.querySelectorAll<HTMLInputElement>(`input[data-u="${u.id}"]:checked`)].map((x) => x.dataset.e!);
    store.eslestirmeler[u.id] = ids;
    await upsertEslestirme(u.id, ids);
  }
  audit("ESANS EŞLEŞTİRME", "Ürün-esans eşleştirmeleri güncellendi");
  closeModal("m-eslas");
  rEsans();
}
