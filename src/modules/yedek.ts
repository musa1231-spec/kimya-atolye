import { store } from "../state";
import { audit } from "../audit";
import { loadAll, restoreAll } from "../db";
import { setHTML, setText, showToast } from "../helpers";
import { rDash } from "./dashboard";
import type { Store } from "../types";

const YEDEK_META = "fl_yedek_meta";
const SON_YEDEK = "fl_son_yedek";
const OTO_YEDEK = "fl_oto_yedek";

interface YedekMeta { tarih: string; boyut: string; tur: string }

function metaListesi(): YedekMeta[] {
  try { return JSON.parse(localStorage.getItem(YEDEK_META) || "[]"); } catch { return []; }
}

export function manuelYedek(): void {
  const json = JSON.stringify(store, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `formulab-yedek-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.json`;
  a.click();
  URL.revokeObjectURL(url);

  const list = metaListesi();
  list.unshift({ tarih: new Date().toISOString(), boyut: (json.length / 1024).toFixed(1), tur: "Manuel" });
  localStorage.setItem(YEDEK_META, JSON.stringify(list.slice(0, 20)));
  localStorage.setItem(SON_YEDEK, new Date().toISOString());
  audit("YEDEK", "Manuel yedek alındı");
  rYedek();
  showToast("Yedek indirildi ✓");
}

export function yukleYedek(inp: HTMLInputElement): void {
  const f = inp.files?.[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = async (e) => {
    try {
      const parsed = JSON.parse(String(e.target?.result)) as Store;
      if (!parsed.ogretmenler || !parsed.musteriler) { alert("Geçersiz yedek dosyası!"); return; }
      if (!confirm("Mevcut tüm veriler bu yedekle değiştirilecek. Emin misiniz?")) return;
      showToast("Geri yükleniyor…");
      await restoreAll(parsed);
      await loadAll();
      showToast("Yedek başarıyla yüklendi ✓");
      audit("YEDEK YÜKLENDİ", "Dosyadan yedek geri yüklendi");
      rDash();
      rYedek();
    } catch (err) {
      alert("Dosya okunamadı: " + (err as Error).message);
    }
  };
  r.readAsText(f);
  inp.value = "";
}

export function otomatikYedekKontrol(): void {
  const son = localStorage.getItem(SON_YEDEK);
  if (!son || Date.now() - new Date(son).getTime() > 6 * 60 * 60 * 1000) {
    localStorage.setItem(OTO_YEDEK, JSON.stringify(store));
    localStorage.setItem(SON_YEDEK, new Date().toISOString());
  }
}

export function rYedek(): void {
  const son = localStorage.getItem(SON_YEDEK);
  setText("son-yedek-tarihi", son ? new Date(son).toLocaleString("tr-TR") : "—");
  setHTML("yedek-tb", metaListesi().map((y) => `<tr>
    <td class="mo2">${new Date(y.tarih).toLocaleString("tr-TR")}</td>
    <td class="mo2">${y.boyut} KB</td>
    <td><span class="ba ${y.tur === "Manuel" ? "bb" : "bgr"}">${y.tur}</span></td>
    <td><button class="btn bg bsm" onclick="alert('Bu özellik için dosyayı tekrar indirin')">İndir</button></td>
  </tr>`).join("") || '<tr><td colspan="4" class="tm">Henüz yedek alınmadı</td></tr>');
  const boyut = (JSON.stringify(store).length / 1024).toFixed(1);
  setHTML("veri-istat", `
    <div class="g4">
      <div class="sc"><div class="sl">Toplam Kayıt</div><div class="sv2 c1">${store.denetim.length + store.uretimGunleri.length + store.siparisler.length}</div></div>
      <div class="sc"><div class="sl">Veri Boyutu</div><div class="sv2 c2">${boyut}</div><div class="ss">KB</div></div>
      <div class="sc"><div class="sl">Öğrenci</div><div class="sv2 c3">${store.ogrenciler.length}</div></div>
      <div class="sc"><div class="sl">Denetim Kaydı</div><div class="sv2 c5">${store.denetim.length}</div></div>
    </div>`);
}
