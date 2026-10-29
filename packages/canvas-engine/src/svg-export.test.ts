import { describe, expect, it } from "vitest";
import { DesignDoc } from "@canvylo/design-core";
import { exportSvg } from "./svg-export";

const solid = (color: string, opacity = 1) => [{ type: "SOLID" as const, color, opacity }];

function setup() {
  const doc = new DesignDoc();
  const page = doc.pages()[0]!.id;
  const frame = doc.createNode("FRAME", { parentId: page, props: { name: "Card", x: 100, y: 50, width: 200, height: 120, fills: solid("#ffffff") } });
  const rect = doc.createNode("RECTANGLE", {
    parentId: frame,
    props: { name: "Btn", x: 10, y: 20, width: 80, height: 40, cornerRadius: 8, fills: solid("#0d99ff"), strokes: solid("#000000"), strokeWidth: 2 },
  });
  const text = doc.createNode("TEXT", { parentId: frame, props: { name: "T", characters: 'Tom & "Jerry" <3', x: 5, y: 80, width: 100, fontSize: 16, fontWeight: 600, fills: solid("#111111") } });
  return { doc, page, frame, rect, text };
}

describe("exportSvg", () => {
  it("crops to the layer and sizes the svg to it", () => {
    const { doc, frame } = setup();
    const out = exportSvg(doc, [frame])!;
    expect(out.width).toBe(200);
    expect(out.height).toBe(120);
    expect(out.svg).toContain('width="200"');
    expect(out.svg).toContain('viewBox="0 0 200 120"');
    expect(out.svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it("draws fill, stroke and radius", () => {
    const { doc, rect } = setup();
    const out = exportSvg(doc, [rect])!;
    expect(out.svg).toContain('fill="#0d99ff"');
    expect(out.svg).toContain('stroke="#000000"');
    expect(out.svg).toContain('stroke-width="2"');
    expect(out.svg).toContain('rx="8"');
    expect(out.width).toBe(80);
  });

  it("escapes text and keeps typography", () => {
    const { doc, text } = setup();
    const { svg } = exportSvg(doc, [text])!;
    expect(svg).toContain("Tom &amp; &quot;Jerry&quot; &lt;3");
    expect(svg).toContain('font-size="16"');
    expect(svg).toContain('font-weight="600"');
  });

  it("clips frame content and nests children once", () => {
    const { doc, frame, rect } = setup();
    const { svg } = exportSvg(doc, [frame, rect])!; // rect is inside frame: drawn once
    expect(svg).toContain("<clipPath");
    expect(svg.match(/rx="8"/g)).toHaveLength(1);
  });

  it("unions several layers and skips hidden ones", () => {
    const { doc, rect, text } = setup();
    const both = exportSvg(doc, [rect, text])!;
    expect(both.width).toBeGreaterThan(80);
    doc.setStyle(text, { visible: false });
    const onlyRect = exportSvg(doc, [rect, text])!;
    expect(onlyRect.width).toBe(80);
    expect(onlyRect.svg).not.toContain("Jerry");
  });

  it("returns null when nothing can be exported", () => {
    const { doc, page } = setup();
    expect(exportSvg(doc, [])).toBeNull();
    expect(exportSvg(doc, [page])).toBeNull();
  });
});
