## ▶️ BURADAN DEVAM
**Son durum:** 17 Kas 2026 — Atölye Düzeni (kurallar PDF + WhatsApp) ve katı sabun Asistanı (tüp + kap, sıcak proses, kaynatma/tuzlama, otomatik kap, doğrulanmış reçeteler) canlıda (d49b86f), 29 test geçiyor.
**Sıradaki iş:** Musa Hocam `supabase/atolye_planlari.sql`i Supabase SQL Editor'de çalıştırsın (ortak günün planı tablosu yok, plan şimdilik cihazda) → sonra cihazlar arası planı dene.
**Bekleyen karar:** Sıcak proseste kap doluluğu %50 varsayımı (kabartmada taşma payı) — Musa Hocam daha dolu kabartıyorsa oran söylenecek.

---

### Künye
- Canlı: https://musa1231-spec.github.io/kimya-atolye/ (GitHub Pages, push → Actions otomatik)
- Push yalnız musa1231-spec jetonuyla; commit yazarı Musa Karabiber (623 adresi).
- ⛔ Commit'e GİRMEZ: `yedek/` (öğrenci verisi, depo herkese açık) ve rafta bekleyen sınıf/sezon işi (index.html, db.ts, karne.ts, personel.ts, uretim.ts farkları + sezon.ts, sinif.ts). `git add -A` YOK.
- index.html'de kısmi commit: yalnız kendi hunk'ların; push ETMEDEN `git checkout-index -a --prefix=<scratch>/sahne/` ile staged ağaçta `tsc` + `node scripts/rehber-kontrol.mjs` (K112). Push sonrası `gh run list`.
- Testler: `npm run build` = tsc + `scripts/rehber-kontrol.mjs`. `KURAL_METNI_YAZ=<yol>` WhatsApp metnini yazar.

### 17 Kas 2026'da yapılanlar
- **Atölye Düzeni** (`src/atolyeDuzen.ts` tek kaynak, `src/modules/duzen.ts`): 4 kazan (K1–K2 alçak, K3–K4 yüksek, 900 kg), altın kural, kurallar PDF + WhatsApp, imza "Kimya Zümre Öğretmenleri", ağır iş adaleti (taşıyıcı adları basılmaz). Asistan'da kazan seçimi + her eklemede öğretmen onayı ENGELİ.
- Kurallara eklenenler: saf su dinamosu + hortum sifonlama, klor–asit "eklenmez", dolum sade, gözlük ihtiyaç hâlinde, 3 eldiven, telefon şeflik odasına, görevsiz giremez, soyunma odası, **şeflik odası kuralı**, değerlendirme 2 madde.
- **Katı sabun** (`src/katiSabun.ts` tek kaynak): 900 kg kazanda yapılmaz → tüpte kap; kap miktara göre OTOMATİK önerilir (elle girilen korunur); üretim TEK PARTİ (bölme yok, sığmazsa engel); kostik suya TEK SEFERDE; atölye yöntemi = SICAK PROSES (ısınan yağa yavaşça, tüpte 2 kez kabartma), yalnız Kastilya-soğuk pişirilmez; tahta karıştırıcı/kalıp/düzleştirici + mala adımları, kalıp kalınlığı ve kesim çizgileri hesaplı.
- Yeni ürün **zy-kaynatma** (kaynatma + tuzlama, dip yağı için) + Rehber Yöntem 6; Yöntem 7 yeniden eritme.
- **Formülasyon doğrulaması** (30+ kaynak; resmî: TÜRKPATENT 219 Hatay Defne Sabunu 16.10.2017, MEB MEGEP Sabun Analizleri 2012): SAP ZY 0,1353 · defne 0,1426; Halep + Kastilya-soğuk suyu 1 kg yağa **300 g**, kostik ≈129 g (%5–8 süperyağ). Halep'te resmî ölçütler (serbest alkali ≤%0,2, nem ≤%29).
- Sürüm denetimi açılışta da çalışıyor (K113): eski ekran kalmasın.

### Eksikler / sonraki adaylar
- `atolye_planlari` tablosu Supabase'de yok (SQL dosyası hazır; MCP/CLI yazma izni verilmedi).
- Lab Programı'ndaki aynı `surumDenetle` modülüne açılış denetimi (K113) uygulanmadı.
- Rehber'in katı sabun sekmesi index.html'de elle duruyor (yüzdeler testle reçeteye bağlı).

### Musa Hocam'dan alınacak bilgiler
- Tahta kalıp iç ölçüsü (varsayılan 30×40 cm), kalıp sabun ağırlığı (125 g), elindeki kap boyları (5/8/10/15/20/25/30/40/50 varsayıldı).
