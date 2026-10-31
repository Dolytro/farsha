import * as Y from 'yjs';
import { generateKeyBetween } from 'fractional-indexing';
import { nanoid } from 'nanoid';
import { TEXT_STYLE_KEYS, type Comment, type ComponentProperty, type ColorVariable, type VariableMode, type Box, type DesignNode, type FillStyle, type NodeType, type Paint, type StylePatch, type TextPatch, type TextStyle } from '@canvylo/types';
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
const INSTANCE_KEYS = new Set(['id', 'type', 'parentId', 'mainId', 'overrides', 'componentId', 'isComponent', 'componentSetId', 'variantProps', 'componentProps', 'propValues']);
/** Keys of an instance's own root that belong to the instance (its place on the canvas and its name). */
const ROOT_KEYS = new Set(['x', 'y', 'name', 'orderKey']);
/** Keys not copied when a main component layer is cloned into an instance. */
const CLONE_DROP = new Set(['id', 'parentId', 'mainId', 'overrides', 'componentId', 'isComponent', 'componentSetId', 'variantProps', 'componentProps', 'propValues']);
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
  private readonly commentMap: Y.Map<Comment>;
  private readonly variableMap: Y.Map<ColorVariable>;
  private readonly modeMap: Y.Map<VariableMode & { order: number }>;
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
    this.commentMap = ydoc.getMap('comments') as Y.Map<Comment>;
    this.commentMap.observe(() => {
      this.version++;
      this.listeners.forEach((fn) => fn());
    });
    this.variableMap = ydoc.getMap('variables') as Y.Map<ColorVariable>;
    this.modeMap = ydoc.getMap('variableModes') as Y.Map<VariableMode & { order: number }>;
    for (const map of [this.variableMap, this.modeMap, this.meta]) {
      map.observe(() => {
        this.version++;
        this.listeners.forEach((fn) => fn());
      });
    }
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
    this.undoManager = new Y.UndoManager([this.nodes, this.styles, this.textStyleMap, this.variableMap, this.modeMap], {
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
      this.syncVariables();
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

  /** Paints bound to a colour variable take its value in the active mode; a deleted variable just leaves the colour as it was. */
  private syncVariables(): void {
    if (!this.variableMap.size && ![...this.nodes.values()].some((m) => this.hasBoundPaint(m) || !!m.get('textVariableId'))) return;
    this.syncing = true;
    try {
      const mode = this.activeModeId();
      const resolve = (paints: unknown): Paint[] | null => {
        if (!Array.isArray(paints)) return null;
        let changed = false;
        const next = (paints as Paint[]).map((p) => {
          if (p.type !== 'SOLID' || !p.variableId) return p;
          const v = this.variableMap.get(p.variableId);
          if (!v) {
            changed = true;
            const { variableId: _gone, ...rest } = p;
            return rest;
          }
          const color = v.values[mode] ?? Object.values(v.values)[0] ?? p.color;
          if (color === p.color) return p;
          changed = true;
          return { ...p, color };
        });
        return changed ? next : null;
      };
      this.transact(() => {
        for (const map of this.nodes.values()) {
          for (const key of ['fills', 'strokes']) {
            const next = resolve(map.get(key));
            if (next) map.set(key, next);
          }
          const textVar = map.get('textVariableId') as string | undefined;
          if (textVar) {
            const v = this.variableMap.get(textVar);
            if (!v || v.kind !== 'STRING') map.delete('textVariableId');
            else {
              const text = v.values[mode] ?? Object.values(v.values)[0] ?? '';
              if (map.get('characters') !== text) map.set('characters', text);
            }
          }
        }
      });
    } finally {
      this.syncing = false;
    }
  }

  private hasBoundPaint(map: NodeMap): boolean {
    return ['fills', 'strokes'].some((k) => {
      const paints = map.get(k);
      return Array.isArray(paints) && paints.some((p: Paint) => p.type === 'SOLID' && !!p.variableId);
    });
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
            } else if (this.syncNode(componentId, id, true, kids, this.controlledLayers(main, map))) changed = true;
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

  /** Layers of an instance whose visibility or text is set by a component property: main layer id -> the key and value to apply. */
  private controlledLayers(main: NodeMap, instance: NodeMap): Map<string, { key: 'visible' | 'characters'; value: boolean | string }> {
    const out = new Map<string, { key: 'visible' | 'characters'; value: boolean | string }>();
    const props = (main.get('componentProps') as ComponentProperty[] | undefined) ?? [];
    const values = (instance.get('propValues') as Record<string, boolean | string> | undefined) ?? {};
    for (const p of props) out.set(p.targetId, { key: p.type === 'BOOLEAN' ? 'visible' : 'characters', value: values[p.id] ?? p.defaultValue });
    return out;
  }

  private syncNode(
    srcId: string,
    dstId: string,
    root: boolean,
    kids: Map<string, string[]>,
    controlled: Map<string, { key: 'visible' | 'characters'; value: boolean | string }> = new Map(),
  ): boolean {
    const src = this.nodes.get(srcId)!;
    const dst = this.nodes.get(dstId)!;
    const overridden = new Set((dst.get('overrides') as string[] | undefined) ?? []);
    const control = controlled.get((dst.get('mainId') as string | undefined) ?? '');
    const skip = (key: string) => INSTANCE_KEYS.has(key) || overridden.has(key) || (root && ROOT_KEYS.has(key)) || key === control?.key;
    let changed = false;
    if (control && dst.get(control.key) !== control.value) {
      dst.set(control.key, control.value);
      changed = true;
    }
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
        if (this.syncNode(sk, dk, false, kids, controlled)) changed = true;
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

  // ---------- variants ----------

  /** The main components of a variant set, left to right. */
  variantsOf(mainId: string): DesignNode[] {
    const main = this.getNode(mainId);
    if (main?.type !== 'FRAME' || !main.isComponent) return [];
    if (!main.componentSetId) return [main];
    const out: DesignNode[] = [];
    for (const id of this.nodes.keys()) {
      const n = this.getNode(id);
      if (n?.type === 'FRAME' && n.isComponent && n.componentSetId === main.componentSetId) out.push(n);
    }
    return out.sort((a, b) => a.x - b.x || a.y - b.y);
  }

  /** Property names with every value used by the variants, in order of first use. */
  variantOptions(mainId: string): Record<string, string[]> {
    const options: Record<string, string[]> = {};
    for (const v of this.variantsOf(mainId)) {
      for (const [prop, value] of Object.entries(v.type === 'FRAME' ? (v.variantProps ?? {}) : {})) {
        const list = (options[prop] ??= []);
        if (!list.includes(value)) list.push(value);
      }
    }
    return options;
  }

  private copySubtree(srcId: string, parentId: string, extra: Record<string, unknown>): string {
    const { id: _id, parentId: _p, orderKey: _o, type, ...props } = this.requireNode(srcId);
    const id = this.createNode(type, { parentId, props: { ...props, ...extra } });
    for (const child of this.children(srcId)) this.copySubtree(child.id, id, {});
    return id;
  }

  /**
   * Add a variant next to a main component: a copy of it in the same set. The first time, the set gets a property
   * "Property 1" with the values "Variant 1" (the original) and "Variant 2" (the copy).
   */
  addVariant(mainId: string): string {
    const main = this.requireNode(mainId);
    if (main.type !== 'FRAME' || !main.isComponent) throw new Error('Variants need a main component');
    let created = '';
    this.transact(() => {
      const setId = main.componentSetId ?? nanoid();
      const variants = this.variantsOf(mainId);
      let props: Record<string, string>;
      if (!main.componentSetId) {
        this.setProps(mainId, { componentSetId: setId, variantProps: { 'Property 1': 'Variant 1' } });
        props = { 'Property 1': 'Variant 2' };
      } else {
        const names = Object.keys(main.variantProps ?? {});
        props = Object.fromEntries((names.length ? names : ['Property 1']).map((n) => [n, `Variant ${variants.length + 1}`]));
      }
      const right = Math.max(...variants.map((v) => v.x + v.width));
      created = this.copySubtree(mainId, main.parentId!, { componentSetId: setId, variantProps: props, x: right + 40, y: main.y });
    });
    return created;
  }

  /** Set this variant's value for a property. */
  setVariantValue(mainId: string, prop: string, value: string): void {
    const main = this.requireNode(mainId);
    if (main.type !== 'FRAME' || !main.componentSetId) throw new Error('Not a variant');
    this.setProps(mainId, { variantProps: { ...(main.variantProps ?? {}), [prop]: value } });
  }

  /** Add a property to every variant of the set. */
  addVariantProperty(mainId: string, name: string): void {
    const clean = name.trim();
    const variants = this.variantsOf(mainId);
    if (!clean || !variants.length || variants[0]!.type !== 'FRAME' || !variants[0]!.componentSetId) throw new Error('Add a variant first');
    if (this.variantOptions(mainId)[clean]) throw new Error('That property already exists');
    this.transact(() => {
      for (const v of variants) this.setProps(v.id, { variantProps: { ...(v.type === 'FRAME' ? v.variantProps : {}), [clean]: 'Value 1' } });
    });
  }

  renameVariantProperty(mainId: string, from: string, to: string): void {
    const clean = to.trim();
    if (!clean || clean === from) return;
    if (this.variantOptions(mainId)[clean]) throw new Error('That property already exists');
    this.transact(() => {
      for (const v of this.variantsOf(mainId)) {
        if (v.type !== 'FRAME' || !v.variantProps || !(from in v.variantProps)) continue;
        this.setProps(v.id, { variantProps: Object.fromEntries(Object.entries(v.variantProps).map(([k, val]) => [k === from ? clean : k, val])) });
      }
    });
  }

  removeVariantProperty(mainId: string, prop: string): void {
    this.transact(() => {
      for (const v of this.variantsOf(mainId)) {
        if (v.type !== 'FRAME' || !v.variantProps || !(prop in v.variantProps)) continue;
        const { [prop]: _gone, ...rest } = v.variantProps;
        this.setProps(v.id, { variantProps: rest });
      }
    });
  }

  /**
   * Point an instance at another variant of its set: the one with the same property values, except that `prop` has `value`.
   * Falls back to the variant that matches the most properties. The layers of the instance are rebuilt from the new variant.
   */
  swapInstanceVariant(instanceId: string, prop: string, value: string): void {
    const inst = this.requireNode(instanceId);
    if (inst.type !== 'FRAME' || !inst.componentId) throw new Error('Not an instance');
    const current = this.getNode(inst.componentId);
    if (current?.type !== 'FRAME' || !current.componentSetId) throw new Error('This component has no variants');
    const wanted = { ...(current.variantProps ?? {}), [prop]: value };
    const score = (v: DesignNode) => (v.type === 'FRAME' && v.variantProps ? Object.entries(wanted).filter(([k, val]) => v.variantProps![k] === val).length : -1);
    const best = this.variantsOf(current.id)
      .filter((v) => v.type === 'FRAME' && v.variantProps?.[prop] === value)
      .sort((a, b) => score(b) - score(a))[0];
    if (!best) throw new Error('No variant has that value');
    if (best.id === current.id) return;
    this.setProps(instanceId, { componentId: best.id });
  }

  // ---------- component properties ----------

  /** Add a property to a main component, controlling one of its layers. The default is what that layer is now. */
  addComponentProperty(mainId: string, type: 'BOOLEAN' | 'TEXT', targetId: string, name?: string): string {
    const main = this.requireNode(mainId);
    if (main.type !== 'FRAME' || !main.isComponent) throw new Error('Properties belong to a main component');
    const target = this.requireNode(targetId);
    if (targetId === mainId || !this.isAncestor(mainId, targetId)) throw new Error('Pick a layer inside the component');
    if (type === 'TEXT' && target.type !== 'TEXT') throw new Error('A text property needs a text layer');
    const props = main.componentProps ?? [];
    const id = nanoid();
    const clean = name?.trim() || (type === 'BOOLEAN' ? `Show ${target.name}` : target.name);
    const unique = props.some((p) => p.name === clean) ? `${clean} ${props.length + 1}` : clean;
    const prop: ComponentProperty = { id, name: unique, type, targetId, defaultValue: type === 'BOOLEAN' ? target.visible : target.type === 'TEXT' ? target.characters : '' };
    this.setProps(mainId, { componentProps: [...props, prop] });
    return id;
  }

  updateComponentProperty(mainId: string, propId: string, patch: Partial<Pick<ComponentProperty, 'name' | 'defaultValue' | 'targetId'>>): void {
    const main = this.requireNode(mainId);
    if (main.type !== 'FRAME') throw new Error('Not a component');
    const props = main.componentProps ?? [];
    const prop = props.find((p) => p.id === propId);
    if (!prop) throw new Error('Property not found');
    if (patch.targetId) {
      const target = this.requireNode(patch.targetId);
      if (patch.targetId === mainId || !this.isAncestor(mainId, patch.targetId)) throw new Error('Pick a layer inside the component');
      if (prop.type === 'TEXT' && target.type !== 'TEXT') throw new Error('A text property needs a text layer');
    }
    const next = { ...prop, ...(patch.name?.trim() ? { name: patch.name.trim() } : {}), ...(patch.defaultValue !== undefined ? { defaultValue: patch.defaultValue } : {}), ...(patch.targetId ? { targetId: patch.targetId } : {}) };
    this.setProps(mainId, { componentProps: props.map((p) => (p.id === propId ? next : p)) });
  }

  removeComponentProperty(mainId: string, propId: string): void {
    const main = this.requireNode(mainId);
    if (main.type !== 'FRAME') throw new Error('Not a component');
    this.setProps(mainId, { componentProps: (main.componentProps ?? []).filter((p) => p.id !== propId) });
  }

  /** Set (or with undefined, clear) an instance's value for one of its component's properties. */
  setInstanceProperty(instanceId: string, propId: string, value: boolean | string | undefined): void {
    const inst = this.requireNode(instanceId);
    if (inst.type !== 'FRAME' || !inst.componentId) throw new Error('Not an instance');
    const next = { ...(inst.propValues ?? {}) };
    if (value === undefined) delete next[propId];
    else next[propId] = value;
    this.setProps(instanceId, { propValues: next });
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
        // Layers set to absolute position stay out of the flow.
        const kids = this.children(id).filter((c) => c.visible && c.layoutPositioning !== 'ABSOLUTE');
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

  /** Write several properties of several layers in one undo step (used by the Scale tool). Unknown ids are skipped. */
  patchNodes(updates: Record<string, Record<string, unknown>>): void {
    this.transact(() => {
      for (const [id, props] of Object.entries(updates)) {
        if (this.nodes.has(id)) this.setProps(id, props);
      }
    });
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

  // ---------- comments ----------

  /** Comments of a page (all pages when none is given), oldest first. */
  comments(pageId?: string): Comment[] {
    return [...this.commentMap.values()].filter((c) => !pageId || c.pageId === pageId).sort((a, b) => a.at - b.at);
  }

  getComment(id: string): Comment | undefined {
    return this.commentMap.get(id);
  }

  /** Pin a new comment. Comments are not part of undo history: they are conversation, not design. */
  addComment(input: { pageId: string; x: number; y: number; author: string; text: string; now?: number }): string {
    const text = input.text.trim();
    if (!text) throw new Error('A comment needs some text');
    const id = nanoid();
    const at = input.now ?? Date.now();
    this.ydoc.transact(() => this.commentMap.set(id, { id, pageId: input.pageId, x: input.x, y: input.y, author: input.author, text, at, resolved: false, replies: [] }), ASSET_ORIGIN);
    return id;
  }

  replyToComment(id: string, author: string, text: string, now?: number): void {
    const c = this.commentMap.get(id);
    if (!c) throw new Error('Comment not found');
    const clean = text.trim();
    if (!clean) throw new Error('A reply needs some text');
    this.ydoc.transact(() => this.commentMap.set(id, { ...c, replies: [...c.replies, { id: nanoid(), author, text: clean, at: now ?? Date.now() }] }), ASSET_ORIGIN);
  }

  resolveComment(id: string, resolved = true): void {
    const c = this.commentMap.get(id);
    if (c) this.ydoc.transact(() => this.commentMap.set(id, { ...c, resolved }), ASSET_ORIGIN);
  }

  moveComment(id: string, x: number, y: number): void {
    const c = this.commentMap.get(id);
    if (c) this.ydoc.transact(() => this.commentMap.set(id, { ...c, x, y }), ASSET_ORIGIN);
  }

  deleteComment(id: string): void {
    this.ydoc.transact(() => this.commentMap.delete(id), ASSET_ORIGIN);
  }

  // ---------- colour variables ----------

  /** The modes in order; a document without any has the single implicit mode "Mode 1". */
  modes(): VariableMode[] {
    const list = [...this.modeMap.values()].sort((a, b) => a.order - b.order).map(({ id, name }) => ({ id, name }));
    return list.length ? list : [{ id: 'default', name: 'Mode 1' }];
  }

  activeModeId(): string {
    const id = this.meta.get('activeMode');
    const modes = this.modes();
    return id && modes.some((m) => m.id === id) ? id : modes[0]!.id;
  }

  /** Canvas colour of a page (Figma's page Background); undefined means the default. */
  pageBackground(pageId: string): string | undefined {
    return this.meta.get(`bg:${pageId}`);
  }

  setPageBackground(pageId: string, color: string | undefined): void {
    if (color !== undefined && !/^#[0-9a-fA-F]{6}$/.test(color)) throw new Error('Background must be a six-digit hex colour');
    this.transact(() => {
      if (color === undefined) this.meta.delete(`bg:${pageId}`);
      else this.meta.set(`bg:${pageId}`, color.toLowerCase());
    });
  }

  setActiveMode(id: string): void {
    if (!this.modes().some((m) => m.id === id)) throw new Error('Mode not found');
    this.transact(() => this.meta.set('activeMode', id));
  }

  /** Add a mode; every variable starts with the value it has in the active mode. */
  addMode(name: string): string {
    const id = nanoid();
    const base = this.activeModeId();
    this.transact(() => {
      if (!this.modeMap.size) this.modeMap.set('default', { id: 'default', name: 'Mode 1', order: 0 });
      const order = Math.max(-1, ...[...this.modeMap.values()].map((m) => m.order)) + 1;
      this.modeMap.set(id, { id, name: name.trim() || `Mode ${order + 1}`, order });
      for (const v of this.variableMap.values()) this.variableMap.set(v.id, { ...v, values: { ...v.values, [id]: v.values[base] ?? Object.values(v.values)[0] ?? (v.kind === 'STRING' ? '' : '#000000') } });
    });
    return id;
  }

  renameMode(id: string, name: string): void {
    const mode = this.modeMap.get(id);
    if (mode && name.trim()) this.transact(() => this.modeMap.set(id, { ...mode, name: name.trim() }));
    else if (!mode && id === 'default' && name.trim()) this.transact(() => this.modeMap.set('default', { id: 'default', name: name.trim(), order: 0 }));
  }

  /** Remove a mode (the last one cannot be removed). */
  deleteMode(id: string): void {
    if (this.modes().length < 2) throw new Error('A collection needs at least one mode');
    this.transact(() => {
      this.modeMap.delete(id);
      for (const v of this.variableMap.values()) {
        const { [id]: _dropped, ...values } = v.values;
        this.variableMap.set(v.id, { ...v, values });
      }
      if (this.meta.get('activeMode') === id) this.meta.delete('activeMode');
    });
  }

  colorVariables(): ColorVariable[] {
    return [...this.variableMap.values()].filter((v) => v.kind !== 'STRING').sort((a, b) => a.name.localeCompare(b.name));
  }

  /** Text variables: a text per mode that text layers can follow. */
  textVariables(): ColorVariable[] {
    return [...this.variableMap.values()].filter((v) => v.kind === 'STRING').sort((a, b) => a.name.localeCompare(b.name));
  }

  createTextVariable(name: string, text: string): string {
    const id = nanoid();
    this.transact(() => this.variableMap.set(id, { id, name: name.trim() || 'Text', kind: 'STRING', values: Object.fromEntries(this.modes().map((m) => [m.id, text])) }));
    return id;
  }

  /** Change the name of a text variable, or its text in one mode. */
  updateTextVariable(id: string, patch: { name?: string; modeId?: string; text?: string }): void {
    const v = this.variableMap.get(id);
    if (!v || v.kind !== 'STRING') throw new Error('Text variable not found');
    this.transact(() =>
      this.variableMap.set(id, {
        ...v,
        ...(patch.name?.trim() ? { name: patch.name.trim() } : {}),
        values: patch.text !== undefined && patch.modeId ? { ...v.values, [patch.modeId]: patch.text } : v.values,
      }),
    );
  }

  /** Make a text layer follow a text variable (or pass null to keep the text it has now and detach). */
  bindTextVariable(nodeId: string, variableId: string | null): void {
    const node = this.requireNode(nodeId);
    if (node.type !== 'TEXT') throw new Error('Only text layers can use a text variable');
    if (variableId === null) {
      this.setText(nodeId, { textVariableId: null });
      return;
    }
    const v = this.variableMap.get(variableId);
    if (!v || v.kind !== 'STRING') throw new Error('Text variable not found');
    this.setText(nodeId, { textVariableId: variableId, characters: v.values[this.activeModeId()] ?? Object.values(v.values)[0] ?? '' });
  }

  getColorVariable(id: string): ColorVariable | undefined {
    return this.variableMap.get(id);
  }

  createColorVariable(name: string, color: string): string {
    const id = nanoid();
    this.transact(() => this.variableMap.set(id, { id, name: name.trim() || 'Color', values: Object.fromEntries(this.modes().map((m) => [m.id, color])) }));
    return id;
  }

  updateColorVariable(id: string, patch: { name?: string; modeId?: string; color?: string }): void {
    const v = this.variableMap.get(id);
    if (!v) throw new Error('Variable not found');
    this.transact(() =>
      this.variableMap.set(id, {
        ...v,
        ...(patch.name?.trim() ? { name: patch.name.trim() } : {}),
        values: patch.color && patch.modeId ? { ...v.values, [patch.modeId]: patch.color } : v.values,
      }),
    );
  }

  deleteColorVariable(id: string): void {
    this.transact(() => this.variableMap.delete(id));
  }

  /** Bind one solid fill or stroke of a layer to a colour variable (or pass null to keep its colour and detach). */
  bindPaintVariable(nodeId: string, key: 'fills' | 'strokes', index: number, variableId: string | null): void {
    const node = this.requireNode(nodeId) as unknown as Record<string, unknown>;
    const paints = node[key];
    if (!Array.isArray(paints) || !paints[index]) throw new Error('No such paint');
    const paint = paints[index] as Paint;
    if (paint.type !== 'SOLID') throw new Error('Only solid colours can use a variable');
    let next: Paint;
    if (variableId === null) {
      const { variableId: _gone, ...rest } = paint;
      next = rest;
    } else {
      const v = this.variableMap.get(variableId);
      if (!v || v.kind === 'STRING') throw new Error('Variable not found');
      next = { ...paint, variableId, color: v.values[this.activeModeId()] ?? paint.color };
    }
    this.setStyle(nodeId, { [key]: (paints as Paint[]).map((p, i) => (i === index ? next : p)) } as StylePatch);
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

  /** Replace a pen path: its box, geometry and anchor points, as one edit. */
  setVectorPath(
    id: string,
    path: { x: number; y: number; width: number; height: number; viewBox: string; markup: string; penPoints: { x: number; y: number; hx: number; hy: number }[]; penClosed: boolean },
  ): void {
    if (this.requireNode(id).type !== 'VECTOR') throw new Error('setVectorPath requires a VECTOR node');
    this.setProps(id, { ...path });
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
