import type { TextNode } from "@canvylo/types";

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

type TextLike = Pick<TextNode, "characters" | "fontFamily" | "fontSize" | "fontWeight" | "letterSpacing" | "lineHeight" | "width"> & { textAutoResize?: TextNode["textAutoResize"] };

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
  const paragraphs = n.characters.split("\n");
  const wrap = (n.textAutoResize ?? "WIDTH_AND_HEIGHT") !== "WIDTH_AND_HEIGHT";
  const lines = wrap ? paragraphs.flatMap((p) => wrapParagraph(p, Math.max(1, n.width), w)) : paragraphs;
  const lineHeight = lineHeightPx(n);
  return { lines, lineHeight, width: Math.max(0, ...lines.map(w)), height: lines.length * lineHeight };
}
