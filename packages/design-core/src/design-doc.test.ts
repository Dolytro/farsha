import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { DesignDoc } from './design-doc';

function setup() {
  const doc = new DesignDoc();
  const page = doc.pages()[0]!.id;
  return { doc, page };
}

describe('DesignDoc', () => {
  it('starts with a document root and one page, not undoable', () => {
    const { doc } = setup();
    expect(doc.getNode(doc.rootId)?.type).toBe('DOCUMENT');
    expect(doc.pages()).toHaveLength(1);
    expect(doc.canUndo()).toBe(false);
  });

  it('creates nodes with unique nanoid ids and typed defaults', () => {
    const { doc, page } = setup();
    const a = doc.createNode('RECTANGLE', { parentId: page });
    const b = doc.createNode('RECTANGLE', { parentId: page });
    expect(a).not.toBe(b);
    const rect = doc.getNode(a)!;
    expect(rect.type === 'RECTANGLE' && rect.fills[0]?.type).toBe('SOLID');
    expect(doc.getNode(a)?.parentId).toBe(page);
  });

  it('rejects invalid parent/child combinations', () => {
    const { doc, page } = setup();
    const rect = doc.createNode('RECTANGLE', { parentId: page });
    expect(() => doc.createNode('RECTANGLE', { parentId: rect })).toThrow();
    expect(() => doc.createNode('PAGE', { parentId: page })).toThrow();
    expect(() => doc.createNode('RECTANGLE', { parentId: 'nope' })).toThrow();
  });

  it('orders children by orderKey and supports insert index', () => {
    const { doc, page } = setup();
    const a = doc.createNode('RECTANGLE', { parentId: page });
    const b = doc.createNode('RECTANGLE', { parentId: page });
    const c = doc.createNode('RECTANGLE', { parentId: page, index: 0 });
    expect(doc.children(page).map((n) => n.id)).toEqual([c, a, b]);
  });

  it('reorders nodes', () => {
    const { doc, page } = setup();
    const [a, b, c] = [0, 1, 2].map(() => doc.createNode('RECTANGLE', { parentId: page }));
    doc.reorderNode(a!, 2);
    expect(doc.children(page).map((n) => n.id)).toEqual([b, c, a]);
    doc.reorderNode(a!, 0);
    expect(doc.children(page).map((n) => n.id)).toEqual([a, b, c]);
  });

  it('moves, resizes and rotates', () => {
    const { doc, page } = setup();
    const id = doc.createNode('RECTANGLE', { parentId: page, props: { x: 10, y: 20 } });
    doc.moveNode(id, 5, -5);
    expect(doc.getNode(id)).toMatchObject({ x: 15, y: 15 });
    doc.resizeNode(id, { width: 200, height: -4 });
    expect(doc.getNode(id)).toMatchObject({ width: 200, height: 0 });
    doc.rotateNode(id, 270);
    expect(doc.getNode(id)?.rotation).toBe(-90);
    expect(() => doc.resizeNode(id, { width: NaN })).toThrow();
  });

  it('applies style and text patches', () => {
    const { doc, page } = setup();
    const rect = doc.createNode('RECTANGLE', { parentId: page });
    doc.setStyle(rect, { cornerRadius: 8, opacity: 0.5, fills: [{ type: 'SOLID', color: '#ff0000', opacity: 1 }] });
    const r = doc.getNode(rect)!;
    expect(r.type === 'RECTANGLE' && r.cornerRadius).toBe(8);
    expect(r.opacity).toBe(0.5);

    const text = doc.createNode('TEXT', { parentId: page });
    doc.setText(text, { characters: 'Hello', fontSize: 32 });
    expect(doc.getNode(text)).toMatchObject({ characters: 'Hello', fontSize: 32 });
    expect(() => doc.setText(rect, { characters: 'x' })).toThrow();
  });

  it('deletes recursively and protects the root', () => {
    const { doc, page } = setup();
    const frame = doc.createNode('FRAME', { parentId: page });
    const child = doc.createNode('RECTANGLE', { parentId: frame });
    doc.deleteNode(frame);
    expect(doc.hasNode(frame)).toBe(false);
    expect(doc.hasNode(child)).toBe(false);
    expect(() => doc.deleteNode(doc.rootId)).toThrow();
  });

  it('reparents without allowing cycles', () => {
    const { doc, page } = setup();
    const outer = doc.createNode('FRAME', { parentId: page });
    const inner = doc.createNode('FRAME', { parentId: outer });
    const rect = doc.createNode('RECTANGLE', { parentId: page });
    doc.reparentNode(rect, inner);
    expect(doc.children(inner).map((n) => n.id)).toEqual([rect]);
    expect(() => doc.reparentNode(outer, inner)).toThrow();
    expect(() => doc.reparentNode(outer, outer)).toThrow();
  });

  it('computes absolute boxes through nested frames', () => {
    const { doc, page } = setup();
    const frame = doc.createNode('FRAME', { parentId: page, props: { x: 100, y: 50 } });
    const rect = doc.createNode('RECTANGLE', { parentId: frame, props: { x: 10, y: 5 } });
    expect(doc.absoluteBox(rect)).toMatchObject({ x: 110, y: 55 });
  });

  describe('undo/redo (Y.UndoManager)', () => {
    it('undoes and redoes creation', () => {
      const { doc, page } = setup();
      const id = doc.createNode('RECTANGLE', { parentId: page });
      expect(doc.canUndo()).toBe(true);
      doc.undo();
      expect(doc.hasNode(id)).toBe(false);
      expect(doc.canRedo()).toBe(true);
      doc.redo();
      expect(doc.hasNode(id)).toBe(true);
    });

    it('undoes deletion including descendants', () => {
      const { doc, page } = setup();
      const frame = doc.createNode('FRAME', { parentId: page });
      const child = doc.createNode('RECTANGLE', { parentId: frame });
      doc.stopCapturing();
      doc.deleteNode(frame);
      doc.undo();
      expect(doc.getNode(frame)?.type).toBe('FRAME');
      expect(doc.getNode(child)?.parentId).toBe(frame);
    });

    it('merges rapid edits into one step but splits at stopCapturing', () => {
      const { doc, page } = setup();
      const id = doc.createNode('RECTANGLE', { parentId: page });
      doc.stopCapturing();
      doc.moveNode(id, 1, 0);
      doc.moveNode(id, 1, 0);
      doc.moveNode(id, 1, 0);
      expect(doc.getNode(id)?.x).toBe(3);
      doc.undo();
      expect(doc.getNode(id)?.x).toBe(0);
      doc.stopCapturing();
      doc.moveNode(id, 10, 0);
      doc.stopCapturing();
      doc.moveNode(id, 20, 0);
      doc.undo();
      expect(doc.getNode(id)?.x).toBe(10);
    });

    it('clears the redo stack after a new edit', () => {
      const { doc, page } = setup();
      const id = doc.createNode('RECTANGLE', { parentId: page });
      doc.stopCapturing();
      doc.moveNode(id, 5, 0);
      doc.undo();
      doc.stopCapturing();
      doc.moveNode(id, 7, 0);
      expect(doc.canRedo()).toBe(false);
    });

    it('does not undo remote changes', () => {
      const { doc, page } = setup();
      const remote = new DesignDoc(new Y.Doc(), { init: false });
      remote.applyUpdate(doc.encodeState());
      const id = remote.createNode('RECTANGLE', { parentId: page });
      doc.applyUpdate(remote.encodeState());
      expect(doc.hasNode(id)).toBe(true);
      expect(doc.canUndo()).toBe(false);
    });
  });

  it('notifies subscribers and bumps version', () => {
    const { doc, page } = setup();
    let calls = 0;
    const off = doc.subscribe(() => calls++);
    const v = doc.getVersion();
    doc.createNode('RECTANGLE', { parentId: page });
    expect(calls).toBe(1);
    expect(doc.getVersion()).toBeGreaterThan(v);
    off();
    doc.createNode('RECTANGLE', { parentId: page });
    expect(calls).toBe(1);
  });

  it('merges concurrent edits from two replicas', () => {
    const a = new DesignDoc();
    const b = new DesignDoc(new Y.Doc(), { init: false });
    b.applyUpdate(a.encodeState());
    const page = a.pages()[0]!.id;
    const ra = a.createNode('RECTANGLE', { parentId: page });
    const rb = b.createNode('ELLIPSE', { parentId: page });
    a.applyUpdate(b.encodeState());
    b.applyUpdate(a.encodeState());
    expect(a.children(page).map((n) => n.id).sort()).toEqual([ra, rb].sort());
    expect(b.children(page).map((n) => n.id)).toEqual(a.children(page).map((n) => n.id));
  });
});
