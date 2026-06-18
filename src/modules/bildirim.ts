import { store } from "../state";
import { URUNLER, HM_LIST } from "../constants";
import { today, fmt, musAd, setHTML } from "../helpers";

interface Bildirim { ikon: string; mesaj: string; tur: "kritik" | "uyari"; sayfa: string }

const gunFarki = (hedef: string): number =>
  Math.round((new Date(hedef + "T00:00:00").getTime() - new Date(today() + "T00:00:00").getTime()) / 86400000);

function hesapla(): Bildirim[] {
  const list: Bildirim[] = [];

  // Siparişler — teslim tarihi gecikmiş / yaklaşıyor
  store.siparisler.forEach((s) => {
    if (s.durum === "teslim edildi" || !s.teslimTarihi) return;
    const fark = gunFarki(s.teslimTarihi);
    if (fark < 0) list.push({ ikon: "⏰", mesaj: `Gecikmiş sipariş: ${musAd(s.musteriId)} — ${fmt(s.teslimTarihi)} (${-fark} gün geçti)`, tur: "kritik", sayfa: "siparisler" });
    else if (fark <= 3) list.push({ ikon: "📋", mesaj: `Teslim yaklaşıyor: ${musAd(s.musteriId)} — ${fmt(s.teslimTarihi)} (${fark === 0 ? "bugün" : fark + " gün"})`, tur: "uyari", sayfa: "siparisler" });
  });

  // Ürün stoğu
  URUNLER.forEach((u) => {
    const st = store.urunStok[u.id];
    if (st && st.min > 0 && st.kg < st.min) list.push({ ikon: "🧴", mesaj: `${u.ad}: ${st.kg.toLocaleString()} kg (min ${st.min})`, tur: st.kg === 0 ? "kritik" : "uyari", sayfa: "urun-stok" });
  });

  // Ham madde
  HM_LIST.forEach((h) => {
    const st = store.hmStok[h.id];
    if (st && st.min > 0 && st.m < st.min) list.push({ ikon: "🧪", mesaj: `${h.ad}: ${st.m.toLocaleString()} (min ${st.min})`, tur: st.m === 0 ? "kritik" : "uyari", sayfa: "hm-stok" });
  });

  // Esans
  store.esanslar.forEach((e) => {
    if (e.stok < e.minEsik) list.push({ ikon: "🌸", mesaj: `${e.ad}: ${e.stok} kg (min ${e.minEsik})`, tur: e.stok === 0 ? "kritik" : "uyari", sayfa: "esans-stok" });
  });

  // Bidon / koli
  if (store.bidon.b1 < 50) list.push({ ikon: "📦", mesaj: `1L bidon az: ${store.bidon.b1}`, tur: "uyari", sayfa: "bidon-stok" });
  if (store.bidon.b5 < 50) list.push({ ikon: "📦", mesaj: `5L bidon az: ${store.bidon.b5}`, tur: "uyari", sayfa: "bidon-stok" });
  if (store.bidon.b20 < 20) list.push({ ikon: "📦", mesaj: `20L bidon az: ${store.bidon.b20}`, tur: "uyari", sayfa: "bidon-stok" });
  if (store.koliStok < 30) list.push({ ikon: "📫", mesaj: `Karton koli az: ${store.koliStok}`, tur: "uyari", sayfa: "koli-stok" });

  // Kritik olanlar üstte
  return list.sort((a, b) => (a.tur === "kritik" ? 0 : 1) - (b.tur === "kritik" ? 0 : 1));
}

export function rBildirimSayac(): void {
  const list = hesapla();
  const kritik = list.some((b) => b.tur === "kritik");
  [["bell-badge", "bell-btn"], ["mob-bell-badge", "mob-bell"]].forEach(([badgeId]) => {
    const badge = document.getElementById(badgeId);
    if (!badge) return;
    if (list.length) {
      badge.textContent = String(list.length);
      badge.style.display = "inline-flex";
      badge.style.background = kritik ? "var(--acc4)" : "var(--acc2)";
    } else {
      badge.style.display = "none";
    }
  });
}

export function openBildirim(): void {
  const list = hesapla();
  setHTML("bildirim-list", list.map((b) => `
    <div class="bildirim-row ${b.tur}" onclick="bildirimGit('${b.sayfa}')">
      <span class="bildirim-ic">${b.ikon}</span>
      <span class="bildirim-msg">${b.mesaj}</span>
      <span class="bildirim-ok">›</span>
    </div>`).join("") || '<div class="tm" style="text-align:center;padding:24px">✅ Bekleyen bildirim yok — her şey yolunda</div>');
  document.getElementById("m-bildirim")?.classList.add("open");
}

export function bildirimGit(sayfa: string): void {
  document.getElementById("m-bildirim")?.classList.remove("open");
  (window as any).go(sayfa);
}
