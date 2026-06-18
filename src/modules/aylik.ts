import { store } from "../state";
import { val, urunAd, setHTML } from "../helpers";

export function rAylik(): void {
  const yil = val("ay-yil") || "2025";
  const AYLAR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
  setHTML("ay-tb", AYLAR.map((ay, i) => {
    const pref = `${yil}-${String(i + 1).padStart(2, "0")}`;
    const lst = store.uretimGunleri.filter((g) => g.tarih.startsWith(pref));
    const kg = lst.reduce((s, g) => s + g.kalemler.reduce((t, k) => t + k.kg, 0), 0);
    const cesit = new Set(lst.flatMap((g) => g.kalemler.map((k) => k.urunId))).size;
    return `<tr><td>${ay}</td><td class="tr mo2">${kg ? kg.toLocaleString() : "—"}</td><td class="tr mo2">${lst.length || "—"}</td><td class="tr">${cesit || "—"}</td></tr>`;
  }).join(""));
  const um: Record<string, number> = {};
  store.uretimGunleri.filter((g) => g.tarih.startsWith(yil)).flatMap((g) => g.kalemler).forEach((k) => { um[k.urunId] = (um[k.urunId] || 0) + k.kg; });
  setHTML("ay-ur", Object.entries(um).sort((a, b) => b[1] - a[1]).map(([id, kg]) => `<tr><td>${urunAd(id)}</td><td class="tr mo2">${kg.toLocaleString()}</td></tr>`).join("") || '<tr><td colspan="2" class="tm">Yok</td></tr>');
}
