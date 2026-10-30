import { describe, expect, it } from 'vitest';
import { DesignDoc } from './design-doc';

function setup() {
  const doc = new DesignDoc();
  const page = doc.pages()[0]!.id;
  const main = doc.createNode('FRAME', { parentId: page, props: { name: 'Card', width: 200, height: 100 } });
  const title = doc.createNode('TEXT', { parentId: main, props: { name: 'Title', characters: 'Hello' } });
  const icon = doc.createNode('RECTANGLE', { parentId: main, props: { name: 'Icon' } });
  doc.createComponent([main]);
  return { doc, page, main, title, icon };
}
const kid = (doc: DesignDoc, inst: string, i: number) => doc.children(inst)[i]! as unknown as { visible: boolean; characters: string };

describe('component properties', () => {
  it('adds a boolean property that starts from the current visibility, and a text property from the current text', () => {
    const { doc, main, title, icon } = setup();
    const b = doc.addComponentProperty(main, 'BOOLEAN', icon);
    const t = doc.addComponentProperty(main, 'TEXT', title);
    const props = (doc.getNode(main) as unknown as { componentProps: { id: string; name: string; defaultValue: unknown }[] }).componentProps;
    expect(props.map((p) => p.id)).toEqual([b, t]);
    expect(props[0]).toMatchObject({ name: 'Show Icon', defaultValue: true });
    expect(props[1]).toMatchObject({ name: 'Title', defaultValue: 'Hello' });
  });

  it('a boolean property shows and hides the layer in an instance, without touching the main', () => {
    const { doc, page, main, icon } = setup();
    const p = doc.addComponentProperty(main, 'BOOLEAN', icon);
    const inst = doc.createInstance(main, page);
    expect(kid(doc, inst, 1).visible).toBe(true);
    doc.setInstanceProperty(inst, p, false);
    expect(kid(doc, inst, 1).visible).toBe(false);
    expect(doc.getNode(icon)!.visible).toBe(true);
    doc.setInstanceProperty(inst, p, undefined);
    expect(kid(doc, inst, 1).visible).toBe(true);
  });

  it('a text property sets the text of the layer, and the default flows from the main', () => {
    const { doc, page, main, title } = setup();
    const p = doc.addComponentProperty(main, 'TEXT', title);
    const a = doc.createInstance(main, page);
    const b = doc.createInstance(main, page, 300, 0);
    doc.setInstanceProperty(a, p, 'Welcome');
    expect(kid(doc, a, 0).characters).toBe('Welcome');
    expect(kid(doc, b, 0).characters).toBe('Hello');
    doc.updateComponentProperty(main, p, { defaultValue: 'Default title' });
    expect(kid(doc, a, 0).characters).toBe('Welcome');
    expect(kid(doc, b, 0).characters).toBe('Default title');
  });

  it('new instances start with the default, and removing the property releases the layer', () => {
    const { doc, page, main, icon } = setup();
    const p = doc.addComponentProperty(main, 'BOOLEAN', icon);
    doc.updateComponentProperty(main, p, { defaultValue: false });
    const inst = doc.createInstance(main, page);
    expect(kid(doc, inst, 1).visible).toBe(false);
    doc.removeComponentProperty(main, p);
    doc.setStyle(icon, { visible: true });
    expect(kid(doc, inst, 1).visible).toBe(true);
  });

  it('property data is not copied into instances, and survives a variant swap and save / load', () => {
    const { doc, page, main, icon } = setup();
    const p = doc.addComponentProperty(main, 'BOOLEAN', icon);
    const inst = doc.createInstance(main, page);
    doc.setInstanceProperty(inst, p, false);
    const node = doc.getNode(inst) as unknown as { componentProps?: unknown; propValues?: Record<string, unknown> };
    expect(node.componentProps).toBeUndefined();
    expect(node.propValues).toEqual({ [p]: false });
    const copy = DesignDoc.fromState(doc.encodeState());
    expect(copy.children(inst)[1]!.visible).toBe(false);
  });

  it('refuses bad targets and wrong layer types', () => {
    const { doc, page, main, icon } = setup();
    expect(() => doc.addComponentProperty(main, 'TEXT', icon)).toThrow();
    expect(() => doc.addComponentProperty(main, 'BOOLEAN', main)).toThrow();
    const outside = doc.createNode('RECTANGLE', { parentId: page });
    expect(() => doc.addComponentProperty(main, 'BOOLEAN', outside)).toThrow();
    expect(() => doc.setInstanceProperty(main, 'x', true)).toThrow();
  });

  it('an instance edit of a controlled layer is overridden by the property, an edit of another one is kept', () => {
    const { doc, page, main, title, icon } = setup();
    const p = doc.addComponentProperty(main, 'TEXT', title);
    const inst = doc.createInstance(main, page);
    doc.setInstanceProperty(inst, p, 'From property');
    doc.setStyle(doc.children(inst)[1]!.id, { opacity: 0.5 });
    doc.setText(title, { fontSize: 33 });
    expect(kid(doc, inst, 0).characters).toBe('From property');
    expect(doc.children(inst)[0]).toMatchObject({ fontSize: 33 });
    expect(doc.children(inst)[1]).toMatchObject({ opacity: 0.5 });
    expect(icon).toBeTruthy();
  });

  it('undo reverts a property value', () => {
    const { doc, page, main, icon } = setup();
    const p = doc.addComponentProperty(main, 'BOOLEAN', icon);
    const inst = doc.createInstance(main, page);
    doc.stopCapturing();
    doc.setInstanceProperty(inst, p, false);
    doc.undo();
    expect(kid(doc, inst, 1).visible).toBe(true);
  });
});
