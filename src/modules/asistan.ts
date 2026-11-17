import { URUNLER, HM_TEHLIKE, URUN_RENK, URUN_ESANS } from "../constants";
import { prosesUret, HM_ROL, SAF_SU } from "../proses";
import type { ProsesAdim } from "../proses";
import { rehberTopla, atlamaUyariHTML, atlamaListesi, atlamaRozet } from "../rehber";
import { alkolUyarla, alkolSecimHTML, alkolSecimOku, alkolNotHTML, urundeAlkolVar } from "../alkol";
import type { AlkolSonuc } from "../alkol";
import { acUretimGunWithLines } from "./uretim";
import { $, urunSelect, val, numVal, esansAd, setHTML, setText, setVal, showToast } from "../helpers";
import { KAZANLAR, asistanKazanEngel, kazanUyum, urunKazanTipi, SAF_SU_DINAMO_UYARI, GOZLUK_KURAL, KATI_SABUN_KAZAN_KURAL } from "../atolyeDuzen";
import { bugunKazanPlani, bugunKazanPlaniTaze } from "./duzen";
import {
  KAP_VARSAYILAN_KG, KAP_DOLULUK, KALIP_VARSAYILAN, KENAR_PAYI_CM, sicakMi, kapPlani, kalipPlani, kapOnerisi, yagOrani, yagdanUrunKg,
} from "../katiSabun";
import type { KapPlani, KalipPlani } from "../katiSabun";
import { session } from "../state";
import type { Urun } from "../types";

type Adim = ProsesAdim & { kkd?: string[]; uyarilar?: string[] };

let adimlar: Adim[] = [];
let aktif = 0;
let hedefKg = 0;
let urun: Urun | null = null;
let uyarli: AlkolSonuc | null = null;   // alkol kaynağına göre uyarlanmış miktarlar
let timerId: number | null = null;
let kalan = 0;
let audioCtx: AudioContext | null = null;
let kazanNo = "";
const onaylar = new Set<number>();   // öğretmenin onayladığı "ekle" adımları
let katiPlan: { kap: KapPlani; kalip: KalipPlani } | null = null;   // katı sabun: kap + kalıp planı

/** Bu adım kazana madde ekliyor mu? (öğretmen onayı zorunlu) */
const ekleAdimi = (i: number) => adimlar[i]?.tip === "ekle" && !!adimlar[i]?.ekle?.length;
/** i'ye kadar (hariç) onaylanmamış ilk ekleme adımı; yoksa -1. */
function onaysizIlk(i: number): number {
  for (let j = 0; j < i; j++) if (ekleAdimi(j) && !onaylar.has(j)) return j;
  return -1;
}

const miktarYaz = (kg: number): string =>
  kg >= 1 ? `${(+kg.toFixed(2)).toLocaleString("tr-TR")} kg` : `${Math.round(kg * 1000).toLocaleString("tr-TR")} g`;

const gercekAd = (ad: string): string => uyarli?.adlar[ad] || ad;

/** Reçetedeki yüzde (alkol kaynağı değiştiyse uyarlanmış reçeteden). */
function yuzdeAd(ad: string): number {
  const ing = (uyarli?.urun || urun)?.ings.find(([a]) => a === gercekAd(ad));
  return ing ? ing[1] : 0;
}
function miktarAd(ad: string): number {
  return (yuzdeAd(ad) / 100) * hedefKg;
}
const yuzdeYaz = (p: number): string => `%${p.toLocaleString("tr-TR", { maximumFractionDigits: 3 })}`;

function sureLabel(dk: number): string {
  if (dk >= 60) { const s = Math.floor(dk / 60), k = dk % 60; return `${s} saat${k ? ` ${k} dk` : ""}`; }
  return `${dk} dk`;
}

function adimlarUret(u: Urun): Adim[] {
  const uyari = [...new Set(u.ings.map(([ad]) => HM_TEHLIKE[ad]).filter(Boolean))];
  const guvenlik: Adim = { tip: "guvenlik", baslik: "Güvenlik & Hazırlık", kkd: ["🧤 Kimyasal eldiveni", "🦺 Önlük / tulum", "🥽 Gözlük: ihtiyaç hâlinde"], uyarilar: uyari, not: urunKazanTipi(u.id) === null
    ? `Eldiven ve uzun kollu önlüğü tak; tüp ocağını, sabun kabını, tahta karıştırıcıyı, tahta kalıbı ve tartıyı hazırla. Gözlük ${GOZLUK_KURAL} — kostik çözülürken takılır.`
    : `Eldiven ve önlüğü tak, kazanı ve tartıyı hazırla. Gözlük ${GOZLUK_KURAL}.` };
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

// ── Kazan seçimi (günün planında bu ürün varsa o kazan önerilir) ──
function kazanSecenekleri(urunId: string): void {
  const plan = bugunKazanPlani();
  const planda = plan?.find((p) => p.urunId === urunId)?.no || "";
  const onceki = val("as-kazan");
  setHTML("as-kazan", `<option value="">— Kazan seç —</option>` + KAZANLAR.map((k) => {
    const p = plan?.find((x) => x.no === k.no && x.urunId);
    const etiket = `${k.no} · ${k.tip === "yuksek" ? "yüksek" : "alçak"} · ${k.kapasiteKg} kg${p ? ` · bugün: ${URUNLER.find((u) => u.id === p.urunId)?.ad || ""}` : ""}`;
    return `<option value="${k.no}">${etiket}</option>`;
  }).join(""));
  setVal("as-kazan", planda || (KAZANLAR.some((k) => k.no === onceki) ? onceki : ""));
  asKazanDegisti();
}

export function asKazanDegisti(): void {
  const urunId = val("as-urun"), no = val("as-kazan");
  if (urunKazanTipi(urunId) === null) { setHTML("as-kazan-not", `<div class="tm" style="margin-top:4px">${KATI_SABUN_KAZAN_KURAL} Kazan seçmeye gerek yok.</div>`); return; }
  if (!no) { setHTML("as-kazan-not", `<div class="tm" style="margin-top:4px">Hangi kazanda çalışıldığı bilinmeden üretime başlanmaz.</div>`); return; }
  const uy = kazanUyum(no, urunId);
  setHTML("as-kazan-not", uy.engel ? `<div class="as-uyari dz-engel">⛔ ${uy.engel}</div>` : uy.uyari ? `<div class="as-uyari">⚠️ ${uy.uyari}</div>` : "");
}

export function asistanUrunDegisti(): void {
  const u = URUNLER.find((x) => x.id === val("as-urun"));
  if (u) {
    setVal("as-kg", String(u.batch));
    setText("as-kat", u.kat + (SAF_SU.has(u.id) ? " · 💧 saf su gerekir" : ""));
    kazanSecenekleri(u.id);
  }
  // Katı sabun: kazan yerine tüp üzerindeki kap + tahta kalıp sorulur
  const kati = !!u && urunKazanTipi(u.id) === null;
  $("as-kazan-fg").style.display = kati ? "none" : "";
  for (const id of ["as-kati", "as-kati-mod-fg"]) $(id).style.display = kati ? "block" : "none";
  if (kati && u) {
    if (!numVal("as-kap")) setVal("as-kap", String(KAP_VARSAYILAN_KG));
    if (!numVal("as-kalip-en")) setVal("as-kalip-en", String(KALIP_VARSAYILAN.en));
    if (!numVal("as-kalip-boy")) setVal("as-kalip-boy", String(KALIP_VARSAYILAN.boy));
    // Varsayılan hedef: seçili kabın bir dolusu
    setVal("as-kg", String(kapPlani(1, numVal("as-kap"), sicakMi(u)).enFazlaKg));
    asKatiDegisti();
  }
  setHTML("as-atla", u ? atlamaListesi(u.id, u.ings.map(([a]) => a)).map((x) => atlamaUyariHTML(u.id, x.ad, true)).join("") : "");
  const w = $("as-alkol");
  if (u && urundeAlkolVar(u)) {
    if (!w.innerHTML) setHTML("as-alkol", alkolSecimHTML("as", "asAlkolDegisti") + `<div id="as-alk-not"></div>`);
    w.style.display = "block";
    asAlkolDegisti();
  } else { w.style.display = "none"; }
}

export function asAlkolDegisti(): void {
  const u = URUNLER.find((x) => x.id === val("as-urun"));
  if (!u || !urundeAlkolVar(u)) return;
  setHTML("as-alk-not", alkolNotHTML(alkolUyarla(u, alkolSecimOku("as"))));
}

// ── 🧼 Katı sabun: kap önerisi, kap/kalıp planı ────────────────
const sayi = (x: number, b = 1) => (+x.toFixed(b)).toLocaleString("tr-TR");

/** Ekrandaki girişlerden katı sabun planını hesapla (geçersizse hata metni). */
function katiHesap(u: Urun): { hedefKg: number; kap: KapPlani; kalip: KalipPlani } | string {
  if (val("as-kati-mod") === "yag") {
    const yag = numVal("as-yag");
    if (yag > 0) setVal("as-kg", String(+yagdanUrunKg(u, yag).toFixed(2)));
  }
  const hedefKg = numVal("as-kg"), kapKg = numVal("as-kap"), en = numVal("as-kalip-en"), boy = numVal("as-kalip-boy");
  if (!(hedefKg > 0)) return "Miktarı girin.";
  if (!(kapKg > 0)) return "Kullanılacak kabın büyüklüğünü (kg) girin.";
  if (!(en >= 5 && boy >= 5)) return "Tahta kalıbın iç ölçüsünü (en × boy, cm) girin.";
  const kap = kapPlani(hedefKg, kapKg, sicakMi(u));
  return { hedefKg, kap, kalip: kalipPlani(kap.kapBasiKg, u.yog, en, boy) };
}

function kapOneriHTML(u: Urun, hedefKg: number, kap: KapPlani): string {
  const sicak = sicakMi(u);
  const on = kapOnerisi(hedefKg, sicak);
  const yag = hedefKg * yagOrani(u);
  const dol = Math.round((sicak ? KAP_DOLULUK.sicak : KAP_DOLULUK.soguk) * 100);
  const oneri = on.onerilenKg
    ? `👉 Tek seferde yapmak için <b>${on.onerilenKg} kg'lık kap</b> önerilir${on.onerilenKg !== kap.kapKg ? ` <button class="btn bg" style="padding:2px 10px;font-size:.78rem" onclick="asKapUygula(${on.onerilenKg})">Bu kabı kullan</button>` : " ✓"}`
    : `👉 Bu miktar tek kaba sığmaz; birkaç partiye bölünür.`;
  return `<div class="as-uyari" style="margin-top:6px">
    <b>🍲 Kap önerisi</b><br>
    ${sayi(hedefKg, 2)} kg sabun = <b>${sayi(yag, 2)} kg yağ</b> + ${sayi(hedefKg - yag, 2)} kg kostik çözeltisi (su + kostik).<br>
    Kap en fazla %${dol} doldurulur${sicak ? " (sıcak proseste pişerken kabarır)" : ""} → en az <b>${sayi(on.gerekliKg)} kg'lık kap</b> gerekir.<br>
    ${oneri}<br>
    Seçili kap (${sayi(kap.kapKg)} kg) ile: <b>${kap.kapSayisi} parti × ${sayi(kap.kapBasiKg, 2)} kg</b> (her parti ≈${sayi(kap.kapBasiKg * yagOrani(u), 2)} kg yağ).
  </div>`;
}

function kalipHTML(k: KalipPlani, kapSayisi: number): string {
  return `<div class="as-uyari" style="margin-top:6px">
    <b>🪵 Tahta kalıp (bir kap için)</b><br>
    Kalıp ${k.en} × ${k.boy} cm · bir kabın sabunu <b>${k.kalipSayisi} kalıba</b> dökülür, kalınlık ≈<b>${sayi(k.kalinlikCm)} cm</b>.<br>
    Kesim: <b>${sayi(k.kesimCm)} × ${sayi(k.kesimCm)} cm</b> → kalıp başına ${k.kalipBasiAdet} adet, bir kaptan ≈<b>${k.toplamAdet} kalıp sabun</b> (taze ≈${k.kalipSabunG} g)${kapSayisi > 1 ? `; ${kapSayisi} kaptan toplam ≈<b>${k.toplamAdet * kapSayisi}</b>` : ""}.
  </div>`;
}

export function asKatiDegisti(): void {
  const u = URUNLER.find((x) => x.id === val("as-urun"));
  if (!u || urunKazanTipi(u.id) !== null) return;
  const yagModu = val("as-kati-mod") === "yag";
  $("as-yag-fg").style.display = yagModu ? "block" : "none";
  ($("as-kg") as HTMLInputElement).readOnly = yagModu;
  if (yagModu && !numVal("as-yag")) setVal("as-yag", String(+(numVal("as-kg") * yagOrani(u)).toFixed(2)));
  const h = katiHesap(u);
  setHTML("as-kati-ozet", typeof h === "string" ? `<div class="tm">${h}</div>` : kapOneriHTML(u, h.hedefKg, h.kap) + kalipHTML(h.kalip, h.kap.kapSayisi));
}
export function asKapUygula(kg: number): void { setVal("as-kap", String(kg)); asKatiDegisti(); }

/** Kesim adımı: çizgi aralıkları (kenar payından sonra). */
function kesimHTML(k: KalipPlani): string {
  const cizgi = (n: number) => Array.from({ length: n + 1 }, (_, i) => sayi(KENAR_PAYI_CM + i * k.kesimCm)).join(" · ");
  return `<div class="as-uyari" style="margin-top:6px">
    <b>📐 Bu partinin kesim ölçüleri</b><br>
    Blok ≈${k.en} × ${k.boy} × ${sayi(k.kalinlikCm)} cm · her kenardan ${sayi(KENAR_PAYI_CM)} cm traş.<br>
    Uzun kenarda (${k.boy} cm) işaretler: <b>${cizgi(k.seritBasiAdet)}</b> cm<br>
    Kısa kenarda (${k.en} cm) işaretler: <b>${cizgi(k.seritSayisi)}</b> cm<br>
    → ${k.seritSayisi} şerit × ${k.seritBasiAdet} parça = <b>${k.kalipBasiAdet} kalıp sabun</b> (kalıp başına), her biri ${sayi(k.kesimCm)} × ${sayi(k.kesimCm)} × ${sayi(k.kalinlikCm)} cm, taze ≈${k.kalipSabunG} g.
  </div>`;
}

export async function asistanBasla(): Promise<void> {
  const u = URUNLER.find((x) => x.id === val("as-urun"));
  const kg = numVal("as-kg");
  if (!u || kg <= 0) { alert("Ürün ve geçerli bir miktar (kg) seç"); return; }
  uyarli = urundeAlkolVar(u) ? alkolUyarla(u, alkolSecimOku("as")) : null;
  if (uyarli?.engel) { alert("⛔ " + uyarli.engel); return; }
  // Katı sabunlar kazanda yapılmaz → kazan sorulmaz
  const kazanli = urunKazanTipi(u.id) !== null;
  if (kazanli) {
    // Başka cihazda (öğretmen bilgisayarı) girilen günün planını taze oku
    const engel = asistanKazanEngel(val("as-kazan"), u.id, kg, await bugunKazanPlaniTaze());
    if (engel) { alert("⛔ " + engel); return; }
  }
  katiPlan = null;
  if (!kazanli) {
    const h = katiHesap(u);
    if (typeof h === "string") { alert("⛔ " + h); return; }
    katiPlan = { kap: h.kap, kalip: h.kalip };
  }
  kazanNo = kazanli ? val("as-kazan") : "";
  urun = u; hedefKg = numVal("as-kg");
  adimlar = adimlarUret(u);
  aktif = 0;
  onaylar.clear();
  $("as-setup").style.display = "none";
  $("as-run").style.display = "block";
  setText("as-run-baslik", `${u.ad} · ${miktarYaz(hedefKg)}${kazanNo ? ` · Kazan ${kazanNo}` : ""}${katiPlan ? ` · ${katiPlan.kap.kapSayisi} parti × ${miktarYaz(katiPlan.kap.kapBasiKg)} (${katiPlan.kap.kapKg} kg'lık kap)` : ""}`);
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
    const stEsans = urun && URUN_ESANS[urun.id] ? esansAd(URUN_ESANS[urun.id]) : "";
    govde = `<div class="as-malz">${a.ekle.map((ad) => {
      const esansMi = ad === "Esans" || ad === "Limon Esansı";
      const adGoster = ad === "Boya" && renk ? `Boya (${renk})`
        : (esansMi && stEsans ? `Esans (${stEsans})` : gercekAd(ad));
      const rol = ad === "Boya" && renk ? `🎨 ${renk} renk verir — az miktar, tona göre ayarlayın`
        : (esansMi && stEsans ? `🌸 Standart esans: ${stEsans} — koku verir` : HM_ROL[ad]);
      return `
      <div class="as-malz-r">
        <span class="as-malz-m">${miktarYaz(miktarAd(ad) / (katiPlan?.kap.kapSayisi || 1))}<span class="as-malz-y" title="Reçetedeki oran (kütlece)">${yuzdeYaz(yuzdeAd(ad))}${katiPlan && katiPlan.kap.kapSayisi > 1 ? ` · kap başına (toplam ${miktarYaz(miktarAd(ad))})` : ""}</span></span>
        <span class="as-malz-a">${adGoster}${urun ? atlamaRozet(urun.id, ad) : ""}</span>
        ${rol ? `<span class="as-malz-rol">${rol}</span>` : ""}
      </div>`;
    }).join("")}</div>`;
    if (urun) govde += a.ekle.map((ad) => atlamaUyariHTML(urun!.id, ad)).join("");
    if (uyarli && a.ekle.some((ad) => uyarli!.adlar[ad])) govde += alkolNotHTML(uyarli);
    if (uyarli && a.ekle.includes("Su") && uyarli.notlar.some((n) => n.includes("SU azaltıldı"))) govde += `<div class="as-uyari">💧 Su miktarı, alkol kaynağıyla birlikte gelen su kadar azaltılmıştır.</div>`;
    if (a.safSu) govde += `<div class="as-uyari">💧 <b>Saf / deiyonize su kullanın.</b> Musluk suyundaki kireç bulanıklık ve çökelme yapar.</div>`;
    if (a.safSu) govde += `<div class="as-uyari dz-engel">⚡ <b>Saf su dinamosu:</b> ${SAF_SU_DINAMO_UYARI}</div>`;
    govde += `<label class="as-onay ${onaylar.has(aktif) ? "ok" : ""}"><input type="checkbox" id="as-onay" ${onaylar.has(aktif) ? "checked" : ""} onchange="asOnay(this.checked)">
      <span>👨‍🏫 <b>Öğretmen kontrol etti ve onayladı</b><br><small>${katiPlan
        ? `Madde · miktar · kap (${katiPlan.kap.kapKg} kg) doğru. Öğretmen onaylamadan kaba HİÇBİR ŞEY eklenmez.`
        : `Madde · miktar · kazan${kazanNo ? ` (${kazanNo})` : ""} doğru. Öğretmen onaylamadan kazana HİÇBİR ŞEY eklenmez.`}</small></span></label>`;
    if (sn > 0) govde += timerBlok(a.sureDk || 0);
  } else if (a.tip === "karistir") {
    govde = sn > 0 ? timerBlok(a.sureDk || 0) : "";
  } else if (a.tip === "olcum") {
    govde = `<button class="btn bg" onclick="openModal('m-kalite')">🧪 Kalite Kaydı Ekle</button>`;
  }
  // Numaralı alt işler + katı sabun hesaplı planı
  if (a.liste?.length) govde = `<ol class="as-liste-ol">${a.liste.map((x) => `<li>${x}</li>`).join("")}</ol>` + govde;
  if (urun && katiPlan && a.kati) {
    govde += a.kati === "kap" ? kapOneriHTML(urun, hedefKg, katiPlan.kap)
      : a.kati === "kalip" ? kalipHTML(katiPlan.kalip, katiPlan.kap.kapSayisi)
      : kesimHTML(katiPlan.kalip);
  }

  setHTML("as-adim", `
    <div class="as-ad-tip">${ikon(a.tip)}</div>
    <h2 class="as-ad-bas">${a.baslik}</h2>
    ${a.not ? `<p class="as-ad-ac">${a.not}</p>` : ""}
    ${govde}
    ${rehberBlok(a)}`);

  setHTML("as-nav", `
    <button class="btn bg" onclick="asGeri()" ${aktif === 0 ? "disabled" : ""}>← Geri</button>
    ${a.tip === "bitir"
      ? `<button class="btn bp" onclick="asBitir()">✓ Üretimi Kaydet</button>`
      : `<button class="btn bp" id="as-sonraki" onclick="asSonraki()" ${ekleAdimi(aktif) && !onaylar.has(aktif) ? "disabled title='Önce öğretmen onayı'" : ""}>Tamam, Sonraki →</button>`}`);

  setHTML("as-liste", adimlar.map((s, i) =>
    `<div class="as-li ${i === aktif ? "akt" : ""} ${i < aktif ? "ok" : ""}" onclick="asGoto(${i})">${i < aktif ? "✓" : i + 1}. ${s.baslik}</div>`).join(""));
}

// ── 📋 Dikkat Edilecekler + 🛠️ Olası Sorunlar ve Çözümleri ──
function rehberBlok(a: Adim): string {
  const { dikkat, sorun } = rehberTopla(a, urun?.id);
  if (!dikkat.length && !sorun.length) return "";
  return `<div class="as-rehber">
    ${dikkat.length ? `<details class="as-dikkat" open>
      <summary>📋 Dikkat Edilecekler <span class="as-say">${dikkat.length}</span></summary>
      <ul>${dikkat.map((d) => `<li>${d}</li>`).join("")}</ul>
    </details>` : ""}
    ${sorun.length ? `<details class="as-sorun">
      <summary>🛠️ Olası Sorunlar ve Çözümleri <span class="as-say">${sorun.length}</span></summary>
      ${sorun.map((s) => `<div class="as-sorun-k">
        <div class="as-sorun-b">❗ ${s.belirti}</div>
        <div class="as-sorun-n"><b>Neden:</b> ${s.neden}</div>
        <div class="as-sorun-c"><b>✅ Çözüm:</b> ${s.cozum}</div>
      </div>`).join("")}
    </details>` : ""}
  </div>`;
}

function timerBlok(dk: number): string {
  return `<div class="as-sure-lbl">⏱️ Hedef süre: ${sureLabel(dk)}</div>
    <div class="as-timer" id="as-timer">${fmtSure(dk * 60)}</div>
    <div class="bgrp" style="justify-content:center;margin-top:8px">
      <button class="btn bp" onclick="asTimerBaslat()" id="as-timer-btn">▶ Başlat</button>
      <button class="btn bg" onclick="asTimerSifirla()">↺ Sıfırla</button>
    </div>`;
}

// Engel: onaylanmamış ekleme adımının ötesine geçilemez (düğme gizli + fonksiyon reddeder)
function gecebilir(hedef: number): boolean {
  const j = onaysizIlk(hedef);
  if (j < 0) return true;
  alert(`⛔ «${adimlar[j].baslik}» adımı öğretmen tarafından onaylanmadı.\n\nÖğretmen onaylamadan kazana hiçbir hammadde eklenmez ve sonraki adıma geçilmez.`);
  return false;
}
export function asSonraki(): void { if (aktif < adimlar.length - 1 && gecebilir(aktif + 1)) { aktif++; goster(); } }
export function asGeri(): void { if (aktif > 0) { aktif--; goster(); } }
export function asGoto(i: number): void { if (i <= aktif || gecebilir(i)) { aktif = i; goster(); } }
export function asOnay(acik: boolean): void {
  if (acik) onaylar.add(aktif); else onaylar.delete(aktif);
  document.querySelector(".as-onay")?.classList.toggle("ok", acik);
  const b = document.getElementById("as-sonraki") as HTMLButtonElement | null;
  if (b) b.disabled = !acik;
}

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
  if (onaysizIlk(adimlar.length) >= 0) { gecebilir(adimlar.length); return; }
  if (urun) acUretimGunWithLines([{ urunId: urun.id, kg: hedefKg, ambLt: 5, esansId: URUN_ESANS[urun.id] || "" }]);
  if (urun && kazanNo) setVal("ug-not", `Kazan: ${kazanNo} · Hammadde eklemeleri öğretmen onaylı${session.CU ? ` (${session.CU.ad})` : ""}`);
  if (urun && katiPlan) setVal("ug-not", `Katı sabun · tüp üzerinde ${katiPlan.kap.kapKg} kg'lık kap · ${katiPlan.kap.kapSayisi} parti × ${miktarYaz(katiPlan.kap.kapBasiKg)} · kalıp ${katiPlan.kalip.en}×${katiPlan.kalip.boy} cm, kesim ${katiPlan.kalip.kesimCm} cm · Hammadde eklemeleri öğretmen onaylı${session.CU ? ` (${session.CU.ad})` : ""}`);
  showToast("Üretim kaydına aktarıldı — öğretmen/öğrenci seçip kaydet");
  rAsistan();
}
