import { describe, it, expect } from "vitest";
import { renderQrSheet } from "../../src/domain/qrSheet";

const card = (over = {}) => ({ shop: "Slow Express", label: "SE-1", url: "http://localhost:5173/t/abc123", qrDataUrl: "data:image/png;base64,AAAA", ...over });

describe("QR sheet (issue 1.4)", () => {
  it("TEST-32: one printable card per table with shop, label, link and QR image", () => {
    const html = renderQrSheet([card(), card({ label: "SE-2", url: "http://localhost:5173/t/def456" })]);
    expect(html.match(/class="card"/g)?.length).toBe(2);
    expect(html).toContain("Slow Express");
    expect(html).toContain("SE-1");
    expect(html).toContain("SE-2");
    expect(html).toContain("http://localhost:5173/t/abc123");
    expect(html).toContain('<img src="data:image/png;base64,AAAA"');
  });
  it("is print-friendly: A4 page, cards never split across pages", () => {
    const html = renderQrSheet([card()]);
    expect(html).toContain("@media print");
    expect(html).toContain("@page { size: A4");
    expect(html).toContain("break-inside: avoid");
  });
  it("escapes HTML in shop and table names", () => {
    const html = renderQrSheet([card({ shop: "<script>alert(1)</script>", label: 'A"B' })]);
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("A&quot;B");
  });
  it("shows a clear message when there are no tables", () => {
    expect(renderQrSheet([])).toContain("No tables");
  });
});
