import { store, session } from "../state";
import { URUNLER, ATOLYE_BILGI } from "../constants";
import { yaklasikMaliyet, karHesap } from "../fiyat";
import { upsertSatisFiyat, uploadBelge, belgeUrl } from "../db";
import { audit } from "../audit";
import { fmt, val, numVal, setHTML, setVal, closeModal, showToast } from "../helpers";
import { cihazPaylas } from "../lib/paylas";
import type { Belge } from "../types";

function belgeler(): Belge[] {
  return store.belgeler.filter((b) => b.tur === "fiyat-listesi").sort((a, b) => b.ref.localeCompare(a.ref));
}

function marjHucre(kar: ReturnType<typeof karHesap>): string {
  if (!kar) return `<td class="tr mo2" style="color:var(--mut)">—</td>`;
  const renk = kar.kar >= 0 ? "var(--acc3)" : "var(--acc4)";
  return `<td class="tr mo2" style="color:${renk}">%${kar.marj.toFixed(1)}<br><span style="font-size:.62rem">${kar.kar.toFixed(0)}₺</span></td>`;
}

export function rFiyatListe(): void {
  const bels = belgeler();
  const guncel = bels[0];
  setHTML("fl-belge", guncel
    ? `<div class="yedek-bar" style="background:rgba(0,200,83,.08);border-color:rgba(0,200,83,.25)">
        <div><div style="font-weight:700">📄 Güncel Fiyat Listesi (Komisyon Kararı)</div>
          <div class="tm">Yürürlük: <b>${fmt(guncel.ref)}</b> · ${guncel.dosyaAdi}${guncel.yukleyen ? " · " + guncel.yukleyen : ""}</div></div>
        <div class="bgrp">
          <a class="btn bp" href="${belgeUrl(guncel.yol)}" target="_blank" rel="noopener">Görüntüle</a>
          <a class="btn bg" href="${belgeUrl(guncel.yol)}" target="_blank" rel="noopener" download="${guncel.dosyaAdi}">İndir</a>
        </div>
      </div>`
    : `<div class="yedek-bar"><div><div style="font-weight:700">Henüz resmî fiyat listesi belgesi yüklenmedi</div><div class="tm">Satış fiyatları yalnızca "Yeni Fiyat Listesi Yükle" ile güncellenir.</div></div></div>`);

  setHTML("fl-fiyat-tb", URUNLER.map((u) => {
    const s = store.satisFiyat[u.id] || { f5: null, f20: null, f1: null };
    const m5 = yaklasikMaliyet(u, 5), m20 = yaklasikMaliyet(u, 20);
    const k5 = karHesap(s.f5, m5), k20 = karHesap(s.f20, m20);
    return `<tr>
      <td><strong>${u.ad}</strong><div class="tm">${u.kat}</div></td>
      <td class="tr mo2">${m5.toFixed(2)} ₺</td>
      <td class="tr mo2">${s.f5 ? s.f5 + " ₺" : "—"}</td>
      ${marjHucre(k5)}
      <td class="tr mo2">${m20.toFixed(2)} ₺</td>
      <td class="tr mo2">${s.f20 ? s.f20 + " ₺" : "—"}</td>
      ${marjHucre(k20)}
    </tr>`;
  }).join(""));

  setHTML("fl-gecmis", bels.length > 1
    ? bels.slice(1).map((b) => `<tr><td class="mo2">${fmt(b.ref)}</td><td>${b.dosyaAdi}</td><td>${b.yukleyen || "—"}</td><td><a class="btn bg bsm" href="${belgeUrl(b.yol)}" target="_blank" rel="noopener">Görüntüle</a></td></tr>`).join("")
    : '<tr><td colspan="4" class="tm">Önceki liste yok</td></tr>');
}

// "Yeni Fiyat Listesi Yükle" modalını hazırla (mevcut fiyatlarla doldur)
export function prepFiyatYukle(): void {
  setVal("fy-tar", new Date().toISOString().slice(0, 10));
  const inp = document.getElementById("fy-belge") as HTMLInputElement;
  if (inp) inp.value = "";
  setHTML("fy-fiyatlar", URUNLER.map((u) => {
    const s = store.satisFiyat[u.id] || { f5: null, f20: null, f1: null };
    return `<div style="display:grid;grid-template-columns:1.6fr 1fr 1fr;gap:6px;align-items:center;margin-bottom:5px">
      <div style="font-size:.76rem;font-weight:600">${u.ad}</div>
      <input type="number" min="0" placeholder="5L ₺" value="${s.f5 ?? ""}" id="fy-${u.id}-5" style="margin:0">
      <input type="number" min="0" placeholder="20L ₺" value="${s.f20 ?? ""}" id="fy-${u.id}-20" style="margin:0">
    </div>`;
  }).join(""));
}

export async function saveFiyatYukle(): Promise<void> {
  const tarih = val("fy-tar");
  if (!tarih) { alert("Yürürlük tarihi gerekli"); return; }
  const inp = document.getElementById("fy-belge") as HTMLInputElement;
  const file = inp?.files?.[0];
  if (!file) { alert("Komisyon kararı / güncel fiyat listesi belgesini yükleyin"); return; }

  showToast("Yükleniyor…");
  // 1) Resmî belgeyi arşivle
  const bel = await uploadBelge("fiyat-listesi", tarih, file, session.CU?.ad || "");
  store.belgeler.unshift(bel);

  // 2) Belgedeki satış fiyatlarını uygula
  for (const u of URUNLER) {
    const f5v = numVal(`fy-${u.id}-5`);
    const f20v = numVal(`fy-${u.id}-20`);
    const cur = store.satisFiyat[u.id] || { f5: null, f20: null, f1: null };
    const yeni = { f5: f5v > 0 ? f5v : null, f20: f20v > 0 ? f20v : null, f1: cur.f1 };
    store.satisFiyat[u.id] = yeni;
    await upsertSatisFiyat(u.id, yeni);
  }
  audit("FİYAT LİSTESİ", `Yeni liste yüklendi · yürürlük ${fmt(tarih)} (${file.name})`);
  closeModal("m-fiyat-yukle");
  rFiyatListe();
  showToast("Fiyat listesi güncellendi ✓");
}

export function paylasFiyatListesi(): void {
  const satir = URUNLER.flatMap((u) => {
    const s = store.satisFiyat[u.id];
    if (!s) return [];
    const a: string[] = [];
    if (s.f5) a.push(`• ${u.ad} (5L): ${s.f5} ₺`);
    if (s.f20) a.push(`• ${u.ad} (20L): ${s.f20} ₺`);
    if (s.f1) a.push(`• ${u.ad} (1L): ${s.f1} ₺`);
    return a;
  });
  if (!satir.length) { showToast("Önce fiyat listesi yükleyin"); return; }
  const metin = `${ATOLYE_BILGI.ad}\nTemizlik Ürünleri Fiyat Listesi (${new Date().toLocaleDateString("tr-TR")})\n\n${satir.join("\n")}\n\nNot: Fiyatlara KDV ve nakliye dahil değildir.\nİletişim: ${ATOLYE_BILGI.tel}`;
  cihazPaylas("Fiyat Listesi", metin);
}
