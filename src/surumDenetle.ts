// (Lab Programı src/lib/surumDenetle.ts ile aynı) Yayından sonra telefonda ESKİ görünüm kalıyordu (13 Kas 2026, K88'in ikinci yüzü): telefon kurulu uygulamayı kapatmaz,
// arka planda uyutur; geri dönülünce sayfa yeniden açılmadığı için eski paket ekranda kalır.
// Çözüm: uygulama öne geldiğinde (ve yarım saatte bir) yayındaki index.html'in paket adı, ekrandaki paketle karşılaştırılır.
//  · Uygulama ≥ 60 sn arka planda kaldıysa → kendiliğinden yenilenir (kullanıcı o an bir şey yazmıyordu).
//  · Kısa aradan dönüldüyse ya da kullanım sırasında fark edildiyse → yazılan kaybolmasın diye «Yenile» düğmesi gösterilir.

const PAKET_DESEN = /\/assets\/index-[\w-]+\.js/;
const UZUN_ARA_MS = 60_000;

function ekrandakiPaket(): string | null {
  const s = document.querySelector<HTMLScriptElement>('script[type="module"][src*="/assets/index-"]');
  const m = s?.getAttribute('src')?.match(PAKET_DESEN);
  return m ? m[0] : null;
}

async function yayindakiPaket(): Promise<string | null> {
  try {
    const r = await fetch(import.meta.env.BASE_URL + '?surum=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) return null;
    const m = (await r.text()).match(PAKET_DESEN);
    return m ? m[0] : null;
  } catch { return null; }   // internet yok: sessizce geç, eski sürüm çalışmaya devam eder
}

function dugmeGoster(): void {
  if (document.getElementById('surum-yenile')) return;
  const b = document.createElement('button');
  b.id = 'surum-yenile';
  b.type = 'button';
  b.textContent = '🔄 Yeni sürüm hazır — Yenile';
  b.className = 'no-print';
  b.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:max(16px,env(safe-area-inset-bottom,0px));z-index:10000;'
    + 'padding:11px 20px;border-radius:999px;border:2px solid #f2a541;background:#0f605d;color:#fff;font:700 14px "Segoe UI",system-ui,sans-serif;'
    + 'box-shadow:0 8px 24px rgba(6,42,42,.35);cursor:pointer';
  b.onclick = () => location.reload();
  document.body.appendChild(b);
}

export function surumDenetleBaslat(): void {
  if (import.meta.env.DEV) return;
  const benim = ekrandakiPaket();
  if (!benim) return;
  let gizlendi = 0, bakiyor = false;

  async function denetle(uzunAra: boolean) {
    if (bakiyor) return;
    bakiyor = true;
    try {
      navigator.serviceWorker?.getRegistration().then((r) => r?.update()).catch(() => {});
      const yayinda = await yayindakiPaket();
      if (yayinda && yayinda !== benim) {
        if (uzunAra) location.reload();
        else dugmeGoster();
      }
    } finally { bakiyor = false; }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { gizlendi = Date.now(); return; }
    denetle(gizlendi > 0 && Date.now() - gizlendi >= UZUN_ARA_MS);
  });
  window.addEventListener('pageshow', (e) => { if ((e as PageTransitionEvent).persisted) denetle(true); });
  setInterval(() => { if (document.visibilityState === 'visible') denetle(false); }, 30 * 60_000);
}
