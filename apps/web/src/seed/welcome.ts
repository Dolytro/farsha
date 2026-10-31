import type { DesignDoc } from "@farsha/design-core";

/** Default canvas for a fresh editor: a short tour of Farsha itself. */

const paint = (color: string) => [{ type: "SOLID" as const, color, opacity: 1 }];

const ACCENT = "#0d99ff";
const INK = "#1a1a1a";
const MUTED = "#6b6b6b";
const LINE = "#e3e3e3";

type Align = "LEFT" | "CENTER";

function rect(doc: DesignDoc, parent: string, name: string, x: number, y: number, width: number, height: number, fill: string, opts: { r?: number; stroke?: string } = {}) {
  return doc.createNode("RECTANGLE", {
    parentId: parent,
    props: {
      name,
      x,
      y,
      width,
      height,
      fills: paint(fill),
      cornerRadius: opts.r ?? 0,
      strokes: opts.stroke ? paint(opts.stroke) : [],
      strokeWidth: 1,
    },
  });
}

function text(doc: DesignDoc, parent: string, x: number, y: number, characters: string, size: number, weight: number, color: string, width: number, textAlign: Align = "LEFT") {
  return doc.createNode("TEXT", {
    parentId: parent,
    props: { name: characters, x, y, width, height: Math.round(size * 1.4), characters, fontSize: size, fontWeight: weight, textAlign, fills: paint(color) },
  });
}

function welcomeFrame(doc: DesignDoc, page: string) {
  const f = doc.createNode("FRAME", { parentId: page, props: { name: "Welcome to Farsha", x: 0, y: 0, width: 1040, height: 640, fills: paint("#ffffff") } });

  rect(doc, f, "Logo mark", 64, 64, 44, 44, ACCENT, { r: 12 });
  text(doc, f, 64, 72, "C", 28, 700, "#ffffff", 44, "CENTER");
  text(doc, f, 124, 74, "Farsha", 24, 700, INK, 200);

  text(doc, f, 64, 150, "Design, inspect and share.", 56, 700, INK, 900);
  text(doc, f, 64, 232, "A free, open source design tool. Your files live in your own Google Drive.", 20, 400, MUTED, 900);

  rect(doc, f, "Primary action", 64, 296, 180, 48, ACCENT, { r: 10 });
  text(doc, f, 64, 311, "Start designing", 16, 600, "#ffffff", 180, "CENTER");
  rect(doc, f, "Secondary action", 260, 296, 160, 48, "#ffffff", { r: 10, stroke: LINE });
  text(doc, f, 260, 311, "Open from Drive", 16, 600, INK, 160, "CENTER");

  // Text boxes don't wrap yet, so each description is written as short lines.
  const cards: [string, string[], string][] = [
    ["Design", ["Frames, shapes, text", "and styles on an", "infinite canvas."], "#e8f4ff"],
    ["Inspect", ["Dev Mode shows sizes,", "colors and copy-ready", "CSS, React, Tailwind."], "#eefbe9"],
    ["Share", ["Send a link. Anyone", "can view; signed-in", "teammates can inspect."], "#fff4e5"],
  ];
  cards.forEach(([title, lines, tint], i) => {
    const x = 64 + i * 312;
    rect(doc, f, `${title} card`, x, 400, 288, 176, tint, { r: 16 });
    text(doc, f, x + 24, 424, title, 22, 700, INK, 240);
    lines.forEach((line, j) => text(doc, f, x + 24, 464 + j * 22, line, 15, 400, MUTED, 240));
  });
}

function shortcutsFrame(doc: DesignDoc, page: string) {
  const f = doc.createNode("FRAME", { parentId: page, props: { name: "Shortcuts", x: 1120, y: 0, width: 420, height: 640, fills: paint("#fafafa") } });
  text(doc, f, 32, 32, "Shortcuts", 24, 700, INK, 300);
  const rows: [string, string][] = [
    ["V", "Move"],
    ["H", "Hand tool"],
    ["F", "Frame"],
    ["R", "Rectangle"],
    ["O", "Ellipse"],
    ["T", "Text"],
    ["Shift + D", "Dev Mode"],
    ["Shift + 1", "Zoom to fit"],
    ["Shift + 2", "Zoom to selection"],
    ["Ctrl + D", "Duplicate"],
    ["Ctrl + G", "Group"],
    ["Alt + hover", "Measure distances"],
  ];
  rows.forEach(([key, label], i) => {
    const y = 88 + i * 42;
    rect(doc, f, `${key} key`, 32, y, 108, 30, "#ffffff", { r: 6, stroke: LINE });
    text(doc, f, 32, y + 6, key, 13, 600, INK, 108, "CENTER");
    text(doc, f, 160, y + 6, label, 15, 400, MUTED, 220);
  });
}

export function seedWelcome(doc: DesignDoc, pageId: string): void {
  welcomeFrame(doc, pageId);
  shortcutsFrame(doc, pageId);
}
