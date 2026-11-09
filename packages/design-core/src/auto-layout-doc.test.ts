import { describe, expect, it } from 'vitest';
import { DesignDoc } from './design-doc';

function setup(layout: Record<string, unknown> = {}) {
  const doc = new DesignDoc();
  const page = doc.pages()[0]!.id;
  const frame = doc.createNode('FRAME', { parentId: page, props: { x: 100, y: 100, width: 50, height: 50 } });
  doc.setStyle(frame, { layoutMode: 'VERTICAL', itemSpacing: 10, paddingLeft: 8, paddingTop: 8, paddingRight: 8, paddingBottom: 8, ...layout } as never);
  const a = doc.createNode('RECTANGLE', { parentId: frame, props: { x: 300, y: 300, width: 40, height: 20 } });
  const b = doc.createNode('RECTANGLE', { parentId: frame, props: { x: 0, y: 0, width: 60, height: 30 } });
  return { doc, page, frame, a, b };
}
const pos = (doc: DesignDoc, id: string) => [doc.getNode(id)!.x, doc.getNode(id)!.y];
const size = (doc: DesignDoc, id: string) => [doc.getNode(id)!.width, doc.getNode(id)!.height];

describe('auto layout in the document', () => {
  it('lays children out and hugs the frame after edits', () => {
    const { doc, frame, a, b } = setup();
    expect(pos(doc, a)).toEqual([8, 8]);
    expect(pos(doc, b)).toEqual([8, 38]);
    expect(size(doc, frame)).toEqual([76, 76]); // 8 + 60 + 8, 8 + 20 + 10 + 30 + 8
  });

  it('follows child size changes and removals', () => {
    const { doc, frame, a, b } = setup();
    doc.resizeNode(a, { height: 50 });
    expect(pos(doc, b)).toEqual([8, 68]);
    expect(size(doc, frame)[1]).toBe(106);
    doc.deleteNode(a);
    expect(pos(doc, b)).toEqual([8, 8]);
    expect(size(doc, frame)).toEqual([76, 46]);
  });

  it('skips hidden children and honours horizontal direction and gap', () => {
    const { doc, frame, a, b } = setup();
    doc.setStyle(frame, { layoutMode: 'HORIZONTAL', itemSpacing: 4 });
    expect(pos(doc, b)).toEqual([8 + 40 + 4, 8]);
    doc.setStyle(a, { visible: false });
    expect(pos(doc, b)).toEqual([8, 8]);
  });

  it('turns a hugging direction fixed when the frame is resized by hand, and stops laying out when switched off', () => {
    const { doc, frame, a } = setup();
    doc.resizeNode(frame, { height: 300 });
    expect(doc.getNode(frame)).toMatchObject({ primarySizing: 'FIXED', height: 300 });
    doc.resizeNode(a, { height: 60 });
    expect(size(doc, frame)[1]).toBe(300);
    doc.setStyle(frame, { layoutMode: null });
    doc.setPosition(a, 123, 45);
    expect(pos(doc, a)).toEqual([123, 45]);
  });

  it('nests: an inner hugging frame grows its parent', () => {
    const { doc, frame } = setup({ paddingLeft: 0, paddingTop: 0, paddingRight: 0, paddingBottom: 0, itemSpacing: 0 });
    const inner = doc.createNode('FRAME', { parentId: frame, props: { width: 10, height: 10 } });
    doc.setStyle(inner, { layoutMode: 'HORIZONTAL', paddingLeft: 5, paddingRight: 5, paddingTop: 5, paddingBottom: 5 });
    doc.createNode('RECTANGLE', { parentId: inner, props: { width: 30, height: 20 } });
    expect(size(doc, inner)).toEqual([40, 30]);
    expect(size(doc, frame)).toEqual([60, 20 + 30 + 30]); // widest child is b (60); heights 20 + 30 + inner 30
  });

  it('undo reverts the edit together with its layout', () => {
    const { doc, a, b } = setup();
    doc.stopCapturing();
    doc.resizeNode(a, { height: 50 });
    expect(pos(doc, b)).toEqual([8, 68]);
    doc.undo();
    expect(size(doc, a)).toEqual([40, 20]);
    expect(pos(doc, b)).toEqual([8, 38]);
  });
});

describe('fill container in the document', () => {
  it('fills the free width and follows the frame when it is resized', () => {
    const { doc, frame, a, b } = setup({ layoutMode: 'HORIZONTAL', primarySizing: 'FIXED', counterSizing: 'FIXED', itemSpacing: 10 });
    doc.resizeNode(frame, { width: 300, height: 100 });
    doc.setStyle(b, { layoutSizingH: 'FILL', layoutSizingV: 'FILL' } as never);
    // 300 - 8 - 8 padding - 40 (a) - 10 gap = 234
    expect(size(doc, b)).toEqual([234, 84]);
    doc.resizeNode(frame, { width: 400 });
    expect(size(doc, b)).toEqual([334, 84]);
    expect(size(doc, a)).toEqual([40, 20]);
  });

  it('resizing a filling child by hand makes it fixed again', () => {
    const { doc, frame, b } = setup({ layoutMode: 'HORIZONTAL', primarySizing: 'FIXED', counterSizing: 'FIXED' });
    doc.resizeNode(frame, { width: 300, height: 100 });
    doc.setStyle(b, { layoutSizingH: 'FILL' } as never);
    doc.resizeNode(b, { width: 50 });
    expect(doc.getNode(b)).toMatchObject({ width: 50, layoutSizingH: 'FIXED' });
  });

  it('a filling child frame lays out its own children at the new size', () => {
    const { doc, page, frame } = setup({ layoutMode: 'HORIZONTAL', primarySizing: 'FIXED', counterSizing: 'FIXED' });
    doc.resizeNode(frame, { width: 300, height: 100 });
    const inner = doc.createNode('FRAME', { parentId: frame, props: { width: 20, height: 20 } });
    doc.setStyle(inner, { layoutMode: 'HORIZONTAL', primarySizing: 'FIXED', counterSizing: 'FIXED', primaryAxisAlign: 'MAX', layoutSizingH: 'FILL' } as never);
    const leaf = doc.createNode('RECTANGLE', { parentId: inner, props: { width: 10, height: 10 } });
    // inner takes the remaining width and its child sits at the far end (MAX)
    expect(doc.getNode(inner)!.width).toBeGreaterThan(100);
    expect(doc.getNode(leaf)!.x).toBeCloseTo(doc.getNode(inner)!.width - 10);
    expect(page).toBeTruthy();
  });
});

describe('absolute position inside auto layout', () => {
  it('keeps the layer out of the flow and out of hugging', () => {
    const { doc, frame, a, b } = setup();
    doc.setStyle(a, { layoutPositioning: 'ABSOLUTE' } as never);
    doc.setPosition(a, 200, 300);
    expect(pos(doc, a)).toEqual([200, 300]);
    expect(pos(doc, b)).toEqual([8, 8]);
    expect(size(doc, frame)).toEqual([76, 46]); // only b: 8 + 30 + 8 high, 8 + 60 + 8 wide
  });

  it('goes back into the flow when set to auto again', () => {
    const { doc, a, b } = setup();
    doc.setStyle(a, { layoutPositioning: 'ABSOLUTE' } as never);
    doc.setStyle(a, { layoutPositioning: 'AUTO' } as never);
    expect(pos(doc, a)).toEqual([8, 8]);
    expect(pos(doc, b)).toEqual([8, 38]);
  });
});

describe('baseline alignment in the document', () => {
  it('lines a text layer and a box up on the baseline of a row', () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const frame = doc.createNode('FRAME', { parentId: page, props: { width: 200, height: 100 } });
    doc.setStyle(frame, { layoutMode: 'HORIZONTAL', counterAxisAlign: 'BASELINE', itemSpacing: 4 } as never);
    const text = doc.createNode('TEXT', { parentId: frame, props: { characters: 'Hi', fontSize: 20, lineHeight: 'AUTO', width: 30, height: 24 } as never });
    const box = doc.createNode('RECTANGLE', { parentId: frame, props: { width: 10, height: 50 } });
    // the box has no text: it hangs by its bottom edge (50); the text baseline is one font size down (20)
    expect(doc.getNode(box)!.y).toBe(0);
    expect(doc.getNode(text)!.y).toBe(30);
  });
});

describe('include strokes in layout', () => {
  const build = (align: string, include: boolean) => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const frame = doc.createNode('FRAME', { parentId: page, props: { width: 200, height: 100 } });
    doc.setStyle(frame, { layoutMode: 'HORIZONTAL', itemSpacing: 10, layoutIncludeStrokes: include } as never);
    const a = doc.createNode('RECTANGLE', { parentId: frame, props: { width: 20, height: 20, strokes: [{ type: 'SOLID', color: '#000000', opacity: 1 }], strokeWidth: 4, strokeAlign: align } as never });
    const b = doc.createNode('RECTANGLE', { parentId: frame, props: { width: 20, height: 20 } });
    return { doc, frame, a, b };
  };
  it('does nothing while off', () => {
    const { doc, a, b } = build('CENTER', false);
    expect(doc.getNode(a)!.x).toBe(0);
    expect(doc.getNode(b)!.x).toBe(30);
  });
  it('a centred stroke pushes the next layer by its width and the layer sits inside it', () => {
    const { doc, a, b } = build('CENTER', true);
    expect(doc.getNode(a)!.x).toBe(2); // half the stroke outside on the left
    expect(doc.getNode(b)!.x).toBe(34); // 20 + 4 + gap 10
    expect(doc.getNode(a)!.width).toBe(20);
  });
  it('an outside stroke counts twice and an inside one not at all', () => {
    const o = build('OUTSIDE', true);
    expect(o.doc.getNode(o.a)!.x).toBe(4);
    expect(o.doc.getNode(o.b)!.x).toBe(38);
    const i = build('INSIDE', true);
    expect(i.doc.getNode(i.a)!.x).toBe(0);
    expect(i.doc.getNode(i.b)!.x).toBe(30);
  });
});
