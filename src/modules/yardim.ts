// ════════════════════════════════════════════════════════════════
// 📚 ÜRETİM REHBERİ — sıvı ürün kartları (TEK KAYNAKTAN ÜRETİLİR)
// Reçete: constants.URUNLER · adımlar: proses.prosesUret · hedef/sorun: rehber.URUN_REHBER
// kazan/aile/altın kural/saf su: atolyeDuzen. Elle yazılmış kart YOK; reçete değişince burası da değişir.
// Katı sabun sekmesi index.html'de durur; yüzdeleri testte URUNLER ile karşılaştırılır.
// ════════════════════════════════════════════════════════════════
import { URUNLER, HM_TEHLIKE } from "../constants";
import { prosesUret, SAF_SU } from "../proses";
import { URUN_REHBER, atlamaRozet, YARDIM_SEKME } from "../rehber";
import {
  KAZANLAR, URUN_AILE, AILE_AD, ALTIN_KURAL, SAF_SU_DINAMO_UYARI, urunKazanTipi, KLOR_ASIT_KURAL,
} from "../atolyeDuzen";
import { setHTML, setVal } from "../helpers";
import { asistanUrunDegisti } from "./asistan";
import type { Urun } from "../types";

const RENK: Record<string, string> = { "Kişisel Bakım": "#1565C0", "Ev Temizliği": "#2E7D32", "Endüstriyel": "#C62828" };

const yuzde = (p: number) => `%${p.toLocaleString("tr-TR", { maximumFractionDigits: 3 })}`;
const sure = (dk: number) => dk >= 60 ? `${Math.floor(dk / 60)} saat${dk % 60 ? ` ${dk % 60} dk` : ""}` : `${dk} dk`;
const hedefler = (id: string) => [
  ...(URUN_REHBER[id]?.hazirlik.dikkat || []), ...(URUN_REHBER[id]?.kontrol.dikkat || []),
].filter((d) => d.startsWith("🎯")).map((d) => d.replace(/^🎯\s*/, ""));

function kazanEtiket(u: Urun): string {
  const t = urunKazanTipi(u.id);
  if (!t) return "";
  const nolar = KAZANLAR.filter((k) => k.tip === t).map((k) => k.no).join(" / ");
  return t === "yuksek" ? `⬆️ Yüksek kazan (${nolar})` : `⬇️ Alçak kazan (${nolar})`;
}

export function yardimKart(u: Urun): string {
  const renk = RENK[u.kat] || "#1565C0";
  const tehlike = [...new Set(u.ings.map(([a]) => HM_TEHLIKE[a]).filter(Boolean))];
  const adimlar = prosesUret(u).filter((a) => a.tip !== "guvenlik" && a.tip !== "bitir");
  const aile = URUN_AILE[u.id];
  const safSu = SAF_SU.has(u.id) || adimlar.some((a) => a.safSu);
  return `<div class="card yh-kart" data-urun="${u.id}" style="border-left:4px solid ${renk};margin-bottom:10px">
    <div class="ch"><span class="ct">${u.ad}</span>
      <span class="bgrp" style="gap:4px;flex-wrap:wrap">
        <span class="ba bb">Parti: ${u.batch} kg</span>
        ${kazanEtiket(u) ? `<span class="ba bgr">${kazanEtiket(u)}</span>` : ""}
        ${aile ? `<span class="ba ${aile === "klor" || aile === "asit" || aile === "kostik" ? "br" : aile === "alkol" ? "bam" : "bg2"}">${AILE_AD[aile]}</span>` : ""}
      </span></div>
    <div class="g2">
      <div>
        <div class="yh-bas">Formülasyon (kütlece)</div>
        <table class="yh-tablo">${u.ings.map(([ad, p]) => `<tr><td>${ad}${atlamaRozet(u.id, ad)}</td><td class="tr">${yuzde(p)}</td></tr>`).join("")}</table>
        ${hedefler(u.id).length ? `<div class="yh-hedef">🎯 ${hedefler(u.id).join("<br>🎯 ")}</div>` : ""}
      </div>
      <div>
        <div class="yh-bas">Üretim Adımları</div>
        <ol class="yh-adim">${adimlar.map((a) => `<li><b>${a.baslik}</b>${a.ekle?.length && !a.ekle.every((e) => a.baslik.includes(e)) ? ` — ${a.ekle.join(", ")}` : ""}${a.sureDk ? ` <span class="tm">(${sure(a.sureDk)})</span>` : ""}${a.not ? `<div class="tm">${a.not}</div>` : ""}</li>`).join("")}</ol>
      </div>
    </div>
    <div class="yh-kural">⛔ <b>${ALTIN_KURAL.baslik.toLocaleLowerCase("tr-TR").replace(/^./, (c) => c.toLocaleUpperCase("tr-TR"))}.</b>
      ${safSu ? `<br>💧 Saf su: ${SAF_SU_DINAMO_UYARI}` : ""}
      ${aile === "klor" || aile === "asit" ? `<br>☣️ ${KLOR_ASIT_KURAL}` : ""}
    </div>
    ${tehlike.length ? `<div class="yh-tehlike">⚠️ ${tehlike.join("<br>⚠️ ")}</div>` : ""}
    <div style="text-align:right;margin-top:8px"><button class="btn bp" onclick="yhAsistan('${u.id}')">▶ Asistanla üret</button></div>
  </div>`;
}

/** Rehber açılınca sıvı ürün kartlarını üretir. */
export function rYardim(): void {
  for (const [kat, id] of Object.entries(YARDIM_SEKME))
    setHTML(id, URUNLER.filter((u) => u.kat === kat).map(yardimKart).join(""));
}

export function yhAsistan(urunId: string): void {
  document.getElementById("m-yardim")?.classList.remove("open");
  (window as unknown as { go: (n: string) => void }).go("asistan");
  setVal("as-urun", urunId);
  asistanUrunDegisti();
}
