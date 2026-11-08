import type { RulerGuide } from "@farsha/types";

/** The guides after moving guide `index` to the typed position; unchanged when the text is not a number. */
export function moveGuideTo(guides: RulerGuide[], index: number, text: string): RulerGuide[] {
  const guide = guides[index];
  const value = Number(text.trim());
  if (!guide || text.trim() === "" || !Number.isFinite(value)) return guides;
  const position = Math.round(value);
  if (position === guide.position) return guides;
  return guides.map((g, i) => (i === index ? { ...g, position } : g));
}
