import { store, session } from "../state";
import { audit } from "../audit";
import { uploadBelge, deleteBelge, belgeUrl } from "../db";
import { HM_LIST } from "../constants";
import { $, fmt, musAd, urunAd, setHTML, setText, showToast } from "../helpers";
import type { Belge, BelgeTur } from "../types";

let curTur: BelgeTur = "hammadde";
let curRef = "";

// Belge sayısını gösteren 📎 düğmesi (render string'lerine gömülür)
export function belgeBtn(tur: BelgeTur, ref: string): string {
  const n = store.belgeler.filter((b) => b.tur === tur && b.ref === ref).length;
  return `<button class="btn ${n ? "bw" : "bg"} bsm" title="Belgeler" onclick="event.stopPropagation();openBelgeler('${tur}','${ref}')">📎${n ? " " + n : ""}</button>`;
}

function baslik(tur: BelgeTur, ref: string): string {
  switch (tur) {
    case "hammadde": return `📎 ${HM_LIST.find((h) => h.id === ref)?.ad || ref} — Faturalar`;
    case "urun": return `📎 ${urunAd(ref)} — Belgeler`;
    case "siparis": {
      const s = store.siparisler.find((x) => x.id === Number(ref));
      return `📎 Sipariş #${ref} — ${s ? musAd(s.musteriId) : ""} · Sipariş Formu`;
    }
    case "sevkiyat": return `📎 Sevkiyat #${ref} — Sevk İrsaliyesi`;
    default: return "📎 Belgeler";
  }
}

export function openBelgeler(tur: BelgeTur, ref: string): void {
  curTur = tur;
  curRef = ref;
  setText("belge-baslik", baslik(tur, ref));
  setText("belge-progress", "");
  $("belge-progress").style.display = "none";
  ($("belge-input") as HTMLInputElement).value = "";
  renderBelgeList();
  $("m-belge").classList.add("open");
}

function ikon(b: Belge): string {
  const m = b.mime.toLowerCase();
  const ad = b.dosyaAdi.toLowerCase();
  if (m.startsWith("image/")) return `<img class="belge-thumb" src="${belgeUrl(b.yol)}" alt="">`;
  let ic = "📎", bg = "rgba(100,116,139,.15)";
  if (m.includes("pdf") || ad.endsWith(".pdf")) { ic = "📄"; bg = "rgba(211,47,47,.12)"; }
  else if (m.includes("word") || /\.docx?$/.test(ad)) { ic = "📝"; bg = "rgba(21,101,192,.12)"; }
  else if (m.includes("sheet") || m.includes("excel") || /\.xlsx?$/.test(ad)) { ic = "📊"; bg = "rgba(0,200,83,.12)"; }
  return `<div class="belge-ic" style="background:${bg}">${ic}</div>`;
}

function boyutStr(b: number): string {
  return b < 1024 * 1024 ? (b / 1024).toFixed(0) + " KB" : (b / 1024 / 1024).toFixed(1) + " MB";
}

function renderBelgeList(): void {
  const list = store.belgeler.filter((b) => b.tur === curTur && b.ref === curRef);
  setHTML("belge-list", list.map((b) => `<div class="belge-row">
    ${ikon(b)}
    <div class="belge-meta">
      <div class="belge-ad"><a href="${belgeUrl(b.yol)}" target="_blank" rel="noopener" style="color:var(--acc);text-decoration:none">${b.dosyaAdi}</a></div>
      <div class="belge-sub">${boyutStr(b.boyut)}${b.yukleyen ? " · " + b.yukleyen : ""} · ${fmt(b.olusturma.slice(0, 10))}</div>
    </div>
    <a class="btn bg bsm" href="${belgeUrl(b.yol)}" target="_blank" rel="noopener" download="${b.dosyaAdi}">İndir</a>
    <button class="x" onclick="eminMisin('Belge silinecek: ${b.dosyaAdi.replace(/'/g, "")}',()=>delBelge(${b.id}))">✕</button>
  </div>`).join("") || '<div class="tm" style="text-align:center;padding:14px">Henüz belge yok</div>');
}

const REFRESH: Partial<Record<BelgeTur, () => void>> = {};
// Kaynak sayfaların yenileme fonksiyonları main.ts'te kayıt edilir (döngüsel
// importtan kaçınmak için).
export function belgeRefreshKaydet(r: Partial<Record<BelgeTur, () => void>>): void {
  Object.assign(REFRESH, r);
}

export async function belgeYukle(input: HTMLInputElement): Promise<void> {
  const files = [...(input.files || [])];
  if (!files.length) return;
  const prog = $("belge-progress");
  prog.style.display = "block";
  let ok = 0;
  for (let i = 0; i < files.length; i++) {
    setText("belge-progress", `Yükleniyor… (${i + 1}/${files.length}) ${files[i].name}`);
    try {
      const b = await uploadBelge(curTur, curRef, files[i], session.CU?.ad || "");
      store.belgeler.unshift(b);
      ok++;
    } catch (e) {
      console.error(e);
      alert(`"${files[i].name}" yüklenemedi: ${(e as Error).message}`);
    }
  }
  input.value = "";
  prog.style.display = "none";
  if (ok) {
    audit("BELGE", `${ok} belge yüklendi (${curTur} #${curRef})`);
    showToast(`${ok} belge yüklendi ✓`);
  }
  renderBelgeList();
  REFRESH[curTur]?.();
}

export async function delBelge(id: number): Promise<void> {
  const b = store.belgeler.find((x) => x.id === id);
  if (!b) return;
  await deleteBelge(b);
  store.belgeler = store.belgeler.filter((x) => x.id !== id);
  audit("BELGE SİLİNDİ", `${b.dosyaAdi} (${b.tur} #${b.ref})`);
  renderBelgeList();
  REFRESH[b.tur]?.();
}
