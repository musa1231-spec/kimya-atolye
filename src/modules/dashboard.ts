import { store } from "../state";
import { URUNLER } from "../constants";
import { today, fmt, urunAd, musAd, stBadge, setText, setHTML } from "../helpers";
import { barChart, donutChart, PALET } from "../lib/grafik";

const AY_KISA = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

function rGrafikler(): void {
  // Veri olan en güncel yılı seç (yoksa içinde bulunulan yıl)
  const yillar = [...new Set(store.uretimGunleri.map((g) => g.tarih.slice(0, 4)))].sort();
  const buYil = today().slice(0, 4);
  const yil = yillar.includes(buYil) ? buYil : yillar[yillar.length - 1] || buYil;
  setText("d-grafik-yil", yil);

  const aylik = AY_KISA.map((ay, i) => {
    const pref = `${yil}-${String(i + 1).padStart(2, "0")}`;
    const kg = store.uretimGunleri.filter((g) => g.tarih.startsWith(pref)).reduce((s, g) => s + g.kalemler.reduce((t, k) => t + k.kg, 0), 0);
    return { label: ay, value: Math.round(kg) };
  });
  setHTML("d-grafik-uretim", barChart(aylik, "kg"));

  const um: Record<string, number> = {};
  store.uretimGunleri.filter((g) => g.tarih.startsWith(yil)).flatMap((g) => g.kalemler).forEach((k) => { um[k.urunId] = (um[k.urunId] || 0) + k.kg; });
  const sirali = Object.entries(um).sort((a, b) => b[1] - a[1]);
  const ilk = sirali.slice(0, 6).map(([id, kg], i) => ({ label: urunAd(id), value: Math.round(kg), color: PALET[i % PALET.length] }));
  const kalan = sirali.slice(6).reduce((s, [, kg]) => s + kg, 0);
  if (kalan > 0) ilk.push({ label: "Diğer", value: Math.round(kalan), color: "#90a4c4" });
  setHTML("d-grafik-urun", donutChart(ilk));
}

export function rDash(): void {
  setText("d-tarih", new Date().toLocaleDateString("tr-TR", { weekday: "long", year: "numeric", month: "long", day: "numeric" }));
  const bek = store.siparisler.filter((s) => ["bekliyor", "hazırlanıyor"].includes(s.durum)).length;
  setText("bb", bek ? String(bek) : "");
  const bugunKg = store.uretimGunleri.filter((g) => g.tarih === today()).reduce((s, g) => s + g.kalemler.reduce((t, k) => t + k.kg, 0), 0);
  const haftaKg = store.uretimGunleri.filter((g) => g.tarih >= today(-7)).reduce((s, g) => s + g.kalemler.reduce((t, k) => t + k.kg, 0), 0);
  const topStok = Object.values(store.urunStok).reduce((s, v) => s + v.kg, 0);
  setHTML("d-stats", `
    <div class="sc"><div class="sl">Bugün Üretim</div><div class="sv2 c1">${bugunKg.toLocaleString()}</div><div class="ss">kg</div></div>
    <div class="sc"><div class="sl">Bu Hafta</div><div class="sv2 c3">${haftaKg.toLocaleString()}</div><div class="ss">kg</div></div>
    <div class="sc"><div class="sl">Bekleyen Sipariş</div><div class="sv2 c2">${bek}</div><div class="ss">adet</div></div>
    <div class="sc"><div class="sl">Ürün Stoku</div><div class="sv2 c5">${topStok.toLocaleString()}</div><div class="ss">kg</div></div>
    <div class="sc"><div class="sl">5L Bidon</div><div class="sv2 c2">${store.bidon.b5}</div><div class="ss">adet</div></div>
    <div class="sc"><div class="sl">20L Bidon</div><div class="sv2 c3">${store.bidon.b20}</div><div class="ss">adet</div></div>
    <div class="sc"><div class="sl">Karton Koli</div><div class="sv2 c5">${store.koliStok}</div><div class="ss">adet</div></div>
    <div class="sc"><div class="sl">Müşteri</div><div class="sv2 c1">${store.musteriler.length}</div><div class="ss">kayıtlı</div></div>`);
  setHTML("d-sip", [...store.siparisler].slice(-5).reverse().map((s) => `
    <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--bord);font-size:.75rem">
      <div><div style="font-weight:700">${musAd(s.musteriId)}</div><div class="tm">${fmt(s.tarih)}</div></div>
      <span class="ba ${stBadge(s.durum)}">${s.durum}</span>
    </div>`).join("") || '<div class="tm">Sipariş yok</div>');
  const uy: string[] = [];
  URUNLER.forEach((u) => { const st = store.urunStok[u.id]; if (st && st.min > 0 && st.kg < st.min) uy.push(`⚠️ ${u.ad}: ${st.kg}kg`); });
  if (store.bidon.b5 < 50) uy.push(`⚠️ 5L Bidon az: ${store.bidon.b5}`);
  if (store.bidon.b20 < 20) uy.push(`⚠️ 20L Bidon az: ${store.bidon.b20}`);
  if (store.koliStok < 30) uy.push(`⚠️ Karton az: ${store.koliStok}`);
  store.esanslar.forEach((e) => { if (e.stok < e.minEsik) uy.push(`🌸 ${e.ad} az: ${e.stok}kg`); });
  setHTML("d-uyari", uy.map((u) => `<div style="padding:5px 0;border-bottom:1px solid var(--bord);font-size:.76rem;color:var(--acc2)">${u}</div>`).join("") || '<div class="tm">✅ Stoklar yeterli</div>');
  setHTML("d-hafta", [...store.uretimGunleri].filter((g) => g.tarih >= today(-7)).sort((a, b) => b.tarih.localeCompare(a.tarih)).map((g) => `
    <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--bord);font-size:.77rem;flex-wrap:wrap;gap:4px">
      <div><span class="mo2" style="color:var(--mut)">${fmt(g.tarih)}</span></div>
      <div>${g.kalemler.map((k) => `<span class="ba bgr" style="margin-right:3px">${urunAd(k.urunId)} ${k.kg}kg</span>`).join("")}</div>
      <div class="tm">${(g.ogretmenler || []).length + (g.ogrenciler || []).length} kişi</div>
    </div>`).join("") || '<div class="tm">Bu hafta üretim yok</div>');
  rGrafikler();
}
