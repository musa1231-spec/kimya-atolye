import { store } from "../state";
import { clearDenetim } from "../db";
import { $, val, setHTML } from "../helpers";

export function rAudit(): void {
  const ara = (val("audit-ara") || "").toLowerCase();
  const kim = val("audit-kim") || "";
  const sel = $("audit-kim") as HTMLSelectElement;
  sel.innerHTML = `<option value="">Tüm kullanıcılar</option>` + store.ogretmenler.map((o) => `<option value="${o.id}" ${String(o.id) == kim ? "selected" : ""}>${o.ad}</option>`).join("");
  sel.value = kim;
  let list = store.denetim;
  if (kim) list = list.filter((a) => String(a.kimId) == kim);
  if (ara) list = list.filter((a) => (a.kim + a.eylem + a.detay).toLowerCase().includes(ara));
  setHTML("audit-list", list.slice(0, 200).map((a) => {
    const d = new Date(a.zaman);
    return `<div class="audit-row">
      <div class="audit-who">${a.kim}</div>
      <div class="audit-when">${d.toLocaleDateString("tr-TR")}<br>${d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</div>
      <div><span class="ba bgr" style="margin-right:5px">${a.eylem}</span>${a.detay}</div>
    </div>`;
  }).join("") || '<div class="tm" style="text-align:center;padding:20px">Kayıt yok</div>');
}

export async function clearAudit(): Promise<void> {
  if (!confirm("Tüm denetim kayıtları silinsin mi?")) return;
  await clearDenetim();
  store.denetim = [];
  rAudit();
}
