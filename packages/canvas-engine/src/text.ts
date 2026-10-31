import type { TextCase, TextList, TextNode } from "@canvylo/types";

export interface FontSpec {
  family: string;
  size: number;
  weight: number;
  letterSpacing: number;
}

/** Width in px of one line of text. The browser passes a real measurer; tests and exports can use the estimate. */
export type Measure = (text: string, font: FontSpec) => number;

export const approxMeasure: Measure = (text, f) => text.length * (f.size * 0.56 + f.letterSpacing);

export interface TextLayout {
  lines: string[];
  lineHeight: number;
  /** Widest line (what auto width resizes to). */
  width: number;
  /** All lines together (what auto width / auto height resize to). */
  height: number;
}

type TextLike = Pick<TextNode, "characters" | "fontFamily" | "fontSize" | "fontWeight" | "letterSpacing" | "lineHeight" | "width"> & { textAutoResize?: TextNode["textAutoResize"]; textCase?: TextCase; textList?: TextList };

/** The characters as they are drawn: upper case, lower case or Title Case when the layer asks for it. */
export function applyTextCase(text: string, mode: TextCase | undefined): string {
  if (mode === "UPPER") return text.toUpperCase();
  if (mode === "LOWER") return text.toLowerCase();
  if (mode === "TITLE") return text.toLowerCase().replace(/(^|[\s\-_/(])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase());
  return text;
}

/** Paragraphs with their list marker: "• " for a bulleted list, "1. ", "2. " … for a numbered one. */
export function applyTextList(paragraphs: string[], mode: TextList | undefined): string[] {
  if (mode === "BULLET") return paragraphs.map((p) => `• ${p}`);
  if (mode === "NUMBER") return paragraphs.map((p, i) => `${i + 1}. ${p}`);
  return paragraphs;
}

/** Where the lines of a text layer start and how they are anchored (SVG `x`, `text-anchor`, `direction`). In right to left text "start" is the right edge. */
export function textPlacement(n: { width: number; textAlign?: string; textDirection?: string }): { x: number; anchor: "start" | "middle" | "end"; rtl: boolean } {
  const rtl = n.textDirection === "RTL";
  if (n.textAlign === "CENTER") return { x: n.width / 2, anchor: "middle", rtl };
  const right = n.textAlign === "RIGHT";
  if (rtl) return right ? { x: n.width, anchor: "start", rtl } : { x: 0, anchor: "end", rtl };
  return right ? { x: n.width, anchor: "end", rtl } : { x: 0, anchor: "start", rtl };
}

/** SVG `font-style` / `text-decoration` values of a text layer (undefined when plain). */
export function textFontStyle(n: { italic?: boolean; textDecoration?: string; textLink?: string }): { fontStyle?: "italic"; textDecoration?: "underline" | "line-through" } {
  return { ...(n.italic ? { fontStyle: "italic" as const } : {}), ...(n.textDecoration === "UNDERLINE" || (n.textLink && !n.textDecoration) ? { textDecoration: "underline" as const } : n.textDecoration === "STRIKETHROUGH" ? { textDecoration: "line-through" as const } : {}) };
}

/** How far the text moves down inside a box taller than the text (Figma's vertical alignment). */
export function verticalTextOffset(n: { height: number; textVerticalAlign?: string; textAutoResize?: string }, textHeight: number): number {
  if ((n.textAutoResize ?? "WIDTH_AND_HEIGHT") !== "NONE") return 0;
  const free = Math.max(0, n.height - textHeight);
  return n.textVerticalAlign === "CENTER" ? free / 2 : n.textVerticalAlign === "BOTTOM" ? free : 0;
}

export function lineHeightPx(n: Pick<TextNode, "fontSize" | "lineHeight">): number {
  return n.lineHeight === "AUTO" ? n.fontSize * 1.2 : Math.max(1, n.lineHeight);
}

function wrapParagraph(text: string, maxWidth: number, width: (s: string) => number): string[] {
  if (text === "") return [""];
  const out: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line === "" ? word : `${line} ${word}`;
    if (width(next) <= maxWidth || line === "" && width(word) <= maxWidth) {
      line = next;
      continue;
    }
    if (line !== "") out.push(line);
    line = "";
    if (width(word) <= maxWidth) {
      line = word;
      continue;
    }
    // A single word wider than the box is broken between characters.
    for (const ch of word) {
      if (line !== "" && width(line + ch) > maxWidth) {
        out.push(line);
        line = ch;
      } else line += ch;
    }
  }
  out.push(line);
  return out;
}

/** Split a text layer into lines: hard breaks always, soft wrapping at the layer width unless it is auto width. */
export function layoutText(n: TextLike, measure: Measure = approxMeasure): TextLayout {
  const font: FontSpec = { family: n.fontFamily, size: n.fontSize, weight: n.fontWeight, letterSpacing: n.letterSpacing };
  const w = (s: string) => measure(s, font);
  const paragraphs = applyTextList(applyTextCase(n.characters, n.textCase).split("\n"), n.textList);
  const wrap = (n.textAutoResize ?? "WIDTH_AND_HEIGHT") !== "WIDTH_AND_HEIGHT";
  const lines = wrap ? paragraphs.flatMap((p) => wrapParagraph(p, Math.max(1, n.width), w)) : paragraphs;
  const lineHeight = lineHeightPx(n);
  return { lines, lineHeight, width: Math.max(0, ...lines.map(w)), height: lines.length * lineHeight };
}
