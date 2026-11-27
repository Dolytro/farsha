import type { DesignDoc } from "@farsha/design-core";

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** "Rectangle 1", "Rectangle 2", ...: the base name with the next number after the highest one already used for it on any page (like Figma). */
export function nextLayerName(doc: DesignDoc, base: string): string {
  const pattern = new RegExp(`^${escape(base)}(?: (\\d+))?$`);
  let highest = 0;
  for (const page of doc.pages()) {
    for (const n of doc.descendants(page.id)) {
      const m = pattern.exec(n.name);
      if (m) highest = Math.max(highest, m[1] ? Number(m[1]) : 0);
    }
  }
  return `${base} ${highest + 1}`;
}

/** The layer name Figma gives a text layer: its first line (cut to 40 characters), or "Text" while it is empty. */
export function textLayerName(characters: string): string {
  const first = characters.split("\n")[0]!.trim();
  return first ? first.slice(0, 40) : "Text";
}

/** The new name for a text layer whose words changed: only a layer still carrying its automatic name follows the words (a name you typed stays). Null when it stays. */
export function renamedWithText(currentName: string, oldCharacters: string, newCharacters: string): string | null {
  if (currentName !== textLayerName(oldCharacters)) return null;
  const next = textLayerName(newCharacters);
  return next === currentName ? null : next;
}
