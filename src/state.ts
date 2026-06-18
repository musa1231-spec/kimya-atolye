import type { Store, Ogretmen } from "./types";

// Bellek içi önbellek — DB'nin aynası. Tüm tablolar girişte yüklenir,
// her değişiklik önce DB'ye yazılır sonra burada güncellenip ekran
// yeniden çizilir. (Eski "D" nesnesinin yerine geçer.)
export const store: Store = {
  uretimGunleri: [],
  siparisler: [],
  sevkiyatlar: [],
  musteriler: [],
  ogretmenler: [],
  ogrenciler: [],
  urunStok: {},
  hmStok: {},
  bidon: { b1: 0, b5: 0, b20: 0 },
  koliStok: 0,
  esanslar: [],
  eslestirmeler: {},
  bidonH: [],
  koliH: [],
  esansH: [],
  denetim: [],
  belgeler: [],
  satisFiyat: {},
  alisFaturalari: [],
  irsaliyeler: [],
  kaliteKayitlari: [],
  partiler: [],
};

// Giriş yapan kullanıcı (Current User)
export const session: { CU: Ogretmen | null } = { CU: null };
