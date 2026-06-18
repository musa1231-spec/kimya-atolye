import { URUNLER, HM_TEHLIKE } from "../constants";
import { acUretimGunWithLines } from "./uretim";
import { $, urunSelect, val, numVal, setHTML, setText, setVal, showToast } from "../helpers";
import type { Urun } from "../types";

interface Adim {
  tip: "guvenlik" | "malzeme" | "karistir" | "kalite" | "ambalaj" | "bitir";
  baslik: string;
  aciklama?: string;
  ad?: string;
  kg?: number;
  pct?: number;
  kkd?: string[];
  uyarilar?: string[];
  sure?: number;
}

let adimlar: Adim[] = [];
let aktif = 0;
let hedefKg = 0;
let urunId = "";
let timerId: number | null = null;
let kalan = 0;
let audioCtx: AudioContext | null = null;

const miktarYaz = (kg: number): string =>
  kg >= 1 ? `${(+kg.toFixed(2)).toLocaleString("tr-TR")} kg` : `${Math.round(kg * 1000).toLocaleString("tr-TR")} g`;

function adimlarUret(urun: Urun, kg: number): Adim[] {
  const uyari = [...new Set(urun.ings.map(([ad]) => HM_TEHLIKE[ad]).filter(Boolean))];
  const list: Adim[] = [];
  list.push({ tip: "guvenlik", baslik: "Güvenlik & Hazırlık", kkd: ["🥽 Koruyucu gözlük", "🧤 Kimyasal eldiveni", "🦺 Önlük / tulum"], uyarilar: uyari, aciklama: "Üretime başlamadan önce koruyucu ekipmanı tak ve çalışma alanını hazırla." });
  urun.ings.forEach(([ad, pct], i) => {
    list.push({ tip: "malzeme", baslik: `${i + 1}. Tartım — ${ad}`, ad, kg: (pct / 100) * kg, pct, aciklama: HM_TEHLIKE[ad] ? `⚠️ ${HM_TEHLIKE[ad]}` : "" });
  });
  list.push({ tip: "karistir", baslik: "Karıştırma", aciklama: "Homojen, berrak/pürüzsüz bir karışım elde edene kadar yavaşça karıştır. Köpürtmemeye dikkat et.", sure: 300 });
  list.push({ tip: "kalite", baslik: "Kalite Kontrol", aciklama: "pH, yoğunluk, görünüm ve kokuyu ölç. Değerleri Kalite Kontrol defterine işle." });
  list.push({ tip: "ambalaj", baslik: "Ambalajlama & Etiketleme", aciklama: "Ürünü bidonlara doldur. Parti & Etiket sayfasından parti oluşturup etiketini bas ve yapıştır." });
  list.push({ tip: "bitir", baslik: "Üretimi Kaydet", aciklama: "Üretimi sisteme kaydet — görevli öğretmen ve öğrencileri seç." });
  return list;
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
    setText("as-kat", u.kat);
  }
}

export function asistanBasla(): void {
  const u = URUNLER.find((x) => x.id === val("as-urun"));
  const kg = numVal("as-kg");
  if (!u || kg <= 0) { alert("Ürün ve geçerli bir miktar (kg) seç"); return; }
  urunId = u.id; hedefKg = kg;
  adimlar = adimlarUret(u, kg);
  aktif = 0;
  $("as-setup").style.display = "none";
  $("as-run").style.display = "block";
  setText("as-run-baslik", `${u.ad} · ${miktarYaz(kg)}`);
  goster();
}

function goster(): void {
  durdurTimer();
  const a = adimlar[aktif];
  if (a.tip === "karistir") kalan = a.sure || 0;
  const yuzde = Math.round((aktif / (adimlar.length - 1)) * 100);
  setHTML("as-progress", `<div class="as-bar"><div class="as-bar-f" style="width:${yuzde}%"></div></div>
    <div class="as-prog-t">Adım ${aktif + 1} / ${adimlar.length}</div>`);

  let govde = "";
  if (a.tip === "guvenlik") {
    govde = `<div class="as-kkd">${(a.kkd || []).map((k) => `<span class="as-kkd-i">${k}</span>`).join("")}</div>`
      + (a.uyarilar && a.uyarilar.length ? `<div class="as-uyari"><b>⚠️ Bu üründeki tehlikeler:</b><ul>${a.uyarilar.map((u) => `<li>${u}</li>`).join("")}</ul></div>` : "");
  } else if (a.tip === "malzeme") {
    govde = `<div class="as-tart">${miktarYaz(a.kg || 0)}</div>
      <div class="as-tart-s">${a.ad} · reçetenin %${a.pct}'i</div>
      ${a.aciklama ? `<div class="as-uyari">${a.aciklama}</div>` : ""}`;
  } else if (a.tip === "karistir") {
    govde = `<div class="as-timer" id="as-timer">${fmtSure(a.sure || 0)}</div>
      <div class="bgrp" style="justify-content:center;margin-top:10px">
        <button class="btn bp" onclick="asTimerBaslat()" id="as-timer-btn">▶ Başlat</button>
        <button class="btn bg" onclick="asTimerSifirla()">↺ Sıfırla</button>
      </div>`;
  }

  setHTML("as-adim", `
    <div class="as-ad-tip as-tip-${a.tip}">${ikon(a.tip)}</div>
    <h2 class="as-ad-bas">${a.baslik}</h2>
    ${a.aciklama && a.tip !== "malzeme" ? `<p class="as-ad-ac">${a.aciklama}</p>` : ""}
    ${govde}`);

  // alt butonlar
  setHTML("as-nav", `
    <button class="btn bg" onclick="asGeri()" ${aktif === 0 ? "disabled" : ""}>← Geri</button>
    ${a.tip === "bitir"
      ? `<button class="btn bp" onclick="asBitir()">✓ Üretimi Kaydet</button>`
      : `<button class="btn bp" onclick="asSonraki()">Tamam, Sonraki →</button>`}`);

  // adım listesi (özet)
  setHTML("as-liste", adimlar.map((s, i) =>
    `<div class="as-li ${i === aktif ? "akt" : ""} ${i < aktif ? "ok" : ""}" onclick="asGoto(${i})">${i < aktif ? "✓" : i + 1}. ${s.baslik}</div>`).join(""));
}

const ikon = (t: string) => ({ guvenlik: "🦺", malzeme: "⚖️", karistir: "🌀", kalite: "🧪", ambalaj: "🏷️", bitir: "✅" } as Record<string, string>)[t] || "•";

export function asSonraki(): void { if (aktif < adimlar.length - 1) { aktif++; goster(); } }
export function asGeri(): void { if (aktif > 0) { aktif--; goster(); } }
export function asGoto(i: number): void { aktif = i; goster(); }

// ── Karıştırma zamanlayıcı ────────────────────────────────────
function fmtSure(s: number): string {
  const m = Math.floor(s / 60), ss = s % 60;
  return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}
function durdurTimer(): void { if (timerId) { clearInterval(timerId); timerId = null; } }

// Ses motorunu kullanıcı dokunuşunda hazırla (mobil tarayıcılar bunu şart koşar)
function sesHazirla(): void {
  try {
    const AC = (window.AudioContext || (window as any).webkitAudioContext);
    if (!AC) return;
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === "suspended") audioCtx.resume();
  } catch { /* ses yoksa sessiz geç */ }
}

// Kısa uyarı sesi (3 bip)
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

export function asTimerBaslat(): void {
  sesHazirla(); // dokunma anında ses motorunu aç (mobil/iOS için şart)
  if (timerId) { durdurTimer(); setText("as-timer-btn", "▶ Devam"); return; }
  if (kalan <= 0) kalan = adimlar[aktif].sure || 0;
  setText("as-timer-btn", "⏸ Duraklat");
  timerId = window.setInterval(() => {
    kalan--;
    setText("as-timer", fmtSure(Math.max(0, kalan)));
    if (kalan <= 0) {
      durdurTimer();
      setText("as-timer-btn", "▶ Başlat");
      showToast("⏰ Karıştırma süresi doldu!");
      bip();
    }
  }, 1000);
}
export function asTimerSifirla(): void {
  durdurTimer();
  kalan = adimlar[aktif]?.sure || 0;
  setText("as-timer", fmtSure(kalan));
  setText("as-timer-btn", "▶ Başlat");
}

// ── Bitir → mevcut üretim-kaydet ekranını ön-dolu aç ──────────
export function asBitir(): void {
  durdurTimer();
  acUretimGunWithLines([{ urunId, kg: hedefKg, ambLt: 5 }]);
  showToast("Üretim kaydına aktarıldı — öğretmen/öğrenci seçip kaydet");
  rAsistan();
}
