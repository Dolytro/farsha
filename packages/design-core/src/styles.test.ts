import { describe, expect, it } from 'vitest';
import type { Paint } from '@farsha/types';
import { DesignDoc } from './design-doc';

const red: Paint[] = [{ type: 'SOLID', color: '#ff0000', opacity: 1 }];
const blue: Paint[] = [{ type: 'SOLID', color: '#0000ff', opacity: 1 }];

function setup() {
  const doc = new DesignDoc();
  const page = doc.pages()[0]!.id;
  const a = doc.createNode('RECTANGLE', { parentId: page });
  const b = doc.createNode('ELLIPSE', { parentId: page });
  return { doc, page, a, b };
}

describe('colour styles', () => {
  it('creates, lists and renames styles', () => {
    const { doc } = setup();
    const id = doc.createFillStyle('Brand', red);
    doc.createFillStyle('Accent', blue);
    expect(doc.fillStyles().map((s) => s.name)).toEqual(['Accent', 'Brand']);
    doc.updateFillStyle(id, { name: 'Primary' });
    expect(doc.getFillStyle(id)!.name).toBe('Primary');
  });

  it('applying a style sets the fills, and editing the style updates every layer that uses it', () => {
    const { doc, a, b } = setup();
    const id = doc.createFillStyle('Brand', red);
    doc.applyFillStyle(a, id);
    doc.applyFillStyle(b, id);
    expect(doc.getNode(a)).toMatchObject({ fillStyleId: id, fills: red });
    doc.updateFillStyle(id, { paints: blue });
    expect(doc.getNode(a)).toMatchObject({ fills: blue });
    expect(doc.getNode(b)).toMatchObject({ fills: blue });
  });

  it('changing the fills by hand detaches the layer from the style', () => {
    const { doc, a } = setup();
    const id = doc.createFillStyle('Brand', red);
    doc.applyFillStyle(a, id);
    doc.setStyle(a, { fills: blue });
    expect(doc.getNode(a)!.fillStyleId).toBeUndefined();
    doc.updateFillStyle(id, { paints: red });
    expect(doc.getNode(a)).toMatchObject({ fills: blue });
  });

  it('detach keeps the current fills', () => {
    const { doc, a } = setup();
    const id = doc.createFillStyle('Brand', red);
    doc.applyFillStyle(a, id);
    doc.applyFillStyle(a, null);
    expect(doc.getNode(a)).toMatchObject({ fills: red });
    expect(doc.getNode(a)!.fillStyleId).toBeUndefined();
  });

  it('deleting a style leaves layers with their fills', () => {
    const { doc, a } = setup();
    const id = doc.createFillStyle('Brand', red);
    doc.applyFillStyle(a, id);
    doc.deleteFillStyle(id);
    expect(doc.getNode(a)).toMatchObject({ fills: red });
    expect(doc.getNode(a)!.fillStyleId).toBeUndefined();
  });

  it('undo reverts a style edit together with the layers that follow it', () => {
    const { doc, a } = setup();
    const id = doc.createFillStyle('Brand', red);
    doc.applyFillStyle(a, id);
    doc.stopCapturing();
    doc.updateFillStyle(id, { paints: blue });
    expect(doc.getNode(a)).toMatchObject({ fills: blue });
    doc.undo();
    expect(doc.getFillStyle(id)!.paints).toEqual(red);
    expect(doc.getNode(a)).toMatchObject({ fills: red });
  });

  it('styles survive saving and loading', () => {
    const { doc, a } = setup();
    doc.applyFillStyle(a, doc.createFillStyle('Brand', red));
    const copy = DesignDoc.fromState(doc.encodeState());
    expect(copy.fillStyles().map((s) => s.name)).toEqual(['Brand']);
    expect(copy.getNode(a)!.fillStyleId).toBeDefined();
  });

  it('instances follow styles used in the main component', () => {
    const { doc, page } = setup();
    const main = doc.createNode('FRAME', { parentId: page });
    const inner = doc.createNode('RECTANGLE', { parentId: main });
    doc.createComponent([main]);
    const inst = doc.createInstance(main, page);
    const id = doc.createFillStyle('Brand', red);
    doc.applyFillStyle(inner, id);
    expect(doc.children(inst)[0]).toMatchObject({ fills: red });
    doc.updateFillStyle(id, { paints: blue });
    expect(doc.children(inst)[0]).toMatchObject({ fills: blue });
  });
});

describe('effect styles', () => {
  it('layers follow an effect style, edits detach them, and deleting leaves the effects', () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const a = doc.createNode('RECTANGLE', { parentId: page, props: { width: 10, height: 10 } });
    const b = doc.createNode('RECTANGLE', { parentId: page, props: { width: 10, height: 10 } });
    const shadow = [{ type: 'DROP_SHADOW', x: 0, y: 4, blur: 8, color: '#000000', opacity: 0.3, visible: true }] as never;
    const id = doc.createEffectStyle('Soft', shadow);
    doc.applyEffectStyle(a, id);
    doc.applyEffectStyle(b, id);
    expect((doc.getNode(a) as unknown as { effects: unknown[] }).effects).toHaveLength(1);
    const bigger = [{ type: 'DROP_SHADOW', x: 0, y: 8, blur: 20, color: '#000000', opacity: 0.4, visible: true }] as never;
    doc.updateEffectStyle(id, { effects: bigger });
    expect((doc.getNode(b) as unknown as { effects: { blur: number }[] }).effects[0]!.blur).toBe(20);
    doc.setStyle(a, { effects: [] });
    expect((doc.getNode(a) as unknown as { effectStyleId?: string }).effectStyleId).toBeUndefined();
    expect((doc.getNode(b) as unknown as { effectStyleId?: string }).effectStyleId).toBe(id);
    doc.deleteEffectStyle(id);
    expect((doc.getNode(b) as unknown as { effectStyleId?: string }).effectStyleId).toBeUndefined();
    expect((doc.getNode(b) as unknown as { effects: unknown[] }).effects).toHaveLength(1);
  });
});

describe('grid styles', () => {
  it('frames follow a grid style and editing the grids detaches them', () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const a = doc.createNode('FRAME', { parentId: page, props: { width: 100, height: 100 } });
    const b = doc.createNode('FRAME', { parentId: page, props: { width: 100, height: 100 } });
    const grids = [{ type: 'COLUMNS', count: 12, gutter: 20, margin: 40, visible: true }] as never;
    const id = doc.createGridStyle('12 col', grids);
    doc.applyGridStyle(a, id);
    doc.applyGridStyle(b, id);
    expect((doc.getNode(b) as unknown as { layoutGrids: { count: number }[] }).layoutGrids[0]!.count).toBe(12);
    doc.updateGridStyle(id, { grids: [{ type: 'COLUMNS', count: 4, gutter: 16, margin: 16, visible: true }] as never });
    expect((doc.getNode(b) as unknown as { layoutGrids: { count: number }[] }).layoutGrids[0]!.count).toBe(4);
    doc.setStyle(a, { layoutGrids: [] });
    expect((doc.getNode(a) as unknown as { gridStyleId?: string }).gridStyleId).toBeUndefined();
    doc.deleteGridStyle(id);
    expect((doc.getNode(b) as unknown as { gridStyleId?: string }).gridStyleId).toBeUndefined();
    const rect = doc.createNode('RECTANGLE', { parentId: page, props: { width: 10, height: 10 } });
    expect(() => doc.applyGridStyle(rect, id)).toThrow();
  });
});
