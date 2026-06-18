import { store, session } from "./state";
import { insertDenetim, setOgretmenSayac } from "./db";

// Denetim kaydı ekler. DB'ye yazma fire-and-forget; UI anında güncellenir.
export function audit(eylem: string, detay: string): void {
  const CU = session.CU;
  if (!CU) return;
  CU.islem = (CU.islem || 0) + 1;
  insertDenetim({ kim: CU.ad, kimId: CU.id, eylem, detay })
    .then((rec) => {
      store.denetim.unshift(rec);
      if (store.denetim.length > 2000) store.denetim = store.denetim.slice(0, 2000);
    })
    .catch(() => {});
  setOgretmenSayac(CU.id, CU.gun, CU.islem).catch(() => {});
}
