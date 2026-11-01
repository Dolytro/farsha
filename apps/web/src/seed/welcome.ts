import type { DesignDoc } from "@farsha/design-core";

/** Default canvas for a fresh editor: the starter board from the Farsha UI design (hero card, mobile card, avatars). */

const paint = (color: string) => [{ type: "SOLID" as const, color, opacity: 1 }];

const GROUND = "#0e0d14";
const SURFACE = "#17151f";
const SURFACE_2 = "#221f2e";
const LINE = "#34304a";
const INK = "#f2f0fa";
const MUTED = "#a29cba";
const IRIS = "#6a46f2";
const IRIS_BRIGHT = "#7c5cff";

const DISPLAY = "'Bricolage Grotesque', 'Segoe UI', system-ui, sans-serif";
const SANS = "'Geist', 'Segoe UI', system-ui, sans-serif";
const MONO = "'Geist Mono', ui-monospace, Consolas, monospace";

type TextOpts = { family?: string; weight?: number; letterSpacing?: number; lineHeight?: number; width?: number; wrap?: boolean; align?: "LEFT" | "CENTER" };

function text(doc: DesignDoc, parent: string, x: number, y: number, characters: string, size: number, color: string, o: TextOpts = {}) {
  const lineHeight = o.lineHeight ?? Math.round(size * 1.4);
  const width = o.width ?? Math.ceil(characters.length * size * 0.62) + 8;
  return doc.createNode("TEXT", {
    parentId: parent,
    props: {
      name: characters,
      x,
      y,
      width,
      height: lineHeight,
      characters,
      fontFamily: o.family ?? SANS,
      fontSize: size,
      fontWeight: o.weight ?? 400,
      lineHeight,
      letterSpacing: o.letterSpacing ?? 0,
      textAlign: o.align ?? "LEFT",
      textAutoResize: o.wrap ? "HEIGHT" : "WIDTH_AND_HEIGHT",
      fills: paint(color),
    },
  });
}

function box(doc: DesignDoc, parent: string, name: string, x: number, y: number, width: number, height: number, fill: string, r: number, stroke?: string) {
  return doc.createNode("RECTANGLE", {
    parentId: parent,
    props: { name, x, y, width, height, fills: paint(fill), cornerRadius: r, strokes: stroke ? paint(stroke) : [], strokeWidth: 1 },
  });
}

function card(doc: DesignDoc, page: string, name: string, x: number, y: number, width: number, height: number, fill: string, r: number) {
  return doc.createNode("FRAME", {
    parentId: page,
    props: { name, x, y, width, height, fills: paint(fill), cornerRadius: r, strokes: paint(LINE), strokeWidth: 1, clipsContent: true },
  });
}

function heroCard(doc: DesignDoc, page: string) {
  text(doc, page, 80, 22, "Hero · 1440 × 900", 11, MUTED, { family: MONO });
  const f = card(doc, page, "Hero card", 80, 60, 560, 360, SURFACE, 16);
  text(doc, f, 32, 24, "OPEN SOURCE · NO SUBSCRIPTION", 11, MUTED, { family: MONO, letterSpacing: 1.54, lineHeight: 16 });
  text(doc, f, 32, 52, "Design freely", 56, INK, { family: DISPLAY, weight: 800, letterSpacing: -2.24, lineHeight: 53 });
  text(doc, f, 32, 117, "A free canvas for drawing, prototyping and shipping with your team.", 15, MUTED, { width: 360, wrap: true, lineHeight: 22 });

  box(doc, f, "Open the editor", 32, 181, 148, 40, IRIS, 10);
  text(doc, f, 32, 191, "Open the editor", 14, "#ffffff", { weight: 600, width: 148, align: "CENTER", lineHeight: 20 });
  box(doc, f, "GitHub", 188, 181, 90, 40, SURFACE, 10, LINE);
  text(doc, f, 188, 191, "GitHub", 14, INK, { weight: 400, width: 90, align: "CENTER", lineHeight: 20 });
}

function mobileCard(doc: DesignDoc, page: string) {
  text(doc, page, 700, 22, "Mobile", 11, MUTED, { family: MONO });
  const f = card(doc, page, "Mobile card", 700, 60, 150, 300, SURFACE_2, 24);
  box(doc, f, "Image", 12, 12, 126, 90, "#ff5e4d", 12);
  box(doc, f, "Title", 12, 110, 101, 14, LINE, 4);
  box(doc, f, "Subtitle", 12, 132, 69, 14, LINE, 4);
  box(doc, f, "Button", 12, 252, 126, 36, IRIS_BRIGHT, 10);
}

function avatars(doc: DesignDoc, page: string) {
  const f = doc.createNode("FRAME", { parentId: page, props: { name: "Avatars", x: 130, y: 450, width: 260, height: 72, fills: [] } });
  doc.createNode("ELLIPSE", { parentId: f, props: { name: "Avatar 1", x: 0, y: 0, width: 72, height: 72, fills: paint("#ffb020") } });
  box(doc, f, "Avatar 2", 88, 0, 72, 72, "#ff4fa3", 16);
  box(doc, f, "Avatar 3", 176, 0, 72, 72, "#2de2c8", 12);
}

export function seedWelcome(doc: DesignDoc, pageId: string): void {
  doc.setPageBackground(pageId, GROUND);
  heroCard(doc, pageId);
  mobileCard(doc, pageId);
  avatars(doc, pageId);
}
