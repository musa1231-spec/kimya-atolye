import type { Urun } from "./types";

// ════════════════════════════════════════════════════════════════
// ALKOL KAYNAĞI UYARLAMASI
// Reçetelerde "IPA" (izopropil alkol, ≈%99) ve "Etil Alkol" (≈%96 hacimce)
// geçer. Atölye IPA yerine etil alkol, etil alkol kaynağı olarak da
// pandemi döneminden kalan EL DEZENFEKTANLARINI kullanıyor.
//
// Kural: alkolün işlevi (çözücü, hızlı kuruma) SAF alkol miktarına
// bağlıdır. IPA ile etil alkolün yoğunlukları neredeyse aynıdır
// (0,786 / 0,789 g/mL), bu yüzden saf alkol bazında 1:1 (kütlece)
// yer değiştirir. Kaynak seyreltikse:
//   kaynak kg = saf alkol kg ÷ kaynağın kütlece saflığı
//   fazladan gelen kısım SUDUR → reçetedeki su o kadar azaltılır.
// Derece alkolmetreyle HACİMCE (% v/v, 20 °C) okunur; hesap KÜTLECE
// (% w/w) yapılır. Dönüşüm aşağıdaki tablodan (etanol–su, 20 °C).
// ════════════════════════════════════════════════════════════════

export type AlkolKaynakTur = "recete" | "etil96" | "dezenfektan";
export interface AlkolKaynak { tur: AlkolKaynakTur; derece?: number /* % v/v, yalnız dezenfektan */ }

export const ALKOL_ADLARI = ["IPA", "Etil Alkol"] as const;
export const DEZENFEKTAN_AD = "Eski El Dezenfektanı";

// Etanol: hacimce % → kütlece % (20 °C, standart alkol tablosu)
const VV_WW: [number, number][] = [
  [0, 0], [10, 8.0], [20, 16.2], [30, 24.6], [40, 33.3], [50, 42.5], [60, 52.1],
  [70, 62.4], [80, 73.5], [90, 85.7], [95, 92.4], [96, 93.8], [100, 100],
];

/** Hacimce % (alkolmetre) → kütlece kesir (0–1). */
export function vvToWw(vv: number): number {
  const v = Math.min(100, Math.max(0, vv));
  for (let i = 1; i < VV_WW.length; i++) {
    const [v1, w1] = VV_WW[i - 1], [v2, w2] = VV_WW[i];
    if (v <= v2) return (w1 + ((v - v1) / (v2 - v1)) * (w2 - w1)) / 100;
  }
  return 1;
}
/** Kütlece kesir → hacimce % (en küçük gerekli dereceyi söylemek için). */
export function wwToVv(w: number): number {
  const ww = Math.min(1, Math.max(0, w)) * 100;
  for (let i = 1; i < VV_WW.length; i++) {
    const [v1, w1] = VV_WW[i - 1], [v2, w2] = VV_WW[i];
    if (ww <= w2) return v1 + ((ww - w1) / (w2 - w1)) * (v2 - v1);
  }
  return 100;
}

/** Reçetedeki hammaddenin kütlece saflığı. */
export const RECETE_SAFLIK: Record<string, number> = { IPA: 0.99, "Etil Alkol": vvToWw(96) };

export const urundeAlkolVar = (u: Urun): boolean => u.ings.some(([ad]) => (ALKOL_ADLARI as readonly string[]).includes(ad));

export interface AlkolSonuc {
  urun: Urun;             // uyarlanmış reçete (aynı id; ings değişmiş)
  adlar: Record<string, string>; // reçetedeki ad → kullanılan kaynak adı (ör. IPA → Etil Alkol)
  notlar: string[];       // ekranda gösterilecek açıklamalar
  engel?: string;         // doluysa bu kaynakla üretim YAPILAMAZ
}

const yuvarla = (x: number) => Math.round(x * 1000) / 1000;
const yuzde = (x: number) => x.toLocaleString("tr-TR", { maximumFractionDigits: 2 });

export function alkolUyarla(u: Urun, k: AlkolKaynak): AlkolSonuc {
  if (!urundeAlkolVar(u) || k.tur === "recete") return { urun: u, adlar: {}, notlar: [] };

  let kaynakSaflik: number, kaynakAd: string;
  if (k.tur === "etil96") { kaynakSaflik = vvToWw(96); kaynakAd = "Etil Alkol"; }
  else {
    const d = k.derece || 0;
    if (!(d >= 30 && d <= 100)) {
      return { urun: u, adlar: {}, notlar: [], engel: "Dezenfektanın derecesini alkolmetreyle ölçüp girin (30–100 arası). Ölçmeden hesap yapılmaz: pandemiden kalan, ağzı açılmış bidonlarda alkol buharlaşıp düşmüş olabilir." };
    }
    kaynakSaflik = vvToWw(d); kaynakAd = `${DEZENFEKTAN_AD} (%${yuzde(d)})`;
  }

  const notlar: string[] = [];
  const adlar: Record<string, string> = {};
  let suFark = 0;
  const yeni: [string, number][] = [];
  for (const [ad, pct] of u.ings) {
    if (!(ALKOL_ADLARI as readonly string[]).includes(ad)) { yeni.push([ad, pct]); continue; }
    const saf = pct * RECETE_SAFLIK[ad];
    const kaynakPct = saf / kaynakSaflik;
    suFark += kaynakPct - pct;
    yeni.push([kaynakAd, yuvarla(kaynakPct)]);
    adlar[ad] = kaynakAd;
    notlar.push(`${ad} %${yuzde(pct)} (saf alkol %${yuzde(yuvarla(saf))}) → ${kaynakAd} %${yuzde(yuvarla(kaynakPct))}.`);
  }

  const suIdx = yeni.findIndex(([ad]) => ad === "Su");
  const suEski = suIdx >= 0 ? yeni[suIdx][1] : 0;
  const suYeni = suEski - suFark;
  if (suYeni < -0.0005) {
    // Kaynak çok seyreltik: reçetedeki su, kaynakla gelen suyu karşılamıyor
    const safToplam = u.ings.filter(([ad]) => (ALKOL_ADLARI as readonly string[]).includes(ad)).reduce((t, [ad, p]) => t + p * RECETE_SAFLIK[ad], 0);
    const alkolPct = u.ings.filter(([ad]) => (ALKOL_ADLARI as readonly string[]).includes(ad)).reduce((t, [, p]) => t + p, 0);
    const minVv = Math.ceil(wwToVv(safToplam / (alkolPct + suEski)));
    return {
      urun: u, adlar, notlar,
      engel: `Bu kaynakla ${u.ad} YAPILAMAZ: dezenfektanın içindeki su reçetedeki suyu aşıyor, ürün hedef alkol oranına ulaşamaz. Bu ürün için kaynağın en az %${minVv} (hacimce) olması gerekir; %96 etil alkol kullanın.`,
    };
  }
  if (suIdx >= 0) {
    yeni[suIdx] = ["Su", yuvarla(suYeni)];
    if (suFark > 0) notlar.push(`Kaynakla birlikte gelen su kadar reçetedeki SU azaltıldı: %${yuzde(suEski)} → %${yuzde(yuvarla(suYeni))}.`);
  }

  if (u.ings.some(([ad]) => ad === "IPA")) notlar.push("IPA yerine etil alkol: işlev (çözücü, hızlı kuruma) aynıdır; yoğunlukları neredeyse eşit olduğu için saf alkol bazında kütlece 1:1 değiştirilir.");
  if (k.tur === "dezenfektan") {
    notlar.push("Yalnız SIVI dezenfektan kullanın. JEL dezenfektan (karbomer içerir) ürünü bulandırır, camda/yüzeyde iz bırakır.");
    notlar.push("Dezenfektandaki gliserin ve esans da ürüne geçer: camda hafif iz kalabilir, koku değişebilir. Üretimden önce küçük bir silme denemesi yapın.");
    notlar.push("Farklı bidonları karıştırdıysanız dereceyi karışımdan ölçün; ölçümü 20 °C'de yapın (sıcakta derece yüksek görünür).");
  }
  return { urun: { ...u, ings: yeni }, adlar, notlar };
}

// ── Ortak seçim kutusu (Asistan + Formülasyon) ────────────────
const LS_KEY = "alkolKaynak";
export function kayitliKaynak(): AlkolKaynak {
  try { const x = JSON.parse(localStorage.getItem(LS_KEY) || "null"); if (x && x.tur) return x; } catch { /* yoksa varsayılan */ }
  return { tur: "recete" };
}
export function kaynakKaydet(k: AlkolKaynak): void {
  try { localStorage.setItem(LS_KEY, JSON.stringify(k)); } catch { /* sessiz */ }
}
/** p = alan öneki (ör. "as" / "fd"), fn = değişince çağrılacak global fonksiyon adı */
export function alkolSecimHTML(p: string, fn: string): string {
  const k = kayitliKaynak();
  return `<div class="alk-kutu">
    <div class="fg" style="margin:0"><label>🧪 Alkol kaynağı</label>
      <select id="${p}-alk-tur" onchange="${fn}()">
        <option value="recete" ${k.tur === "recete" ? "selected" : ""}>Reçetedeki gibi (IPA / %96 etil alkol)</option>
        <option value="etil96" ${k.tur === "etil96" ? "selected" : ""}>%96 Etil alkol (IPA yerine)</option>
        <option value="dezenfektan" ${k.tur === "dezenfektan" ? "selected" : ""}>Eski el dezenfektanı (derecesi ölçülecek)</option>
      </select></div>
    <div class="fg" id="${p}-alk-der-w" style="margin:0;${k.tur === "dezenfektan" ? "" : "display:none"}"><label>Alkolmetre derecesi (% hacimce, 20 °C)</label>
      <input type="number" id="${p}-alk-derece" min="30" max="100" step="0.5" placeholder="ör. 70" value="${k.derece ?? ""}" oninput="${fn}()"></div>
  </div>`;
}
export function alkolSecimOku(p: string): AlkolKaynak {
  const tur = ((document.getElementById(`${p}-alk-tur`) as HTMLSelectElement | null)?.value || "recete") as AlkolKaynakTur;
  const dEl = document.getElementById(`${p}-alk-derece`) as HTMLInputElement | null;
  const derece = dEl && dEl.value !== "" ? parseFloat(dEl.value.replace(",", ".")) : undefined;
  const w = document.getElementById(`${p}-alk-der-w`);
  if (w) w.style.display = tur === "dezenfektan" ? "" : "none";
  const k: AlkolKaynak = { tur, derece };
  kaynakKaydet(k);
  return k;
}
/** Notlar + engel kutusu */
export function alkolNotHTML(s: AlkolSonuc): string {
  if (s.engel) return `<div class="alk-engel">⛔ ${s.engel}</div>`;
  if (!s.notlar.length) return "";
  return `<div class="alk-not"><b>🧪 Alkol uyarlaması</b><ul>${s.notlar.map((n) => `<li>${n}</li>`).join("")}</ul></div>`;
}
