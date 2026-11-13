import { store, session } from "./state";
import { audit } from "./audit";
import { rDash } from "./modules/dashboard";
import { rBildirimSayac } from "./modules/bildirim";
import { $, setHTML, setText, setVal } from "./helpers";

export function initLoginScreen(): void {
  setHTML("login-user", store.ogretmenler.map((o) => `<option value="${o.id}">${o.ad}</option>`).join(""));
}

export function doLogin(): void {
  const id = parseInt(($("login-user") as HTMLSelectElement).value);
  const sif = ($("login-pass") as HTMLInputElement).value;
  const ogr = store.ogretmenler.find((o) => o.id === id);
  if (!ogr || ogr.sif !== sif) {
    $("login-error").style.display = "block";
    setVal("login-pass", "");
    return;
  }
  session.CU = ogr;
  $("login-error").style.display = "none";
  $("login-screen").style.display = "none";
  $("app").classList.add("show");
  setText("sb-name", ogr.ad);
  const bas = ogr.ad.split(" ").map((w) => w[0]).join("").substring(0, 2).toLocaleUpperCase("tr-TR");
  setText("sb-avatar", bas);
  // Okul bandında giriş yapan kullanıcı
  setText("ob-kul-ad", ogr.ad);
  setText("ob-kul-a", bas);
  $("ob-kul").style.display = "";
  audit("GİRİŞ", "Sisteme giriş yapıldı");
  window.scrollTo(0, 0);
  rDash();
  rBildirimSayac();
}

export function doLogout(): void {
  if (session.CU) audit("ÇIKIŞ", "Sistemden çıkış yapıldı");
  session.CU = null;
  $("login-screen").style.display = "flex";
  $("app").classList.remove("show");
  setVal("login-pass", "");
  initLoginScreen();
}
