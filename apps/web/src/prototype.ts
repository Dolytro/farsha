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

/** The frame a presentation starts from: the selected layer's frame, else the first flow starting point, else the first frame. */
export function startFrame(doc: DesignDoc, selection: string[]): string | undefined {
  const frames = prototypeFrames(doc);
  return topFrameOf(doc, selection[0])?.id ?? frames.find((f) => f.flowStart)?.id ?? frames[0]?.id;
}

export interface Hotspot {
  id: string;
  box: Box;
  interaction: Interaction;
}

/** Interactions of the layers of a frame with the given triggers, with the layer's box relative to the frame. Hidden layers are skipped. */
export function interactionsIn(doc: DesignDoc, frameId: string, triggers: Interaction["trigger"][]): Hotspot[] {
  const origin = doc.absoluteBox(frameId);
  if (!origin) return [];
  const out: Hotspot[] = [];
  for (const n of [doc.getNode(frameId)!, ...doc.descendants(frameId)]) {
    if (!n.visible) continue;
    const abs = doc.absoluteBox(n.id);
    if (!abs) continue;
    for (const interaction of n.interactions ?? []) {
      if (triggers.includes(interaction.trigger)) out.push({ id: n.id, box: { x: abs.x - origin.x, y: abs.y - origin.y, width: abs.width, height: abs.height }, interaction });
    }
  }
  return out;
}

/** Clickable and hoverable areas inside a frame, relative to the frame; layers drawn later (on top) come last. */
export function hotspotsIn(doc: DesignDoc, frameId: string): Hotspot[] {
  return interactionsIn(doc, frameId, ["ON_CLICK", "ON_HOVER"]);
}

/** Interactions that start by themselves after a delay, or when a key is pressed. */
export function timedAndKeyIn(doc: DesignDoc, frameId: string): Hotspot[] {
  return interactionsIn(doc, frameId, ["AFTER_DELAY", "ON_KEY"]);
}

/** Only web addresses may be opened from a prototype. */
export function safeUrl(url: string): string | null {
  try {
    const u = new URL(url.trim());
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
}

/** Where an interaction leads: the next frame and the new history, or null when it does nothing (or only opens a web address). */
export function followInteraction(doc: DesignDoc, current: string, history: string[], interaction: Interaction): { frame: string; history: string[] } | null {
  const action = interaction.action;
  if (action.type === "OPEN_URL" || action.type === "OPEN_OVERLAY" || action.type === "CLOSE_OVERLAY") return null;
  if (action.type === "BACK") {
    const prev = history[history.length - 1];
    return prev ? { frame: prev, history: history.slice(0, -1) } : null;
  }
  const target = doc.getNode(action.targetId);
  if (target?.type !== "FRAME" || action.targetId === current) return null;
  return { frame: action.targetId, history: [...history, current] };
}

/** The frame an Open overlay interaction shows, when it still exists and is not the frame already on screen. */
export function overlayTarget(doc: DesignDoc, current: string, interaction: Interaction): string | null {
  const action = interaction.action;
  if (action.type !== "OPEN_OVERLAY") return null;
  const target = doc.getNode(action.targetId);
  return target?.type === "FRAME" && action.targetId !== current ? action.targetId : null;
}

/** CSS keyframes name and duration for a transition (null for an instant change). */
export function transitionAnimation(t: Interaction["transition"]): { name: string; durationMs: number } | null {
  if (!t || t.type === "INSTANT") return null;
  const name = { DISSOLVE: "presenter-dissolve", SLIDE_IN_LEFT: "presenter-slide-left", SLIDE_IN_RIGHT: "presenter-slide-right", SLIDE_IN_TOP: "presenter-slide-top", SLIDE_IN_BOTTOM: "presenter-slide-bottom" }[t.type];
  return { name, durationMs: Math.min(5000, Math.max(50, Number.isFinite(t.durationMs) ? t.durationMs : 300)) };
}
