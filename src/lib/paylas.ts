// WhatsApp / e-posta / cihaz paylaşımı yardımcıları (bağımlılıksız).

// Telefonu uluslararası mobil formata çevirir; mobil değilse null döner
// (sabit hatlarda wa.me "geçersiz numara" hatası vermesin diye).
function mobilNo(tel?: string): string | null {
  if (!tel) return null;
  let d = tel.replace(/\D/g, "");
  if (d.startsWith("0")) d = "90" + d.slice(1);
  else if (d.length === 10) d = "90" + d;
  // TR cep: 90 + 5xxxxxxxxx (12 hane)
  return /^905\d{9}$/.test(d) ? d : null;
}

export function whatsappPaylas(metin: string, tel?: string): void {
  const no = mobilNo(tel);
  const url = `https://wa.me/${no || ""}?text=${encodeURIComponent(metin)}`;
  window.open(url, "_blank");
}

export function epostaPaylas(konu: string, govde: string, eposta?: string): void {
  window.location.href = `mailto:${eposta || ""}?subject=${encodeURIComponent(konu)}&body=${encodeURIComponent(govde)}`;
}

// Mobil cihazlarda yerel paylaşım menüsü (varsa); yoksa WhatsApp'a düşer.
export async function cihazPaylas(baslik: string, metin: string, tel?: string): Promise<void> {
  const nav = navigator as Navigator & { share?: (d: { title?: string; text?: string }) => Promise<void> };
  if (nav.share) {
    try { await nav.share({ title: baslik, text: metin }); return; } catch { /* iptal */ }
  }
  whatsappPaylas(metin, tel);
}
