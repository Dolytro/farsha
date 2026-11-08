import { describe, expect, it } from 'vitest';
import { DesignDoc } from './design-doc';

function setup() {
  const doc = new DesignDoc();
  const page = doc.pages()[0]!.id;
  const frame = doc.createNode('FRAME', { parentId: page });
  const rect = doc.createNode('RECTANGLE', { parentId: frame, props: { fills: [{ type: 'SOLID', color: '#111111', opacity: 1 }] } });
  return { doc, page, frame, rect };
}
const fill = (doc: DesignDoc, id: string) => (doc.getNode(id) as unknown as { fills: { color: string }[] }).fills[0]!.color;

describe('variable collections', () => {
  it('starts with one collection and keeps its modes separate from new collections', () => {
    const { doc } = setup();
    expect(doc.collections()).toEqual([{ id: 'default', name: 'Collection 1' }]);
    const brand = doc.addCollection('Brand');
    expect(doc.collections().map((c) => c.name)).toEqual(['Collection 1', 'Brand']);
    expect(doc.modes(brand)).toHaveLength(1);
    doc.addMode('Dark', brand);
    expect(doc.modes(brand).map((m) => m.name)).toEqual(['Mode 1', 'Dark']);
    expect(doc.modes()).toEqual([{ id: 'default', name: 'Mode 1' }]);
  });

  it('a new variable gets a value for each mode of its own collection only', () => {
    const { doc } = setup();
    const brand = doc.addCollection('Brand');
    const dark = doc.addMode('Dark', brand);
    const v = doc.createColorVariable('primary', '#ff0000', brand);
    expect(Object.keys(doc.getColorVariable(v)!.values).sort()).toEqual([doc.modes(brand)[0]!.id, dark].sort());
    expect(doc.variablesIn(brand).map((x) => x.id)).toEqual([v]);
    expect(doc.variablesIn('default')).toEqual([]);
    expect(() => doc.createColorVariable('x', '#000000', 'nope')).toThrow();
  });

  it('each collection has its own active mode, and a bound layer follows the mode of its variable collection', () => {
    const { doc, rect } = setup();
    const brand = doc.addCollection('Brand');
    const light = doc.modes(brand)[0]!.id;
    const dark = doc.addMode('Dark', brand);
    const v = doc.createColorVariable('primary', '#ff0000', brand);
    doc.setVariableValue(v, dark, '#00ff00');
    doc.bindPaintVariable(rect, 'fills', 0, v);
    expect(fill(doc, rect)).toBe('#ff0000');
    doc.setActiveMode(dark);
    expect(doc.activeModeId(brand)).toBe(dark);
    expect(doc.activeModeId()).toBe('default');
    expect(fill(doc, rect)).toBe('#00ff00');
    doc.setActiveMode(light);
    expect(fill(doc, rect)).toBe('#ff0000');
  });

  it('an explicit mode on a frame applies to the variables of that mode\'s collection', () => {
    const { doc, frame, rect } = setup();
    const brand = doc.addCollection('Brand');
    const dark = doc.addMode('Dark', brand);
    const v = doc.createColorVariable('primary', '#ff0000', brand);
    doc.setVariableValue(v, dark, '#00ff00');
    doc.bindPaintVariable(rect, 'fills', 0, v);
    doc.setStyle(frame, { explicitMode: dark });
    expect(fill(doc, rect)).toBe('#00ff00');
    expect(doc.activeModeId(brand)).not.toBe(dark);
  });

  it('adding a mode to the first collection does not touch another collection', () => {
    const { doc } = setup();
    const brand = doc.addCollection('Brand');
    const v = doc.createColorVariable('primary', '#ff0000', brand);
    const before = Object.keys(doc.getColorVariable(v)!.values);
    doc.addMode('Dark');
    expect(Object.keys(doc.getColorVariable(v)!.values)).toEqual(before);
  });

  it('the last mode of a collection stays; deleting a collection removes its modes and variables', () => {
    const { doc, rect } = setup();
    const brand = doc.addCollection('Brand');
    const v = doc.createColorVariable('primary', '#ff0000', brand);
    doc.bindPaintVariable(rect, 'fills', 0, v);
    expect(() => doc.deleteMode(doc.modes(brand)[0]!.id)).toThrow();
    doc.deleteCollection(brand);
    expect(doc.collections()).toHaveLength(1);
    expect(doc.getColorVariable(v)).toBeUndefined();
    expect(doc.modes(brand)).toEqual([]);
    expect(fill(doc, rect)).toBe('#ff0000');
    expect(() => doc.deleteCollection('default')).toThrow();
  });

  it('renames collections, the first one too, and survives a save and load', () => {
    const { doc } = setup();
    const brand = doc.addCollection('Brand');
    doc.renameCollection('default', 'Primitives');
    doc.renameCollection(brand, 'Tokens');
    const dark = doc.addMode('Dark', brand);
    const copy = DesignDoc.fromState(doc.encodeState());
    expect(copy.collections().map((c) => c.name)).toEqual(['Primitives', 'Tokens']);
    expect(copy.modes(brand).map((m) => m.id)).toContain(dark);
  });

  it('an alias across collections follows the mode of the target collection', () => {
    const { doc } = setup();
    const brand = doc.addCollection('Brand');
    const dark = doc.addMode('Dark', brand);
    const base = doc.createColorVariable('base', '#111111', brand);
    doc.setVariableValue(base, dark, '#999999');
    const alias = doc.createColorVariable('alias', '#000000');
    doc.setVariableAlias(alias, 'default', base);
    expect(doc.resolveVariableValue(doc.getColorVariable(alias)!, 'default')).toBe('#111111');
    doc.setActiveMode(dark);
    expect(doc.resolveVariableValue(doc.getColorVariable(alias)!, 'default')).toBe('#999999');
  });
});
