// Bağımlılıksız, hafif SVG grafikler.

export const PALET = ["#1565C0", "#00C853", "#FF5252", "#2196F3", "#FF9800", "#9C27B0", "#00BCD4", "#8BC34A", "#E91E63", "#795548"];

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ── Çubuk grafik ──────────────────────────────────────────────
export function barChart(data: { label: string; value: number }[], birim = ""): string {
  const W = 380, H = 190, pad = { t: 20, r: 10, b: 26, l: 10 };
  const n = data.length || 1;
  const max = Math.max(1, ...data.map((d) => d.value));
  const bw = (W - pad.l - pad.r) / n;
  const base = H - pad.b;
  const bars = data.map((d, i) => {
    const x = pad.l + i * bw + bw * 0.16;
    const w = bw * 0.68;
    const h = (d.value / max) * (base - pad.t);
    const y = base - h;
    const renk = d.value > 0 ? "#1565C0" : "#c8dbff";
    const deger = d.value > 0 ? `<text x="${x + w / 2}" y="${y - 4}" text-anchor="middle" font-size="9" fill="#5a6f99" font-family="monospace">${kisaSayi(d.value)}</text>` : "";
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${Math.max(0, h).toFixed(1)}" rx="2" fill="${renk}"/>
      ${deger}
      <text x="${(x + w / 2).toFixed(1)}" y="${H - 8}" text-anchor="middle" font-size="9" fill="#7a8db5">${esc(d.label)}</text>`;
  }).join("");
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto" role="img">
    <line x1="${pad.l}" y1="${base}" x2="${W - pad.r}" y2="${base}" stroke="#c8dbff" stroke-width="1"/>
    ${bars}
    ${birim ? `<text x="${pad.l}" y="12" font-size="9" fill="#7a8db5">${esc(birim)}</text>` : ""}
  </svg>`;
}

// ── Halka (donut) grafik + lejant ─────────────────────────────
export function donutChart(data: { label: string; value: number; color?: string }[]): string {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total <= 0) return '<div class="tm" style="text-align:center;padding:30px">Veri yok</div>';
  const cx = 80, cy = 80, r = 58, sw = 26, C = 2 * Math.PI * r;
  let off = 0;
  const arclar = data.map((d, i) => {
    const renk = d.color || PALET[i % PALET.length];
    const dash = (d.value / total) * C;
    const seg = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${renk}" stroke-width="${sw}"
      stroke-dasharray="${dash.toFixed(2)} ${(C - dash).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}"/>`;
    off += dash;
    return seg;
  }).join("");
  const lejant = data.map((d, i) => {
    const renk = d.color || PALET[i % PALET.length];
    const pct = ((d.value / total) * 100).toFixed(0);
    return `<div style="display:flex;align-items:center;gap:6px;font-size:.72rem;padding:2px 0">
      <span style="width:10px;height:10px;border-radius:2px;background:${renk};flex-shrink:0"></span>
      <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(d.label)}</span>
      <span class="mo2" style="color:var(--mut)">%${pct}</span>
    </div>`;
  }).join("");
  return `<div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">
    <svg viewBox="0 0 160 160" style="width:150px;height:150px;flex-shrink:0" role="img">
      <g transform="rotate(-90 ${cx} ${cy})">${arclar}</g>
      <text x="${cx}" y="${cy - 2}" text-anchor="middle" font-size="22" font-weight="800" fill="#0d1b3e" font-family="monospace">${kisaSayi(total)}</text>
      <text x="${cx}" y="${cy + 16}" text-anchor="middle" font-size="9" fill="#7a8db5">TOPLAM</text>
    </svg>
    <div style="flex:1;min-width:140px">${lejant}</div>
  </div>`;
}

function kisaSayi(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "B";
  return String(Math.round(n));
}
