// Okul bandı / giriş ekranı / mobil başlık için canlı tarih ve saat.
// Sayfadaki [data-tarih], [data-saat], [data-tarih-kisa], [data-saat-kisa]
// öğelerini her saniye günceller.

const AYLAR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const GUNLER = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
const iki = (n: number) => String(n).padStart(2, "0");

export function tarihYaz(d: Date): string {
  return `${d.getDate()} ${AYLAR[d.getMonth()]} ${d.getFullYear()} ${GUNLER[d.getDay()]}`;
}
export function saatYaz(d: Date, saniye = true): string {
  return `${iki(d.getHours())}:${iki(d.getMinutes())}${saniye ? ":" + iki(d.getSeconds()) : ""}`;
}

function guncelle(): void {
  const d = new Date();
  const yaz = (sec: string, metin: string) => document.querySelectorAll<HTMLElement>(sec).forEach((el) => {
    if (el.textContent !== metin) el.textContent = metin;
  });
  yaz("[data-tarih]", tarihYaz(d));
  yaz("[data-saat]", saatYaz(d));
  yaz("[data-tarih-kisa]", `${iki(d.getDate())}.${iki(d.getMonth() + 1)}.${d.getFullYear()}`);
  yaz("[data-saat-kisa]", saatYaz(d, false));
}

let basladi = false;
export function saatBaslat(): void {
  if (basladi) return;
  basladi = true;
  guncelle();
  window.setInterval(guncelle, 1000);
}
