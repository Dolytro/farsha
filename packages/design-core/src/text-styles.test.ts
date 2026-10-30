import { describe, expect, it } from 'vitest';
import { DesignDoc } from './design-doc';

const heading = { fontFamily: 'Georgia, serif', fontSize: 32, fontWeight: 700, lineHeight: 40 as number | 'AUTO', letterSpacing: 1 };

function setup() {
  const doc = new DesignDoc();
  const page = doc.pages()[0]!.id;
  const a = doc.createNode('TEXT', { parentId: page });
  const b = doc.createNode('TEXT', { parentId: page, props: { fontSize: 12 } });
  return { doc, page, a, b };
}

describe('text styles', () => {
  it('creates and lists styles', () => {
    const { doc } = setup();
    doc.createTextStyle('Heading', heading);
    doc.createTextStyle('Body', { ...heading, fontSize: 16, fontWeight: 400 });
    expect(doc.textStyles().map((s) => s.name)).toEqual(['Body', 'Heading']);
  });

  it('applying a style copies the font settings, and editing the style updates every text layer using it', () => {
    const { doc, a, b } = setup();
    const id = doc.createTextStyle('Heading', heading);
    doc.applyTextStyle(a, id);
    doc.applyTextStyle(b, id);
    expect(doc.getNode(a)).toMatchObject({ ...heading, textStyleId: id });
    doc.updateTextStyle(id, { fontSize: 48 });
    expect(doc.getNode(a)).toMatchObject({ fontSize: 48 });
    expect(doc.getNode(b)).toMatchObject({ fontSize: 48 });
  });

  it('changing a font setting by hand detaches the layer, but editing the text does not', () => {
    const { doc, a } = setup();
    const id = doc.createTextStyle('Heading', heading);
    doc.applyTextStyle(a, id);
    doc.setText(a, { characters: 'Hello' });
    expect(doc.getNode(a)!.textStyleId).toBe(id);
    doc.setText(a, { fontSize: 20 });
    expect(doc.getNode(a)!.textStyleId).toBeUndefined();
    doc.updateTextStyle(id, { fontSize: 60 });
    expect(doc.getNode(a)).toMatchObject({ fontSize: 20 });
  });

  it('detach and delete keep the current settings', () => {
    const { doc, a, b } = setup();
    const id = doc.createTextStyle('Heading', heading);
    doc.applyTextStyle(a, id);
    doc.applyTextStyle(b, id);
    doc.applyTextStyle(a, null);
    doc.deleteTextStyle(id);
    expect(doc.getNode(a)).toMatchObject({ fontSize: 32 });
    expect(doc.getNode(a)!.textStyleId).toBeUndefined();
    expect(doc.getNode(b)).toMatchObject({ fontSize: 32 });
    expect(doc.getNode(b)!.textStyleId).toBeUndefined();
  });

  it('refuses non-text layers', () => {
    const { doc, page } = setup();
    const rect = doc.createNode('RECTANGLE', { parentId: page });
    expect(() => doc.applyTextStyle(rect, doc.createTextStyle('Heading', heading))).toThrow();
  });

  it('undo reverts a style edit together with its layers', () => {
    const { doc, a } = setup();
    const id = doc.createTextStyle('Heading', heading);
    doc.applyTextStyle(a, id);
    doc.stopCapturing();
    doc.updateTextStyle(id, { fontSize: 99 });
    doc.undo();
    expect(doc.getTextStyle(id)!.fontSize).toBe(32);
    expect(doc.getNode(a)).toMatchObject({ fontSize: 32 });
  });
});
