export type QrCard = { shop: string; label: string; url: string; qrDataUrl: string };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Printable A4 page: one card per table (shop, table label, QR image, link). Pure function, no I/O. */
export function renderQrSheet(cards: QrCard[]): string {
  const body = cards.length === 0
    ? "<p>No tables found. Run the seed first.</p>"
    : cards.map((c) => `<div class="card">
  <div class="shop">${esc(c.shop)}</div>
  <img src="${c.qrDataUrl}" alt="QR code for table ${esc(c.label)}" width="260" height="260">
  <div class="label">Table ${esc(c.label)}</div>
  <div class="hint">Scan to order</div>
  <div class="url">${esc(c.url)}</div>
</div>`).join("\n");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Table QR codes</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 16px; }
  .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
  .card { border: 2px solid #0B7A46; border-radius: 12px; padding: 16px; text-align: center; break-inside: avoid; }
  .shop { font-size: 20px; font-weight: 700; color: #0B7A46; }
  .label { font-size: 28px; font-weight: 700; margin-top: 4px; }
  .hint { font-size: 16px; color: #333; }
  .url { font-size: 10px; color: #666; word-break: break-all; margin-top: 6px; }
  @page { size: A4; margin: 12mm; }
  @media print { body { margin: 0; } .grid { gap: 10mm; } }
</style></head>
<body><h1>Table QR codes</h1><div class="grid">
${body}
</div></body></html>
`;
}
