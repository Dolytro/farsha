import { describe, expect, it } from 'vitest';
import { DesignDoc } from './design-doc';

function setup() {
  const doc = new DesignDoc();
  const page = doc.pages()[0]!.id;
  const a = doc.createNode('TEXT', { parentId: page, props: { characters: 'Old' } });
  const b = doc.createNode('TEXT', { parentId: page, props: { characters: 'Other' } });
  return { doc, page, a, b };
}
const chars = (doc: DesignDoc, id: string) => (doc.getNode(id) as unknown as { characters: string }).characters;

describe('text variables', () => {
  it('are kept apart from colour variables', () => {
    const { doc } = setup();
    const t = doc.createTextVariable('Greeting', 'Hello');
    const c = doc.createColorVariable('Brand', '#123456');
    expect(doc.textVariables().map((v) => v.id)).toEqual([t]);
    expect(doc.colorVariables().map((v) => v.id)).toEqual([c]);
    expect(doc.getColorVariable(t)).toMatchObject({ kind: 'STRING', values: { default: 'Hello' } });
  });

  it('binding makes a text layer take the text, and editing the variable updates every bound layer', () => {
    const { doc, a, b } = setup();
    const v = doc.createTextVariable('Title', 'Welcome');
    doc.bindTextVariable(a, v);
    doc.bindTextVariable(b, v);
    expect(chars(doc, a)).toBe('Welcome');
    doc.updateTextVariable(v, { modeId: 'default', text: 'Hi there' });
    expect(chars(doc, a)).toBe('Hi there');
    expect(chars(doc, b)).toBe('Hi there');
  });

  it('switching the mode switches the text', () => {
    const { doc, a } = setup();
    const v = doc.createTextVariable('Lang', 'Hello');
    doc.bindTextVariable(a, v);
    const bn = doc.addMode('Bangla');
    doc.updateTextVariable(v, { modeId: bn, text: 'Nomoshkar' });
    expect(chars(doc, a)).toBe('Hello');
    doc.setActiveMode(bn);
    expect(chars(doc, a)).toBe('Nomoshkar');
    doc.setActiveMode('default');
    expect(chars(doc, a)).toBe('Hello');
  });

  it('a new mode copies the active text, and detaching keeps the text', () => {
    const { doc, a } = setup();
    const v = doc.createTextVariable('T', 'Same');
    const m = doc.addMode('Two');
    expect(doc.getColorVariable(v)!.values[m]).toBe('Same');
    doc.bindTextVariable(a, v);
    doc.bindTextVariable(a, null);
    doc.updateTextVariable(v, { modeId: 'default', text: 'Changed' });
    expect(chars(doc, a)).toBe('Same');
  });

  it('deleting the variable keeps the text and releases the layer', () => {
    const { doc, a } = setup();
    const v = doc.createTextVariable('T', 'Keep');
    doc.bindTextVariable(a, v);
    doc.stopCapturing();
    doc.deleteColorVariable(v);
    expect(chars(doc, a)).toBe('Keep');
    expect((doc.getNode(a) as unknown as { textVariableId?: string }).textVariableId).toBeUndefined();
    doc.updateTextVariable; // still a function
  });

  it('refuses non-text layers, colour variables and paints', () => {
    const { doc, page, a } = setup();
    const rect = doc.createNode('RECTANGLE', { parentId: page, props: { fills: [{ type: 'SOLID', color: '#111111', opacity: 1 }] } });
    const t = doc.createTextVariable('T', 'x');
    const c = doc.createColorVariable('C', '#222222');
    expect(() => doc.bindTextVariable(rect, t)).toThrow();
    expect(() => doc.bindTextVariable(a, c)).toThrow();
    expect(() => doc.bindPaintVariable(rect, 'fills', 0, t)).toThrow();
    expect(() => doc.updateTextVariable(c, { name: 'x' })).toThrow();
  });

  it('undo reverts the text together with the variable edit, and the binding survives save and load', () => {
    const { doc, a } = setup();
    const v = doc.createTextVariable('T', 'One');
    doc.bindTextVariable(a, v);
    doc.stopCapturing();
    doc.updateTextVariable(v, { modeId: 'default', text: 'Two' });
    expect(chars(doc, a)).toBe('Two');
    doc.undo();
    expect(chars(doc, a)).toBe('One');
    const copy = DesignDoc.fromState(doc.encodeState());
    expect(chars(copy, a)).toBe('One');
    expect(copy.textVariables()[0]!.name).toBe('T');
  });
});
