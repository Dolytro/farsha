import type { DesignDoc } from "@farsha/design-core";
import { topLevelOf } from "./clipboard";

/** Figma's "Create component" (Ctrl+Alt+K): a frame becomes a main component, anything else is wrapped in one. With several layers selected each one gets its own component ("Create multiple components"). */
export function createComponentFromSelection(doc: DesignDoc, ids: string[]): string[] {
  const tops = topLevelOf(doc, ids);
  if (!tops.length) return ids;
  doc.stopCapturing();
  const made = tops.map((id) => doc.createComponent([id]));
  doc.stopCapturing();
  return made;
}

/** Figma's "Detach instance" (Ctrl+Alt+B). Returns the detached frames. */
export function detachSelection(doc: DesignDoc, ids: string[]): string[] {
  const roots = [...new Set(ids.map((id) => doc.instanceOf(id)?.id).filter((id): id is string => !!id))];
  if (!roots.length) return ids;
  doc.stopCapturing();
  roots.forEach((id) => doc.detachInstance(id));
  doc.stopCapturing();
  return roots;
}

/** Figma's "Reset all overrides". */
export function resetSelection(doc: DesignDoc, ids: string[]): void {
  const roots = new Set(ids.map((id) => doc.instanceOf(id)?.id).filter((id): id is string => !!id));
  doc.stopCapturing();
  roots.forEach((id) => doc.resetOverrides(id));
  doc.stopCapturing();
}

/** The main components the selected instances point to. */
export function mainsOf(doc: DesignDoc, ids: string[]): string[] {
  return [...new Set(ids.map((id) => doc.instanceOf(id)).map((n) => (n && n.type === "FRAME" ? n.componentId : undefined)).filter((id): id is string => !!id && doc.hasNode(id)))];
}

/** Figma's "Push changes to main component": the overrides of the selected instances become part of their main components. Returns how many properties were pushed. */
export function pushSelectionToMain(doc: DesignDoc, ids: string[]): number {
  const roots = [...new Set(ids.map((id) => doc.instanceOf(id)?.id).filter((id): id is string => !!id))];
  doc.stopCapturing();
  let pushed = 0;
  for (const id of roots) pushed += doc.pushOverridesToMain(id);
  doc.stopCapturing();
  return pushed;
}
