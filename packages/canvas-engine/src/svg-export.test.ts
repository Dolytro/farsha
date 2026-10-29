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
    expect(out.svg).toContain('stroke-width="4"'); // inside stroke: double width, clipped to the shape
    expect(out.svg).toContain('clip-path="url(#sc-');
    expect(out.svg).toContain('rx="8"');
    expect(out.width).toBe(80);
  });

  it("draws centre and outside strokes", () => {
    const { doc, rect } = setup();
    doc.setStyle(rect, { strokeAlign: "CENTER" });
    expect(exportSvg(doc, [rect])!.svg).toContain('stroke-width="2"');
    doc.setStyle(rect, { strokeAlign: "OUTSIDE" });
    const { svg } = exportSvg(doc, [rect])!;
    expect(svg).toContain("<mask");
    expect(svg).toContain('stroke-width="4"');
  });

  it("draws linear and radial gradient fills", () => {
    const { doc, rect } = setup();
    const stops = [
      { position: 1, color: "#0000ff", opacity: 1 },
      { position: 0, color: "#ff0000", opacity: 0.5 },
    ];
    doc.setStyle(rect, { fills: [{ type: "GRADIENT_LINEAR", angle: 90, opacity: 1, stops }] });
    const { svg } = exportSvg(doc, [rect])!;
    expect(svg).toContain("<linearGradient");
    expect(svg).toContain('x1="0.5" y1="0" x2="0.5" y2="1"');
    expect(svg).toMatch(/fill="url\(#gf-/);
    expect(svg.indexOf('stop-color="#ff0000"')).toBeLessThan(svg.indexOf('stop-color="#0000ff"')); // sorted by position
    doc.setStyle(rect, { fills: [{ type: "GRADIENT_RADIAL", angle: 0, opacity: 1, stops: [{ position: 0, color: "x\" onload=\"y", opacity: 1 }, stops[0]!] }] });
    const radial = exportSvg(doc, [rect])!.svg;
    expect(radial).toContain("<radialGradient");
    expect(radial).not.toContain("onload");
  });

  it("adds a filter for shadows and blur and ignores hidden or malformed effects", () => {
    const { doc, rect } = setup();
    doc.setStyle(rect, {
      effects: [
        { type: "DROP_SHADOW", x: 0, y: 4, blur: 8, color: "#000000", opacity: 0.25, visible: true },
        { type: "INNER_SHADOW", x: 1, y: 2, blur: 4, color: "red\" onload=\"x", opacity: 1, visible: true },
        { type: "LAYER_BLUR", radius: 10, visible: false },
      ],
    });
    const { svg } = exportSvg(doc, [rect])!;
    expect(svg).toContain("<filter");
    expect(svg).toContain('filter="url(#fx-');
    expect(svg).toContain('dy="4"');
    expect(svg).toContain('stdDeviation="4"');
    expect(svg).not.toContain("onload");
    expect(svg).not.toContain('stdDeviation="5"'); // hidden blur is skipped
  });

  it("escapes text and keeps typography", () => {
    const { doc, text } = setup();
    const { svg } = exportSvg(doc, [text])!;
    expect(svg).toContain("Tom &amp; &quot;Jerry&quot; &lt;3");
    expect(svg).toContain('font-size="16"');
    expect(svg).toContain('font-weight="600"');
  });

  it("exports letter spacing, centred baseline for a fixed line height and alignment", () => {
    const { doc, text } = setup();
    doc.setText(text, { letterSpacing: 2, lineHeight: 40, textAlign: "CENTER" });
    const { svg } = exportSvg(doc, [text])!;
    expect(svg).toContain('letter-spacing="2"');
    expect(svg).toContain('text-anchor="middle"');
    expect(svg).toContain('y="26.4"'); // 16 + (40 - 19.2) / 2
    doc.setText(text, { letterSpacing: 0, lineHeight: "AUTO" });
    const auto = exportSvg(doc, [text])!.svg;
    expect(auto).not.toContain("letter-spacing");
    expect(auto).toContain('y="16"');
  });

  it("clips frame content and nests children once", () => {
    const { doc, frame, rect } = setup();
    const { svg } = exportSvg(doc, [frame, rect])!; // rect is inside frame: drawn once
    expect(svg).toContain("<clipPath");
    expect(svg.match(/fill="#0d99ff"/g)).toHaveLength(1);
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

  it("embeds image layers as data urls and refuses other asset types", () => {
    const { doc, frame } = setup();
    const png = doc.addAsset("image/png", Uint8Array.from([137, 80, 78, 71]));
    const img = doc.createNode("IMAGE", { parentId: frame, props: { name: "Pic", x: 0, y: 0, width: 40, height: 30, cornerRadius: 4, assetId: png } });
    const { svg } = exportSvg(doc, [img])!;
    expect(svg).toContain(`href="data:image/png;base64,${btoa(String.fromCharCode(137, 80, 78, 71))}"`);
    expect(svg).toContain('rx="4"');

    const evil = doc.addAsset("text/html", Uint8Array.from([60, 98, 62]));
    const bad = doc.createNode("IMAGE", { parentId: frame, props: { name: "Bad", width: 10, height: 10, assetId: evil } });
    expect(exportSvg(doc, [bad])!.svg).not.toContain("data:text/html");
    expect(exportSvg(doc, [bad])!.svg).toContain("#e5e5e5");
  });

  it("returns null when nothing can be exported", () => {
    const { doc, page } = setup();
    expect(exportSvg(doc, [])).toBeNull();
    expect(exportSvg(doc, [page])).toBeNull();
  });
});
