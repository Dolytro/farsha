import { describe, expect, it } from "vitest";
import { looksLikeSvg, parseColor, svgToClip } from "./svg-import";

const icon = `<?xml version="1.0"?>
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- a layers icon -->
  <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="#0d99ff" stroke-width="2" stroke-linecap="round"/>
</svg>`;

describe("looksLikeSvg", () => {
  it("accepts svg documents and rejects other text", () => {
    expect(looksLikeSvg(icon)).toBe(true);
    expect(looksLikeSvg('  <svg viewBox="0 0 1 1"></svg>')).toBe(true);
    expect(looksLikeSvg("<div><svg></svg></div>")).toBe(false);
    expect(looksLikeSvg("hello <svg>")).toBe(false);
  });
});

describe("parseColor", () => {
  it("normalises hex, rgb, named and none", () => {
    expect(parseColor("#abc")).toEqual({ color: "#aabbcc", opacity: 1 });
    expect(parseColor("rgb(13, 153, 255)")).toEqual({ color: "#0d99ff", opacity: 1 });
    expect(parseColor("rgba(0,0,0,0.5)")).toEqual({ color: "#000000", opacity: 0.5 });
    expect(parseColor("RED")).toEqual({ color: "#ff0000", opacity: 1 });
    expect(parseColor("none")).toBeNull();
    expect(parseColor("currentColor", "#123456")).toEqual({ color: "#123456", opacity: 1 });
  });
});

describe("svgToClip", () => {
  it("turns an icon into a frame holding one vector", () => {
    const clip = svgToClip(icon)!;
    expect(clip.type).toBe("FRAME");
    expect(clip.props).toMatchObject({ name: "SVG", width: 24, height: 24, clipsContent: false });
    expect(clip.children).toHaveLength(1);
    const v = clip.children[0]!;
    expect(v.type).toBe("VECTOR");
    expect(v.props.viewBox).toBe("0 0 24 24");
    expect(v.props.markup).toContain('d="M12 2L2 7l10 5 10-5-10-5z"');
    expect(v.props.markup).toContain('stroke="#0d99ff"');
    expect(v.props.markup).toContain('stroke-linecap="round"');
    expect(v.props.markup).toContain('fill="none"');
  });

  it("converts basic shapes to native layers and scales to the declared size", () => {
    const clip = svgToClip(
      `<svg width="48" height="48" viewBox="0 0 24 24">
        <rect x="2" y="3" width="10" height="6" rx="1" fill="#ff0000"/>
        <circle cx="12" cy="12" r="4" style="fill: rgb(0, 128, 0); stroke:#000; stroke-width:1"/>
        <text x="12" y="20" text-anchor="middle" font-size="4" font-weight="bold">Hi &amp; bye</text>
      </svg>`,
    )!;
    const [rect, circle, text] = clip.children;
    expect(clip.props).toMatchObject({ width: 48, height: 48 });
    expect(rect!.props).toMatchObject({ x: 4, y: 6, width: 20, height: 12, cornerRadius: 2 });
    expect(rect!.props.fills).toEqual([{ type: "SOLID", color: "#ff0000", opacity: 1 }]);
    expect(circle!.props).toMatchObject({ x: 16, y: 16, width: 16, height: 16 });
    expect(circle!.props.fills).toEqual([{ type: "SOLID", color: "#008000", opacity: 1 }]);
    expect(circle!.props.strokes).toEqual([{ type: "SOLID", color: "#000000", opacity: 1 }]);
    expect(text!.type).toBe("TEXT");
    expect(text!.props).toMatchObject({ characters: "Hi & bye", fontSize: 8, fontWeight: 700, textAlign: "CENTER" });
  });

  it("inherits from groups and applies translations", () => {
    const clip = svgToClip('<svg viewBox="0 0 100 100"><g fill="#00f" opacity="0.5" transform="translate(10 20)"><rect x="1" y="2" width="5" height="5"/></g></svg>')!;
    const rect = clip.children[0]!;
    expect(rect.props).toMatchObject({ x: 11, y: 22, opacity: 0.5 });
    expect(rect.props.fills).toEqual([{ type: "SOLID", color: "#0000ff", opacity: 1 }]);
  });

  it("uses the first gradient stop as a flat fill", () => {
    const clip = svgToClip(
      '<svg viewBox="0 0 10 10"><defs><linearGradient id="g"><stop offset="0" stop-color="#ff00ff"/><stop offset="1" stop-color="#000"/></linearGradient></defs><rect width="10" height="10" fill="url(#g)"/></svg>',
    )!;
    expect(clip.children[0]!.props.fills).toEqual([{ type: "SOLID", color: "#ff00ff", opacity: 1 }]);
  });

  it("never lets scripts, handlers or bad path data through", () => {
    const clip = svgToClip(
      `<svg viewBox="0 0 10 10">
        <script>alert(1)</script>
        <path d="M0 0L5 5" fill="red" onload="alert(1)" onclick="x()"/>
        <path d="M0 0 <script>" fill="red"/>
        <path d="M1 1 L2 2" fill='red" onerror="alert(2)'/>
        <image href="javascript:alert(3)"/>
      </svg>`,
    )!;
    const markups = clip.children.map((c) => String(c.props.markup));
    expect(clip.children.every((c) => c.type === "VECTOR")).toBe(true);
    for (const m of markups) {
      expect(m).not.toMatch(/onload|onclick|onerror|script|javascript/i);
    }
    expect(markups.filter((m) => m.includes("M0 0 <"))).toHaveLength(0);
  });

  it("returns null for empty or non-svg input", () => {
    expect(svgToClip("<svg viewBox='0 0 1 1'></svg>")).toBeNull();
    expect(svgToClip("just text")).toBeNull();
    expect(svgToClip("<svg><defs><style>.a{}</style></defs></svg>")).toBeNull();
  });
});
