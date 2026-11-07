import { describe, expect, it } from 'vitest';
import { DesignDoc } from './design-doc';

function setup() {
  const doc = new DesignDoc();
  const light = doc.activeModeId();
  const dark = doc.addMode('Dark');
  const base = doc.createColorVariable('base', '#112233');
  const brand = doc.createColorVariable('brand', '#000000');
  return { doc, light, dark, base, brand };
}

describe('variable aliases', () => {
  it('shows the value of the variable it points to, and follows it when it changes', () => {
    const { doc, light, base, brand } = setup();
    doc.setVariableAlias(brand, light, base);
    expect(doc.variableAlias(brand, light)).toBe(base);
    expect(doc.resolveVariableValue(doc.getColorVariable(brand)!, light)).toBe('#112233');
    doc.updateColorVariable(base, { modeId: light, color: '#abcdef' });
    expect(doc.resolveVariableValue(doc.getColorVariable(brand)!, light)).toBe('#abcdef');
  });

  it('keeps modes separate: one mode can be an alias while another holds its own value', () => {
    const { doc, light, dark, base, brand } = setup();
    doc.updateColorVariable(base, { modeId: dark, color: '#ffffff' });
    doc.setVariableAlias(brand, light, base);
    doc.setVariableAlias(brand, dark, base);
    expect(doc.resolveVariableValue(doc.getColorVariable(brand)!, light)).toBe('#112233');
    expect(doc.resolveVariableValue(doc.getColorVariable(brand)!, dark)).toBe('#ffffff');
    doc.updateColorVariable(brand, { modeId: dark, color: '#ff0000' });
    expect(doc.variableAlias(brand, dark)).toBeNull();
    expect(doc.variableAlias(brand, light)).toBe(base);
  });

  it('lets a bound fill follow the alias', () => {
    const { doc, light, base, brand } = setup();
    const page = doc.pages()[0]!.id;
    const rect = doc.createNode('RECTANGLE', { parentId: page, props: { width: 10, height: 10, fills: [{ type: 'SOLID', color: '#000000', opacity: 1 }] } as never });
    doc.setVariableAlias(brand, light, base);
    doc.bindPaintVariable(rect, 'fills', 0, brand);
    expect((doc.getNode(rect) as unknown as { fills: { color: string }[] }).fills[0]!.color).toBe('#112233');
    doc.updateColorVariable(base, { modeId: light, color: '#00ff00' });
    expect((doc.getNode(rect) as unknown as { fills: { color: string }[] }).fills[0]!.color).toBe('#00ff00');
  });

  it('works for number variables too, and refuses a different kind', () => {
    const { doc, light, brand } = setup();
    const a = doc.createValueVariable('NUMBER', 'space', '8');
    const b = doc.createValueVariable('NUMBER', 'gap', '0');
    doc.setVariableAlias(b, light, a);
    expect(doc.resolveVariableValue(doc.getColorVariable(b)!, light)).toBe('8');
    expect(() => doc.setVariableAlias(b, light, brand)).toThrow(/same type/);
  });

  it('refuses itself and loops', () => {
    const { doc, light, base, brand } = setup();
    expect(() => doc.setVariableAlias(base, light, base)).toThrow(/itself/);
    doc.setVariableAlias(brand, light, base);
    expect(() => doc.setVariableAlias(base, light, brand)).toThrow(/loop/);
  });

  it('detaching keeps the value it showed', () => {
    const { doc, light, base, brand } = setup();
    doc.setVariableAlias(brand, light, base);
    doc.setVariableAlias(brand, light, null);
    expect(doc.variableAlias(brand, light)).toBeNull();
    expect(doc.getColorVariable(brand)!.values[light]).toBe('#112233');
  });

  it('deleting the target turns its aliases into plain values', () => {
    const { doc, light, base, brand } = setup();
    doc.setVariableAlias(brand, light, base);
    doc.deleteColorVariable(base);
    expect(doc.getColorVariable(brand)!.values[light]).toBe('#112233');
    expect(doc.variableAlias(brand, light)).toBeNull();
  });

  it('restores raw values including aliases', () => {
    const { doc, light, base, brand } = setup();
    doc.setVariableAlias(brand, light, base);
    const saved = { ...doc.getColorVariable(brand)!.values };
    doc.setVariableValue(brand, light, '#123456');
    expect(doc.variableAlias(brand, light)).toBeNull();
    doc.restoreVariableValues(brand, saved);
    expect(doc.variableAlias(brand, light)).toBe(base);
  });

  it('a new mode copies the alias', () => {
    const { doc, light, base, brand } = setup();
    doc.setVariableAlias(brand, light, base);
    const third = doc.addMode('Night');
    expect(doc.variableAlias(brand, third)).toBe(base);
  });
});
