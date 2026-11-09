import { describe, expect, it } from 'vitest';
import { DesignDoc } from './design-doc';

function setup() {
  const doc = new DesignDoc();
  const page = doc.pages()[0]!.id;
  const a = doc.createNode('RECTANGLE', { parentId: page, props: { fills: [{ type: 'SOLID', color: '#111111', opacity: 1 }] } });
  const b = doc.createNode('ELLIPSE', { parentId: page, props: { fills: [{ type: 'SOLID', color: '#222222', opacity: 1 }] } });
  return { doc, page, a, b };
}
const color = (doc: DesignDoc, id: string, key: 'fills' | 'strokes' = 'fills') => (doc.getNode(id) as unknown as { fills: { color: string }[]; strokes: { color: string }[] })[key][0]!.color;

describe('colour variables', () => {
  it('starts with one implicit mode', () => {
    const { doc } = setup();
    expect(doc.modes()).toEqual([{ id: 'default', name: 'Mode 1' }]);
    expect(doc.activeModeId()).toBe('default');
  });

  it('binding a paint takes the variable colour, and editing the variable updates every bound layer', () => {
    const { doc, a, b } = setup();
    const v = doc.createColorVariable('Background', '#ffffff');
    doc.bindPaintVariable(a, 'fills', 0, v);
    doc.bindPaintVariable(b, 'fills', 0, v);
    expect(color(doc, a)).toBe('#ffffff');
    doc.updateColorVariable(v, { modeId: 'default', color: '#abcdef' });
    expect(color(doc, a)).toBe('#abcdef');
    expect(color(doc, b)).toBe('#abcdef');
  });

  it('switching the mode switches every bound colour', () => {
    const { doc, a } = setup();
    const v = doc.createColorVariable('Background', '#ffffff');
    doc.bindPaintVariable(a, 'fills', 0, v);
    const dark = doc.addMode('Dark');
    expect(doc.modes().map((m) => m.name)).toEqual(['Mode 1', 'Dark']);
    doc.updateColorVariable(v, { modeId: dark, color: '#000000' });
    expect(color(doc, a)).toBe('#ffffff');
    doc.setActiveMode(dark);
    expect(color(doc, a)).toBe('#000000');
    doc.setActiveMode('default');
    expect(color(doc, a)).toBe('#ffffff');
  });

  it('a new mode starts from the values of the active mode', () => {
    const { doc } = setup();
    const v = doc.createColorVariable('Text', '#123456');
    const dark = doc.addMode('Dark');
    expect(doc.getColorVariable(v)!.values[dark]).toBe('#123456');
  });

  it('strokes can be bound too', () => {
    const { doc, a } = setup();
    doc.setStyle(a, { strokes: [{ type: 'SOLID', color: '#000000', opacity: 1 }] });
    const v = doc.createColorVariable('Border', '#cccccc');
    doc.bindPaintVariable(a, 'strokes', 0, v);
    expect(color(doc, a, 'strokes')).toBe('#cccccc');
  });

  it('deleting a variable keeps the colour; detaching keeps it too', () => {
    const { doc, a, b } = setup();
    const v = doc.createColorVariable('Background', '#ffffff');
    doc.bindPaintVariable(a, 'fills', 0, v);
    doc.bindPaintVariable(b, 'fills', 0, v);
    doc.bindPaintVariable(b, 'fills', 0, null);
    doc.deleteColorVariable(v);
    expect(color(doc, a)).toBe('#ffffff');
    expect((doc.getNode(a) as unknown as { fills: { variableId?: string }[] }).fills[0]!.variableId).toBeUndefined();
    expect(color(doc, b)).toBe('#ffffff');
  });

  it('deleting a mode drops its values and falls back to the first mode', () => {
    const { doc, a } = setup();
    const v = doc.createColorVariable('Background', '#ffffff');
    doc.bindPaintVariable(a, 'fills', 0, v);
    const dark = doc.addMode('Dark');
    doc.updateColorVariable(v, { modeId: dark, color: '#000000' });
    doc.setActiveMode(dark);
    doc.deleteMode(dark);
    expect(doc.activeModeId()).toBe('default');
    expect(color(doc, a)).toBe('#ffffff');
    expect(() => doc.deleteMode('default')).toThrow();
  });

  it('refuses gradients and unknown variables', () => {
    const { doc, a } = setup();
    expect(() => doc.bindPaintVariable(a, 'fills', 0, 'nope')).toThrow();
    doc.setStyle(a, { fills: [{ type: 'GRADIENT_LINEAR', stops: [], angle: 0, opacity: 1 }] });
    expect(() => doc.bindPaintVariable(a, 'fills', 0, doc.createColorVariable('x', '#fff'))).toThrow();
  });

  it('undo reverts a variable edit together with the layers bound to it', () => {
    const { doc, a } = setup();
    const v = doc.createColorVariable('Background', '#ffffff');
    doc.bindPaintVariable(a, 'fills', 0, v);
    doc.stopCapturing();
    doc.updateColorVariable(v, { modeId: 'default', color: '#000000' });
    expect(color(doc, a)).toBe('#000000');
    doc.undo();
    expect(color(doc, a)).toBe('#ffffff');
  });

  it('survives saving and loading', () => {
    const { doc, a } = setup();
    const v = doc.createColorVariable('Background', '#ffffff');
    doc.bindPaintVariable(a, 'fills', 0, v);
    const dark = doc.addMode('Dark');
    doc.updateColorVariable(v, { modeId: dark, color: '#000000' });
    doc.setActiveMode(dark);
    const copy = DesignDoc.fromState(doc.encodeState());
    expect(copy.modes().map((m) => m.name)).toEqual(['Mode 1', 'Dark']);
    expect(copy.activeModeId()).toBe(dark);
    expect(copy.colorVariables()[0]!.name).toBe('Background');
  });
});

describe('page background', () => {
  it('is per page, validated, resettable, undoable and saved', () => {
    const { doc, page } = setup();
    expect(doc.pageBackground(page)).toBeUndefined();
    doc.stopCapturing();
    doc.setPageBackground(page, '#1E1E1E');
    expect(doc.pageBackground(page)).toBe('#1e1e1e');
    expect(DesignDoc.fromState(doc.encodeState()).pageBackground(page)).toBe('#1e1e1e');
    expect(() => doc.setPageBackground(page, 'red')).toThrow();
    doc.setPageBackground(page, undefined);
    expect(doc.pageBackground(page)).toBeUndefined();
  });
});

describe('explicit mode', () => {
  it('a frame with an explicit mode shows that mode whatever the file mode is', () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const light = doc.activeModeId();
    const dark = doc.addMode('Dark');
    const v = doc.createColorVariable('Bg', '#ffffff');
    doc.updateColorVariable(v, { modeId: dark, color: '#000000' });
    const frame = doc.createNode('FRAME', { parentId: page, props: { width: 100, height: 100, fills: [{ type: 'SOLID', color: '#ffffff', opacity: 1 }] } as never });
    const inner = doc.createNode('RECTANGLE', { parentId: frame, props: { width: 10, height: 10, fills: [{ type: 'SOLID', color: '#ffffff', opacity: 1 }] } as never });
    doc.bindPaintVariable(frame, 'fills', 0, v);
    doc.bindPaintVariable(inner, 'fills', 0, v);
    const color = (id: string) => (doc.getNode(id) as unknown as { fills: { color: string }[] }).fills[0]!.color;
    expect(color(inner)).toBe('#ffffff');
    doc.setStyle(frame, { explicitMode: dark });
    expect(color(frame)).toBe('#000000');
    expect(color(inner)).toBe('#000000');
    doc.setActiveMode(dark);
    doc.setStyle(frame, { explicitMode: light });
    expect(color(inner)).toBe('#ffffff');
    doc.setStyle(frame, { explicitMode: null });
    expect(color(inner)).toBe('#000000');
  });
});

describe('setVariableValue', () => {
  it('sets a colour, text, number or boolean in one mode and rejects bad values', () => {
    const doc = new DesignDoc();
    const mode = doc.activeModeId();
    const c = doc.createColorVariable('C', '#ffffff');
    const t = doc.createTextVariable('T', 'hi');
    const n = doc.createValueVariable('NUMBER', 'N', '1');
    const b = doc.createValueVariable('BOOLEAN', 'B', 'true');
    doc.setVariableValue(c, mode, '#112233');
    doc.setVariableValue(t, mode, 'hello');
    doc.setVariableValue(n, mode, '42');
    doc.setVariableValue(b, mode, 'false');
    expect(doc.getColorVariable(c)?.values[mode]).toBe('#112233');
    expect(doc.getColorVariable(t)?.values[mode]).toBe('hello');
    expect(doc.getColorVariable(n)?.values[mode]).toBe('42');
    expect(doc.getColorVariable(b)?.values[mode]).toBe('false');
    expect(() => doc.setVariableValue(c, mode, 'red')).toThrow();
    expect(() => doc.setVariableValue('nope', mode, 'x')).toThrow();
    expect(() => doc.setVariableValue(c, 'nomode', '#112233')).toThrow();
  });
});

describe('colour variable scopes', () => {
  it('limits a colour variable to some kinds of paint', () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const rect = doc.createNode('RECTANGLE', { parentId: page, props: { width: 10, height: 10, fills: [{ type: 'SOLID', color: '#000000', opacity: 1 }], strokes: [{ type: 'SOLID', color: '#000000', opacity: 1 }] } as never });
    const text = doc.createNode('TEXT', { parentId: page, props: { characters: 'Hi', fills: [{ type: 'SOLID', color: '#000000', opacity: 1 }] } as never });
    const brand = doc.createColorVariable('brand', '#336699');
    doc.setVariableScopes(brand, ['STROKE']);
    expect(doc.getColorVariable(brand)!.scopes).toEqual(['STROKE']);
    expect(() => doc.bindPaintVariable(rect, 'fills', 0, brand)).toThrow(/scope/);
    expect(() => doc.bindPaintVariable(text, 'fills', 0, brand)).toThrow(/scope/);
    doc.bindPaintVariable(rect, 'strokes', 0, brand);
    expect((doc.getNode(rect) as unknown as { strokes: { color: string }[] }).strokes[0]!.color).toBe('#336699');
  });

  it('separates text fills from shape fills, drops scopes of the wrong kind, and refuses text variables', () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const rect = doc.createNode('RECTANGLE', { parentId: page, props: { width: 10, height: 10, fills: [{ type: 'SOLID', color: '#000000', opacity: 1 }] } as never });
    const text = doc.createNode('TEXT', { parentId: page, props: { characters: 'Hi', fills: [{ type: 'SOLID', color: '#000000', opacity: 1 }] } as never });
    const ink = doc.createColorVariable('ink', '#111111');
    doc.setVariableScopes(ink, ['TEXT_FILL', 'SIZE', 'nope']);
    expect(doc.getColorVariable(ink)!.scopes).toEqual(['TEXT_FILL']);
    doc.bindPaintVariable(text, 'fills', 0, ink);
    expect(() => doc.bindPaintVariable(rect, 'fills', 0, ink)).toThrow(/scope/);
    doc.setVariableScopes(ink, ['FILL', 'TEXT_FILL', 'STROKE']);
    expect(doc.getColorVariable(ink)!.scopes).toBeUndefined();
    const label = doc.createTextVariable('label', 'x');
    expect(() => doc.setVariableScopes(label, ['FILL'])).toThrow(/number and colour/);
  });
});
