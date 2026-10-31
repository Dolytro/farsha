import type { DesignDoc } from "@farsha/design-core";
import type { DesignNode, NodeType } from "@farsha/types";
import { fitSize } from "./images";
import { svgToClip } from "./svg-import";

/** Prefix on the clipboard text so Farsha can tell its own payload from ordinary text. */
export const CLIP_PREFIX = "farsha:";

const PASTE_STEP = 16;
const MAX_TEXT = 5000;

export interface ClipNode {
  type: NodeType;
  props: Record<string, unknown>;
  children: ClipNode[];
}

export interface ClipPayload {
  v: 1;
  /** Parent of the copied layers, used to offset a repeated paste into the same parent. */
  parentId: string | null;
  nodes: ClipNode[];
}

let pasteCount = 0;

function toClip(doc: DesignDoc, node: DesignNode, mainAsInstance = true): ClipNode {
  const { id, parentId: _p, orderKey: _o, type, ...props } = node;
  // Pasting a main component makes an instance of it (Figma); the instance fills its own layers.
  if (mainAsInstance && node.type === "FRAME" && node.isComponent) {
    const { isComponent: _c, ...rest } = props as Record<string, unknown>;
    return { type, props: { ...rest, componentId: id }, children: [] };
  }
  // An instance rebuilds its layers from the main component, so only the frame itself is copied (child overrides are not kept).
  if (node.type === "FRAME" && node.componentId) return { type, props, children: [] };
  return { type, props, children: doc.children(id).map((c) => toClip(doc, c, mainAsInstance)) };
}

/** Ctrl+D: copy each top-level layer with its whole subtree next to the original (a main component duplicates into a new main). */
export function duplicateNodes(doc: DesignDoc, ids: string[], offset = 10, closeStep = true): string[] {
  doc.stopCapturing();
  const copies = topLevelOf(doc, ids).flatMap((id) => {
    const n = doc.getNode(id);
    if (!n?.parentId) return [];
    const made = create(doc, toClip(doc, n, false), n.parentId, offset, offset);
    return made ? [made] : [];
  });
  // Alt+drag keeps the copy and the drag that follows in one undo step
  if (closeStep) doc.stopCapturing();
  return copies;
}

/** Drop ids whose ancestor is also selected, so a group and its child aren't both copied. */
export function topLevelOf(doc: DesignDoc, ids: string[]): string[] {
  return ids.filter((id) => doc.hasNode(id) && !ids.some((other) => other !== id && doc.isAncestor(other, id)));
}

/** Serialise the selection to clipboard text, or null when there is nothing copyable. */
export function copyNodes(doc: DesignDoc, ids: string[]): string | null {
  const nodes = topLevelOf(doc, ids)
    .map((id) => doc.getNode(id))
    .filter((n): n is DesignNode => !!n && !!n.parentId && n.type !== "PAGE" && n.type !== "DOCUMENT");
  if (!nodes.length) return null;
  pasteCount = 0;
  const payload: ClipPayload = { v: 1, parentId: nodes[0]!.parentId, nodes: nodes.map((n) => toClip(doc, n)) };
  return CLIP_PREFIX + JSON.stringify(payload);
}

/** Parse clipboard text written by copyNodes; null for anything else. */
export function parseClip(text: string): ClipPayload | null {
  if (!text.startsWith(CLIP_PREFIX)) return null;
  try {
    const data = JSON.parse(text.slice(CLIP_PREFIX.length)) as ClipPayload;
    return data.v === 1 && Array.isArray(data.nodes) ? data : null;
  } catch {
    return null;
  }
}

/** Where a paste lands: inside a selected frame/group, else beside the selected layer, else on the page. */
export function pasteTarget(doc: DesignDoc, selection: string[], pageId: string): string {
  const node = selection.length === 1 ? doc.getNode(selection[0]!) : undefined;
  if (!node) return pageId;
  if (node.type === "FRAME" || node.type === "GROUP") return node.id;
  return node.parentId ?? pageId;
}

function create(doc: DesignDoc, clip: ClipNode, parentId: string, dx: number, dy: number): string | null {
  try {
    const props = { ...clip.props } as Record<string, unknown> & { x?: number; y?: number };
    if (typeof props.x === "number") props.x += dx;
    if (typeof props.y === "number") props.y += dy;
    // An instance can't live inside its own main component: it lands beside it instead.
    const main = typeof props.componentId === "string" ? doc.getNode(props.componentId) : undefined;
    if (main && (parentId === main.id || doc.isAncestor(main.id, parentId))) {
      parentId = main.parentId ?? parentId;
      if (typeof props.x === "number") props.x = main.x + main.width + 20;
      if (typeof props.y === "number") props.y = main.y;
    }
    const id = doc.createNode(clip.type, { parentId, props });
    for (const child of clip.children) create(doc, child, id, 0, 0);
    return id;
  } catch {
    return null; // the target can't hold this type (e.g. a frame inside a rectangle)
  }
}

/** Paste copied layers under `parentId` as one undo step. Returns the new top-level ids. */
export function pasteNodes(doc: DesignDoc, payload: ClipPayload, parentId: string): string[] {
  const sameParent = payload.parentId === parentId;
  const step = sameParent ? PASTE_STEP * ++pasteCount : 0;
  doc.stopCapturing();
  const ids = payload.nodes.map((c) => create(doc, c, parentId, step, step)).filter((id): id is string => id !== null);
  doc.stopCapturing();
  return ids;
}

/** Which paste command the next paste event is: the event itself carries no modifier keys. */
export type PasteMode = "offset" | "over" | "replace";

let armedMode: PasteMode = "offset";

/** Remember the paste variant from the keydown that precedes the browser's paste event. */
export function armPasteMode(mode: PasteMode): void {
  armedMode = mode;
}

/** Read and reset the armed paste variant. */
export function takePasteMode(): PasteMode {
  const mode = armedMode;
  armedMode = "offset";
  return mode;
}

function clipCenter(nodes: ClipNode[]): { x: number; y: number } {
  const boxes = nodes.map((n) => ({
    x: Number(n.props.x ?? 0),
    y: Number(n.props.y ?? 0),
    w: Number(n.props.width ?? 0),
    h: Number(n.props.height ?? 0),
  }));
  const x1 = Math.min(...boxes.map((b) => b.x));
  const y1 = Math.min(...boxes.map((b) => b.y));
  const x2 = Math.max(...boxes.map((b) => b.x + b.w));
  const y2 = Math.max(...boxes.map((b) => b.y + b.h));
  return { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
}

/** Parent and box (in that parent's coordinates) that a "paste over" is centred on. */
function overTarget(doc: DesignDoc, id: string): { parentId: string; box: { x: number; y: number; width: number; height: number } } | null {
  const n = doc.getNode(id);
  if (!n?.parentId) return null;
  if (n.type === "FRAME" || n.type === "GROUP") return { parentId: n.id, box: { x: 0, y: 0, width: n.width, height: n.height } };
  return { parentId: n.parentId, box: { x: n.x, y: n.y, width: n.width, height: n.height } };
}

function pasteCentered(doc: DesignDoc, payload: ClipPayload, parentId: string, box: { x: number; y: number; width: number; height: number }): string[] {
  const c = clipCenter(payload.nodes);
  const dx = box.x + box.width / 2 - c.x;
  const dy = box.y + box.height / 2 - c.y;
  return payload.nodes.map((n) => create(doc, n, parentId, dx, dy)).filter((id): id is string => id !== null);
}

/**
 * Paste over selection (Ctrl+Shift+V): drop the copied layers centred on the single selected layer,
 * inside it when it is a frame or group. Returns null when there is no single selection.
 */
export function pasteOver(doc: DesignDoc, payload: ClipPayload, selection: string[]): string[] | null {
  const target = selection.length === 1 ? overTarget(doc, selection[0]!) : null;
  if (!target) return null;
  doc.stopCapturing();
  const ids = pasteCentered(doc, payload, target.parentId, target.box);
  doc.stopCapturing();
  return ids;
}

/**
 * Paste to replace (Ctrl+Alt+Shift+V): put the copied layers where the single selected layer is, at its
 * place in the stacking order, then delete that layer. One undo step. Null when nothing can be replaced.
 */
export function pasteReplace(doc: DesignDoc, payload: ClipPayload, selection: string[]): string[] | null {
  const node = selection.length === 1 ? doc.getNode(selection[0]!) : undefined;
  if (!node?.parentId) return null;
  const parentId = node.parentId;
  const index = doc.children(parentId).findIndex((c) => c.id === node.id);
  doc.stopCapturing();
  const ids = pasteCentered(doc, payload, parentId, { x: node.x, y: node.y, width: node.width, height: node.height });
  if (!ids.length) {
    doc.stopCapturing();
    return null;
  }
  ids.forEach((id, i) => doc.reorderNode(id, index + i));
  doc.deleteNode(node.id);
  doc.stopCapturing();
  return ids;
}

/**
 * Layers converted from another app (Figma). Their x/y are in the source's canvas coordinates, so the
 * set is moved as one block to be centred on (cx, cy). One undo step.
 */
export function pasteClips(doc: DesignDoc, clips: ClipNode[], parentId: string, cx: number, cy: number): string[] {
  if (!clips.length) return [];
  const c = clipCenter(clips);
  doc.stopCapturing();
  const ids = clips.map((n) => create(doc, n, parentId, cx - c.x, cy - c.y)).filter((id): id is string => id !== null);
  doc.stopCapturing();
  return ids;
}

/** SVG text becomes a frame of native shapes and vectors, centred on (cx, cy). One undo step. */
export function pasteSvg(doc: DesignDoc, svg: string, parentId: string, cx: number, cy: number): string[] {
  const clip = svgToClip(svg);
  if (!clip) return [];
  doc.stopCapturing();
  const id = create(doc, clip, parentId, cx - Number(clip.props.width) / 2, cy - Number(clip.props.height) / 2);
  doc.stopCapturing();
  return id ? [id] : [];
}

/** An image becomes an IMAGE layer centred on (cx, cy); its bytes go into the document. One undo step. */
export function pasteImage(doc: DesignDoc, image: { mime: string; bytes: Uint8Array; width: number; height: number }, parentId: string, cx: number, cy: number): string[] {
  const { width, height } = fitSize(image.width, image.height);
  const assetId = doc.addAsset(image.mime, image.bytes);
  doc.stopCapturing();
  const id = doc.createNode("IMAGE", { parentId, props: { name: "Image", x: Math.round(cx - width / 2), y: Math.round(cy - height / 2), width, height, assetId } });
  doc.stopCapturing();
  return [id];
}

/** Plain text on the clipboard becomes a text layer at (x, y). */
export function pasteText(doc: DesignDoc, text: string, parentId: string, x: number, y: number): string[] {
  const characters = text.trim().slice(0, MAX_TEXT);
  if (!characters) return [];
  doc.stopCapturing();
  const id = doc.createNode("TEXT", {
    parentId,
    props: { name: characters.slice(0, 40), characters, x, y, width: Math.min(600, Math.max(40, characters.length * 9)), height: 24, fills: [{ type: "SOLID", color: "#111111", opacity: 1 }] },
  });
  doc.stopCapturing();
  return [id];
}

/** Ctrl+A: every visible, unlocked sibling of the selection, or all top-level layers. */
export function selectAllIn(doc: DesignDoc, selection: string[], pageId: string): string[] {
  const first = selection[0] ? doc.getNode(selection[0]) : undefined;
  const parentId = first?.parentId ?? pageId;
  return doc.children(parentId).filter((n) => n.visible && !n.locked).map((n) => n.id);
}

/** Appearance copied by Ctrl+Alt+C (Figma's "Copy properties"). */
export interface PropertySnapshot {
  type: NodeType;
  opacity: number;
  blendMode?: string;
  fills?: unknown;
  strokes?: unknown;
  strokeWidth?: number;
  strokeAlign?: unknown;
  effects?: unknown;
  cornerRadius?: number;
  text?: { fontFamily: string; fontSize: number; fontWeight: number; lineHeight: number | "AUTO"; letterSpacing: number; textAlign: string };
}

let copiedProperties: PropertySnapshot | null = null;

/** Remember a layer's appearance (fills, strokes, radius, opacity, text style). Returns false if the layer is gone. */
export function copyProperties(doc: DesignDoc, id: string | undefined): boolean {
  const n = id ? doc.getNode(id) : undefined;
  if (!n || n.type === "PAGE" || n.type === "DOCUMENT") return false;
  const snap: PropertySnapshot = { type: n.type, opacity: n.opacity, blendMode: n.blendMode };
  if ("fills" in n) snap.fills = JSON.parse(JSON.stringify(n.fills));
  if ("strokes" in n) {
    snap.strokes = JSON.parse(JSON.stringify(n.strokes));
    snap.strokeWidth = n.strokeWidth;
    if ("strokeAlign" in n) snap.strokeAlign = n.strokeAlign;
  }
  snap.effects = JSON.parse(JSON.stringify(n.effects ?? []));
  if ("cornerRadius" in n) snap.cornerRadius = n.cornerRadius;
  if (n.type === "TEXT") {
    snap.text = { fontFamily: n.fontFamily, fontSize: n.fontSize, fontWeight: n.fontWeight, lineHeight: n.lineHeight, letterSpacing: n.letterSpacing, textAlign: n.textAlign };
  }
  copiedProperties = snap;
  return true;
}

export function hasCopiedProperties(): boolean {
  return copiedProperties !== null;
}

/** Apply the remembered appearance to each layer that can take it, as one undo step. Returns how many changed. */
export function pasteProperties(doc: DesignDoc, ids: string[]): number {
  const snap = copiedProperties;
  if (!snap) return 0;
  doc.stopCapturing();
  let changed = 0;
  for (const id of ids) {
    const n = doc.getNode(id);
    if (!n || n.type === "PAGE" || n.type === "DOCUMENT") continue;
    const style: Record<string, unknown> = { opacity: snap.opacity, blendMode: snap.blendMode ?? "NORMAL" };
    if (snap.fills !== undefined && "fills" in n) style.fills = JSON.parse(JSON.stringify(snap.fills));
    if (snap.strokes !== undefined && "strokes" in n) {
      style.strokes = JSON.parse(JSON.stringify(snap.strokes));
      style.strokeWidth = snap.strokeWidth;
      if (snap.strokeAlign !== undefined) style.strokeAlign = snap.strokeAlign;
    }
    if (snap.effects !== undefined) style.effects = JSON.parse(JSON.stringify(snap.effects));
    if (snap.cornerRadius !== undefined && "cornerRadius" in n) style.cornerRadius = snap.cornerRadius;
    doc.setStyle(id, style);
    if (snap.text && n.type === "TEXT") doc.setText(id, snap.text as Parameters<DesignDoc["setText"]>[1]);
    changed++;
  }
  doc.stopCapturing();
  return changed;
}

/** Test hook: forget remembered paste state. */
export function resetClipboardState(): void {
  pasteCount = 0;
  copiedProperties = null;
}
