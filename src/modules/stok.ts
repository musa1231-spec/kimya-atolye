import { store } from "../state";
import { audit } from "../audit";
import { URUNLER, HM_LIST } from "../constants";
import {
  upsertUrunStok, upsertHmStok, updateGenelStok, insertBidonH, insertKoliH, insertAlisFatura,
} from "../db";
import { hmFiyatId } from "../fiyat";
import {
  $, val, numVal, today, fmt, urunAd, urunSelect, setHTML, setText, closeModal,
} from "../helpers";
import { session } from "../state";
import { belgeBtn } from "./belge";

// ── ÜRÜN STOK ─────────────────────────────────────────────────
export function rUsStok(): void {
  setHTML("us-tb", URUNLER.map((u) => {
    const st = store.urunStok[u.id] || { kg: 0, min: 500 };
    const dur = st.kg === 0 ? "br" : st.kg < st.min ? "bam" : "bg2";
    return `<tr><td><strong>${u.ad}</strong></td><td class="tr mo2">${st.kg.toLocaleString()}</td>
      <td class="tr mo2">${(st.kg / u.yog).toFixed(0)}</td><td class="tr mo2">${st.min}</td>
      <td><span class="ba ${dur}">${st.kg === 0 ? "Yok" : st.kg < st.min ? "Az" : "Yeterli"}</span></td>
      <td style="display:flex;gap:3px"><button class="btn bg bsm" onclick="qStok('${u.id}')">+ Giriş</button>${belgeBtn("urun", u.id)}</td></tr>`;
  }).join(""));
}
export function qStok(id: string): void {
  setHTML("uss-u", urunSelect(id));
  $("m-urun-stok").classList.add("open");
}
export async function saveUsStok(): Promise<void> {
  const uid = val("uss-u");
  const kg = numVal("uss-kg");
  const tip = val("uss-t");
  const esik = numVal("uss-e");
  const st = store.urunStok[uid] || { kg: 0, min: 500 };
  st.kg = tip === "giris" ? st.kg + kg : Math.max(0, st.kg - kg);
  if (esik) st.min = esik;
  store.urunStok[uid] = st;
  await upsertUrunStok(uid, st.kg, st.min);
  audit("ÜRÜN STOK", `${urunAd(uid)}: ${tip} ${kg}kg`);
  closeModal("m-urun-stok");
  rUsStok();
}

// ── BİDON STOK ────────────────────────────────────────────────
export function rBidon(): void {
  const b = store.bidon;
  const max: Record<string, number> = { "1": 1000, "5": 500, "20": 200 };
  (["1", "5", "20"] as const).forEach((x) => {
    setText(`b${x}v`, String(b[("b" + x) as keyof typeof b]));
    const bar = $(`b${x}b`);
    if (bar) bar.style.width = Math.min(100, (b[("b" + x) as keyof typeof b] / max[x]) * 100) + "%";
  });
  setHTML("bd-tb", [...store.bidonH].reverse().map((bh) => `<tr><td class="mo2">${fmt(bh.t)}</td>
    <td><span class="ba ${bh.tip === "giris" ? "bg2" : "br"}">${bh.tip}</span></td>
    <td class="tr mo2">${bh.b1 || 0}</td><td class="tr mo2">${bh.b5 || 0}</td><td class="tr mo2">${bh.b20 || 0}</td>
    <td class="tm">${bh.n || ""}</td></tr>`).join("") || '<tr><td colspan="6" class="tm">Yok</td></tr>');
}
export async function saveBidon(): Promise<void> {
  const tip = val("bd-t");
  const b1 = numVal("bd-1"), b5 = numVal("bd-5"), b20 = numVal("bd-20");
  if (tip === "giris") { store.bidon.b1 += b1; store.bidon.b5 += b5; store.bidon.b20 += b20; }
  else { store.bidon.b1 = Math.max(0, store.bidon.b1 - b1); store.bidon.b5 = Math.max(0, store.bidon.b5 - b5); store.bidon.b20 = Math.max(0, store.bidon.b20 - b20); }
  await updateGenelStok({ b1: store.bidon.b1, b5: store.bidon.b5, b20: store.bidon.b20 });
  const h = await insertBidonH({ t: today(), tip, b1, b5, b20, n: val("bd-n") });
  store.bidonH.push(h);
  audit("BİDON STOK", `${tip}: 1L×${b1} 5L×${b5} 20L×${b20}`);
  closeModal("m-bidon");
  rBidon();
}

// ── KARTON / KOLİ STOK ────────────────────────────────────────
export function rKoli(): void {
  setText("kv", String(store.koliStok));
  const bar = $("kb");
  if (bar) bar.style.width = Math.min(100, (store.koliStok / 500) * 100) + "%";
  setHTML("kol-tb", [...store.koliH].reverse().map((k) => `<tr><td class="mo2">${fmt(k.t)}</td>
    <td><span class="ba ${k.tip === "giris" ? "bg2" : "br"}">${k.tip}</span></td>
    <td class="tr mo2">${k.a}</td><td class="tm">${k.kim || ""}</td><td class="tm">${k.n || ""}</td></tr>`).join("") || '<tr><td colspan="5" class="tm">Yok</td></tr>');
}
export async function saveKoli(): Promise<void> {
  const tip = val("kl-t");
  const a = numVal("kl-a");
  const n = val("kl-n");
  store.koliStok = tip === "giris" ? store.koliStok + a : Math.max(0, store.koliStok - a);
  await updateGenelStok({ koli: store.koliStok });
  const h = await insertKoliH({ t: today(), tip, a, kim: session.CU?.ad || "", n });
  store.koliH.push(h);
  audit("KOLİ STOK", `${tip}: ${a} adet`);
  closeModal("m-koli");
  rKoli();
}

// ── HAM MADDE STOK ────────────────────────────────────────────
export function rHm(): void {
  setHTML("hm-tb", HM_LIST.map((h) => {
    const st = store.hmStok[h.id] || { m: 0, min: 50, fiyat: 0 };
    const fiyat = hmFiyatId(h.id);
    const dur = st.m === 0 ? "br" : st.m < st.min ? "bam" : "bg2";
    return `<tr><td><strong>${h.ad}</strong></td><td>${h.b}</td><td class="tr mo2">${st.m.toLocaleString()}</td>
      <td class="tr mo2">${st.min}</td><td><span class="ba ${dur}">${st.m === 0 ? "Yok" : st.m < st.min ? "Az" : "Yeterli"}</span></td>
      <td class="tr mo2">${fiyat.toLocaleString("tr-TR")} ₺</td><td class="tr mo2">${(st.m * fiyat).toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺</td>
      <td>${belgeBtn("hammadde", h.id)}</td></tr>`;
  }).join(""));
  // Son alış faturaları
  setHTML("hm-fatura-tb", store.alisFaturalari.slice(0, 50).map((a) => `<tr>
    <td class="mo2">${fmt(a.tarih)}</td><td>${HM_LIST.find((h) => h.id === a.hmId)?.ad || a.hmId}</td>
    <td>${a.tedarikci || "—"}</td><td class="mo2">${a.faturaNo || "—"}</td>
    <td class="tr mo2">${a.miktar.toLocaleString("tr-TR")}</td><td class="tr mo2">${a.birimFiyat.toLocaleString("tr-TR")} ₺</td>
    <td class="tr mo2">${a.tutar.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺</td></tr>`).join("") || '<tr><td colspan="7" class="tm">Henüz alış faturası girilmedi</td></tr>');
}
export async function saveHm(): Promise<void> {
  const hid = val("hm-m");
  const m = numVal("hm-mk");
  const esik = numVal("hm-e");
  const tip = val("hm-t");
  const bf = numVal("hm-bf");
  const st = store.hmStok[hid] || { m: 0, min: 50, fiyat: 0 };
  st.m = tip === "giris" ? st.m + m : Math.max(0, st.m - m);
  if (esik) st.min = esik;
  if (tip === "giris" && bf > 0) st.fiyat = bf; // son alış fiyatı = güncel maliyet
  store.hmStok[hid] = st;
  await upsertHmStok(hid, st.m, st.min, st.fiyat);
  if (tip === "giris" && (bf > 0 || val("hm-ted") || val("hm-fno"))) {
    const fat = await insertAlisFatura({
      tarih: val("hm-tar") || today(), tedarikci: val("hm-ted"), faturaNo: val("hm-fno"),
      hmId: hid, miktar: m, birimFiyat: bf, tutar: bf * m, kim: session.CU?.ad || "",
    });
    store.alisFaturalari.unshift(fat);
  }
  const ad = HM_LIST.find((h) => h.id === hid)?.ad;
  audit("HAM MADDE", `${ad}: ${tip === "giris" ? "alış" : "çıkış"} ${m}kg${tip === "giris" && bf ? ` @${bf}₺` : ""}`);
  closeModal("m-hm");
  rHm();
}
