import { store } from "../state";
import { URUNLER, HM_LIST } from "../constants";
import { $, fmt, urunAd, musAd, setHTML } from "../helpers";

interface Sonuc { tur: string; id: string; ikon: string; ad: string; sub: string }

const irsNo = (id: number) => `İRS-${new Date().getFullYear()}-${String(id).padStart(4, "0")}`;

export function openArama(): void {
  const inp = $("arama-input") as HTMLInputElement;
  inp.value = "";
  setHTML("arama-sonuc", '<div class="tm" style="text-align:center;padding:22px">En az 2 harf yazın…<br><span style="font-size:.65rem">Müşteri · sipariş · ürün · ham madde · esans · irsaliye · üretim · sevkiyat</span></div>');
  $("m-arama").classList.add("open");
  setTimeout(() => inp.focus(), 60);
}

function bolum(baslik: string, satirlar: Sonuc[]): string {
  if (!satirlar.length) return "";
  return `<div class="arama-bolum">${baslik} <span class="tm">(${satirlar.length})</span></div>` +
    satirlar.map((s) => `<div class="arama-row" onclick="aramaGit('${s.tur}','${s.id}')">
      <span class="arama-ic">${s.ikon}</span>
      <div class="arama-meta"><div class="arama-ad">${s.ad}</div><div class="arama-sub">${s.sub}</div></div>
      <span class="bildirim-ok">›</span></div>`).join("");
}

export function aramaYap(): void {
  const q = (($("arama-input") as HTMLInputElement).value || "").trim().toLowerCase();
  if (q.length < 2) {
    setHTML("arama-sonuc", q ? '<div class="tm" style="text-align:center;padding:22px">En az 2 harf yazın…</div>' : '<div class="tm" style="text-align:center;padding:22px">Aramak için yazın…</div>');
    return;
  }
  const içerir = (...p: (string | number | undefined | null)[]) => p.join(" ").toLowerCase().includes(q);

  const mus: Sonuc[] = store.musteriler.filter((m) => içerir(m.ad, m.ilce, m.tel, m.yetkili))
    .slice(0, 8).map((m) => ({ tur: "musteri", id: String(m.id), ikon: "🏥", ad: m.ad, sub: [m.ilce, m.tel].filter(Boolean).join(" · ") || "—" }));

  const sip: Sonuc[] = store.siparisler.filter((s) => içerir("#" + s.id, musAd(s.musteriId), s.durum, (s.kalemler || []).map((k) => urunAd(k.urunId)).join(" ")))
    .slice(-8).reverse().map((s) => ({ tur: "siparis", id: String(s.id), ikon: "📋", ad: `${musAd(s.musteriId)} · ${s.durum}`, sub: `${fmt(s.tarih)} · ${(s.kalemler || []).map((k) => urunAd(k.urunId)).join(", ")}` }));

  const urn: Sonuc[] = URUNLER.filter((u) => içerir(u.ad, u.kat))
    .slice(0, 8).map((u) => ({ tur: "urun", id: u.id, ikon: "🧴", ad: u.ad, sub: u.kat }));

  const hm: Sonuc[] = HM_LIST.filter((h) => içerir(h.ad))
    .slice(0, 8).map((h) => ({ tur: "hammadde", id: h.id, ikon: "🧪", ad: h.ad, sub: "Ham madde" }));

  const esn: Sonuc[] = store.esanslar.filter((e) => içerir(e.ad, e.aciklama))
    .slice(0, 8).map((e) => ({ tur: "esans", id: e.id, ikon: "🌸", ad: e.ad, sub: e.aciklama || "Esans" }));

  const irs: Sonuc[] = store.irsaliyeler.filter((i) => içerir(irsNo(i.id), musAd(i.musteriId), (i.kalemler || []).map((k) => urunAd(k.urunId)).join(" ")))
    .slice(0, 8).map((i) => ({ tur: "irsaliye", id: String(i.id), ikon: "🧾", ad: `${irsNo(i.id)} · ${musAd(i.musteriId)}`, sub: `${fmt(i.tarih)} · ${i.plaka || ""}` }));

  const ure: Sonuc[] = store.uretimGunleri.filter((g) => içerir(g.tarih, fmt(g.tarih), g.not, g.kalemler.map((k) => urunAd(k.urunId)).join(" ")))
    .slice(0, 8).map((g) => ({ tur: "uretim", id: String(g.id), ikon: "🏭", ad: `Üretim ${fmt(g.tarih)}`, sub: g.kalemler.map((k) => urunAd(k.urunId)).join(", ") || "—" }));

  const sev: Sonuc[] = store.sevkiyatlar.filter((s) => içerir(fmt(s.tarih), s.plaka, s.surucu, s.kim))
    .slice(0, 8).map((s) => ({ tur: "sevkiyat", id: String(s.id), ikon: "🚚", ad: `Sevkiyat ${fmt(s.tarih)}`, sub: [s.plaka, s.surucu].filter(Boolean).join(" · ") || "—" }));

  const html = bolum("🏥 Müşteriler", mus) + bolum("📋 Siparişler", sip) + bolum("🧴 Ürünler", urn) +
    bolum("🧪 Ham Madde", hm) + bolum("🌸 Esans", esn) + bolum("🧾 İrsaliyeler", irs) +
    bolum("🏭 Üretim", ure) + bolum("🚚 Sevkiyat", sev);
  setHTML("arama-sonuc", html || '<div class="tm" style="text-align:center;padding:22px">Sonuç bulunamadı</div>');
}

export function aramaGit(tur: string, id: string): void {
  $("m-arama").classList.remove("open");
  const w = window as any;
  const sayfa: Record<string, string> = {
    musteri: "musteriler", siparis: "siparisler", urun: "urun-stok", hammadde: "hm-stok",
    esans: "esans-stok", irsaliye: "irsaliye", uretim: "uretim", sevkiyat: "sevkiyat",
  };
  w.go(sayfa[tur] || "dashboard");
  if (tur === "musteri") w.editMus(Number(id)); // müşteri kartını düzenlemeye aç
}
