# Kimya Üretim Atölyesi Yönetim Programı (v6)

Tek dosyalık HTML uygulamasının **Vite + TypeScript + Supabase** mimarisine taşınmış hâli.

## Çalıştırma

```bash
npm install        # bağımlılıklar (bir kez)
npm run dev        # geliştirme sunucusu → http://localhost:5173
npm run build      # production derleme → dist/
npm run preview    # dist/ önizleme
```

> `.env` dosyasında `VITE_SUPABASE_URL` ve `VITE_SUPABASE_ANON_KEY` tanımlıdır.
> Başka bir Supabase projesine geçerken `.env`'i güncelleyin ve `supabase/schema.sql`'i
> o projede çalıştırın.

## Giriş

Öğretmen seç + şifre. Tohum şifreler: `musa123`, `suleyman123`, `dogan123`,
`mustafa123`, `vedat123`, `senem123` (Öğretmenler sayfasından değiştirilebilir).

## Mimari

- **Veri:** Supabase'de 15 normalize tablo. Her kayıt kendi satırında → eşzamanlı
  kullanımda veri kaybı yok (eski sürümdeki tek-JSON-blob sorunu çözüldü).
  Alt kalemler (sipariş/üretim kalemleri, personel listeleri) ilgili satırda `jsonb`.
- **Kod:** `src/` altında modüller. Ürün reçeteleri ve ham madde fiyatları
  `src/constants.ts` içinde sabit referans verisi.
- **Şema:** `supabase/schema.sql` (tablolar + RLS politikaları).

```
src/
  main.ts        yönlendirme, modal, başlatma, global handler bağlama
  db.ts          tüm tablolar: yükleme, tohumlama, CRUD, yedekten geri yükleme
  types.ts       tip tanımları
  constants.ts   ürün/ham madde/tohum verileri
  supabase.ts    .env'den client
  state.ts       bellek içi önbellek (store) + oturum (CU)
  helpers.ts     DOM, biçim, ad aramaları, toast, onay
  audit.ts       denetim kaydı
  login.ts       giriş/çıkış
  modules/       dashboard, uretim, siparisler, sevkiyat, musteriler,
                 stok, esans, personel, formulasyon, maliyet, aylik,
                 denetim, yedek
```

## Yedekleme

- **Şimdi Yedekle:** tüm veriyi JSON olarak indirir.
- **Yedeği Yükle:** JSON'dan tüm tabloları siler ve yeniden kurar (ID'ler yeniden
  eşlenir; ilişkiler korunur).

## Güvenlik notu

Basit giriş (öğretmen + şifre) korunduğu için RLS politikaları anon anahtara tam
erişim verir — güvenlik modeli eski sürümle aynıdır. İleride çok kullanıcılı/güvenli
yetkilendirme istenirse Supabase Auth'a geçilip politikalar daraltılmalıdır.
