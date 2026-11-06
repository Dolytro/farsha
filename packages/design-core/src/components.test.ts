import { describe, expect, it } from 'vitest';
import { DesignDoc } from './design-doc';

function setup() {
  const doc = new DesignDoc();
  const page = doc.pages()[0]!.id;
  const main = doc.createNode('FRAME', { parentId: page, props: { name: 'Button', width: 120, height: 40 } });
  const label = doc.createNode('TEXT', { parentId: main, props: { characters: 'Click', x: 10, y: 8 } });
  const bg = doc.createNode('RECTANGLE', { parentId: main, props: { width: 120, height: 40 } });
  doc.createComponent([main]);
  return { doc, page, main, label, bg };
}

describe('components', () => {
  it('turns a frame into a main component', () => {
    const { doc, main } = setup();
    expect(doc.getNode(main)).toMatchObject({ type: 'FRAME', isComponent: true });
  });

  it('wraps several layers into a new main component', () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const a = doc.createNode('RECTANGLE', { parentId: page, props: { x: 50, y: 60, width: 20, height: 20 } });
    const b = doc.createNode('ELLIPSE', { parentId: page, props: { x: 100, y: 90, width: 30, height: 30 } });
    const id = doc.createComponent([a, b]);
    expect(doc.getNode(id)).toMatchObject({ isComponent: true, x: 50, y: 60, width: 80, height: 60, parentId: page });
    expect(doc.getNode(a)).toMatchObject({ parentId: id, x: 0, y: 0 });
    expect(doc.getNode(b)).toMatchObject({ parentId: id, x: 50, y: 30 });
  });

  it('creates an instance whose layers mirror the main component', () => {
    const { doc, page, main } = setup();
    const inst = doc.createInstance(main, page, 300, 40);
    const node = doc.getNode(inst)!;
    expect(node).toMatchObject({ componentId: main, x: 300, y: 40, width: 120, height: 40, name: 'Button' });
    const kids = doc.children(inst);
    expect(kids.map((k) => k.type)).toEqual(['TEXT', 'RECTANGLE']);
    expect(kids[0]).toMatchObject({ characters: 'Click', x: 10, y: 8 });
  });

  it('propagates edits of the main component to instances', () => {
    const { doc, page, main, label } = setup();
    const inst = doc.createInstance(main, page);
    doc.setText(label, { characters: 'Buy' });
    doc.resizeNode(main, { width: 200 });
    expect(doc.children(inst)[0]).toMatchObject({ characters: 'Buy' });
    expect(doc.getNode(inst)!.width).toBe(200);
  });

  it('adds and removes layers in instances when the main component changes', () => {
    const { doc, page, main, bg } = setup();
    const inst = doc.createInstance(main, page);
    const extra = doc.createNode('ELLIPSE', { parentId: main });
    expect(doc.children(inst)).toHaveLength(3);
    doc.deleteNode(bg);
    doc.deleteNode(extra);
    expect(doc.children(inst).map((k) => k.type)).toEqual(['TEXT']);
  });

  it('keeps overridden properties and syncs the rest', () => {
    const { doc, page, main, label } = setup();
    const inst = doc.createInstance(main, page);
    const instLabel = doc.children(inst)[0]!.id;
    doc.setText(instLabel, { characters: 'Mine' });
    doc.setText(label, { characters: 'Theirs', fontSize: 30 });
    expect(doc.getNode(instLabel)).toMatchObject({ characters: 'Mine', fontSize: 30 });
    expect(doc.getNode(instLabel)!.overrides).toEqual(['characters']);
  });

  it('resets overrides', () => {
    const { doc, page, main, label } = setup();
    const inst = doc.createInstance(main, page);
    const instLabel = doc.children(inst)[0]!.id;
    doc.setText(instLabel, { characters: 'Mine' });
    doc.setText(label, { characters: 'Theirs' });
    doc.resetOverrides(inst);
    expect(doc.getNode(instLabel)).toMatchObject({ characters: 'Theirs' });
    expect(doc.getNode(instLabel)!.overrides).toBeUndefined();
  });

  it('does not count moving the instance as an override, and resizing it follows constraints', () => {
    const { doc, page, main } = setup();
    const inst = doc.createInstance(main, page);
    doc.moveNode(inst, 25, 5);
    expect(doc.getNode(inst)!.overrides).toBeUndefined();
    doc.resizeNode(inst, { width: 240 });
    expect(doc.getNode(inst)).toMatchObject({ width: 240, overrides: ['width'] });
    doc.resizeNode(main, { width: 300 });
    expect(doc.getNode(inst)!.width).toBe(240);
  });

  it('detaches an instance into a plain frame', () => {
    const { doc, page, main, label } = setup();
    const inst = doc.createInstance(main, page);
    doc.detachInstance(inst);
    expect(doc.instanceOf(inst)).toBeUndefined();
    doc.setText(label, { characters: 'Later' });
    expect(doc.children(inst)[0]).toMatchObject({ characters: 'Click' });
    expect(doc.children(inst)[0]!.mainId).toBeUndefined();
  });

  it('detaches instances when the main component is deleted', () => {
    const { doc, page, main } = setup();
    const inst = doc.createInstance(main, page);
    doc.deleteNode(main);
    expect(doc.hasNode(inst)).toBe(true);
    expect(doc.instanceOf(inst)).toBeUndefined();
    expect(doc.children(inst)).toHaveLength(2);
  });

  it('refuses an instance inside its own main component', () => {
    const { doc, main } = setup();
    expect(() => doc.createInstance(main, main)).toThrow();
  });

  it('detaches an instance that ends up inside its own main component instead of looping', () => {
    const { doc, main } = setup();
    const inst = doc.createNode('FRAME', { parentId: main, props: { componentId: main } });
    expect(doc.instanceOf(inst)).toBeUndefined();
    expect(doc.children(main)).toHaveLength(3);
  });

  it('undoes an edit together with its instance updates', () => {
    const { doc, page, main, label } = setup();
    const inst = doc.createInstance(main, page);
    doc.stopCapturing();
    doc.setText(label, { characters: 'Changed' });
    expect(doc.children(inst)[0]).toMatchObject({ characters: 'Changed' });
    doc.undo();
    expect(doc.getNode(label)).toMatchObject({ characters: 'Click' });
    expect(doc.children(inst)[0]).toMatchObject({ characters: 'Click' });
  });

  it('finds the instance a nested layer belongs to', () => {
    const { doc, page, main } = setup();
    const inst = doc.createInstance(main, page);
    expect(doc.instanceOf(doc.children(inst)[0]!.id)?.id).toBe(inst);
  });
});

describe('component description', () => {
  it('is kept on the main, removed with null, and survives save and load', () => {
    const { doc, main } = setup();
    doc.setStyle(main, { description: 'Primary action' });
    expect((doc.getNode(main) as { description?: string }).description).toBe('Primary action');
    const copy = DesignDoc.fromState(doc.encodeState());
    expect((copy.getNode(main) as { description?: string }).description).toBe('Primary action');
    doc.setStyle(main, { description: null });
    expect((doc.getNode(main) as { description?: string | null }).description ?? '').toBe('');
  });
});

describe('swapInstance', () => {
  it('points an instance at another main and rebuilds its layers', () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const a = doc.createNode('FRAME', { parentId: page, props: { name: 'A', x: 0, y: 0, width: 100, height: 40 } });
    doc.createNode('TEXT', { parentId: a, props: { characters: 'Alpha' } });
    const b = doc.createNode('FRAME', { parentId: page, props: { name: 'B', x: 300, y: 0, width: 160, height: 60 } });
    doc.createNode('TEXT', { parentId: b, props: { characters: 'Beta' } });
    doc.createComponent([a]);
    doc.createComponent([b]);
    const inst = doc.createInstance(a, page, 0, 200);
    doc.swapInstance(inst, b);
    expect(doc.getNode(inst)).toMatchObject({ componentId: b, width: 160, height: 60, x: 0, y: 200 });
    expect(doc.children(inst).map((n) => (n as unknown as { characters?: string }).characters)).toEqual(['Beta']);
    expect(() => doc.swapInstance(inst, inst)).toThrow();
    expect(() => doc.swapInstance(a, b)).toThrow();
  });
});
