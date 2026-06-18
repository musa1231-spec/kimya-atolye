import { URUNLER, HM_TEHLIKE, URUN_RENK } from "../constants";
import { prosesUret, HM_ROL, SAF_SU } from "../proses";
import type { ProsesAdim } from "../proses";
import { acUretimGunWithLines } from "./uretim";
import { $, urunSelect, val, numVal, setHTML, setText, setVal, showToast } from "../helpers";
import type { Urun } from "../types";

type Adim = ProsesAdim & { kkd?: string[]; uyarilar?: string[] };

let adimlar: Adim[] = [];
let aktif = 0;
let hedefKg = 0;
let urun: Urun | null = null;
let timerId: number | null = null;
let kalan = 0;
let audioCtx: AudioContext | null = null;

const miktarYaz = (kg: number): string =>
  kg >= 1 ? `${(+kg.toFixed(2)).toLocaleString("tr-TR")} kg` : `${Math.round(kg * 1000).toLocaleString("tr-TR")} g`;

function miktarAd(ad: string): number {
  const ing = urun?.ings.find(([a]) => a === ad);
  return ing ? (ing[1] / 100) * hedefKg : 0;
}

function sureLabel(dk: number): string {
  if (dk >= 60) { const s = Math.floor(dk / 60), k = dk % 60; return `${s} saat${k ? ` ${k} dk` : ""}`; }
  return `${dk} dk`;
}

function adimlarUret(u: Urun): Adim[] {
  const uyari = [...new Set(u.ings.map(([ad]) => HM_TEHLIKE[ad]).filter(Boolean))];
  const guvenlik: Adim = { tip: "guvenlik", baslik: "Güvenlik & Hazırlık", kkd: ["🥽 Koruyucu gözlük", "🧤 Kimyasal eldiveni", "🦺 Önlük / tulum"], uyarilar: uyari, not: "Koruyucu ekipmanı tak, kazanı ve tartıyı hazırla." };
  const bitir: Adim = { tip: "bitir", baslik: "Üretimi Kaydet", not: "Üretimi sisteme kaydet — görevli öğretmen ve öğrencileri seç." };
  return [guvenlik, ...prosesUret(u), bitir];
}

// ── Kurulum görünümü ──────────────────────────────────────────
export function rAsistan(): void {
  durdurTimer();
  setHTML("as-urun", urunSelect());
  asistanUrunDegisti();
  $("as-setup").style.display = "block";
  $("as-run").style.display = "none";
}

export function asistanUrunDegisti(): void {
  const u = URUNLER.find((x) => x.id === val("as-urun"));
  if (u) {
    setVal("as-kg", String(u.batch));
    setText("as-kat", u.kat + (SAF_SU.has(u.id) ? " · 💧 saf su gerekir" : ""));
  }
}

export function asistanBasla(): void {
  const u = URUNLER.find((x) => x.id === val("as-urun"));
  const kg = numVal("as-kg");
  if (!u || kg <= 0) { alert("Ürün ve geçerli bir miktar (kg) seç"); return; }
  urun = u; hedefKg = kg;
  adimlar = adimlarUret(u);
  aktif = 0;
  $("as-setup").style.display = "none";
  $("as-run").style.display = "block";
  setText("as-run-baslik", `${u.ad} · ${miktarYaz(kg)}`);
  goster();
}

const ikon = (t: string) => ({ guvenlik: "🦺", ekle: "⚖️", karistir: "🌀", olcum: "🧪", devirdaim: "🔄", dolum: "🛢️", bilgi: "ℹ️", bitir: "✅" } as Record<string, string>)[t] || "•";

function goster(): void {
  durdurTimer();
  const a = adimlar[aktif];
  const sn = (a.sureDk || 0) * 60;
  if (sn > 0) kalan = sn;
  const yuzde = Math.round((aktif / (adimlar.length - 1)) * 100);
  setHTML("as-progress", `<div class="as-bar"><div class="as-bar-f" style="width:${yuzde}%"></div></div>
    <div class="as-prog-t">Adım ${aktif + 1} / ${adimlar.length}</div>`);

  let govde = "";
  if (a.tip === "guvenlik") {
    govde = `<div class="as-kkd">${(a.kkd || []).map((k) => `<span class="as-kkd-i">${k}</span>`).join("")}</div>`
      + (a.uyarilar && a.uyarilar.length ? `<div class="as-uyari"><b>⚠️ Bu üründeki tehlikeler:</b><ul>${a.uyarilar.map((u) => `<li>${u}</li>`).join("")}</ul></div>` : "");
  } else if (a.tip === "ekle" && a.ekle) {
    const renk = urun ? URUN_RENK[urun.id] : "";
    govde = `<div class="as-malz">${a.ekle.map((ad) => {
      const adGoster = ad === "Boya" && renk ? `Boya (${renk})` : ad;
      const rol = ad === "Boya" && renk ? `🎨 ${renk} renk verir — az miktar, tona göre ayarlayın` : HM_ROL[ad];
      return `
      <div class="as-malz-r">
        <span class="as-malz-m">${miktarYaz(miktarAd(ad))}</span>
        <span class="as-malz-a">${adGoster}</span>
        ${rol ? `<span class="as-malz-rol">${rol}</span>` : ""}
      </div>`;
    }).join("")}</div>`;
    if (a.safSu) govde += `<div class="as-uyari">💧 <b>Saf / deiyonize su kullanın.</b> Musluk suyundaki kireç bulanıklık ve çökelme yapar.</div>`;
    if (sn > 0) govde += timerBlok(a.sureDk || 0);
  } else if (a.tip === "karistir") {
    govde = sn > 0 ? timerBlok(a.sureDk || 0) : "";
  } else if (a.tip === "olcum") {
    govde = `<button class="btn bg" onclick="openModal('m-kalite')">🧪 Kalite Kaydı Ekle</button>`;
  }

  setHTML("as-adim", `
    <div class="as-ad-tip">${ikon(a.tip)}</div>
    <h2 class="as-ad-bas">${a.baslik}</h2>
    ${a.not ? `<p class="as-ad-ac">${a.not}</p>` : ""}
    ${govde}`);

  setHTML("as-nav", `
    <button class="btn bg" onclick="asGeri()" ${aktif === 0 ? "disabled" : ""}>← Geri</button>
    ${a.tip === "bitir"
      ? `<button class="btn bp" onclick="asBitir()">✓ Üretimi Kaydet</button>`
      : `<button class="btn bp" onclick="asSonraki()">Tamam, Sonraki →</button>`}`);

  setHTML("as-liste", adimlar.map((s, i) =>
    `<div class="as-li ${i === aktif ? "akt" : ""} ${i < aktif ? "ok" : ""}" onclick="asGoto(${i})">${i < aktif ? "✓" : i + 1}. ${s.baslik}</div>`).join(""));
}

function timerBlok(dk: number): string {
  return `<div class="as-sure-lbl">⏱️ Hedef süre: ${sureLabel(dk)}</div>
    <div class="as-timer" id="as-timer">${fmtSure(dk * 60)}</div>
    <div class="bgrp" style="justify-content:center;margin-top:8px">
      <button class="btn bp" onclick="asTimerBaslat()" id="as-timer-btn">▶ Başlat</button>
      <button class="btn bg" onclick="asTimerSifirla()">↺ Sıfırla</button>
    </div>`;
}

export function asSonraki(): void { if (aktif < adimlar.length - 1) { aktif++; goster(); } }
export function asGeri(): void { if (aktif > 0) { aktif--; goster(); } }
export function asGoto(i: number): void { aktif = i; goster(); }

// ── Karıştırma zamanlayıcı ────────────────────────────────────
function fmtSure(s: number): string {
  const m = Math.floor(s / 60), ss = s % 60;
  return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}
function durdurTimer(): void { if (timerId) { clearInterval(timerId); timerId = null; } }

export function asTimerBaslat(): void {
  sesHazirla();
  if (timerId) { durdurTimer(); setText("as-timer-btn", "▶ Devam"); return; }
  if (kalan <= 0) kalan = (adimlar[aktif]?.sureDk || 0) * 60;
  setText("as-timer-btn", "⏸ Duraklat");
  timerId = window.setInterval(() => {
    kalan--;
    setText("as-timer", fmtSure(Math.max(0, kalan)));
    if (kalan <= 0) {
      durdurTimer();
      setText("as-timer-btn", "▶ Başlat");
      showToast("⏰ Süre doldu!");
      bip();
    }
  }, 1000);
}
export function asTimerSifirla(): void {
  durdurTimer();
  kalan = (adimlar[aktif]?.sureDk || 0) * 60;
  setText("as-timer", fmtSure(kalan));
  setText("as-timer-btn", "▶ Başlat");
}

function sesHazirla(): void {
  try {
    const AC = (window.AudioContext || (window as any).webkitAudioContext);
    if (!AC) return;
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === "suspended") audioCtx.resume();
  } catch { /* ses yoksa sessiz geç */ }
}
function bip(): void {
  const ctx = audioCtx;
  if (!ctx) return;
  try {
    if (ctx.state === "suspended") ctx.resume();
    [0, 0.25, 0.5].forEach((t) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.18);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.2);
    });
    if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);
  } catch { /* sessiz geç */ }
}

// ── Bitir → mevcut üretim-kaydet ekranını ön-dolu aç ──────────
export function asBitir(): void {
  durdurTimer();
  if (urun) acUretimGunWithLines([{ urunId: urun.id, kg: hedefKg, ambLt: 5 }]);
  showToast("Üretim kaydına aktarıldı — öğretmen/öğrenci seçip kaydet");
  rAsistan();
}
