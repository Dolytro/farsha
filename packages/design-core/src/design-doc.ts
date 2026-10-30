import * as Y from 'yjs';
import { generateKeyBetween } from 'fractional-indexing';
import { nanoid } from 'nanoid';
import { TEXT_STYLE_KEYS, type Box, type DesignNode, type FillStyle, type NodeType, type Paint, type StylePatch, type TextPatch, type TextStyle } from '@canvylo/types';
import { computeAutoLayout } from './auto-layout';
import { applyConstraints } from './constraints';
import { ALLOWED_CHILDREN, defaultsFor } from './defaults';

/** Transaction origin for user edits; only these are undoable. */
export const LOCAL_ORIGIN = 'canvylo:local';
const INIT_ORIGIN = 'canvylo:init';
/** Asset writes are not part of undo history: undoing a paste removes the layer, not the stored bytes. */
const ASSET_ORIGIN = 'canvylo:asset';

export interface StoredAsset {
  mime: string;
  bytes: Uint8Array;
}

type NodeMap = Y.Map<unknown>;

/** Keys that describe the instance link; never copied from the main component and never overridden. */
const INSTANCE_KEYS = new Set(['id', 'type', 'parentId', 'mainId', 'overrides', 'componentId', 'isComponent']);
/** Keys of an instance's own root that belong to the instance (its place on the canvas and its name). */
const ROOT_KEYS = new Set(['x', 'y', 'name', 'orderKey']);
/** Keys not copied when a main component layer is cloned into an instance. */
const CLONE_DROP = new Set(['id', 'parentId', 'mainId', 'overrides', 'componentId', 'isComponent']);
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
  /** Image bytes, keyed by asset id. Kept out of the node map so layers stay small. */
  private readonly assets: Y.Map<StoredAsset>;
  /** Colour styles, keyed by style id. */
  private readonly styles: Y.Map<FillStyle>;
  private readonly textStyleMap: Y.Map<TextStyle>;
  private readonly undoManager: Y.UndoManager;
  private readonly listeners = new Set<() => void>();
  private nodeCache = new Map<string, DesignNode>();
  private childIndex: Map<string, DesignNode[]> | null = null;
  private version = 0;

  constructor(ydoc: Y.Doc = new Y.Doc(), options: { init?: boolean } = {}) {
    this.ydoc = ydoc;
    this.nodes = ydoc.getMap('nodes') as Y.Map<NodeMap>;
    this.meta = ydoc.getMap('meta') as Y.Map<string>;
    this.assets = ydoc.getMap('assets') as Y.Map<StoredAsset>;
    this.styles = ydoc.getMap('styles') as Y.Map<FillStyle>;
    this.textStyleMap = ydoc.getMap('textStyles') as Y.Map<TextStyle>;
    this.textStyleMap.observe(() => {
      this.version++;
      this.listeners.forEach((fn) => fn());
    });
    this.styles.observe(() => {
      this.version++;
      this.listeners.forEach((fn) => fn());
    });
    // An image arriving from a collaborator (or Drive) should redraw layers that reference it.
    this.assets.observe(() => {
      this.version++;
      this.listeners.forEach((fn) => fn());
    });
    this.undoManager = new Y.UndoManager([this.nodes, this.styles, this.textStyleMap], {
      trackedOrigins: new Set([LOCAL_ORIGIN]),
      captureTimeout: 500,
    });
    this.nodes.observeDeep(() => {
      this.nodeCache.clear();
      this.childIndex = null;
      this.version++;
      this.listeners.forEach((fn) => fn());
    });
    // Keep auto layout frames laid out after every local edit. The re-layout runs inside the same undo step
    // (it follows the edit within the capture window); undo / redo and remote changes already carry their own layout.
    this.ydoc.on('afterTransaction', (tr: Y.Transaction) => {
      if (tr.origin !== LOCAL_ORIGIN || this.relayouting || this.syncing || tr.changed.size === 0) return;
      this.syncStyles();
      this.syncInstances();
      this.relayout();
    });
    if (options.init !== false && !this.meta.has('rootId')) this.initialise();
  }

  /** Move / resize the children of a resized frame by their constraints, and carry on into child frames. */
  private followParent(frameId: string, from: { width: number; height: number }, to: { width: number; height: number }): void {
    for (const c of this.children(frameId)) {
      const box = applyConstraints(c, from, to);
      this.noOverride = true;
      try {
        this.setProps(c.id, { x: box.x, y: box.y, width: box.width, height: box.height });
      } finally {
        this.noOverride = false;
      }
      if (c.type === 'FRAME' && !c.layoutMode && (box.width !== c.width || box.height !== c.height)) {
        this.followParent(c.id, { width: c.width, height: c.height }, { width: box.width, height: box.height });
      }
    }
  }

  private relayouting = false;
  private syncing = false;
  /** Set while the document itself moves layers (constraints), so those moves do not count as user overrides. */
  private noOverride = false;

  // ---------- components ----------

  /** parentId -> child ids sorted by orderKey, read straight from Yjs (the caches are stale while a transaction is open). */
  private rawChildren(): Map<string, string[]> {
    const index = new Map<string, { id: string; key: string }[]>();
    for (const [id, map] of this.nodes.entries()) {
      const parent = map.get('parentId') as string | null;
      if (!parent) continue;
      const entry = { id, key: map.get('orderKey') as string };
      const list = index.get(parent);
      if (list) list.push(entry);
      else index.set(parent, [entry]);
    }
    const out = new Map<string, string[]>();
    for (const [parent, list] of index) {
      list.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : a.id < b.id ? -1 : 1));
      out.set(parent, list.map((e) => e.id));
    }
    return out;
  }

  /** Layers that use a colour style take its paints; a deleted style just leaves the layer with its current fills. */
  private syncStyles(): void {
    this.syncing = true;
    try {
      this.transact(() => {
        for (const map of this.nodes.values()) {
          const styleId = map.get('fillStyleId') as string | undefined;
          if (styleId) {
            const style = this.styles.get(styleId);
            if (!style) map.delete('fillStyleId');
            else if (JSON.stringify(map.get('fills')) !== JSON.stringify(style.paints)) map.set('fills', style.paints);
          }
          const textStyleId = map.get('textStyleId') as string | undefined;
          if (textStyleId) {
            const style = this.textStyleMap.get(textStyleId);
            if (!style) map.delete('textStyleId');
            else {
              for (const key of TEXT_STYLE_KEYS) {
                if (JSON.stringify(map.get(key)) !== JSON.stringify(style[key])) map.set(key, style[key]);
              }
            }
          }
        }
      });
    } finally {
      this.syncing = false;
    }
  }

  /** Make every instance mirror its main component, except for the properties the instance overrides. */
  private syncInstances(): void {
    this.syncing = true;
    try {
      this.transact(() => {
        for (let pass = 0; pass < 4; pass++) {
          const kids = this.rawChildren();
          let changed = false;
          for (const [id, map] of [...this.nodes.entries()]) {
            const componentId = map.get('componentId') as string | undefined;
            if (!componentId) continue;
            const main = this.nodes.get(componentId);
            if (!main || !main.get('isComponent') || this.insideRaw(id, componentId)) {
              this.stripInstance(id, kids);
              changed = true;
            } else if (this.syncNode(componentId, id, true, kids)) changed = true;
          }
          if (!changed) break;
        }
      });
    } finally {
      this.syncing = false;
    }
  }

  /** True when `id` is `ancestorId` or sits somewhere below it, read straight from Yjs. */
  private insideRaw(id: string, ancestorId: string): boolean {
    for (let cur: string | null | undefined = id, n = 0; cur && n < 1000; n++) {
      if (cur === ancestorId) return true;
      cur = this.nodes.get(cur)?.get('parentId') as string | null | undefined;
    }
    return false;
  }

  private syncNode(srcId: string, dstId: string, root: boolean, kids: Map<string, string[]>): boolean {
    const src = this.nodes.get(srcId)!;
    const dst = this.nodes.get(dstId)!;
    const overridden = new Set((dst.get('overrides') as string[] | undefined) ?? []);
    const skip = (key: string) => INSTANCE_KEYS.has(key) || overridden.has(key) || (root && ROOT_KEYS.has(key));
    let changed = false;
    for (const key of src.keys()) {
      if (skip(key)) continue;
      const value = src.get(key);
      if (JSON.stringify(value) !== JSON.stringify(dst.get(key))) {
        dst.set(key, value);
        changed = true;
      }
    }
    for (const key of [...dst.keys()]) {
      if (skip(key) || src.has(key)) continue;
      dst.delete(key);
      changed = true;
    }
    const srcKids = kids.get(srcId) ?? [];
    const dstKids = kids.get(dstId) ?? [];
    const mirrored = new Map<string, string>();
    for (const k of dstKids) {
      const m = this.nodes.get(k)!.get('mainId') as string | undefined;
      if (m) mirrored.set(m, k);
    }
    for (const sk of srcKids) {
      const dk = mirrored.get(sk);
      if (dk) {
        if (this.syncNode(sk, dk, false, kids)) changed = true;
      } else {
        this.cloneInto(sk, dstId, kids);
        changed = true;
      }
    }
    const live = new Set(srcKids);
    for (const dk of dstKids) {
      const m = this.nodes.get(dk)!.get('mainId') as string | undefined;
      if (m && !live.has(m)) {
        this.deleteRaw(dk, kids);
        changed = true;
      }
    }
    return changed;
  }

  /** Copy a main component layer (and its subtree) under `parentId` as an instance layer that remembers its source. */
  private cloneInto(srcId: string, parentId: string, kids: Map<string, string[]>): void {
    const src = this.nodes.get(srcId)!;
    const id = nanoid();
    const map: NodeMap = new Y.Map();
    for (const [key, value] of src.entries()) {
      if (!CLONE_DROP.has(key)) map.set(key, value);
    }
    map.set('id', id);
    map.set('parentId', parentId);
    map.set('mainId', srcId);
    this.nodes.set(id, map);
    for (const k of kids.get(srcId) ?? []) this.cloneInto(k, id, kids);
  }

  private deleteRaw(id: string, kids: Map<string, string[]>): void {
    for (const k of kids.get(id) ?? []) this.deleteRaw(k, kids);
    this.nodes.delete(id);
  }

  private stripInstance(id: string, kids: Map<string, string[]>): void {
    const map = this.nodes.get(id)!;
    map.delete('componentId');
    map.delete('overrides');
    for (const k of kids.get(id) ?? []) {
      this.nodes.get(k)!.delete('mainId');
      this.stripInstance(k, kids);
    }
  }

  /** The instance a layer belongs to (the layer itself or an ancestor), if any. */
  instanceOf(id: string): DesignNode | undefined {
    for (let n = this.getNode(id); n; n = n.parentId ? this.getNode(n.parentId) : undefined) {
      if (n.type === 'FRAME' && n.componentId) return n;
    }
    return undefined;
  }

  /** Turn a frame into a main component, or wrap other layers (which share a parent) in a new main component. */
  createComponent(ids: string[]): string {
    const nodes = ids.map((id) => this.requireNode(id));
    if (!nodes.length) throw new Error('Nothing to turn into a component');
    const parentId = nodes[0]!.parentId;
    if (!parentId || nodes.some((n) => n.parentId !== parentId)) throw new Error('Layers must share a parent');
    if (nodes.some((n) => n.mainId)) throw new Error('Cannot make a component from a layer inside an instance');
    const only = nodes[0]!;
    if (nodes.length === 1 && only.type === 'FRAME' && !only.componentId) {
      this.setProps(only.id, { isComponent: true });
      return only.id;
    }
    const order = this.children(parentId).map((n) => n.id);
    const sorted = [...nodes].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    const x = Math.min(...sorted.map((n) => n.x));
    const y = Math.min(...sorted.map((n) => n.y));
    const right = Math.max(...sorted.map((n) => n.x + n.width));
    const bottom = Math.max(...sorted.map((n) => n.y + n.height));
    let wrapperId = '';
    this.transact(() => {
      wrapperId = this.createNode('FRAME', {
        parentId,
        index: order.indexOf(sorted[0]!.id),
        props: { name: sorted[0]!.name, x, y, width: right - x, height: bottom - y, fills: [], clipsContent: false, isComponent: true },
      });
      for (const n of sorted) {
        this.reparentNode(n.id, wrapperId);
        this.setProps(n.id, { x: n.x - x, y: n.y - y });
      }
    });
    return wrapperId;
  }

  /** Place a new instance of a main component. */
  createInstance(componentId: string, parentId: string, x = 0, y = 0, index?: number): string {
    const main = this.requireNode(componentId);
    if (main.type !== 'FRAME' || !main.isComponent) throw new Error('Not a main component');
    if (parentId === componentId || this.isAncestor(componentId, parentId)) throw new Error('Cannot place a component inside itself');
    let id = '';
    this.transact(() => {
      id = this.createNode('FRAME', { parentId, index, props: { name: main.name, x, y, width: main.width, height: main.height, componentId } });
    });
    return id;
  }

  /** Cut an instance loose from its main component; it becomes a plain frame with the layers it has now. */
  detachInstance(id: string): void {
    const node = this.requireNode(id);
    if (node.type !== 'FRAME' || !node.componentId) throw new Error('Not an instance');
    this.transact(() => this.stripInstance(id, this.rawChildren()));
  }

  /** Drop every override inside an instance so it matches its main component again. */
  resetOverrides(id: string): void {
    this.requireNode(id);
    this.transact(() => {
      for (const n of [this.getNode(id)!, ...this.descendants(id)]) {
        const map = this.nodes.get(n.id)!;
        if (map.has('overrides')) map.delete('overrides');
      }
    });
  }

  /** Lay out every auto layout frame, repeating while a pass changed sizes (a child that fills its parent may need its own children re-laid out). */
  private relayout(): void {
    for (let pass = 0; pass < 4; pass++) if (!this.relayoutPass()) break;
  }

  /** One pass over every auto layout frame, innermost first so hugging parents see their children's new sizes. Returns whether anything moved or resized. */
  private relayoutPass(): boolean {
    let changed = false;
    const frames: { id: string; depth: number }[] = [];
    for (const id of this.nodes.keys()) {
      const n = this.getNode(id);
      if (n?.type !== 'FRAME' || (n.layoutMode !== 'HORIZONTAL' && n.layoutMode !== 'VERTICAL')) continue;
      let depth = 0;
      for (let p = n.parentId ? this.getNode(n.parentId) : undefined; p; p = p.parentId ? this.getNode(p.parentId) : undefined) depth++;
      frames.push({ id, depth });
    }
    if (!frames.length) return false;
    frames.sort((a, b) => b.depth - a.depth);
    this.relayouting = true;
    try {
      for (const { id } of frames) {
        const frame = this.getNode(id);
        if (frame?.type !== 'FRAME') continue;
        const kids = this.children(id).filter((c) => c.visible);
        const result = computeAutoLayout(
          frame,
          kids.map((c) => ({ id: c.id, width: c.width, height: c.height, fillWidth: c.layoutSizingH === 'FILL', fillHeight: c.layoutSizingV === 'FILL' })),
        );
        if (!result) continue;
        const moves = kids.filter((c) => {
          const p = result.positions[c.id]!;
          return Math.abs(p.x - c.x) > 1e-6 || Math.abs(p.y - c.y) > 1e-6;
        });
        const resize = Math.abs(result.width - frame.width) > 1e-6 || Math.abs(result.height - frame.height) > 1e-6;
        const resized = kids.filter((c) => {
          const s = result.sizes[c.id];
          return !!s && (Math.abs(s.width - c.width) > 1e-6 || Math.abs(s.height - c.height) > 1e-6);
        });
        if (!moves.length && !resize && !resized.length) continue;
        changed = true;
        this.transact(() => {
          for (const c of resized) {
            const map = this.nodes.get(c.id)!;
            map.set('width', result.sizes[c.id]!.width);
            map.set('height', result.sizes[c.id]!.height);
          }
          for (const c of moves) {
            const map = this.nodes.get(c.id)!;
            map.set('x', result.positions[c.id]!.x);
            map.set('y', result.positions[c.id]!.y);
          }
          if (resize) {
            const map = this.nodes.get(id)!;
            map.set('width', Math.max(0, result.width));
            map.set('height', Math.max(0, result.height));
          }
        });
      }
    } finally {
      this.relayouting = false;
    }
    return changed;
  }

  /** Rebuild a document from bytes produced by `encodeState()`. */
  static fromState(update: Uint8Array): DesignDoc {
    const ydoc = new Y.Doc();
    Y.applyUpdate(ydoc, update, 'canvylo:remote');
    const doc = new DesignDoc(ydoc, { init: false });
    if (!doc.rootId) throw new Error('Not a Canvylo file');
    return doc;
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
    // Resizing an auto layout frame by hand makes that direction fixed (Figma).
    const node = this.getNode(id)!;
    const resizes = (patch.width !== undefined && patch.width !== node.width) || (patch.height !== undefined && patch.height !== node.height);
    if (node.type === 'FRAME' && !node.layoutMode && resizes) {
      // Children follow the frame according to their constraints.
      this.transact(() => {
        this.setProps(id, patch);
        this.followParent(id, { width: node.width, height: node.height }, { width: patch.width ?? node.width, height: patch.height ?? node.height });
      });
      return;
    }
    if (node.type === 'FRAME' && (node.layoutMode === 'HORIZONTAL' || node.layoutMode === 'VERTICAL')) {
      const horizontal = node.layoutMode === 'HORIZONTAL';
      const widthKey = horizontal ? 'primarySizing' : 'counterSizing';
      const heightKey = horizontal ? 'counterSizing' : 'primarySizing';
      const extra: Record<string, unknown> = {};
      if (patch.width !== undefined && patch.width !== node.width) extra[widthKey] = 'FIXED';
      if (patch.height !== undefined && patch.height !== node.height) extra[heightKey] = 'FIXED';
      this.setProps(id, { ...patch, ...extra });
      return;
    }
    const parent = node.parentId ? this.getNode(node.parentId) : undefined;
    if (parent?.type === 'FRAME' && (parent.layoutMode === 'HORIZONTAL' || parent.layoutMode === 'VERTICAL')) {
      const extra: Record<string, unknown> = {};
      if (patch.width !== undefined && patch.width !== node.width) extra.layoutSizingH = 'FIXED';
      if (patch.height !== undefined && patch.height !== node.height) extra.layoutSizingV = 'FIXED';
      this.setProps(id, { ...patch, ...extra });
      return;
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

  /** Replace the geometry of a VECTOR layer (used while a Line / Arrow is being drawn). */
  setVector(id: string, patch: { viewBox: string; markup: string }): void {
    if (this.requireNode(id).type !== 'VECTOR') throw new Error('setVector requires a VECTOR node');
    this.setProps(id, patch);
  }

  // ---------- colour styles ----------

  fillStyles(): FillStyle[] {
    return [...this.styles.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  getFillStyle(id: string): FillStyle | undefined {
    return this.styles.get(id);
  }

  createFillStyle(name: string, paints: Paint[]): string {
    const id = nanoid();
    this.transact(() => this.styles.set(id, { id, name: name.trim() || 'Style', paints }));
    return id;
  }

  updateFillStyle(id: string, patch: { name?: string; paints?: Paint[] }): void {
    const style = this.styles.get(id);
    if (!style) throw new Error('Style not found');
    this.transact(() =>
      this.styles.set(id, { ...style, ...(patch.name?.trim() ? { name: patch.name.trim() } : {}), ...(patch.paints ? { paints: patch.paints } : {}) }),
    );
  }

  deleteFillStyle(id: string): void {
    this.transact(() => this.styles.delete(id));
  }

  /** Give a layer a colour style (its fills now follow the style), or pass null to detach it. */
  applyFillStyle(nodeId: string, styleId: string | null): void {
    const node = this.requireNode(nodeId);
    if (!('fills' in node)) throw new Error('This layer has no fills');
    if (styleId === null) {
      this.transact(() => this.nodes.get(nodeId)!.delete('fillStyleId'));
      return;
    }
    const style = this.styles.get(styleId);
    if (!style) throw new Error('Style not found');
    this.setProps(nodeId, { fills: style.paints, fillStyleId: styleId });
  }

  // ---------- text styles ----------

  textStyles(): TextStyle[] {
    return [...this.textStyleMap.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  getTextStyle(id: string): TextStyle | undefined {
    return this.textStyleMap.get(id);
  }

  createTextStyle(name: string, props: Omit<TextStyle, 'id' | 'name'>): string {
    const id = nanoid();
    this.transact(() => this.textStyleMap.set(id, { ...props, id, name: name.trim() || 'Text style' }));
    return id;
  }

  updateTextStyle(id: string, patch: Partial<Omit<TextStyle, 'id'>>): void {
    const style = this.textStyleMap.get(id);
    if (!style) throw new Error('Style not found');
    const clean = Object.fromEntries(Object.entries(patch).filter(([k, v]) => v !== undefined && (k !== 'name' || String(v).trim())));
    this.transact(() => this.textStyleMap.set(id, { ...style, ...clean }));
  }

  deleteTextStyle(id: string): void {
    this.transact(() => this.textStyleMap.delete(id));
  }

  /** Give a text layer a text style (its font settings now follow the style), or pass null to detach it. */
  applyTextStyle(nodeId: string, styleId: string | null): void {
    const node = this.requireNode(nodeId);
    if (node.type !== 'TEXT') throw new Error('Text styles apply to text layers');
    if (styleId === null) {
      this.transact(() => this.nodes.get(nodeId)!.delete('textStyleId'));
      return;
    }
    const style = this.textStyleMap.get(styleId);
    if (!style) throw new Error('Style not found');
    this.setProps(nodeId, { ...Object.fromEntries(TEXT_STYLE_KEYS.map((k) => [k, style[k]])), textStyleId: styleId });
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

  // ---------- assets ----------

  /** Store image bytes in the document and return the asset id an IMAGE layer refers to. */
  addAsset(mime: string, bytes: Uint8Array): string {
    const id = nanoid();
    this.ydoc.transact(() => this.assets.set(id, { mime, bytes }), ASSET_ORIGIN);
    return id;
  }

  getAsset(id: string): StoredAsset | undefined {
    return this.assets.get(id);
  }

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
    const follows = !this.noOverride && (map.get('mainId') !== undefined || map.get('componentId') !== undefined);
    this.transact(() => {
      for (const [key, value] of Object.entries(patch)) map.set(key, value);
      // Changing the fills by hand detaches the layer from its colour style (Figma).
      if ('fills' in patch && !('fillStyleId' in patch)) map.delete('fillStyleId');
      if (TEXT_STYLE_KEYS.some((k) => k in patch) && !('textStyleId' in patch)) map.delete('textStyleId');
      if (!follows) return;
      const isRoot = map.get('componentId') !== undefined;
      const keys = Object.keys(patch).filter((k) => !INSTANCE_KEYS.has(k) && (isRoot ? !ROOT_KEYS.has(k) : k !== 'orderKey'));
      if (keys.length) map.set('overrides', [...new Set([...((map.get('overrides') as string[] | undefined) ?? []), ...keys])]);
    });
  }

  /** Fractional key for inserting under `parentId` at `index`, ignoring `excludeId`. */
  private keyAt(parentId: string, index: number | undefined, excludeId?: string): string {
    const siblings = this.children(parentId).filter((n) => n.id !== excludeId);
    const i = index === undefined ? siblings.length : Math.max(0, Math.min(index, siblings.length));
    return generateKeyBetween(siblings[i - 1]?.orderKey ?? null, siblings[i]?.orderKey ?? null);
  }
}
