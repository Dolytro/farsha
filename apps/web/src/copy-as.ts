import type { DesignDoc } from "@farsha/design-core";
import { generateCode } from "@farsha/code-generator";
import { textLayersIn } from "./text-actions";

/** The words of every text layer in the selection (also inside frames and groups), one layer per line, top to bottom. */
export function textOf(doc: DesignDoc, ids: string[]): string {
  return textLayersIn(doc, ids)
    .map((n) => ({ n, box: doc.absoluteBox(n.id) }))
    .sort((a, b) => (a.box?.y ?? 0) - (b.box?.y ?? 0) || (a.box?.x ?? 0) - (b.box?.x ?? 0))
    .map(({ n }) => n.characters)
    .join("\n");
}

/** CSS for every selected layer and every layer inside it, each as its own rule (Figma's "CSS (all layers)"). */
export function cssOfAll(doc: DesignDoc, ids: string[]): string {
  const seen = new Set<string>();
  const blocks: string[] = [];
  for (const id of ids) {
    const root = doc.getNode(id);
    if (!root || root.type === "PAGE" || root.type === "DOCUMENT") continue;
    for (const n of [root, ...doc.descendants(id)]) {
      if (seen.has(n.id)) continue;
      seen.add(n.id);
      blocks.push(generateCode(n, () => [], "css"));
    }
  }
  return blocks.join("\n\n");
}

async function copy(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export const copyAsText = (doc: DesignDoc, ids: string[]) => copy(textOf(doc, ids));
export const copyAsCssAll = (doc: DesignDoc, ids: string[]) => copy(cssOfAll(doc, ids));
