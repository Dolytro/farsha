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
    const box = { x: abs.x - origin.x, y: abs.y - origin.y, width: abs.width, height: abs.height };
    for (const interaction of n.interactions ?? []) {
      if (triggers.includes(interaction.trigger)) out.push({ id: n.id, box, interaction });
    }
    // a text link behaves like an On click, Open link interaction
    const link = n.type === "TEXT" ? n.textLink : undefined;
    if (link && triggers.includes("ON_CLICK")) out.push({ id: n.id, box, interaction: { trigger: "ON_CLICK", action: { type: "OPEN_URL", url: link } } });
  }
  return out;
}

/** Clickable, hoverable and draggable areas inside a frame, relative to the frame; layers drawn later (on top) come last. */
export function hotspotsIn(doc: DesignDoc, frameId: string): Hotspot[] {
  return interactionsIn(doc, frameId, ["ON_CLICK", "ON_HOVER", "ON_DRAG"]);
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
  if (!t || t.type === "INSTANT" || t.type === "SMART_ANIMATE") return null;
  const name = { DISSOLVE: "presenter-dissolve", SLIDE_IN_LEFT: "presenter-slide-left", SLIDE_IN_RIGHT: "presenter-slide-right", SLIDE_IN_TOP: "presenter-slide-top", SLIDE_IN_BOTTOM: "presenter-slide-bottom" }[t.type];
  return { name, durationMs: Math.min(5000, Math.max(50, Number.isFinite(t.durationMs) ? t.durationMs : 300)) };
}

/** How big the prototype stage is in a window: fit the whole frame, or (vertical scrolling) fit the width and scroll the rest. */
export function stageLayout(frame: { width: number; height: number }, win: { w: number; h: number }, scrolls: boolean): { scale: number; stageHeight: number } {
  const maxW = Math.max(1, win.w - 40);
  const maxH = Math.max(1, win.h - 40);
  const scale = scrolls ? Math.min(maxW / frame.width, 4) : Math.min(maxW / frame.width, maxH / frame.height, 4);
  return { scale, stageHeight: scrolls ? Math.min(frame.height * scale, maxH) : frame.height * scale };
}

export interface Connector {
  /** The layer that carries the interaction. */
  id: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
}

/** Arrows for the Prototype tab: from every layer with a Navigate or Open overlay interaction (page coordinates) to the left edge of its destination frame. */
export function connectorsIn(doc: DesignDoc, pageId: string): Connector[] {
  const out: Connector[] = [];
  for (const n of doc.descendants(pageId)) {
    if (!n.visible) continue;
    for (const it of n.interactions ?? []) {
      if (it.action.type !== "NAVIGATE" && it.action.type !== "OPEN_OVERLAY") continue;
      const target = doc.getNode(it.action.targetId);
      const from = doc.absoluteBox(n.id);
      const to = target?.type === "FRAME" ? doc.absoluteBox(target.id) : undefined;
      if (!from || !to || target!.id === n.id) continue;
      const toLeft = to.x >= from.x + from.width;
      out.push({ id: n.id, from: { x: from.x + from.width, y: from.y + from.height / 2 }, to: { x: toLeft ? to.x : to.x + to.width, y: to.y + Math.min(to.height / 2, 60) } });
    }
  }
  return out;
}

/** A smooth curve between two points that leaves sideways and arrives sideways (SVG path data). */
export function connectorPath(c: Connector): string {
  const dx = Math.max(40, Math.abs(c.to.x - c.from.x) / 2);
  const dir = c.to.x >= c.from.x ? 1 : -1;
  return `M${c.from.x} ${c.from.y} C${c.from.x + dx * dir} ${c.from.y} ${c.to.x - dx * dir} ${c.to.y} ${c.to.x} ${c.to.y}`;
}

export interface VideoSpot {
  id: string;
  assetId: string;
  /** Position and size relative to the frame. */
  box: Box;
}

/** The video layers inside a frame (visible ones), for the prototype to play. */
export function videosIn(doc: DesignDoc, frameId: string): VideoSpot[] {
  const origin = doc.absoluteBox(frameId);
  if (!origin) return [];
  const out: VideoSpot[] = [];
  for (const n of doc.descendants(frameId)) {
    if (!n.visible || n.type !== "RECTANGLE" || !n.videoAssetId) continue;
    const abs = doc.absoluteBox(n.id);
    if (abs) out.push({ id: n.id, assetId: n.videoAssetId, box: { x: abs.x - origin.x, y: abs.y - origin.y, width: abs.width, height: abs.height } });
  }
  return out;
}
