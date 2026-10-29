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
