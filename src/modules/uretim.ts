import { store, session } from "../state";
import { audit } from "../audit";
import { URUNLER, AMB_KOLI_K } from "../constants";
import {
  insertUretim, deleteUretim, upsertUrunStok, updateGenelStok,
  insertBidonH, insertKoliH, setOgretmenSayac, setOgrenciGun,
} from "../db";
import {
  $, today, fmt, urunAd, esansAd, ogrAd, ogcAd, urunSelect, esansOpts,
  setHTML, setText, showToast,
} from "../helpers";
import type { UretimKalem } from "../types";
import { rDash } from "./dashboard";

let ugN = 0;

// ── Aramalı öğretmen/öğrenci seçici ───────────────────────────
const selOgr = new Set<number>();
const selOgc = new Set<number>();

// Türkçe karakter duyarsız arama (ö→o, ş→s, ı/İ→i, ç→c, ü→u, ğ→g)
const TR_MAP: Record<string, string> = {
  ç: "c", Ç: "c", ğ: "g", Ğ: "g", ı: "i", İ: "i", I: "i",
  ö: "o", Ö: "o", ş: "s", Ş: "s", ü: "u", Ü: "u", â: "a", î: "i", û: "u",
};
function fold(s: string): string {
  return s.replace(/[çÇğĞıİIöÖşŞüÜâîû]/g, (c) => TR_MAP[c] || c).toLowerCase();
}

const persOf = (k: string) => (k === "ogr" ? store.ogretmenler : store.ogrenciler);
const selOf = (k: string) => (k === "ogr" ? selOgr : selOgc);

function ugInitPickers(): void {
  selOgr.clear();
  selOgc.clear();
  ["ogr", "ogc"].forEach((k) => {
    const ara = $(`ug-${k}-ara`) as HTMLInputElement;
    if (ara) ara.value = "";
    ugRenderChips(k);
    ugRenderList(k);
  });
}

function ugRenderChips(k: string): void {
  const sel = selOf(k);
  const list = persOf(k);
  const cls = k === "ogr" ? "cot" : "cog";
  const ico = k === "ogr" ? "👨‍🏫" : "🎓";
  const arr = [...sel].map((id) => list.find((p) => p.id === id)).filter(Boolean) as { id: number; ad: string }[];
  setHTML(`ug-${k}-chips`, arr.length
    ? arr.map((p) => `<span class="chip ${cls}">${ico} ${p.ad}<button class="chip-x" onclick="ugToggle('${k}',${p.id})">✕</button></span>`).join("")
    : `<span class="picker-empty">Henüz seçilmedi — yukarıdan arayıp tıklayın</span>`);
  setText(`ug-${k}-say`, `${arr.length} seçili`);
}

function ugRenderList(k: string): void {
  const q = fold((($(`ug-${k}-ara`) as HTMLInputElement)?.value || "").trim());
  const sel = selOf(k);
  const list = persOf(k) as { id: number; ad: string; gorev?: string; sn?: string }[];
  let items = list;
  if (q) items = list.filter((p) => fold(p.ad).includes(q));
  else if (list.length > 12) { setHTML(`ug-${k}-list`, `<div class="picker-hint">İsim yazarak arayın…</div>`); return; }
  if (!items.length) { setHTML(`ug-${k}-list`, `<div class="picker-hint">Eşleşen yok</div>`); return; }
  setHTML(`ug-${k}-list`, items.map((p) => {
    const on = sel.has(p.id);
    const av = k === "ogr" ? p.ad.split(" ").map((w) => w[0]).join("").substring(0, 2) : p.ad.charAt(0);
    const sub = k === "ogr" ? `<span class="pers-gorev">${p.gorev || ""}</span>` : (p.sn ? `<span class="pers-sub">${p.sn}</span>` : "");
    return `<div class="pers-row${on ? " on" : ""}" onclick="ugToggle('${k}',${p.id})">
      <span class="pers-av ${k}-av">${av}</span>
      <span class="pers-name">${p.ad}</span>${sub}
      <span class="pers-check">${on ? "✓" : "+"}</span>
    </div>`;
  }).join(""));
}

export function ugFilter(k: string): void {
  ugRenderList(k);
}

export function ugToggle(k: string, id: number): void {
  const sel = selOf(k);
  if (sel.has(id)) sel.delete(id); else sel.add(id);
  ugRenderChips(k);
  ugRenderList(k);
}

function prepUretimBase(): void {
  ($("ug-tarih") as HTMLInputElement).value = today();
  ($("ug-not") as HTMLInputElement).value = "";
  setHTML("ug-kalemler", "");
  ugInitPickers();
}

// Modal hazırlığı (openModal'dan çağrılır — boş)
export function prepUretimGun(): void {
  prepUretimBase();
  addUgK();
}

// Üretim Günü modalını verilen kalemlerle önceden doldurup açar
// (Plan → Üretim, Sipariş → Üretim bağlantıları için).
export function acUretimGunWithLines(lines: { urunId: string; kg: number; ambLt?: number }[]): void {
  prepUretimBase();
  if (lines.length) lines.forEach((l) => addUgK(l.urunId, l.kg, l.ambLt ?? 5));
  else addUgK();
  $("m-uretim-gun").classList.add("open");
}

export function addUgK(uid = "", kg = 900, ambLt = 5): void {
  const n = ugN++;
  const div = document.createElement("div");
  div.id = `ugk-${n}`;
  div.style.cssText = "background:rgba(14,165,233,.05);border:1px solid rgba(33,150,243,.15);border-radius:8px;padding:9px;margin-bottom:7px";
  const ambSel = (v: number) => (ambLt === v ? "selected" : "");
  div.innerHTML = `
    <div class="ugk-grid" style="display:grid;grid-template-columns:2fr 1.5fr 100px 80px 80px 28px;gap:6px;align-items:end">
      <div><label>Ürün</label><select class="mb0 ugku" onchange="ugRefresh(this,${n})">${urunSelect(uid)}</select></div>
      <div><label>Esans/Seans</label><select class="mb0 ugke" id="ugke-${n}">${esansOpts()}</select></div>
      <div><label>Ambalaj</label>
        <select class="mb0 ugkamb" id="ugkamb-${n}" onchange="ugCalc(${n})">
          <option value="0" ${ambSel(0)}>Ambalajsız</option><option value="1" ${ambSel(1)}>1 Lt</option>
          <option value="5" ${ambSel(5)}>5 Lt</option><option value="20" ${ambSel(20)}>20 Lt</option>
        </select>
      </div>
      <div><label>kg</label><input type="number" class="mb0 ugkm" id="ugkm-${n}" value="${kg}" min="1" oninput="ugCalc(${n})"></div>
      <div><label>Kazan</label><input type="number" class="mb0 ugkb" value="1" min="1"></div>
      <button class="x ugk-del" style="align-self:end;height:33px" onclick="document.getElementById('ugk-${n}').remove()">✕</button>
    </div>
    <div class="hesap-box" id="ugkh-${n}">—</div>`;
  $("ug-kalemler").appendChild(div);
  ugRefresh(div.querySelector(".ugku") as HTMLSelectElement, n);
  ugCalc(n);
}

export function ugRefresh(sel: HTMLSelectElement, n: number): void {
  setHTML(`ugke-${n}`, esansOpts(sel.value));
  ugCalc(n);
}

export function ugCalc(n: number): void {
  const ambLt = parseInt(($(`ugkamb-${n}`) as HTMLSelectElement)?.value) || 0;
  const kg = parseFloat(($(`ugkm-${n}`) as HTMLInputElement)?.value) || 0;
  const el = $(`ugkh-${n}`);
  if (!el) return;
  if (!ambLt || !kg) { el.textContent = "Ambalaj hesabı yok"; return; }
  const urunSel = $(`ugk-${n}`)?.querySelector(".ugku") as HTMLSelectElement;
  const yog = URUNLER.find((u) => u.id === urunSel?.value)?.yog || 1;
  const bidonAdet = Math.ceil(kg / (ambLt * yog));
  const koliPer = AMB_KOLI_K[ambLt] || 0;
  const koliAdet = koliPer > 0 ? Math.ceil(bidonAdet / koliPer) : 0;
  const mevBidon = ambLt === 1 ? store.bidon.b1 : ambLt === 5 ? store.bidon.b5 : store.bidon.b20;
  const uyari = bidonAdet > mevBidon ? ` ⚠ Stokta ${mevBidon} var!` : "";
  el.innerHTML = `📦 ${bidonAdet} adet ${ambLt}L bidon${koliAdet > 0 ? ` · 📫 ${koliAdet} koli` : ""}${uyari ? `<span style="color:var(--acc4)">${uyari}</span>` : ""}`;
}

export async function saveUretimGun(): Promise<void> {
  const tarih = ($("ug-tarih") as HTMLInputElement).value;
  if (!tarih) { alert("Tarih seç"); return; }
  const kalemler: UretimKalem[] = [...document.querySelectorAll<HTMLElement>("#ug-kalemler > div")].map((d) => {
    const ambLt = parseInt((d.querySelector(".ugkamb") as HTMLSelectElement)?.value) || 0;
    const kg = parseFloat((d.querySelector(".ugkm") as HTMLInputElement)?.value) || 0;
    const urunId = (d.querySelector(".ugku") as HTMLSelectElement)?.value || "";
    const yog = URUNLER.find((u) => u.id === urunId)?.yog || 1;
    const bidonAdet = ambLt > 0 ? Math.ceil(kg / (ambLt * yog)) : 0;
    const koliPer = AMB_KOLI_K[ambLt] || 0;
    const koliAdet = koliPer > 0 ? Math.ceil(bidonAdet / koliPer) : 0;
    return { urunId, esansId: (d.querySelector(".ugke") as HTMLSelectElement)?.value || null, kg, batch: parseInt((d.querySelector(".ugkb") as HTMLInputElement)?.value) || 1, ambLt, bidonAdet, koliAdet };
  }).filter((k) => k.kg > 0);
  if (!kalemler.length) { alert("En az 1 ürün ekle"); return; }

  const rb1 = kalemler.filter((k) => k.ambLt === 1).reduce((s, k) => s + k.bidonAdet, 0);
  const rb5 = kalemler.filter((k) => k.ambLt === 5).reduce((s, k) => s + k.bidonAdet, 0);
  const rb20 = kalemler.filter((k) => k.ambLt === 20).reduce((s, k) => s + k.bidonAdet, 0);
  const rk = kalemler.reduce((s, k) => s + k.koliAdet, 0);
  const uyar: string[] = [];
  if (rb1 > store.bidon.b1) uyar.push(`1L bidon: ${store.bidon.b1} var, ${rb1} gerekiyor`);
  if (rb5 > store.bidon.b5) uyar.push(`5L bidon: ${store.bidon.b5} var, ${rb5} gerekiyor`);
  if (rb20 > store.bidon.b20) uyar.push(`20L bidon: ${store.bidon.b20} var, ${rb20} gerekiyor`);
  if (rk > store.koliStok) uyar.push(`Koli: ${store.koliStok} var, ${rk} gerekiyor`);
  if (uyar.length && !confirm(`⚠️ Stok uyarısı:\n${uyar.join("\n")}\n\nYine de kaydet?`)) return;

  const ogrs = [...selOgr];
  const ogcs = [...selOgc];

  const gun = await insertUretim({ tarih, not: ($("ug-not") as HTMLInputElement).value, kalemler, ogretmenler: ogrs, ogrenciler: ogcs });
  store.uretimGunleri.push(gun);

  // ürün stoğu artır
  for (const k of kalemler) {
    const st = store.urunStok[k.urunId] || { kg: 0, min: 500 };
    st.kg += k.kg;
    store.urunStok[k.urunId] = st;
    await upsertUrunStok(k.urunId, st.kg, st.min);
  }
  // bidon / koli düş
  store.bidon.b1 = Math.max(0, store.bidon.b1 - rb1);
  store.bidon.b5 = Math.max(0, store.bidon.b5 - rb5);
  store.bidon.b20 = Math.max(0, store.bidon.b20 - rb20);
  store.koliStok = Math.max(0, store.koliStok - rk);
  await updateGenelStok({ b1: store.bidon.b1, b5: store.bidon.b5, b20: store.bidon.b20, koli: store.koliStok });
  if (rb1 || rb5 || rb20) store.bidonH.push(await insertBidonH({ t: tarih, tip: "cikis", b1: rb1, b5: rb5, b20: rb20, n: `Üretim ${fmt(tarih)}` }));
  if (rk) store.koliH.push(await insertKoliH({ t: tarih, tip: "cikis", a: rk, kim: session.CU?.ad || "", n: `Üretim ${fmt(tarih)}` }));

  // personel sayaçları
  for (const id of ogrs) { const o = store.ogretmenler.find((x) => x.id === id); if (o) { o.gun = (o.gun || 0) + 1; await setOgretmenSayac(o.id, o.gun, o.islem); } }
  for (const id of ogcs) { const o = store.ogrenciler.find((x) => x.id === id); if (o) { o.gun = (o.gun || 0) + 1; await setOgrenciGun(o.id, o.gun); } }

  audit("ÜRETİM", `${fmt(tarih)}: ${kalemler.map((k) => urunAd(k.urunId) + " " + k.kg + "kg").join(", ")}`);
  $("m-uretim-gun").classList.remove("open");
  rUretim();
  rDash();
  showToast("Üretim günü kaydedildi ✓");
}

export function rUretim(): void {
  const filtre = ($("uf-ay") as HTMLInputElement)?.value || "";
  let list = [...store.uretimGunleri].sort((a, b) => b.tarih.localeCompare(a.tarih));
  if (filtre) list = list.filter((g) => g.tarih.startsWith(filtre));
  const topKg = list.reduce((s, g) => s + g.kalemler.reduce((t, k) => t + k.kg, 0), 0);
  setText("uf-top", `${list.length} gün · ${topKg.toLocaleString()} kg`);
  setHTML("uretim-list", list.map((g) => {
    const gKg = g.kalemler.reduce((s, k) => s + k.kg, 0);
    return `<div class="ug-card">
      <div class="ug-hd" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">
        <div><div style="font-weight:800">📅 ${fmt(g.tarih)}</div>
          <div class="tm">${g.kalemler.length} ürün · ${gKg.toLocaleString()} kg${g.not ? " · " + g.not : ""}</div></div>
        <div class="bgrp">
          <span class="ba bg2">${(g.ogretmenler || []).length} öğretmen · ${(g.ogrenciler || []).length} öğrenci</span>
          <button class="btn bg bsm" onclick="event.stopPropagation();foyUretim(${g.id})">🖨 Föy</button>
          <button class="x" onclick="event.stopPropagation();eminMisin('Üretim günü silinecek',()=>delGun(${g.id}))">✕</button>
        </div>
      </div>
      <div class="ug-bd">
        ${g.kalemler.map((k) => `<div class="ugr">
          <div class="ugrn">${urunAd(k.urunId)}</div>
          ${k.esansId ? `<span class="ba bpu2">${esansAd(k.esansId)}</span>` : ""}
          <span class="mo2" style="color:var(--acc)">${k.kg.toLocaleString()} kg</span>
          ${k.ambLt > 0 ? `<span class="ba bb">${k.bidonAdet}×${k.ambLt}L</span>` : ""}
          ${k.koliAdet > 0 ? `<span class="ba bam">${k.koliAdet} koli</span>` : ""}
          <span class="ba bgr">${k.batch} kazan</span>
        </div>`).join("")}
        <div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:8px;padding-top:8px;border-top:1px solid var(--bord)">
          ${(g.ogretmenler || []).map((id) => `<span class="chip cot">👨‍🏫 ${ogrAd(id)}</span>`).join("")}
          ${(g.ogrenciler || []).map((id) => `<span class="chip cog">🎓 ${ogcAd(id)}</span>`).join("")}
        </div>
      </div>
    </div>`;
  }).join("") || '<div class="tm" style="text-align:center;padding:25px">Bu ayda üretim yok</div>');
}

export async function delGun(id: number): Promise<void> {
  const g = store.uretimGunleri.find((x) => x.id === id);
  if (g) {
    for (const k of g.kalemler) {
      if (store.urunStok[k.urunId]) {
        store.urunStok[k.urunId].kg = Math.max(0, store.urunStok[k.urunId].kg - k.kg);
        await upsertUrunStok(k.urunId, store.urunStok[k.urunId].kg, store.urunStok[k.urunId].min);
      }
    }
    store.bidon.b1 += g.kalemler.filter((k) => k.ambLt === 1).reduce((s, k) => s + (k.bidonAdet || 0), 0);
    store.bidon.b5 += g.kalemler.filter((k) => k.ambLt === 5).reduce((s, k) => s + (k.bidonAdet || 0), 0);
    store.bidon.b20 += g.kalemler.filter((k) => k.ambLt === 20).reduce((s, k) => s + (k.bidonAdet || 0), 0);
    store.koliStok += g.kalemler.reduce((s, k) => s + (k.koliAdet || 0), 0);
    await updateGenelStok({ b1: store.bidon.b1, b5: store.bidon.b5, b20: store.bidon.b20, koli: store.koliStok });
    for (const id2 of g.ogretmenler || []) { const o = store.ogretmenler.find((x) => x.id === id2); if (o) { o.gun = Math.max(0, (o.gun || 1) - 1); await setOgretmenSayac(o.id, o.gun, o.islem); } }
    for (const id2 of g.ogrenciler || []) { const o = store.ogrenciler.find((x) => x.id === id2); if (o) { o.gun = Math.max(0, (o.gun || 1) - 1); await setOgrenciGun(o.id, o.gun); } }
    audit("SİLİNDİ", `Üretim günü silindi: ${fmt(g.tarih)}`);
  }
  await deleteUretim(id);
  store.uretimGunleri = store.uretimGunleri.filter((x) => x.id !== id);
  rUretim();
  rDash();
  showToast("Üretim günü silindi");
}
