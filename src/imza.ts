// Musa Karabiber imzası: okul bandında (koyu zemin) ve giriş kutusunda (açık zemin) görünür.
// Dosyalar public/imza-koyu.svg · public/imza-acik.svg (yazılar çizgiye çevrilmiş, font gerekmez).
export function imzaYerlestir(): void {
  const kok = import.meta.env.BASE_URL;
  const img = (dosya: string, sinif: string) => {
    const i = document.createElement("img");
    i.src = kok + dosya; i.className = sinif; i.alt = "Musa Karabiber — Kimya Öğretmeni";
    i.width = 834; i.height = 226; i.decoding = "async";
    return i;
  };
  const band = document.getElementById("okul-band");
  const saat = band?.querySelector(".ob-saat");
  if (band && saat && !band.querySelector(".ob-imza")) band.insertBefore(img("imza-koyu.svg", "ob-imza"), saat);
  const giris = document.querySelector(".login-logo");
  if (giris && !giris.querySelector(".login-imza")) giris.appendChild(img("imza-acik.svg", "login-imza"));
}
