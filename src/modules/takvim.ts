import { store } from "../state";
import { acUretimGunWithLines } from "./uretim";
import { $, fmt, today, urunAd, musAd, stBadge, setHTML, setText } from "../helpers";

const AYLAR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const GUNLER = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

let tvYil = 0;
let tvAy = 0; // 0-11
let tvSecili = "";

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

export function rTakvim(): void {
  if (!tvYil) { const n = new Date(); tvYil = n.getFullYear(); tvAy = n.getMonth(); }
  ciz();
}

export function tvPrev(): void { if (--tvAy < 0) { tvAy = 11; tvYil--; } ciz(); }
export function tvNext(): void { if (++tvAy > 11) { tvAy = 0; tvYil++; } ciz(); }
export function tvBugun(): void { const n = new Date(); tvYil = n.getFullYear(); tvAy = n.getMonth(); tvSecili = today(); ciz(); }

function ciz(): void {
  setText("tv-baslik", `${AYLAR[tvAy]} ${tvYil}`);

  // Günlük üretim & sipariş haritaları
  const uretim = new Map<string, { adet: number; kg: number }>();
  for (const g of store.uretimGunleri) {
    if (!g.tarih.startsWith(iso(tvYil, tvAy, 1).substring(0, 7))) continue;
    const kg = g.kalemler.reduce((s, k) => s + k.kg, 0);
    const cur = uretim.get(g.tarih) || { adet: 0, kg: 0 };
    cur.adet += g.kalemler.length; cur.kg += kg;
    uretim.set(g.tarih, cur);
  }
  const siparis = new Map<string, number>();
  for (const s of store.siparisler) {
    if (!s.teslimTarihi || !s.teslimTarihi.startsWith(iso(tvYil, tvAy, 1).substring(0, 7))) continue;
    siparis.set(s.teslimTarihi, (siparis.get(s.teslimTarihi) || 0) + 1);
  }

  const ilkGun = (new Date(tvYil, tvAy, 1).getDay() + 6) % 7; // Pzt=0
  const gunSayisi = new Date(tvYil, tvAy + 1, 0).getDate();
  const bugun = today();

  let hucreler = GUNLER.map((g) => `<div class="tv-wd">${g}</div>`).join("");
  for (let i = 0; i < ilkGun; i++) hucreler += `<div class="tv-bos"></div>`;
  for (let d = 1; d <= gunSayisi; d++) {
    const t = iso(tvYil, tvAy, d);
    const u = uretim.get(t);
    const sp = siparis.get(t);
    const cls = [t === bugun ? "bugun" : "", t === tvSecili ? "secili" : ""].filter(Boolean).join(" ");
    hucreler += `<div class="tv-gun ${cls}" onclick="tvGun('${t}')">
      <div class="tv-no">${d}</div>
      ${u ? `<div class="tv-rozet tv-u">🏭 ${u.kg.toLocaleString("tr-TR")}kg</div>` : ""}
      ${sp ? `<div class="tv-rozet tv-s">📋 ${sp} teslim</div>` : ""}
    </div>`;
  }
  setHTML("tv-grid", hucreler);

  if (tvSecili && tvSecili.startsWith(iso(tvYil, tvAy, 1).substring(0, 7))) detay(tvSecili);
  else setHTML("tv-detay", '<div class="tm" style="text-align:center;padding:18px">Detay için bir güne tıklayın.</div>');
}

export function tvGun(t: string): void { tvSecili = t; ciz(); }

function detay(t: string): void {
  const uretimler = store.uretimGunleri.filter((g) => g.tarih === t);
  const siparisler = store.siparisler.filter((s) => s.teslimTarihi === t);
  let html = `<div class="tv-detay-bas">📅 ${fmt(t)}
    <button class="btn bp bsm" style="float:right" onclick="takvimYeniUretim('${t}')">+ Üretim Günü</button></div>`;

  if (uretimler.length) {
    html += `<div class="tv-sec-bas">🏭 Üretim</div>`;
    for (const g of uretimler) {
      html += `<div class="tv-row">${g.kalemler.map((k) => `<span class="ba bb">${urunAd(k.urunId)} ${k.kg.toLocaleString("tr-TR")}kg</span>`).join(" ")}</div>`;
    }
  }
  if (siparisler.length) {
    html += `<div class="tv-sec-bas">📋 Teslim Edilecek Siparişler</div>`;
    for (const s of siparisler) {
      html += `<div class="tv-row"><b>${musAd(s.musteriId)}</b> <span class="ba ${stBadge(s.durum)}">${s.durum}</span> · ${s.kalemler.length} kalem</div>`;
    }
  }
  if (!uretimler.length && !siparisler.length) html += `<div class="tm" style="padding:10px">Bu gün kayıt yok. "+ Üretim Günü" ile başlayabilirsin.</div>`;
  setHTML("tv-detay", html);
}

// Seçili güne üretim günü modalını tarih dolu açar
export function takvimYeniUretim(t: string): void {
  acUretimGunWithLines([]);
  const inp = $("ug-tarih") as HTMLInputElement;
  if (inp) inp.value = t || today();
}
