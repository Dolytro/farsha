import { describe, expect, it } from "vitest";
import { DesignDoc } from "@canvylo/design-core";
import { exportSvg } from "./svg-export";
import { shapeMarkup } from "./appearance";

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

  it("exports blend modes and ignores unknown ones", () => {
    const { doc, rect } = setup();
    doc.setStyle(rect, { blendMode: "SOFT_LIGHT" });
    expect(exportSvg(doc, [rect])!.svg).toContain('style="mix-blend-mode:soft-light"');
    doc.setStyle(rect, { blendMode: "x;color:red" as never });
    expect(exportSvg(doc, [rect])!.svg).not.toContain("mix-blend-mode");
  });

  it("draws image fills as patterns with data urls and refuses other asset types", () => {
    const { doc, rect } = setup();
    const png = doc.addAsset("image/png", Uint8Array.from([137, 80, 78, 71]));
    doc.setStyle(rect, { fills: [{ type: "IMAGE", assetId: png, scaleMode: "FIT", opacity: 1 }] });
    const { svg } = exportSvg(doc, [rect])!;
    expect(svg).toContain("<pattern");
    expect(svg).toContain('href="data:image/png;base64,');
    expect(svg).toContain('preserveAspectRatio="xMidYMid meet"');
    const evil = doc.addAsset("text/html", Uint8Array.from([60, 98, 62]));
    doc.setStyle(rect, { fills: [{ type: "IMAGE", assetId: evil, scaleMode: "FILL", opacity: 1 }] });
    const bad = exportSvg(doc, [rect])!.svg;
    expect(bad).not.toContain("data:text/html");
    expect(bad).toContain('fill="#e5e5e5"');
  });

  it("draws independent corner radii as a path and clamps them", () => {
    const { doc, rect } = setup(); // 80 x 40
    doc.setStyle(rect, { cornerRadii: [4, 0, 8, 100] });
    const { svg } = exportSvg(doc, [rect])!;
    expect(svg).toContain("<path d=\"M4 0H80A0 0 0 0 1 80 0V32A8 8 0 0 1 72 40H20A20 20 0 0 1 0 20V4A4 4 0 0 1 4 0Z\"");
    doc.setStyle(rect, { cornerRadii: [6, 6, 6, 6] });
    expect(exportSvg(doc, [rect])!.svg).toContain('rx="6"');
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

  it("exports multi-line and wrapped text as one tspan per line", () => {
    const { doc, text } = setup();
    doc.setText(text, { characters: "one\ntwo", lineHeight: 20 });
    const hard = exportSvg(doc, [text])!.svg;
    expect(hard.match(/<tspan/g)).toHaveLength(2);
    expect(hard).toContain('dy="20"');
    doc.setText(text, { characters: "aaaa bbbb cccc dddd", textAutoResize: "HEIGHT", fontSize: 10, lineHeight: "AUTO" });
    doc.resizeNode(text, { width: 60 }); // ~10 chars per line with the estimate
    expect(exportSvg(doc, [text], { measure: (s) => s.length * 5.6 })!.svg.match(/<tspan/g)).toHaveLength(2);
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

describe("multiple fills", () => {
  it("draws every fill, bottom first", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const id = doc.createNode("RECTANGLE", { parentId: page, props: { fills: [...solid("#ff0000"), ...solid("#0000ff", 0.5)] } });
    const svg = exportSvg(doc, [id])?.svg ?? "";
    expect(svg.indexOf('fill="#ff0000"')).toBeGreaterThan(-1);
    expect(svg.indexOf('fill="#0000ff"')).toBeGreaterThan(svg.indexOf('fill="#ff0000"'));
  });
});

describe("masks", () => {
  it("does not draw the mask layer and clips the layers above it", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const frame = doc.createNode("FRAME", { parentId: page, props: { width: 100, height: 100 } });
    const mask = doc.createNode("ELLIPSE", { parentId: frame, props: { width: 50, height: 50, fills: solid("#ff0000"), isMask: true } });
    doc.createNode("RECTANGLE", { parentId: frame, props: { width: 100, height: 100, fills: solid("#00ff00") } });
    const svg = exportSvg(doc, [frame])?.svg ?? "";
    expect(svg).toContain(`<mask id="mask-${mask}"`);
    expect(svg).toContain(`mask="url(#mask-${mask})"`);
    expect(svg).not.toContain("#ff0000");
    expect(svg).toContain("#00ff00");
  });

  it("leaves layers below the mask alone", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const frame = doc.createNode("FRAME", { parentId: page, props: { width: 100, height: 100 } });
    doc.createNode("RECTANGLE", { parentId: frame, props: { fills: solid("#0000ff") } });
    doc.createNode("ELLIPSE", { parentId: frame, props: { isMask: true } });
    const svg = exportSvg(doc, [frame])?.svg ?? "";
    const maskAt = svg.indexOf("<mask");
    expect(svg.indexOf("#0000ff")).toBeLessThan(maskAt);
  });
});

describe("multiple strokes", () => {
  it("draws every stroke, bottom first, sharing one clip for inside strokes", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const id = doc.createNode("RECTANGLE", { parentId: page, props: { fills: [], strokes: [...solid("#ff0000"), ...solid("#0000ff")], strokeWidth: 4, strokeAlign: "INSIDE" } });
    const svg = exportSvg(doc, [id])?.svg ?? "";
    expect(svg.match(/<clipPath/g)).toHaveLength(1);
    expect(svg.match(/stroke="#/g)).toHaveLength(2);
    expect(svg.indexOf('stroke="#ff0000"')).toBeLessThan(svg.indexOf('stroke="#0000ff"'));
  });

  it("still draws a single centered stroke", () => {
    const doc = new DesignDoc();
    const id = doc.createNode("RECTANGLE", { parentId: doc.pages()[0]!.id, props: { fills: [], strokes: solid("#00ff00"), strokeWidth: 2, strokeAlign: "CENTER" } });
    const svg = exportSvg(doc, [id])?.svg ?? "";
    expect(svg).toContain('stroke="#00ff00"');
    expect(svg).toContain('stroke-width="2"');
  });
});

describe("advanced strokes", () => {
  const rect = (props: Record<string, unknown>) => {
    const doc = new DesignDoc();
    const id = doc.createNode("RECTANGLE", { parentId: doc.pages()[0]!.id, props: { fills: [], strokes: solid("#123456"), strokeWidth: 2, strokeAlign: "CENTER", ...props } });
    return exportSvg(doc, [id])?.svg ?? "";
  };

  it("draws dashes, caps and joins", () => {
    const svg = rect({ strokeDash: [6, 3], strokeCap: "ROUND", strokeJoin: "BEVEL" });
    expect(svg).toContain('stroke-dasharray="6 3"');
    expect(svg).toContain('stroke-linecap="round"');
    expect(svg).toContain('stroke-linejoin="bevel"');
  });

  it("leaves a plain stroke plain", () => {
    const svg = rect({});
    expect(svg).not.toContain("stroke-dasharray");
    expect(svg).not.toContain("stroke-linecap");
    expect(svg).not.toContain("stroke-linejoin");
  });

  it("ignores unsafe values from a shared file", () => {
    const svg = rect({ strokeDash: [-5, "x", 99999, 4], strokeCap: "evil\"/><script>", strokeJoin: 7 });
    expect(svg).toContain('stroke-dasharray="4"');
    expect(svg).not.toContain("script");
  });

  it("gives a vector arrowheads through markers", () => {
    const doc = new DesignDoc();
    const id = doc.createNode("VECTOR", {
      parentId: doc.pages()[0]!.id,
      props: { viewBox: "0 0 100 10", markup: '<path d="M0 5H100"/>', fills: [], strokes: solid("#ff0000"), strokeWidth: 2, strokeEndCap: "ARROW_FILLED", strokeStartCap: "CIRCLE" },
    });
    const svg = exportSvg(doc, [id])?.svg ?? "";
    expect(svg).toContain(`<marker id="mk-e-${id}"`);
    expect(svg).toContain(`<marker id="mk-s-${id}"`);
    expect(svg).toContain(`marker-end="url(#mk-e-${id})"`);
    expect(svg).toContain('fill="#ff0000"');
  });
});

describe("corner smoothing", () => {
  const rect = (extra: object) => ({ id: "r", type: "RECTANGLE", x: 0, y: 0, width: 100, height: 100, cornerRadius: 20, fills: [{ type: "SOLID", color: "#ff0000", opacity: 1 }], strokes: [], strokeWidth: 0, ...extra }) as never;
  it("draws a smooth path instead of a plain rounded rect, and starts the curve earlier", () => {
    expect(shapeMarkup(rect({}))).toContain('rx="20"');
    const smooth = shapeMarkup(rect({ cornerSmoothing: 0.6 }));
    expect(smooth).toContain("<path");
    expect(smooth).not.toContain("rx=");
    expect(smooth).toContain("M32 0H68"); // 20 * 1.6 = 32 from each corner
    expect(smooth).toContain("C");
  });
  it("caps the curve at half the shorter side and clamps bad values", () => {
    expect(shapeMarkup(rect({ cornerRadius: 50, cornerSmoothing: 1 }))).toContain("M50 0H50");
    expect(shapeMarkup(rect({ cornerSmoothing: 5 }))).toContain("M40 0H60");
    expect(shapeMarkup(rect({ cornerSmoothing: -1 }))).toContain('rx="20"');
  });
});

describe("slices", () => {
  function setup() {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const frame = doc.createNode("FRAME", { parentId: page, props: { x: 100, y: 100, width: 200, height: 200, fills: [{ type: "SOLID", color: "#ff0000", opacity: 1 }] } });
    const slice = doc.createNode("RECTANGLE", { parentId: page, props: { x: 150, y: 150, width: 80, height: 60, fills: [], strokes: [], strokeWidth: 0, isSlice: true } as never });
    return { doc, frame, slice };
  }
  it("exports what is under the slice, cropped to its box", () => {
    const { doc, slice } = setup();
    const out = exportSvg(doc, [slice])!;
    expect(out).toMatchObject({ width: 80, height: 60 });
    expect(out.svg).toContain("#ff0000");
    expect(out.svg).toContain("translate(-150 -150)");
  });
  it("is not drawn when something else is exported", () => {
    const { doc, frame } = setup();
    expect(exportSvg(doc, [frame])!.svg).not.toContain("slice");
    const inside = doc.createNode("RECTANGLE", { parentId: frame, props: { width: 10, height: 10, isSlice: true } as never });
    expect(exportSvg(doc, [frame])!.svg.match(/<g /g)!.length).toBeLessThan(exportSvg(doc, [frame, inside])!.svg.length);
  });
});
