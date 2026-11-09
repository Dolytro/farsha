import { describe, expect, it } from 'vitest';
import { DesignDoc } from './design-doc';

describe('paintOrder', () => {
  const setup = () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const frame = doc.createNode('FRAME', { parentId: page, props: { layoutMode: 'HORIZONTAL' } });
    const a = doc.createNode('RECTANGLE', { parentId: frame, props: { width: 10, height: 10 } });
    const b = doc.createNode('RECTANGLE', { parentId: frame, props: { width: 10, height: 10 } });
    return { doc, frame, a, b };
  };
  it('draws the last layer on top by default', () => {
    const { doc, frame, a, b } = setup();
    expect(doc.paintOrder(frame).map((n) => n.id)).toEqual([a, b]);
  });
  it('first on top reverses the drawing order of an auto layout frame only', () => {
    const { doc, frame, a, b } = setup();
    doc.setStyle(frame, { layoutFirstOnTop: true });
    expect(doc.paintOrder(frame).map((n) => n.id)).toEqual([b, a]);
    expect(doc.children(frame).map((n) => n.id)).toEqual([a, b]);
    doc.setStyle(frame, { layoutMode: null });
    expect(doc.paintOrder(frame).map((n) => n.id)).toEqual([a, b]);
  });
});
