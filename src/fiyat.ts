import { store } from "./state";
import { HM_FIYAT, HM_LIST, AMB_FIYAT } from "./constants";
import type { Urun } from "./types";

const ID_BY_AD: Record<string, string> = Object.fromEntries(HM_LIST.map((h) => [h.ad, h.id]));

// Dinamik ham madde fiyatı: DB'deki son alış fiyatı varsa onu, yoksa sabit
// referans fiyatı (HM_FIYAT) kullanır.
export function hmFiyatAd(ad: string): number {
  const id = ID_BY_AD[ad];
  const f = id ? store.hmStok[id]?.fiyat : undefined;
  return f && f > 0 ? f : HM_FIYAT[ad] || 0;
}
export function hmFiyatId(id: string): number {
  const ad = HM_LIST.find((h) => h.id === id)?.ad || "";
  const f = store.hmStok[id]?.fiyat;
  return f && f > 0 ? f : HM_FIYAT[ad] || 0;
}

// Ürünün 1 kg ham madde maliyeti (dinamik fiyatlarla)
export function rawKg(urun: Urun): number {
  return urun.ings.reduce((s, [ad, pct]) => s + hmFiyatAd(ad) * (pct / 100), 0);
}

export type NakTip = "perset" | "perkg" | "yok";
export interface PaketMaliyet {
  adet: number; hamMad: number; bidon: number; koliPay: number; nak: number; top: number; litreM: number; kgB: number;
}

// Dolu ambalaj maliyeti (ham madde + bidon + koli payı + nakliye payı)
export function paketMaliyet(
  urun: Urun, hacim: number, bidonFiyat: number, koliPer: number,
  koliFiyat: number, nakTip: NakTip, nakTut: number, batch: number
): PaketMaliyet {
  const kgB = hacim * urun.yog;
  const adet = Math.ceil(batch / kgB);
  const hamMad = rawKg(urun) * kgB;
  const koliPay = koliPer > 0 ? koliFiyat / koliPer : 0;
  const nak = nakTip === "perset" ? nakTut / adet : nakTip === "perkg" ? nakTut * kgB : 0;
  const top = hamMad + bidonFiyat + koliPay + nak;
  return { adet, hamMad, bidon: bidonFiyat, koliPay, nak, top, litreM: top / hacim, kgB };
}

// Fiyat Listesi için varsayılan ambalajla yaklaşık dolu maliyet (nakliye hariç)
export function yaklasikMaliyet(urun: Urun, hacim: 5 | 20 | 1): number {
  const bidon = hacim === 5 ? AMB_FIYAT.p5 : hacim === 20 ? AMB_FIYAT.p20 : AMB_FIYAT.p1;
  const koliPer = hacim === 5 ? 4 : hacim === 1 ? 14 : 0;
  return paketMaliyet(urun, hacim, bidon, koliPer, AMB_FIYAT.koli, "yok", 0, urun.batch).top;
}

export interface KarBilgi { kar: number; marj: number }
// Kâr ₺ ve kâr marjı % (satış üzerinden). Satış yoksa null.
export function karHesap(satis: number | null | undefined, maliyet: number): KarBilgi | null {
  if (!satis || satis <= 0) return null;
  const kar = satis - maliyet;
  return { kar, marj: (kar / satis) * 100 };
}
