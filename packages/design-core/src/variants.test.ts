import { describe, expect, it } from 'vitest';
import { DesignDoc } from './design-doc';

function setup() {
  const doc = new DesignDoc();
  const page = doc.pages()[0]!.id;
  const main = doc.createNode('FRAME', { parentId: page, props: { name: 'Button', x: 0, y: 0, width: 100, height: 40 } });
  const label = doc.createNode('TEXT', { parentId: main, props: { characters: 'Click' } });
  doc.createComponent([main]);
  return { doc, page, main, label };
}
const props = (doc: DesignDoc, id: string) => (doc.getNode(id) as unknown as { variantProps?: Record<string, string> }).variantProps;

describe('variants', () => {
  it('adding a variant copies the component into a set with a default property', () => {
    const { doc, main } = setup();
    const v2 = doc.addVariant(main);
    expect(props(doc, main)).toEqual({ 'Property 1': 'Variant 1' });
    expect(props(doc, v2)).toEqual({ 'Property 1': 'Variant 2' });
    expect(doc.getNode(v2)).toMatchObject({ isComponent: true, x: 140, y: 0, width: 100 });
    expect(doc.children(v2).map((c) => c.type)).toEqual(['TEXT']);
    expect(doc.variantsOf(v2).map((v) => v.id)).toEqual([main, v2]);
    expect(doc.variantOptions(main)).toEqual({ 'Property 1': ['Variant 1', 'Variant 2'] });
  });

  it('a third variant continues the numbering and lands to the right', () => {
    const { doc, main } = setup();
    doc.addVariant(main);
    const v3 = doc.addVariant(main);
    expect(props(doc, v3)).toEqual({ 'Property 1': 'Variant 3' });
    expect(doc.getNode(v3)!.x).toBe(280);
  });

  it('adds, renames and removes properties across the whole set', () => {
    const { doc, main } = setup();
    const v2 = doc.addVariant(main);
    doc.addVariantProperty(main, 'Size');
    expect(props(doc, v2)).toEqual({ 'Property 1': 'Variant 2', Size: 'Value 1' });
    doc.setVariantValue(v2, 'Size', 'Large');
    doc.renameVariantProperty(main, 'Property 1', 'State');
    expect(props(doc, v2)).toEqual({ State: 'Variant 2', Size: 'Large' });
    doc.removeVariantProperty(main, 'Size');
    expect(props(doc, main)).toEqual({ State: 'Variant 1' });
    expect(() => doc.addVariantProperty(main, 'State')).toThrow();
  });

  it('an instance can be switched to another variant, and takes its layers', () => {
    const { doc, page, main, label } = setup();
    const v2 = doc.addVariant(main);
    const label2 = doc.children(v2)[0]!.id;
    doc.setText(label2, { characters: 'Hover' });
    doc.setVariantValue(v2, 'Property 1', 'Hover');
    doc.setVariantValue(main, 'Property 1', 'Default');
    const inst = doc.createInstance(main, page, 300, 0);
    expect(doc.children(inst)[0]).toMatchObject({ characters: 'Click' });
    doc.swapInstanceVariant(inst, 'Property 1', 'Hover');
    expect(doc.getNode(inst)).toMatchObject({ componentId: v2, x: 300 });
    expect(doc.children(inst)).toHaveLength(1);
    expect(doc.children(inst)[0]).toMatchObject({ characters: 'Hover' });
    doc.swapInstanceVariant(inst, 'Property 1', 'Default');
    expect(doc.children(inst)[0]).toMatchObject({ characters: 'Click' });
    expect(label).toBeTruthy();
  });

  it('picks the variant matching the most properties and refuses unknown values', () => {
    const { doc, page, main } = setup();
    const v2 = doc.addVariant(main);
    doc.addVariantProperty(main, 'Size');
    doc.setVariantValue(main, 'Property 1', 'A');
    doc.setVariantValue(v2, 'Property 1', 'B');
    doc.setVariantValue(main, 'Size', 'S');
    doc.setVariantValue(v2, 'Size', 'L');
    const v3 = doc.addVariant(main);
    doc.setVariantValue(v3, 'Property 1', 'B');
    doc.setVariantValue(v3, 'Size', 'S');
    const inst = doc.createInstance(main, page);
    doc.swapInstanceVariant(inst, 'Property 1', 'B');
    // Size stays S, so the B / S variant wins over B / L
    expect(doc.getNode(inst)).toMatchObject({ componentId: v3 });
    expect(() => doc.swapInstanceVariant(inst, 'Property 1', 'Z')).toThrow();
  });

  it('variant data is not copied into instances', () => {
    const { doc, page, main } = setup();
    doc.addVariant(main);
    const inst = doc.createInstance(main, page);
    const node = doc.getNode(inst) as unknown as { componentSetId?: string; variantProps?: unknown; isComponent?: boolean };
    expect(node.componentSetId).toBeUndefined();
    expect(node.variantProps).toBeUndefined();
    expect(node.isComponent).toBeFalsy();
  });

  it('refuses variants of plain layers', () => {
    const { doc, page } = setup();
    expect(() => doc.addVariant(doc.createNode('FRAME', { parentId: page }))).toThrow();
  });
});
