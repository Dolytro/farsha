import type { DesignDoc } from "@canvylo/design-core";
import type { Box, DesignNode, Interaction } from "@canvylo/types";
import { topLevelFrames } from "./section-actions";

/** Top-level frames of every page: the screens a prototype can navigate between. */
export function prototypeFrames(doc: DesignDoc): DesignNode[] {
  return doc.pages().flatMap((p) => topLevelFrames(doc, p.id));
}

/** The top-level frame a layer lives in (or the layer itself when it is one). */
export function topFrameOf(doc: DesignDoc, id: string | undefined): DesignNode | undefined {
  let cur = id ? doc.getNode(id) : undefined;
  // sections are only folders: a frame directly inside one is still a top-level frame
  const screenParent = (n: DesignNode | undefined) => !n || n.type === "PAGE" || (n.type === "FRAME" && !!n.isSection);
  while (cur?.parentId && !screenParent(doc.getNode(cur.parentId))) cur = doc.getNode(cur.parentId);
  return cur?.type === "FRAME" && !cur.isSection ? cur : undefined;
}

/** The frame a presentation starts from: the selected layer's frame, else the first frame. */
export function startFrame(doc: DesignDoc, selection: string[]): string | undefined {
  return topFrameOf(doc, selection[0])?.id ?? prototypeFrames(doc)[0]?.id;
}

export interface Hotspot {
  id: string;
  box: Box;
  interaction: Interaction;
}

/** Clickable areas inside a frame, relative to the frame; layers drawn later (on top) come last. */
export function hotspotsIn(doc: DesignDoc, frameId: string): Hotspot[] {
  const origin = doc.absoluteBox(frameId);
  if (!origin) return [];
  const out: Hotspot[] = [];
  for (const n of [doc.getNode(frameId)!, ...doc.descendants(frameId)]) {
    const interaction = n.visible ? n.interactions?.find((i) => i.trigger === "ON_CLICK") : undefined;
    const abs = interaction ? doc.absoluteBox(n.id) : undefined;
    if (interaction && abs) out.push({ id: n.id, box: { x: abs.x - origin.x, y: abs.y - origin.y, width: abs.width, height: abs.height }, interaction });
  }
  return out;
}

/** Where a click leads: the next frame and the new history, or null when the click does nothing. */
export function followInteraction(doc: DesignDoc, current: string, history: string[], interaction: Interaction): { frame: string; history: string[] } | null {
  const action = interaction.action;
  if (action.type === "BACK") {
    const prev = history[history.length - 1];
    return prev ? { frame: prev, history: history.slice(0, -1) } : null;
  }
  const target = doc.getNode(action.targetId);
  if (target?.type !== "FRAME" || action.targetId === current) return null;
  return { frame: action.targetId, history: [...history, current] };
}
