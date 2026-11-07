import type { DesignDoc } from "@farsha/design-core";
import type { Box, DesignNode, Easing, Interaction, InteractionAction, MediaOp } from "@farsha/types";
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

export interface Flow {
  frameId: string;
  name: string;
}

/** Every flow of the file: the frames marked as starting points, in order, with their names ("Flow 1", "Flow 2" when unnamed). */
export function flowsOf(doc: DesignDoc): Flow[] {
  return prototypeFrames(doc)
    .filter((f) => f.flowStart)
    .map((f, i) => ({ frameId: f.id, name: (f.type === "FRAME" && f.flowName?.trim()) || `Flow ${i + 1}` }));
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
  return interactionsIn(doc, frameId, ["ON_CLICK", "ON_HOVER", "ON_DRAG", "ON_MOUSE_ENTER", "ON_MOUSE_LEAVE", "ON_MOUSE_DOWN", "ON_MOUSE_UP"]);
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

/** The frame a Conditional action leads to: its "then" frame when the variable compares true to the value, else its "else" frame (undefined when there is none). */
export function conditionTarget(doc: DesignDoc, a: Extract<InteractionAction, { type: "CONDITIONAL" }>): string | undefined {
  const v = doc.getColorVariable(a.variableId);
  if (!v) return a.elseId;
  const have = doc.resolveVariableValue(v, doc.activeModeId());
  const bothNumbers = have.trim() !== "" && a.value.trim() !== "" && Number.isFinite(Number(have)) && Number.isFinite(Number(a.value));
  const same = bothNumbers ? Number(have) === Number(a.value) : have.trim().toLowerCase() === a.value.trim().toLowerCase();
  const ok = a.op === "EQ" ? same : a.op === "NEQ" ? !same : bothNumbers && (a.op === "GT" ? Number(have) > Number(a.value) : Number(have) < Number(a.value));
  return ok ? a.thenId : a.elseId;
}

/** Where an interaction leads: the next frame and the new history, or null when it does nothing (or only opens a web address). */
export function followInteraction(doc: DesignDoc, current: string, history: string[], interaction: Interaction): { frame: string; history: string[] } | null {
  let action = interaction.action;
  if (action.type === "CONDITIONAL") {
    const targetId = conditionTarget(doc, action);
    if (!targetId) return null;
    action = { type: "NAVIGATE", targetId };
  }
  if (action.type === "OPEN_URL" || action.type === "OPEN_OVERLAY" || action.type === "SWAP_OVERLAY" || action.type === "CLOSE_OVERLAY" || action.type === "SCROLL_TO" || action.type === "SET_MODE" || action.type === "SET_VARIABLE" || action.type === "CHANGE_TO" || action.type === "MEDIA") return null;
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
  if (action.type !== "OPEN_OVERLAY" && action.type !== "SWAP_OVERLAY") return null;
  const target = doc.getNode(action.targetId);
  return target?.type === "FRAME" && action.targetId !== current ? action.targetId : null;
}

/** CSS keyframes name and duration for a transition (null for an instant change). */
/** CSS timing function of an easing. The spring is a short overshoot written with linear(). */
export function easingCss(e: Easing | undefined): string {
  switch (e) {
    case "LINEAR":
      return "linear";
    case "EASE_IN":
      return "cubic-bezier(0.42, 0, 1, 1)";
    case "EASE_OUT":
      return "cubic-bezier(0, 0, 0.58, 1)";
    case "SPRING":
      return "linear(0, 0.38 8%, 0.82 18%, 1.08 30%, 1.12 38%, 1.04 52%, 0.99 66%, 1 80%, 1)";
    default:
      return "ease";
  }
}

/** The same curves as functions of progress 0..1 (used by Smart animate). */
export function easingFn(e: Easing | undefined): (t: number) => number {
  const bezier = (p1x: number, p1y: number, p2x: number, p2y: number) => (t: number) => {
    // solve x(u) = t by bisection, then return y(u)
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 24; i++) {
      const u = (lo + hi) / 2;
      const x = 3 * (1 - u) * (1 - u) * u * p1x + 3 * (1 - u) * u * u * p2x + u * u * u;
      if (x < t) lo = u;
      else hi = u;
    }
    const u = (lo + hi) / 2;
    return 3 * (1 - u) * (1 - u) * u * p1y + 3 * (1 - u) * u * u * p2y + u * u * u;
  };
  switch (e) {
    case "LINEAR":
      return (t) => t;
    case "EASE_IN":
      return bezier(0.42, 0, 1, 1);
    case "EASE_OUT":
      return bezier(0, 0, 0.58, 1);
    case "SPRING":
      return (t) => 1 - Math.exp(-6 * t) * Math.cos(10 * t);
    default:
      return bezier(0.42, 0, 0.58, 1);
  }
}

/** CSS keyframes name, duration and timing function for a transition (null for an instant change). */
export function transitionAnimation(t: Interaction["transition"]): { name: string; durationMs: number; timing: string; leave?: string } | null {
  if (!t || t.type === "INSTANT" || t.type === "SMART_ANIMATE") return null;
  const names: Record<string, string> = { DISSOLVE: "presenter-dissolve", SLIDE_IN_LEFT: "presenter-slide-left", SLIDE_IN_RIGHT: "presenter-slide-right", SLIDE_IN_TOP: "presenter-slide-top", SLIDE_IN_BOTTOM: "presenter-slide-bottom" };
  // Move out: the old frame leaves toward a side and reveals the new one. Push: the new frame comes in from a side and pushes the old one out the opposite way.
  const opposite: Record<string, string> = { left: "right", right: "left", top: "bottom", bottom: "top" };
  const side = t.type.split("_").pop()!.toLowerCase();
  let name = names[t.type];
  let leave: string | undefined;
  if (t.type.startsWith("MOVE_OUT_")) {
    name = "presenter-hold";
    leave = `presenter-out-${side}`;
  } else if (t.type.startsWith("PUSH_")) {
    name = `presenter-slide-${side}`;
    leave = `presenter-out-${opposite[side] ?? side}`;
  }
  if (!name) return null;
  return { name, durationMs: Math.min(5000, Math.max(50, Number.isFinite(t.durationMs) ? t.durationMs : 300)), timing: easingCss(t.easing), ...(leave ? { leave } : {}) };
}

/** How big the prototype stage is in a window: fit the whole frame, or (vertical scrolling) fit the width and scroll the rest. */
export type ScrollMode = "NONE" | "VERTICAL" | "HORIZONTAL" | "BOTH";

/**
 * How big the prototype stage is in a window: fit the whole frame, or fit the width and scroll down (VERTICAL),
 * fit the height and scroll across (HORIZONTAL), or show it at the size that fills the window's width and scroll both ways (BOTH).
 */
export type PresentScale = "FIT" | "FILL" | "ACTUAL";

/** `zoom` only matters for a frame without scrolling: FIT shows it whole, FILL covers the window (the edges are cropped), ACTUAL shows it at 100%. */
export function stageLayout(frame: { width: number; height: number }, win: { w: number; h: number }, scroll: ScrollMode | boolean, zoom: PresentScale = "FIT"): { scale: number; stageWidth: number; stageHeight: number } {
  const mode: ScrollMode = scroll === true ? "VERTICAL" : scroll === false ? "NONE" : scroll;
  const maxW = Math.max(1, win.w - 40);
  const maxH = Math.max(1, win.h - 40);
  const scale =
    mode === "VERTICAL" ? Math.min(maxW / frame.width, 4) : mode === "HORIZONTAL" ? Math.min(maxH / frame.height, 4) : mode === "BOTH" ? 1 : zoom === "ACTUAL" ? 1 : zoom === "FILL" ? Math.min(Math.max(maxW / frame.width, maxH / frame.height), 4) : Math.min(maxW / frame.width, maxH / frame.height, 4);
  const w = frame.width * scale;
  const h = frame.height * scale;
  const crop = mode === "NONE" && zoom !== "FIT";
  return {
    scale,
    stageWidth: mode === "HORIZONTAL" || mode === "BOTH" || crop ? Math.min(w, maxW) : w,
    stageHeight: mode === "VERTICAL" || mode === "BOTH" || crop ? Math.min(h, maxH) : h,
  };
}

/** Where a layer sits inside a frame (relative to it), or null when it is not inside. */
export function layerBoxIn(doc: DesignDoc, frameId: string, layerId: string): Box | null {
  const origin = doc.absoluteBox(frameId);
  const abs = doc.absoluteBox(layerId);
  if (!origin || !abs || (layerId !== frameId && !doc.isAncestor(frameId, layerId))) return null;
  return { x: abs.x - origin.x, y: abs.y - origin.y, width: abs.width, height: abs.height };
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

/** The state of a video after a media control: playing or paused, muted or not, and the playback time (skips stay between 0 and the length). */
export function mediaState(
  op: MediaOp,
  now: { paused: boolean; muted: boolean; time: number; duration: number },
  seconds = 10,
): { paused: boolean; muted: boolean; time: number } {
  const skip = Number.isFinite(seconds) && seconds > 0 ? Math.min(3600, seconds) : 10;
  const length = Number.isFinite(now.duration) && now.duration > 0 ? now.duration : Infinity;
  const clamp = (t: number) => Math.min(length, Math.max(0, t));
  let { paused, muted, time } = now;
  if (op === "PLAY") paused = false;
  else if (op === "PAUSE") paused = true;
  else if (op === "TOGGLE_PLAY") paused = !paused;
  else if (op === "MUTE") muted = true;
  else if (op === "UNMUTE") muted = false;
  else if (op === "TOGGLE_MUTE") muted = !muted;
  else if (op === "SKIP_FORWARD") time = clamp(time + skip);
  else if (op === "SKIP_BACK") time = clamp(time - skip);
  return { paused, muted, time };
}
