import * as Y from 'yjs';
import { generateKeyBetween } from 'fractional-indexing';
import { nanoid } from 'nanoid';
import type { Box, DesignNode, NodeType, StylePatch, TextPatch } from '@canvylo/types';
import { ALLOWED_CHILDREN, defaultsFor } from './defaults';

/** Transaction origin for user edits; only these are undoable. */
export const LOCAL_ORIGIN = 'canvylo:local';
const INIT_ORIGIN = 'canvylo:init';

type NodeMap = Y.Map<unknown>;
type CreateProps = Partial<Omit<DesignNode, 'id' | 'type' | 'parentId' | 'orderKey'>>;

export interface CreateNodeOptions {
  parentId: string;
  /** Position among siblings (0 = bottom of z-order). Defaults to the top. */
  index?: number;
  props?: Record<string, unknown>;
  id?: string;
}

/**
 * The Design Document: a typed facade over a Yjs doc, which is the single source of truth.
 * All mutations run inside a Yjs transaction with LOCAL_ORIGIN so Y.UndoManager can track them.
 */
export class DesignDoc {
  readonly ydoc: Y.Doc;
  private readonly nodes: Y.Map<NodeMap>;
  private readonly meta: Y.Map<string>;
  private readonly undoManager: Y.UndoManager;
  private readonly listeners = new Set<() => void>();
  private nodeCache = new Map<string, DesignNode>();
  private childIndex: Map<string, DesignNode[]> | null = null;
  private version = 0;

  constructor(ydoc: Y.Doc = new Y.Doc(), options: { init?: boolean } = {}) {
    this.ydoc = ydoc;
    this.nodes = ydoc.getMap('nodes') as Y.Map<NodeMap>;
    this.meta = ydoc.getMap('meta') as Y.Map<string>;
    this.undoManager = new Y.UndoManager(this.nodes, {
      trackedOrigins: new Set([LOCAL_ORIGIN]),
      captureTimeout: 500,
    });
    this.nodes.observeDeep(() => {
      this.nodeCache.clear();
      this.childIndex = null;
      this.version++;
      this.listeners.forEach((fn) => fn());
    });
    if (options.init !== false && !this.meta.has('rootId')) this.initialise();
  }

  private initialise(): void {
    this.ydoc.transact(() => {
      const rootId = nanoid();
      this.meta.set('rootId', rootId);
      this.putNode({ ...defaultsFor('DOCUMENT'), id: rootId, parentId: null, orderKey: 'a0', name: 'Canvylo file' });
      const pageId = nanoid();
      this.putNode({ ...defaultsFor('PAGE'), id: pageId, parentId: rootId, orderKey: 'a0', name: 'Page 1' });
    }, INIT_ORIGIN);
    this.undoManager.clear();
  }

  // ---------- reading ----------

  get rootId(): string {
    return this.meta.get('rootId') as string;
  }

  /** Increments on every change; handy for useSyncExternalStore. */
  getVersion(): number {
    return this.version;
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  getNode(id: string): DesignNode | undefined {
    const cached = this.nodeCache.get(id);
    if (cached) return cached;
    const map = this.nodes.get(id);
    if (!map) return undefined;
    const node = map.toJSON() as DesignNode;
    this.nodeCache.set(id, node);
    return node;
  }

  hasNode(id: string): boolean {
    return this.nodes.has(id);
  }

  /** Children sorted by orderKey (bottom of z-order first). */
  children(parentId: string): DesignNode[] {
    if (!this.childIndex) {
      const index = new Map<string, DesignNode[]>();
      for (const id of this.nodes.keys()) {
        const node = this.getNode(id)!;
        if (node.parentId === null) continue;
        const list = index.get(node.parentId);
        if (list) list.push(node);
        else index.set(node.parentId, [node]);
      }
      for (const list of index.values()) {
        list.sort((a, b) => (a.orderKey < b.orderKey ? -1 : a.orderKey > b.orderKey ? 1 : a.id < b.id ? -1 : 1));
      }
      this.childIndex = index;
    }
    return this.childIndex.get(parentId) ?? [];
  }

  pages(): DesignNode[] {
    return this.children(this.rootId);
  }

  /** Position of a node in page coordinates (ancestor rotation is ignored). */
  absoluteBox(id: string): Box | undefined {
    const node = this.getNode(id);
    if (!node) return undefined;
    let x = node.x;
    let y = node.y;
    let parent = node.parentId ? this.getNode(node.parentId) : undefined;
    while (parent && parent.type !== 'PAGE' && parent.type !== 'DOCUMENT') {
      x += parent.x;
      y += parent.y;
      parent = parent.parentId ? this.getNode(parent.parentId) : undefined;
    }
    return { x, y, width: node.width, height: node.height };
  }

  descendants(id: string): DesignNode[] {
    const out: DesignNode[] = [];
    const walk = (nodeId: string) => {
      for (const child of this.children(nodeId)) {
        out.push(child);
        walk(child.id);
      }
    };
    walk(id);
    return out;
  }

  isAncestor(ancestorId: string, id: string): boolean {
    let cur = this.getNode(id)?.parentId ?? null;
    while (cur) {
      if (cur === ancestorId) return true;
      cur = this.getNode(cur)?.parentId ?? null;
    }
    return false;
  }

  // ---------- operations ----------

  createNode(type: NodeType, options: CreateNodeOptions): string {
    const { parentId } = options;
    const parent = this.requireNode(parentId);
    if (!ALLOWED_CHILDREN[parent.type].includes(type)) {
      throw new Error(`Cannot place ${type} inside ${parent.type}`);
    }
    const id = options.id ?? nanoid();
    if (this.nodes.has(id)) throw new Error(`Node ${id} already exists`);
    this.transact(() => {
      this.putNode({
        ...defaultsFor(type),
        ...(options.props as CreateProps),
        id,
        type,
        parentId,
        orderKey: this.keyAt(parentId, options.index),
      } as DesignNode);
    });
    return id;
  }

  deleteNode(id: string): void {
    const node = this.requireNode(id);
    if (node.type === 'DOCUMENT') throw new Error('Cannot delete the document root');
    const doomed = [id, ...this.descendants(id).map((n) => n.id)];
    this.transact(() => {
      for (const nodeId of doomed) this.nodes.delete(nodeId);
    });
  }

  moveNode(id: string, dx: number, dy: number): void {
    const node = this.requireNode(id);
    this.setProps(id, { x: node.x + dx, y: node.y + dy });
  }

  setPosition(id: string, x: number, y: number): void {
    this.requireNode(id);
    this.setProps(id, { x, y });
  }

  /** Set any subset of the node box. Width/height are clamped to >= 0. */
  resizeNode(id: string, box: Partial<Box>): void {
    this.requireNode(id);
    const patch: Record<string, number> = {};
    for (const key of ['x', 'y', 'width', 'height'] as const) {
      const value = box[key];
      if (value === undefined) continue;
      if (!Number.isFinite(value)) throw new Error(`Invalid ${key}: ${value}`);
      patch[key] = key === 'width' || key === 'height' ? Math.max(0, value) : value;
    }
    this.setProps(id, patch);
  }

  /** Rotation in degrees, normalised to (-180, 180]. */
  rotateNode(id: string, degrees: number): void {
    this.requireNode(id);
    if (!Number.isFinite(degrees)) throw new Error(`Invalid rotation: ${degrees}`);
    let r = degrees % 360;
    if (r > 180) r -= 360;
    if (r <= -180) r += 360;
    this.setProps(id, { rotation: r });
  }

  /** Move a node to `index` among its current siblings (0 = back). */
  reorderNode(id: string, index: number): void {
    const node = this.requireNode(id);
    if (!node.parentId) throw new Error('Root cannot be reordered');
    this.setProps(id, { orderKey: this.keyAt(node.parentId, index, id) });
  }

  /** Move a node under another parent, keeping its local x/y. */
  reparentNode(id: string, newParentId: string, index?: number): void {
    const node = this.requireNode(id);
    const parent = this.requireNode(newParentId);
    if (!node.parentId) throw new Error('Root cannot be reparented');
    if (id === newParentId || this.isAncestor(id, newParentId)) throw new Error('Cannot move a node into itself');
    if (!ALLOWED_CHILDREN[parent.type].includes(node.type)) {
      throw new Error(`Cannot place ${node.type} inside ${parent.type}`);
    }
    this.setProps(id, { parentId: newParentId, orderKey: this.keyAt(newParentId, index, id) });
  }

  setStyle(id: string, patch: StylePatch): void {
    this.requireNode(id);
    const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    this.setProps(id, clean);
  }

  setText(id: string, patch: TextPatch): void {
    const node = this.requireNode(id);
    if (node.type !== 'TEXT') throw new Error('setText requires a TEXT node');
    const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    this.setProps(id, clean);
  }

  rename(id: string, name: string): void {
    this.requireNode(id);
    this.setProps(id, { name });
  }

  // ---------- history ----------

  undo(): void {
    this.undoManager.undo();
  }

  redo(): void {
    this.undoManager.redo();
  }

  canUndo(): boolean {
    return this.undoManager.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.undoManager.redoStack.length > 0;
  }

  /** Drop undo/redo history, e.g. after loading seed content that should not be undoable. */
  clearHistory(): void {
    this.undoManager.clear();
  }

  /** Close the current undo step, so the next edit starts a new one (call at gesture boundaries). */
  stopCapturing(): void {
    this.undoManager.stopCapturing();
  }

  // ---------- sync ----------

  encodeState(): Uint8Array {
    return Y.encodeStateAsUpdate(this.ydoc);
  }

  applyUpdate(update: Uint8Array): void {
    Y.applyUpdate(this.ydoc, update, 'canvylo:remote');
  }

  // ---------- internals ----------

  private requireNode(id: string): DesignNode {
    const node = this.getNode(id);
    if (!node) throw new Error(`Node ${id} not found`);
    return node;
  }

  private transact(fn: () => void): void {
    this.ydoc.transact(fn, LOCAL_ORIGIN);
  }

  private putNode(node: DesignNode): void {
    const map: NodeMap = new Y.Map();
    for (const [key, value] of Object.entries(node)) map.set(key, value);
    this.nodes.set(node.id, map);
  }

  private setProps(id: string, patch: Record<string, unknown>): void {
    const map = this.nodes.get(id)!;
    this.transact(() => {
      for (const [key, value] of Object.entries(patch)) map.set(key, value);
    });
  }

  /** Fractional key for inserting under `parentId` at `index`, ignoring `excludeId`. */
  private keyAt(parentId: string, index: number | undefined, excludeId?: string): string {
    const siblings = this.children(parentId).filter((n) => n.id !== excludeId);
    const i = index === undefined ? siblings.length : Math.max(0, Math.min(index, siblings.length));
    return generateKeyBetween(siblings[i - 1]?.orderKey ?? null, siblings[i]?.orderKey ?? null);
  }
}
