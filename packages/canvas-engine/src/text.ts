import type { TextCase, TextList, TextNode, TextRun } from "@farsha/types";

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
  /** Extra space above each line (the paragraph spacing, on the first line of every paragraph after the first). */
  lineGap: number[];
  /** Indent of each line (the paragraph indent, on the first line of every paragraph). */
  indent: number[];
  /** Extra space added to every word gap of a line so a justified line fills the box (0 for the last line of a paragraph and for other alignments). */
  wordSpacing: number[];
  /** For every line, the index in `characters` of the line's first character (list markers count as sitting just before their paragraph). */
  starts: number[];
  lineHeight: number;
  /** Widest line (what auto width resizes to). */
  width: number;
  /** All lines together (what auto width / auto height resize to). */
  height: number;
}

type TextLike = Pick<TextNode, "characters" | "fontFamily" | "fontSize" | "fontWeight" | "letterSpacing" | "lineHeight" | "width"> & { textAutoResize?: TextNode["textAutoResize"]; textCase?: TextCase; textList?: TextList; textAlign?: string; paragraphSpacing?: number; paragraphIndent?: number; maxLines?: number };

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
  const original = applyTextCase(n.characters, n.textCase).split("\n");
  const paragraphs = applyTextList(original, n.textList);
  const wrap = (n.textAutoResize ?? "WIDTH_AND_HEIGHT") !== "WIDTH_AND_HEIGHT";
  const lines: string[] = [];
  const starts: number[] = [];
  let offset = 0; // index in characters of the current paragraph's first character
  paragraphs.forEach((p, pi) => {
    const prefix = p.length - (original[pi] ?? "").length;
    const pieces = wrap ? wrapParagraph(p, Math.max(1, n.width), w) : [p];
    let pos = 0; // position inside the displayed paragraph
    for (const piece of pieces) {
      lines.push(piece);
      starts.push(offset - prefix + pos);
      pos += piece.length;
      if (p[pos] === " ") pos += 1; // a space at a soft break is dropped
    }
    offset += (original[pi] ?? "").length + 1;
  });
  const lineHeight = lineHeightPx(n);
  // justified text: spread the leftover width of every line over its spaces, except the last line of a paragraph
  const lastOfParagraph = new Set<number>();
  {
    let at = 0;
    paragraphs.forEach((p) => {
      const count = wrap ? wrapParagraph(p, Math.max(1, n.width), w).length : 1;
      at += count;
      lastOfParagraph.add(at - 1);
    });
  }
  // paragraph spacing and first-line indent
  const spacing = Math.max(0, Number.isFinite(n.paragraphSpacing) ? (n.paragraphSpacing as number) : 0);
  const indentPx = Math.max(0, Number.isFinite(n.paragraphIndent) ? (n.paragraphIndent as number) : 0);
  const lineGap: number[] = [];
  const indent: number[] = [];
  {
    let at = 0;
    paragraphs.forEach((p, pi) => {
      const count = wrap ? wrapParagraph(p, Math.max(1, n.width), w).length : 1;
      for (let k = 0; k < count; k++) {
        lineGap.push(k === 0 && pi > 0 ? spacing : 0);
        indent.push(k === 0 ? indentPx : 0);
      }
      at += count;
    });
  }
  // truncation: keep the first maxLines lines and end the last with an ellipsis
  const limit = Number.isFinite(n.maxLines) && (n.maxLines as number) > 0 ? Math.floor(n.maxLines as number) : 0;
  if (limit && lines.length > limit) {
    lines.length = limit;
    starts.length = limit;
    lineGap.length = limit;
    indent.length = limit;
    lines[limit - 1] = `${lines[limit - 1]!.replace(/\s+$/, "")}…`;
  }
  const wordSpacing = lines.map((line, i) => {
    if (n.textAlign !== "JUSTIFIED" || !wrap || lastOfParagraph.has(i)) return 0;
    const gaps = line.split(" ").length - 1;
    const free = n.width - w(line);
    return gaps > 0 && free > 0 ? free / gaps : 0;
  });
  return { lines, starts, wordSpacing, lineGap, indent, lineHeight, width: Math.max(0, ...lines.map((l, i) => w(l) + (indent[i] ?? 0))), height: lines.length * lineHeight + lineGap.reduce((a, b) => a + b, 0) };
}

/** One piece of a line with the same style (rich text). */
export interface TextSegment {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
}

type Flag = "bold" | "italic" | "underline" | "strikethrough";
type Flags = Record<Flag, boolean>;

const noFlags = (): Flags => ({ bold: false, italic: false, underline: false, strikethrough: false });
const flagKey = (f: Flags) => `${+f.bold}${+f.italic}${+f.underline}${+f.strikethrough}`;
const withFlags = (f: Flags) => ({ ...(f.bold ? { bold: true } : {}), ...(f.italic ? { italic: true } : {}), ...(f.underline ? { underline: true } : {}), ...(f.strikethrough ? { strikethrough: true } : {}) });

/** The style of every character: a flag is on wherever any run says so. */
function flagsPerChar(runs: TextRun[] | undefined, length: number): Flags[] {
  const per = Array.from({ length }, noFlags);
  for (const r of runs ?? []) {
    for (let i = Math.max(0, r.start); i < Math.min(length, r.end); i++) {
      per[i]!.bold ||= !!r.bold;
      per[i]!.italic ||= !!r.italic;
      per[i]!.underline ||= !!r.underline;
      per[i]!.strikethrough ||= !!r.strikethrough;
    }
  }
  return per;
}

/**
 * Cut a displayed line into pieces of equal style. `from` is the index in `characters` of the line's first character (see `TextLayout.starts`).
 * Without runs the whole line is one plain segment.
 */
export function lineSegments(line: string, from: number, runs: TextRun[] | undefined): TextSegment[] {
  if (!runs?.length || line === "") return [{ text: line }];
  const flagAt = (i: number): Flags => {
    const f = noFlags();
    for (const r of runs) {
      if (i < r.start || i >= r.end) continue;
      f.bold ||= !!r.bold;
      f.italic ||= !!r.italic;
      f.underline ||= !!r.underline;
      f.strikethrough ||= !!r.strikethrough;
    }
    return f;
  };
  const segments: TextSegment[] = [];
  let curKey = "";
  for (let j = 0; j < line.length; j++) {
    const f = flagAt(from + j);
    const k = flagKey(f);
    if (segments.length && k === curKey) segments[segments.length - 1]!.text += line[j]!;
    else {
      curKey = k;
      segments.push({ text: line[j]!, ...withFlags(f) });
    }
  }
  return segments;
}

/** Is every character of [start, end) already set for this flag? (Decides whether the shortcut turns the style on or off.) */
export function rangeHas(runs: TextRun[] | undefined, start: number, end: number, flag: Flag): boolean {
  if (end <= start) return false;
  const per = flagsPerChar(runs, end);
  for (let i = start; i < end; i++) if (!per[i]![flag]) return false;
  return true;
}

/** Turn a style on or off for [start, end). Runs are rebuilt as one run per stretch of equal style, so they never pile up. */
export function setRangeStyle(runs: TextRun[] | undefined, length: number, start: number, end: number, flag: Flag, on: boolean): TextRun[] {
  const s = Math.max(0, Math.min(start, end));
  const e = Math.min(length, Math.max(start, end));
  const per = flagsPerChar(runs, length);
  for (let i = s; i < e; i++) per[i]![flag] = on;
  const out: TextRun[] = [];
  let open: TextRun | null = null;
  let openKey = "";
  for (let i = 0; i < length; i++) {
    const k = flagKey(per[i]!);
    if (open && k !== openKey) {
      out.push(open);
      open = null;
    }
    if (!open && k !== "0000") {
      open = { start: i, end: i + 1, ...withFlags(per[i]!) };
      openKey = k;
    } else if (open) open.end = i + 1;
  }
  if (open) out.push(open);
  return out;
}

/** Keep the runs on the right characters when the text is edited: what follows the changed part moves, runs inside it grow or shrink. */
export function adjustRuns(runs: TextRun[] | undefined, oldText: string, newText: string): TextRun[] | undefined {
  if (!runs?.length) return runs;
  let prefix = 0;
  while (prefix < oldText.length && prefix < newText.length && oldText[prefix] === newText[prefix]) prefix++;
  let suffix = 0;
  while (suffix < oldText.length - prefix && suffix < newText.length - prefix && oldText[oldText.length - 1 - suffix] === newText[newText.length - 1 - suffix]) suffix++;
  const removedEnd = oldText.length - suffix; // old index where the unchanged tail starts
  const delta = newText.length - oldText.length;
  const insertedEnd = newText.length - suffix; // new index where the unchanged tail starts
  const map = (i: number) => (i <= prefix ? i : i >= removedEnd ? i + delta : Math.min(insertedEnd, prefix + (i - prefix)));
  return runs.map((r) => ({ ...r, start: map(r.start), end: map(r.end) })).filter((r) => r.end > r.start);
}
