import type { DesignDoc } from "@canvylo/design-core";
import type { TextAlign, TextCase, TextNode, TextPatch, TextVerticalAlign } from "@canvylo/types";

export type Refit = (doc: DesignDoc, id: string) => void;

/** Every text layer in the selection, including text inside selected frames and groups. */
export function textLayersIn(doc: DesignDoc, ids: string[]): TextNode[] {
  const seen = new Set<string>();
  const out: TextNode[] = [];
  for (const id of ids) {
    const root = doc.getNode(id);
    if (!root) continue;
    for (const n of [root, ...doc.descendants(id)]) {
      if (n.type === "TEXT" && !seen.has(n.id)) {
        seen.add(n.id);
        out.push(n);
      }
    }
  }
  return out;
}

/** Apply a text patch to every text layer in the selection as one undo step; `refit` re-measures auto-size layers afterwards. Returns how many layers changed. */
export function patchText(doc: DesignDoc, ids: string[], patch: (n: TextNode) => TextPatch, refit?: Refit): number {
  const layers = textLayersIn(doc, ids);
  if (!layers.length) return 0;
  doc.stopCapturing();
  for (const n of layers) {
    doc.setText(n.id, patch(n));
    refit?.(doc, n.id);
  }
  doc.stopCapturing();
  return layers.length;
}

export type TextToggle = "bold" | "italic" | "underline" | "strikethrough";

/**
 * Ctrl+B / I / U / Shift+X: toggles a style on all selected text. The first text layer decides which way it goes, so a mixed selection
 * ends up uniform (Figma does the same).
 */
export function toggleTextStyle(doc: DesignDoc, ids: string[], kind: TextToggle, refit?: Refit): number {
  const layers = textLayersIn(doc, ids);
  const first = layers[0];
  if (!first) return 0;
  const turnOn =
    kind === "bold" ? first.fontWeight < 600 : kind === "italic" ? !first.italic : kind === "underline" ? first.textDecoration !== "UNDERLINE" : first.textDecoration !== "STRIKETHROUGH";
  return patchText(
    doc,
    ids,
    () => {
      if (kind === "bold") return { fontWeight: turnOn ? 700 : 400 };
      if (kind === "italic") return { italic: turnOn };
      return { textDecoration: turnOn ? (kind === "underline" ? "UNDERLINE" : "STRIKETHROUGH") : "NONE" };
    },
    refit,
  );
}

export const setTextCase = (doc: DesignDoc, ids: string[], textCase: TextCase, refit?: Refit) => patchText(doc, ids, () => ({ textCase }), refit);
export const setTextAlign = (doc: DesignDoc, ids: string[], textAlign: TextAlign, refit?: Refit) => patchText(doc, ids, () => ({ textAlign }), refit);
export const setTextVerticalAlign = (doc: DesignDoc, ids: string[], textVerticalAlign: TextVerticalAlign) => patchText(doc, ids, () => ({ textVerticalAlign }));
