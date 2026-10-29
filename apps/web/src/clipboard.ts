import type { DesignDoc } from "@canvylo/design-core";
import type { DesignNode, NodeType } from "@canvylo/types";

/** Prefix on the clipboard text so Canvylo can tell its own payload from ordinary text. */
export const CLIP_PREFIX = "canvylo:";

const PASTE_STEP = 16;
const MAX_TEXT = 5000;

export interface ClipNode {
  type: NodeType;
  props: Record<string, unknown>;
  children: ClipNode[];
}

interface ClipPayload {
  v: 1;
  /** Parent of the copied layers, used to offset a repeated paste into the same parent. */
  parentId: string | null;
  nodes: ClipNode[];
}

let pasteCount = 0;

function toClip(doc: DesignDoc, node: DesignNode): ClipNode {
  const { id, parentId: _p, orderKey: _o, type, ...props } = node;
  return { type, props, children: doc.children(id).map((c) => toClip(doc, c)) };
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

/** Test hook: forget remembered paste state. */
export function resetClipboardState(): void {
  pasteCount = 0;
}
