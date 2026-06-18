import { URUNLER } from "./constants";
import { store } from "./state";

// ── DOM kısayolları ───────────────────────────────────────────
export const $ = <T extends HTMLElement = HTMLElement>(id: string): T =>
  document.getElementById(id) as T;

export const val = (id: string): string => {
  const e = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
  return e ? e.value : "";
};
export const numVal = (id: string): number => parseFloat(val(id)) || 0;
export const intVal = (id: string): number => parseInt(val(id)) || 0;
export const setVal = (id: string, v: string) => {
  const e = document.getElementById(id) as HTMLInputElement | null;
  if (e) e.value = v;
};
export const setHTML = (id: string, html: string) => {
  const e = document.getElementById(id);
  if (e) e.innerHTML = html;
};
export const setText = (id: string, t: string) => {
  const e = document.getElementById(id);
  if (e) e.textContent = t;
};

// ── Tarih / biçim ─────────────────────────────────────────────
export const today = (o = 0): string => {
  const d = new Date();
  d.setDate(d.getDate() + o);
  return d.toISOString().split("T")[0];
};
export const fmt = (d: string): string => {
  if (!d) return "—";
  const p = d.split("-");
  return `${p[2]}.${p[1]}.${p[0]}`;
};

// ── Ad aramaları ──────────────────────────────────────────────
export const urunAd = (id: string): string => URUNLER.find((u) => u.id === id)?.ad || id;
export const musAd = (id: number | string): string => store.musteriler.find((m) => m.id == id)?.ad || "—";
export const esansAd = (id: string): string => store.esanslar.find((e) => e.id === id)?.ad || "—";
export const ogrAd = (id: number | string): string => store.ogretmenler.find((o) => o.id == id)?.ad || "?";
export const ogcAd = (id: number | string): string => store.ogrenciler.find((x) => x.id == id)?.ad || "";

export const stBadge = (d: string): string =>
  ({ bekliyor: "bam", hazırlanıyor: "bb", hazır: "bpu2", "teslim edildi": "bg2" } as Record<string, string>)[d] || "bgr";

// ── Select üreticileri ────────────────────────────────────────
export function urunSelect(sel = ""): string {
  return URUNLER.map((u) => `<option value="${u.id}" ${u.id === sel ? "selected" : ""}>${u.ad}</option>`).join("");
}
export function esansOpts(uid = "", sel = ""): string {
  const esl = store.eslestirmeler[uid] || [];
  const onc = store.esanslar.filter((e) => esl.includes(e.id));
  const diger = store.esanslar.filter((e) => !esl.includes(e.id));
  return (
    `<option value="">— Esans yok —</option>` +
    onc.map((e) => `<option value="${e.id}" ${e.id === sel ? "selected" : ""}>${e.ad}</option>`).join("") +
    (diger.length
      ? `<option disabled>──</option>` +
        diger.map((e) => `<option value="${e.id}" ${e.id === sel ? "selected" : ""}>${e.ad}</option>`).join("")
      : "")
  );
}

// ── Bildirim / onay ───────────────────────────────────────────
export function showToast(msg: string): void {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2500);
}

export function eminMisin(eylem: string, cb: () => void): void {
  if (!confirm(`${eylem}\n\nBu işlemi yapmak istediğinizden emin misiniz?`)) return;
  if (!confirm(`${eylem}\n\n⚠️ Son onay: Bu işlem geri alınamaz. Devam edilsin mi?`)) return;
  cb();
}

export function closeModal(id: string): void {
  document.getElementById(id)?.classList.remove("open");
}
