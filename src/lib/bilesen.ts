// Ham madde → kimyasal grup + renk; formülün "bileşim şeridi" (su hariç).
// Formülasyon listesinde, Bileşen Detayı'nda ve Gösterge'de kullanılır.

export interface Grup { ad: string; renk: string }
export const GRUPLAR: Record<string, Grup> = {
  aktif: { ad: "Yüzey aktif", renk: "#22c55e" },
  alkol: { ad: "Alkol / çözücü", renk: "#38bdf8" },
  asit: { ad: "Asit", renk: "#ef4444" },
  baz: { ad: "Baz", renk: "#a855f7" },
  oks: { ad: "Aktif klor", renk: "#eab308" },
  kivam: { ad: "Kıvam / nem", renk: "#64748b" },
  yag: { ad: "Yağ", renk: "#d97706" },
  katki: { ad: "Katkı (koku · renk · koruyucu)", renk: "#f472b6" },
  su: { ad: "Su", renk: "#93c5fd" },
};

export const HM_GRUP: Record<string, string> = {
  Su: "su",
  SLES: "aktif", LABSA: "aktif", Betain: "aktif", "Kokamid DEA": "aktif", NP10: "aktif",
  "Etil Alkol": "alkol", IPA: "alkol",
  "Sitrik Asit": "asit", "Fosforik Asit": "asit", HCl: "asit", HNO3: "asit",
  Kostik: "baz", "Sıvı Kostik": "baz", TEA: "baz",
  "Hipoklorit %16": "oks",
  Tuz: "kivam", Gliserin: "kivam",
  Zeytinyağı: "yag", "Defne Yağı": "yag",
  Koruyucu: "katki", Esans: "katki", "Limon Esansı": "katki", Boya: "katki", "Köpük Kesici": "katki", "Asit İnhibitörü": "katki",
};

/** Ad → grup anahtarı (uyarlanmış adlar: "Eski El Dezenfektanı (%70)" → alkol). */
export function grupBul(ad: string): string {
  if (HM_GRUP[ad]) return HM_GRUP[ad];
  if (ad.startsWith("Eski El Dezenfektanı")) return "alkol";
  return "katki";
}

const fmt = (x: number) => x.toLocaleString("tr-TR", { maximumFractionDigits: 2 });

/** Su hariç bileşim şeridi. buyuk=true → detay sayfası için kalın + açıklamalı. */
export function bilesimBar(ings: [string, number][], buyuk = false): string {
  const aktif = ings.filter(([ad]) => grupBul(ad) !== "su");
  const top = aktif.reduce((t, [, p]) => t + p, 0);
  if (top <= 0) return "";
  const parca = aktif.map(([ad, p]) => {
    const g = GRUPLAR[grupBul(ad)];
    return `<span class="bb-p" style="flex:${p};background:${g.renk}" title="${ad} %${fmt(p)} (${g.ad})">${buyuk && p / top > 0.09 ? ad : ""}</span>`;
  }).join("");
  const su = ings.find(([ad]) => ad === "Su")?.[1] || 0;
  return `<div class="bb ${buyuk ? "bb-buyuk" : ""}"><div class="bb-serit">${parca}</div>
    <div class="bb-alt">${su ? `💧 Su %${fmt(su)} · ` : ""}aktif + katkı %${fmt(top)}</div></div>`;
}

/** Renk açıklaması (yalnız bu formülde geçen gruplar ya da hepsi). */
export function grupLejant(ings?: [string, number][]): string {
  const anahtarlar = ings ? [...new Set(ings.map(([ad]) => grupBul(ad)).filter((g) => g !== "su"))] : Object.keys(GRUPLAR).filter((g) => g !== "su");
  return `<div class="bb-lej">${anahtarlar.map((k) => `<span><i style="background:${GRUPLAR[k].renk}"></i>${GRUPLAR[k].ad}</span>`).join("")}</div>`;
}
