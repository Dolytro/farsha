import { describe, expect, it } from 'vitest';
import { DesignDoc } from './design-doc';

describe('dev status and annotations', () => {
  it('stores a status and a note, clears them with null, and keeps them through save and load', () => {
    const doc = new DesignDoc();
    const frame = doc.createNode('FRAME', { parentId: doc.pages()[0]!.id });
    doc.setStyle(frame, { devStatus: 'READY', devNote: 'Use 8px gap' });
    expect(doc.getNode(frame)).toMatchObject({ devStatus: 'READY', devNote: 'Use 8px gap' });
    const copy = DesignDoc.fromState(doc.encodeState());
    expect(copy.getNode(frame)).toMatchObject({ devStatus: 'READY', devNote: 'Use 8px gap' });
    doc.setStyle(frame, { devStatus: null, devNote: null });
    const node = doc.getNode(frame) as unknown as { devStatus?: string; devNote?: string };
    expect(node.devStatus ?? undefined).toBeUndefined();
    expect(node.devNote ?? undefined).toBeUndefined();
  });

  it('undoes a status change', () => {
    const doc = new DesignDoc();
    const frame = doc.createNode('FRAME', { parentId: doc.pages()[0]!.id });
    doc.stopCapturing();
    doc.setStyle(frame, { devStatus: 'COMPLETED' });
    doc.undo();
    expect((doc.getNode(frame) as unknown as { devStatus?: string }).devStatus).toBeUndefined();
  });
});
