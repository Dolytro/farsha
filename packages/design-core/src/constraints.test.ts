import { describe, expect, it } from 'vitest';
import { applyConstraints } from './constraints';
import { DesignDoc } from './design-doc';

const child = { x: 20, y: 10, width: 40, height: 30 };
const from = { width: 200, height: 100 };

describe('applyConstraints', () => {
  it('defaults to left / top and keeps the box', () => {
    expect(applyConstraints(child, from, { width: 300, height: 150 })).toEqual(child);
  });

  it('right / bottom keep the distance to the far edge', () => {
    expect(applyConstraints({ ...child, constraintH: 'MAX', constraintV: 'MAX' }, from, { width: 300, height: 150 })).toEqual({ x: 120, y: 60, width: 40, height: 30 });
  });

  it('left & right / top & bottom stretch', () => {
    expect(applyConstraints({ ...child, constraintH: 'STRETCH', constraintV: 'STRETCH' }, from, { width: 300, height: 90 })).toEqual({ x: 20, y: 10, width: 140, height: 20 });
  });

  it('center keeps the centre and scale scales everything', () => {
    expect(applyConstraints({ ...child, constraintH: 'CENTER', constraintV: 'CENTER' }, from, { width: 300, height: 100 })).toEqual({ x: 70, y: 10, width: 40, height: 30 });
    expect(applyConstraints({ ...child, constraintH: 'SCALE', constraintV: 'SCALE' }, from, { width: 400, height: 50 })).toEqual({ x: 40, y: 5, width: 80, height: 15 });
  });
});

describe('constraints when a frame is resized', () => {
  function setup() {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const frame = doc.createNode('FRAME', { parentId: page, props: { x: 0, y: 0, width: 200, height: 100 } });
    const a = doc.createNode('RECTANGLE', { parentId: frame, props: { x: 20, y: 10, width: 40, height: 30, constraintH: 'MAX', constraintV: 'STRETCH' } });
    const b = doc.createNode('RECTANGLE', { parentId: frame, props: { x: 20, y: 10, width: 40, height: 30 } });
    return { doc, page, frame, a, b };
  }

  it('moves and resizes children with the frame, in one undo step', () => {
    const { doc, frame, a, b } = setup();
    doc.stopCapturing();
    doc.resizeNode(frame, { width: 300, height: 150 });
    expect(doc.getNode(a)).toMatchObject({ x: 120, y: 10, width: 40, height: 80 });
    expect(doc.getNode(b)).toMatchObject({ x: 20, y: 10, width: 40, height: 30 });
    doc.undo();
    expect(doc.getNode(frame)).toMatchObject({ width: 200, height: 100 });
    expect(doc.getNode(a)).toMatchObject({ x: 20, y: 10, width: 40, height: 30 });
  });

  it('cascades into nested frames', () => {
    const { doc, frame } = setup();
    const inner = doc.createNode('FRAME', { parentId: frame, props: { x: 0, y: 0, width: 100, height: 100, constraintH: 'STRETCH' } });
    const deep = doc.createNode('RECTANGLE', { parentId: inner, props: { x: 10, y: 0, width: 20, height: 20, constraintH: 'MAX' } });
    doc.resizeNode(frame, { width: 300 });
    expect(doc.getNode(inner)).toMatchObject({ width: 200 });
    expect(doc.getNode(deep)).toMatchObject({ x: 110 });
  });

  it('does not touch children when only the position changes or for auto layout frames', () => {
    const { doc, frame, a } = setup();
    doc.resizeNode(frame, { x: 50, y: 50 });
    expect(doc.getNode(a)).toMatchObject({ x: 20, width: 40 });
    doc.setStyle(frame, { layoutMode: 'VERTICAL' });
    doc.resizeNode(frame, { width: 500 });
    expect(doc.getNode(a)!.width).toBe(40);
  });
});
