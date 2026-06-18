import "./style.css";

import { loadAll, seedIfEmpty } from "./db";
import { URUNLER } from "./constants";
import { store } from "./state";
import {
  $, eminMisin, closeModal, urunSelect, setHTML, setVal, today,
} from "./helpers";
import { HM_LIST } from "./constants";

import { initLoginScreen, doLogin, doLogout } from "./login";
import { rDash } from "./modules/dashboard";
import {
  prepUretimGun, addUgK, ugRefresh, ugCalc, saveUretimGun, delGun, rUretim,
  ugFilter, ugToggle,
} from "./modules/uretim";
import { rAylik } from "./modules/aylik";
import { rFormulasyon, rFormDetay, rFormDetayHesap } from "./modules/formulasyon";
import { rMaliyet } from "./modules/maliyet";
import {
  prepSiparis, rSiparisler, addSipK, saveSiparis, nextSt, delSip, editSiparis,
  siparisUretimeAktar, siparisIrsaliyeAktar, siparisPaylas,
} from "./modules/siparisler";
import {
  prepSevkiyat, addSvSip, addSvEk, saveSevkiyat, rSevkiyat, delSv,
} from "./modules/sevkiyat";
import { rMus, saveMus, editMus, delMus } from "./modules/musteriler";
import {
  rUsStok, qStok, saveUsStok, rBidon, saveBidon, rKoli, saveKoli, rHm, saveHm,
} from "./modules/stok";
import {
  rEsans, hEsans, saveEsansGiris, saveEsansTanim, saveEslestirme,
} from "./modules/esans";
import {
  rOgr, saveOgr, editOgr, delOgr, rOgc, saveOgc, editOgc, delOgc,
} from "./modules/personel";
import { rAudit, clearAudit } from "./modules/denetim";
import { manuelYedek, yukleYedek, otomatikYedekKontrol, rYedek } from "./modules/yedek";
import { openBelgeler, belgeYukle, delBelge, belgeRefreshKaydet } from "./modules/belge";
import {
  exportAylik, exportUretim, exportSiparisler, exportMusteri, exportUrunStok, exportHmStok,
  foyUretim, yazdirSiparis, yazdirSevkiyat, exportFiyatListesi, yazdirFiyatListesi,
} from "./modules/disaaktar";
import { rFiyatListe, prepFiyatYukle, saveFiyatYukle, paylasFiyatListesi } from "./modules/fiyatliste";
import { rPlan, addPlanK, hesaplaPlan, exportPlan, yazdirPlan, planiUretimeAktar } from "./modules/plan";
import { openBildirim, bildirimGit, rBildirimSayac } from "./modules/bildirim";
import { openArama, aramaYap, aramaGit } from "./modules/arama";
import {
  rIrsaliye, prepIrsaliye, addIrsK, irsSiparistenDoldur, saveIrsaliye, delIrsaliye, yazdirIrsaliye, paylasIrsaliye,
} from "./modules/irsaliye";
import { rKalite, prepKalite, saveKalite, delKalite, yazdirKalite } from "./modules/kalite";
import {
  rParti, prepParti, saveParti, delParti, etiketParti, partiFromUretim, partiUrunDegisti, partiRafDegisti,
} from "./modules/parti";
import { rRapor, yazdirRapor } from "./modules/rapor";
import { rSiparisOneri, yazdirSiparisOneri } from "./modules/siparisoneri";
import {
  rAsistan, asistanUrunDegisti, asistanBasla, asSonraki, asGeri, asGoto,
  asTimerBaslat, asTimerSifirla, asBitir,
} from "./modules/asistan";
import { rTakvim, tvPrev, tvNext, tvBugun, tvGun, takvimYeniUretim } from "./modules/takvim";
import { rKarne, yazdirKarne } from "./modules/karne";

// Belge yükleme/silme sonrası sayaçları tazelemek için kaynak sayfaların
// yenileme fonksiyonlarını kaydet (döngüsel importtan kaçınmak için).
belgeRefreshKaydet({
  hammadde: rHm,
  urun: rUsStok,
  siparis: () => rSiparisler(),
  sevkiyat: rSevkiyat,
});

// ════════════════════════════════════════════════════════════════
// NAVİGASYON
// ════════════════════════════════════════════════════════════════
const RENDER: Record<string, () => void> = {
  dashboard: rDash, uretim: rUretim, aylik: rAylik, formulasyon: rFormulasyon,
  maliyet: rMaliyet, siparisler: () => rSiparisler("hepsi"), sevkiyat: rSevkiyat,
  musteriler: rMus, "urun-stok": rUsStok, "bidon-stok": rBidon, "koli-stok": rKoli,
  "hm-stok": rHm, "esans-stok": rEsans, ogretmenler: rOgr, ogrenciler: rOgc,
  audit: rAudit, yedek: rYedek, "fiyat-liste": rFiyatListe, plan: rPlan, irsaliye: rIrsaliye,
  kalite: rKalite, parti: rParti, rapor: rRapor, "siparis-oneri": rSiparisOneri,
  asistan: rAsistan, takvim: rTakvim, karne: rKarne,
};

function go(name: string, el?: HTMLElement): void {
  document.querySelectorAll(".pg").forEach((p) => p.classList.remove("active"));
  document.querySelectorAll(".ni").forEach((n) => n.classList.remove("active"));
  $("pg-" + name).classList.add("active");
  // Program ile gezinince (el verilmezse) ilgili menü öğesini bul ve vurgula
  if (!el) el = (document.querySelector(`.ni[onclick*="go('${name}'"]`) as HTMLElement) || undefined;
  // Aktif sayfanın üst-bar grubunu işaretle
  document.querySelectorAll(".tb-grp.has-active").forEach((g) => g.classList.remove("has-active"));
  if (el) {
    el.classList.add("active");
    el.closest(".tb-grp")?.classList.add("has-active");
  }
  tbCloseAll();
  closeSidebar();
  window.scrollTo(0, 0);
  const main = document.querySelector(".main");
  if (main) main.scrollTop = 0;
  (RENDER[name] || (() => {}))();
  rBildirimSayac();
}

// ── Üst bar açılır menüler ────────────────────────────────────
function tbCloseAll(): void {
  document.querySelectorAll(".tb-grp.open").forEach((g) => g.classList.remove("open"));
}
function tbToggle(head: HTMLElement, ev?: Event): void {
  ev?.stopPropagation();
  const grp = head.closest(".tb-grp");
  const acik = grp?.classList.contains("open");
  tbCloseAll();
  if (!acik) grp?.classList.add("open");
}
// Dışarı tıklayınca açık menüleri kapat
document.addEventListener("click", (e) => {
  if (!(e.target as HTMLElement).closest(".tb-grp")) tbCloseAll();
});

// Mobil: hamburger üst bar panelini açar/kapar
function toggleSidebar(): void {
  $("topbar").classList.toggle("mob-open");
  $("sb-overlay").classList.toggle("mob-open");
}
function closeSidebar(): void {
  $("topbar").classList.remove("mob-open");
  $("sb-overlay").classList.remove("mob-open");
  tbCloseAll();
}
function yhTab(id: string, btn: HTMLElement): void {
  document.querySelectorAll<HTMLElement>(".yh-sec").forEach((s) => (s.style.display = "none"));
  document.querySelectorAll(".yh-tb").forEach((b) => b.classList.remove("active"));
  $(id).style.display = "block";
  btn.classList.add("active");
}
function fTab(name: string, btn: HTMLElement): void {
  document.querySelectorAll(".fsec").forEach((s) => s.classList.remove("active"));
  document.querySelectorAll(".ftb").forEach((b) => b.classList.remove("active"));
  $(name).classList.add("active");
  btn.classList.add("active");
  if (name === "form-detay") { setHTML("fd-urun", urunSelect()); rFormDetay(); }
}

// ════════════════════════════════════════════════════════════════
// MODAL
// ════════════════════════════════════════════════════════════════
function openModal(id: string): void {
  switch (id) {
    case "m-uretim-gun": prepUretimGun(); break;
    case "m-siparis": prepSiparis(); break;
    case "m-sevkiyat": prepSevkiyat(); break;
    case "m-irsaliye": prepIrsaliye(); break;
    case "m-fiyat-yukle": prepFiyatYukle(); break;
    case "m-hm":
      setHTML("hm-m", HM_LIST.map((h) => `<option value="${h.id}">${h.ad}</option>`).join(""));
      ["hm-mk", "hm-bf", "hm-ted", "hm-fno", "hm-e"].forEach((x) => setVal(x, ""));
      setVal("hm-tar", today());
      break;
    case "m-urun-stok": setHTML("uss-u", urunSelect()); break;
    case "m-esans-giris": setHTML("eg-e", store.esanslar.map((e) => `<option value="${e.id}">${e.ad}</option>`).join("")); break;
    case "m-eslas": buildEslasForm(); break;
    case "m-musteri": resetMusteriForm(); break;
    case "m-ogr": resetOgrForm(); break;
    case "m-ogc": resetOgcForm(); break;
    case "m-esans-tanim": resetEsansTanimForm(); break;
    case "m-kalite": prepKalite(); break;
    case "m-parti": prepParti(); break;
  }
  $(id).classList.add("open");
}

function buildEslasForm(): void {
  setHTML("esl-form", URUNLER.map((u) => {
    const mev = store.eslestirmeler[u.id] || [];
    return `<div style="margin-bottom:8px;padding:8px;background:var(--surf);border-radius:7px;border:1px solid var(--bord)">
      <div style="font-weight:700;font-size:.78rem;margin-bottom:5px">${u.ad}</div>
      <div style="display:flex;flex-wrap:wrap;gap:4px">${store.esanslar.map((e) => `
        <label class="cbl" style="${mev.includes(e.id) ? "background:rgba(33,150,243,.15)" : ""}">
          <input type="checkbox" data-u="${u.id}" data-e="${e.id}" ${mev.includes(e.id) ? "checked" : ""} style="width:auto;margin:0;background:none;border:none;padding:0"> ${e.ad}
        </label>`).join("")}</div></div>`;
  }).join(""));
}
// "+ Ekle" yolunda formu sıfırla (eski sürümdeki gizli-id kalıntısı hatasını önler)
function resetMusteriForm(): void { ["mu-id", "mu-ad", "mu-il", "mu-tel", "mu-yetk", "mu-adr"].forEach((x) => setVal(x, "")); }
function resetOgrForm(): void { ["ot-id", "ot-ad", "ot-gv", "ot-sif", "ot-tel"].forEach((x) => setVal(x, "")); }
function resetOgcForm(): void { ["oc-id", "oc-no", "oc-ad", "oc-sn", "oc-ib"].forEach((x) => setVal(x, "")); }
function resetEsansTanimForm(): void { setVal("et-ad", ""); setVal("et-ac", ""); setVal("et-e", "5"); }

// ════════════════════════════════════════════════════════════════
// GLOBAL HANDLER BAĞLAMA (inline onclick'ler için)
// ════════════════════════════════════════════════════════════════
Object.assign(window, {
  go, openModal, closeModal, toggleSidebar, closeSidebar, fTab, yhTab, tbToggle,
  doLogin, doLogout, eminMisin,
  addUgK, ugRefresh, ugCalc, saveUretimGun, delGun, rUretim, ugFilter, ugToggle,
  rAylik, rFormDetay, rFormDetayHesap, rMaliyet,
  rSiparisler, addSipK, saveSiparis, nextSt, delSip, editSiparis,
  addSvSip, addSvEk, saveSevkiyat, delSv,
  saveMus, editMus, delMus,
  qStok, saveUsStok, saveBidon, saveKoli, saveHm,
  hEsans, saveEsansGiris, saveEsansTanim, saveEslestirme,
  saveOgr, editOgr, delOgr, saveOgc, editOgc, delOgc,
  clearAudit, rAudit, manuelYedek, yukleYedek,
  openBelgeler, belgeYukle, delBelge,
  exportAylik, exportUretim, exportSiparisler, exportMusteri, exportUrunStok, exportHmStok,
  foyUretim, yazdirSiparis, yazdirSevkiyat,
  exportFiyatListesi, yazdirFiyatListesi, saveFiyatYukle,
  addPlanK, hesaplaPlan, exportPlan, yazdirPlan, planiUretimeAktar,
  openBildirim, bildirimGit,
  addIrsK, irsSiparistenDoldur, saveIrsaliye, delIrsaliye, yazdirIrsaliye, paylasIrsaliye,
  siparisUretimeAktar, siparisIrsaliyeAktar, siparisPaylas, paylasFiyatListesi,
  openArama, aramaYap, aramaGit,
  rKalite, saveKalite, delKalite, yazdirKalite,
  rParti, saveParti, delParti, etiketParti, partiFromUretim, partiUrunDegisti, partiRafDegisti,
  rRapor, yazdirRapor, rSiparisOneri, yazdirSiparisOneri,
  asistanUrunDegisti, asistanBasla, asSonraki, asGeri, asGoto, asTimerBaslat, asTimerSifirla, asBitir,
  tvPrev, tvNext, tvBugun, tvGun, takvimYeniUretim, rKarne, yazdirKarne,
});

// ════════════════════════════════════════════════════════════════
// BAŞLAT
// ════════════════════════════════════════════════════════════════
(async () => {
  try {
    await seedIfEmpty();
    await loadAll();
  } catch (e) {
    console.error("Veri yükleme hatası:", e);
    alert("Veriler yüklenemedi. Supabase bağlantısını ve tabloları kontrol edin.\n\n" + (e as Error).message);
  }
  $("yukleniyor").style.display = "none";

  // Belge sürükle-bırak
  const drop = $("belge-drop");
  ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("dragover"); }));
  ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, () => drop.classList.remove("dragover")));
  drop.addEventListener("drop", (e: DragEvent) => {
    e.preventDefault();
    const inp = $("belge-input") as HTMLInputElement;
    if (e.dataTransfer?.files?.length) { inp.files = e.dataTransfer.files; belgeYukle(inp); }
  });

  initLoginScreen();
  // Açılışta aktif (Gösterge) sayfasının grubunu işaretle
  document.querySelector(".ni.active")?.closest(".tb-grp")?.classList.add("has-active");
  setVal("uf-ay", today().substring(0, 7));
  setInterval(otomatikYedekKontrol, 30 * 60 * 1000);

  // Ctrl/Cmd + K → global arama (giriş yapılmışsa)
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k" && $("app").classList.contains("show")) {
      e.preventDefault();
      openArama();
    }
  });
})();
