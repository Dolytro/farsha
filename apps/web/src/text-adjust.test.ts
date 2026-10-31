import { describe, expect, it } from "vitest";
import { DesignDoc } from "@canvylo/design-core";
import { layoutText } from "@canvylo/canvas-engine";
import { adjustText } from "./text-actions";
import { textShortcutCommand } from "./text-shortcuts";

function setup() {
  const doc = new DesignDoc();
  const t = doc.createNode("TEXT", { parentId: doc.pages()[0]!.id, props: { characters: "Hello", fontSize: 16, fontWeight: 400 } });
  return { doc, t };
}
const get = (doc: DesignDoc, id: string) => doc.getNode(id) as unknown as { fontSize: number; fontWeight: number; lineHeight: number | "AUTO"; letterSpacing: number };

describe("adjustText", () => {
  it("steps font size by 1, weight by 100 (kept between 100 and 900)", () => {
    const { doc, t } = setup();
    adjustText(doc, [t], "fontSize", 1);
    expect(get(doc, t).fontSize).toBe(17);
    adjustText(doc, [t], "fontSize", -1);
    adjustText(doc, [t], "fontSize", -1);
    expect(get(doc, t).fontSize).toBe(15);
    adjustText(doc, [t], "fontWeight", 1);
    expect(get(doc, t).fontWeight).toBe(500);
    for (let i = 0; i < 20; i++) adjustText(doc, [t], "fontWeight", 1);
    expect(get(doc, t).fontWeight).toBe(900);
  });
  it("starts line height from the automatic value and steps letter spacing by half", () => {
    const { doc, t } = setup();
    adjustText(doc, [t], "lineHeight", 1);
    expect(get(doc, t).lineHeight).toBe(20);
    adjustText(doc, [t], "letterSpacing", 1);
    expect(get(doc, t).letterSpacing).toBe(0.5);
  });
  it("is one undo step and ignores layers that are not text", () => {
    const { doc, t } = setup();
    doc.stopCapturing();
    expect(adjustText(doc, [t, doc.createNode("RECTANGLE", { parentId: doc.pages()[0]!.id })], "fontSize", 1)).toBe(1);
    doc.undo();
    expect(get(doc, t).fontSize).toBe(16);
  });
});

describe("textShortcutCommand", () => {
  const k = (code: string, mods: Partial<{ ctrlKey: boolean; metaKey: boolean; altKey: boolean; shiftKey: boolean }> = {}) => textShortcutCommand({ code, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...mods });
  it("maps Figma's shortcuts", () => {
    expect(k("KeyJ", { ctrlKey: true, altKey: true })).toBe("text-align-justify");
    expect(k("KeyU", { ctrlKey: true, shiftKey: true })).toBe("text-link");
    expect(k("Digit8", { ctrlKey: true, shiftKey: true })).toBe("text-list-bullet");
    expect(k("Digit7", { metaKey: true, shiftKey: true })).toBe("text-list-number");
    expect(k("Period", { ctrlKey: true, shiftKey: true })).toBe("text-size-up");
    expect(k("Comma", { ctrlKey: true, altKey: true })).toBe("text-weight-down");
    expect(k("Period", { altKey: true, shiftKey: true })).toBe("text-leading-up");
    expect(k("Comma", { altKey: true })).toBe("text-tracking-down");
  });
  it("ignores everything else", () => {
    expect(k("KeyJ")).toBeNull();
    expect(k("Period")).toBeNull();
    expect(k("KeyU", { ctrlKey: true })).toBeNull();
    expect(k("Digit8", { ctrlKey: true })).toBeNull();
  });
});

describe("justified text", () => {
  const base = { characters: "aaa bbb ccc ddd eee fff", fontFamily: "Inter", fontSize: 16, fontWeight: 400, letterSpacing: 0, lineHeight: "AUTO" as const, width: 120, textAutoResize: "HEIGHT" as const };
  it("spreads the leftover width over the spaces of every line but the last of a paragraph", () => {
    const l = layoutText({ ...base, textAlign: "JUSTIFIED" });
    expect(l.lines.length).toBeGreaterThan(1);
    expect(l.wordSpacing.slice(0, -1).every((v) => v > 0)).toBe(true);
    expect(l.wordSpacing[l.wordSpacing.length - 1]).toBe(0);
  });
  it("adds nothing for other alignments or for auto width", () => {
    expect(layoutText({ ...base, textAlign: "LEFT" }).wordSpacing.every((v) => v === 0)).toBe(true);
    expect(layoutText({ ...base, textAlign: "JUSTIFIED", textAutoResize: "WIDTH_AND_HEIGHT" }).wordSpacing.every((v) => v === 0)).toBe(true);
  });
});
