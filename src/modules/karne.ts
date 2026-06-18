import { store } from "../state";
import { ATOLYE_BILGI } from "../constants";
import { fmt, today, urunAd, val, setHTML, setText } from "../helpers";

interface KarneVeri {
  id: number; ad: string; sn: string;
  gun: number; kg: number; urunler: string[]; sonTarih: string;
  rozetler: { ad: string; ico: string }[];
}

function rozetler(gun: number, cesit: number, kg: number): { ad: string; ico: string }[] {
  const r: { ad: string; ico: string }[] = [];
  if (gun >= 1) r.push({ ico: "🥉", ad: "Başladı" });
  if (gun >= 5) r.push({ ico: "🥈", ad: "Deneyimli" });
  if (gun >= 10) r.push({ ico: "🥇", ad: "Usta Üretici" });
  if (gun >= 20) r.push({ ico: "🏆", ad: "Atölye Şefi" });
  if (cesit >= 3) r.push({ ico: "🎨", ad: "Çok Yönlü" });
  if (cesit >= 6) r.push({ ico: "🌟", ad: "Uzman" });
  if (kg >= 5000) r.push({ ico: "🏭", ad: "5 Ton Kulübü" });
  return r;
}

function hesapla(): KarneVeri[] {
  return store.ogrenciler.map((o) => {
    const gunler = store.uretimGunleri.filter((g) => (g.ogrenciler || []).includes(o.id));
    const urunSet = new Set<string>();
    let kg = 0; let sonTarih = "";
    for (const g of gunler) {
      for (const k of g.kalemler) { urunSet.add(k.urunId); kg += k.kg; }
      if (g.tarih > sonTarih) sonTarih = g.tarih;
    }
    const urunler = [...urunSet];
    return { id: o.id, ad: o.ad, sn: o.sn, gun: gunler.length, kg, urunler, sonTarih, rozetler: rozetler(gunler.length, urunler.length, kg) };
  }).sort((a, b) => b.gun - a.gun || b.kg - a.kg);
}

export function rKarne(): void {
  const q = (val("kr-ara") || "").toLocaleLowerCase("tr");
  let list = hesapla();
  if (q) list = list.filter((k) => k.ad.toLocaleLowerCase("tr").includes(q));
  const aktif = list.filter((k) => k.gun > 0).length;
  setText("kr-ozet", `${list.length} öğrenci · ${aktif} üretime katıldı`);

  if (!list.length) { setHTML("kr-list", '<div class="tm" style="text-align:center;padding:25px">Öğrenci bulunamadı.</div>'); return; }
  setHTML("kr-list", `<div class="kr-grid">${list.map((k) => `
    <div class="kr-card ${k.gun === 0 ? "pasif" : ""}">
      <div class="kr-hd">
        <div class="kr-av">${k.ad.charAt(0)}</div>
        <div class="kr-ad"><b>${k.ad}</b>${k.sn ? `<span class="kr-sn">${k.sn}</span>` : ""}</div>
      </div>
      <div class="kr-ist">🏭 ${k.gun} gün · 🧪 ${k.urunler.length} ürün · ⚖️ ${k.kg.toLocaleString("tr-TR")} kg</div>
      <div class="kr-rz">${k.rozetler.length ? k.rozetler.map((r) => `<span class="kr-rozet" title="${r.ad}">${r.ico} ${r.ad}</span>`).join("") : '<span class="tm">Henüz rozet yok</span>'}</div>
      <button class="btn bg bsm" style="width:100%;margin-top:8px" onclick="yazdirKarne(${k.id})" ${k.gun === 0 ? "disabled" : ""}>📜 Beceri Belgesi</button>
    </div>`).join("")}</div>`);
}

export function yazdirKarne(id: number): void {
  const k = hesapla().find((x) => x.id === id);
  if (!k) return;
  const urunListe = k.urunler.map((u) => urunAd(u)).sort();
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<html><head><title>Beceri Belgesi — ${k.ad}</title><meta charset="utf-8"><style>
    body{font-family:Georgia,serif;padding:40px;color:#222}
    .belge{border:6px double #1565C0;border-radius:14px;padding:34px 40px;max-width:720px;margin:auto;text-align:center}
    .ust{font-size:12px;color:#666;letter-spacing:1px;text-transform:uppercase}
    h1{color:#1565C0;font-size:26px;margin:14px 0 4px}
    .ad{font-size:30px;font-weight:bold;margin:18px 0 4px;color:#0d1b3e}
    .sn{color:#666;font-size:14px;margin-bottom:18px}
    .metin{font-size:14px;line-height:1.7;margin:14px 0}
    .ist{display:flex;justify-content:center;gap:26px;margin:18px 0;font-size:15px}
    .ist b{color:#1565C0;font-size:20px;display:block}
    .rz{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:16px 0}
    .rz span{background:#e8f0fe;border:1px solid #1565C0;border-radius:18px;padding:6px 13px;font-size:13px;font-weight:bold;color:#1565C0}
    .urunler{font-size:12.5px;color:#444;margin-top:12px;line-height:1.6}
    .imza{display:flex;justify-content:space-between;margin-top:40px;font-size:12px;color:#444}
    .imza div{border-top:1px solid #999;padding-top:6px;width:200px}
  </style></head><body><div class="belge">
    <div class="ust">${ATOLYE_BILGI.ad}</div>
    <h1>🏅 BECERİ BELGESİ</h1>
    <div class="metin">Aşağıda adı yazılı öğrencimiz, kimya üretim atölyesinde temizlik ve kozmetik ürünleri üretiminde aktif görev almış ve aşağıdaki becerileri kazanmıştır.</div>
    <div class="ad">${k.ad}</div>
    <div class="sn">${k.sn || ""}</div>
    <div class="ist">
      <div>Üretim Günü<b>${k.gun}</b></div>
      <div>Ürün Çeşidi<b>${k.urunler.length}</b></div>
      <div>Toplam Üretim<b>${k.kg.toLocaleString("tr-TR")} kg</b></div>
    </div>
    <div class="rz">${k.rozetler.map((r) => `<span>${r.ico} ${r.ad}</span>`).join("")}</div>
    ${urunListe.length ? `<div class="urunler"><b>Üretmeyi öğrendiği ürünler:</b> ${urunListe.join(", ")}</div>` : ""}
    <div class="imza"><div>Atölye Öğretmeni</div><div>Okul Müdürü</div></div>
    <div style="margin-top:18px;font-size:11px;color:#888">Belge tarihi: ${fmt(today())}${k.sonTarih ? ` · Son üretim: ${fmt(k.sonTarih)}` : ""}</div>
  </div><script>window.onload=()=>window.print()</script></body></html>`);
  w.document.close();
}
