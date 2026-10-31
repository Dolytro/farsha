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
