import { describe, expect, it } from 'vitest';
import { DesignDoc } from './design-doc';

function setup() {
  const doc = new DesignDoc();
  const page = doc.pages()[0]!.id;
  const rect = doc.createNode('RECTANGLE', { parentId: page, props: { width: 100, height: 50, cornerRadius: 4 } });
  const other = doc.createNode('RECTANGLE', { parentId: page, props: { width: 10, height: 10 } });
  return { doc, rect, other };
}
const prop = (doc: DesignDoc, id: string, key: string) => (doc.getNode(id) as unknown as Record<string, unknown>)[key];

describe('number and boolean variables', () => {
  it('are kept apart from colour and text variables', () => {
    const { doc } = setup();
    const n = doc.createValueVariable('NUMBER', 'Radius', '8');
    const b = doc.createValueVariable('BOOLEAN', 'Show', 'true');
    doc.createColorVariable('Brand', '#123456');
    doc.createTextVariable('Title', 'Hi');
    expect(doc.valueVariables('NUMBER').map((v) => v.id)).toEqual([n]);
    expect(doc.valueVariables('BOOLEAN').map((v) => v.id)).toEqual([b]);
    expect(doc.colorVariables()).toHaveLength(1);
    expect(doc.textVariables()).toHaveLength(1);
  });

  it('a bound property takes the value, and editing the variable updates every bound layer', () => {
    const { doc, rect, other } = setup();
    const v = doc.createValueVariable('NUMBER', 'Radius', '8');
    doc.bindProperty(rect, 'cornerRadius', v);
    doc.bindProperty(other, 'cornerRadius', v);
    expect(prop(doc, rect, 'cornerRadius')).toBe(8);
    doc.updateValueVariable(v, { modeId: 'default', value: '24' });
    expect(prop(doc, rect, 'cornerRadius')).toBe(24);
    expect(prop(doc, other, 'cornerRadius')).toBe(24);
  });

  it('drives size, opacity and visibility, and switches with the mode', () => {
    const { doc, rect } = setup();
    const w = doc.createValueVariable('NUMBER', 'Width', '200');
    const o = doc.createValueVariable('NUMBER', 'Opacity', '50');
    const show = doc.createValueVariable('BOOLEAN', 'Visible', 'true');
    doc.bindProperty(rect, 'width', w);
    doc.bindProperty(rect, 'opacity', o);
    doc.bindProperty(rect, 'visible', show);
    expect(prop(doc, rect, 'width')).toBe(200);
    expect(prop(doc, rect, 'opacity')).toBe(50);
    const dark = doc.addMode('Dark');
    doc.updateValueVariable(w, { modeId: dark, value: '320' });
    doc.updateValueVariable(show, { modeId: dark, value: 'false' });
    doc.setActiveMode(dark);
    expect(prop(doc, rect, 'width')).toBe(320);
    expect(prop(doc, rect, 'visible')).toBe(false);
    doc.setActiveMode('default');
    expect(prop(doc, rect, 'width')).toBe(200);
    expect(prop(doc, rect, 'visible')).toBe(true);
  });

  it('detaching keeps the value, and deleting the variable releases the property', () => {
    const { doc, rect, other } = setup();
    const v = doc.createValueVariable('NUMBER', 'R', '12');
    doc.bindProperty(rect, 'cornerRadius', v);
    doc.bindProperty(other, 'cornerRadius', v);
    doc.bindProperty(rect, 'cornerRadius', null);
    doc.updateValueVariable(v, { modeId: 'default', value: '30' });
    expect(prop(doc, rect, 'cornerRadius')).toBe(12);
    expect(prop(doc, other, 'cornerRadius')).toBe(30);
    doc.deleteColorVariable(v);
    expect(prop(doc, other, 'cornerRadius')).toBe(30);
    expect(prop(doc, other, 'varBindings') ?? undefined).toBeUndefined();
  });

  it('refuses wrong kinds, wrong properties and bad numbers', () => {
    const { doc, rect } = setup();
    const n = doc.createValueVariable('NUMBER', 'N', '1');
    const b = doc.createValueVariable('BOOLEAN', 'B', 'true');
    const c = doc.createColorVariable('C', '#111111');
    expect(() => doc.bindProperty(rect, 'visible', n)).toThrow();
    expect(() => doc.bindProperty(rect, 'width', b)).toThrow();
    expect(() => doc.bindProperty(rect, 'width', c)).toThrow();
    expect(() => doc.bindProperty(rect, 'name', n)).toThrow();
    expect(() => doc.updateValueVariable(n, { modeId: 'default', value: 'abc' })).toThrow();
    expect(() => doc.bindPaintVariable(rect, 'fills', 0, n)).toThrow();
  });

  it('a new mode copies the active value, undo reverts together, and it survives save and load', () => {
    const { doc, rect } = setup();
    const v = doc.createValueVariable('NUMBER', 'W', '150');
    const m = doc.addMode('Two');
    expect(doc.getColorVariable(v)!.values[m]).toBe('150');
    doc.bindProperty(rect, 'width', v);
    doc.stopCapturing();
    doc.updateValueVariable(v, { modeId: 'default', value: '260' });
    expect(prop(doc, rect, 'width')).toBe(260);
    doc.undo();
    expect(prop(doc, rect, 'width')).toBe(150);
    const copy = DesignDoc.fromState(doc.encodeState());
    expect(prop(copy, rect, 'width')).toBe(150);
    expect(copy.valueVariables('NUMBER')[0]!.name).toBe('W');
  });
});

describe('variable scopes', () => {
  it('limits which properties a number variable can be bound to', () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const rect = doc.createNode('RECTANGLE', { parentId: page, props: { width: 10, height: 10 } });
    const radius = doc.createValueVariable('NUMBER', 'radius', '12');
    doc.setVariableScopes(radius, ['CORNER_RADIUS']);
    expect(doc.getColorVariable(radius)!.scopes).toEqual(['CORNER_RADIUS']);
    expect(() => doc.bindProperty(rect, 'width', radius)).toThrow(/scope/);
    doc.bindProperty(rect, 'cornerRadius', radius);
    expect((doc.getNode(rect) as unknown as { cornerRadius: number }).cornerRadius).toBe(12);
  });

  it('an empty list, or all groups, means no limit; unknown scopes are dropped; other kinds are refused', () => {
    const doc = new DesignDoc();
    const n = doc.createValueVariable('NUMBER', 'n', '1');
    doc.setVariableScopes(n, ['SIZE', 'NOPE', 'SIZE']);
    expect(doc.getColorVariable(n)!.scopes).toEqual(['SIZE']);
    doc.setVariableScopes(n, []);
    expect(doc.getColorVariable(n)!.scopes).toBeUndefined();
    doc.setVariableScopes(n, ['SIZE', 'CORNER_RADIUS', 'OPACITY', 'SPACING', 'FONT_SIZE', 'STROKE_WIDTH', 'ROTATION']);
    expect(doc.getColorVariable(n)!.scopes).toBeUndefined();
    const b = doc.createValueVariable('BOOLEAN', 'b', 'true');
    expect(() => doc.setVariableScopes(b, ['SIZE'])).toThrow(/number and colour/);
    expect(() => doc.setVariableScopes('missing', ['SIZE'])).toThrow();
  });

  it('keeps existing bindings when the scope later excludes them, and survives a save and load', () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const rect = doc.createNode('RECTANGLE', { parentId: page, props: { width: 10, height: 10 } });
    const n = doc.createValueVariable('NUMBER', 'n', '40');
    doc.bindProperty(rect, 'width', n);
    doc.setVariableScopes(n, ['OPACITY']);
    expect((doc.getNode(rect) as unknown as { width: number }).width).toBe(40);
    const copy = DesignDoc.fromState(doc.encodeState());
    expect(copy.getColorVariable(n)!.scopes).toEqual(['OPACITY']);
  });
});
