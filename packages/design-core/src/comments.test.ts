import { describe, expect, it } from 'vitest';
import { DesignDoc } from './design-doc';

function setup() {
  const doc = new DesignDoc();
  const page = doc.pages()[0]!.id;
  return { doc, page };
}

describe('comments', () => {
  it('adds and lists comments of a page, oldest first', () => {
    const { doc, page } = setup();
    const b = doc.addComment({ pageId: page, x: 10, y: 20, author: 'Ana', text: 'Second', now: 2000 });
    const a = doc.addComment({ pageId: page, x: 1, y: 2, author: 'Ana', text: 'First', now: 1000 });
    doc.addComment({ pageId: 'other', x: 0, y: 0, author: 'Bo', text: 'Elsewhere', now: 3000 });
    expect(doc.comments(page).map((c) => c.id)).toEqual([a, b]);
    expect(doc.comments()).toHaveLength(3);
    expect(doc.getComment(a)).toMatchObject({ x: 1, y: 2, author: 'Ana', text: 'First', resolved: false, replies: [] });
  });

  it('trims text and refuses an empty comment', () => {
    const { doc, page } = setup();
    expect(() => doc.addComment({ pageId: page, x: 0, y: 0, author: 'Ana', text: '   ' })).toThrow();
    const id = doc.addComment({ pageId: page, x: 0, y: 0, author: 'Ana', text: '  hi  ' });
    expect(doc.getComment(id)!.text).toBe('hi');
  });

  it('threads replies, resolves, moves and deletes', () => {
    const { doc, page } = setup();
    const id = doc.addComment({ pageId: page, x: 5, y: 5, author: 'Ana', text: 'Is this the right blue?', now: 1 });
    doc.replyToComment(id, 'Bo', 'Yes, brand blue', 2);
    expect(doc.getComment(id)!.replies).toMatchObject([{ author: 'Bo', text: 'Yes, brand blue', at: 2 }]);
    expect(() => doc.replyToComment(id, 'Bo', ' ')).toThrow();
    expect(() => doc.replyToComment('nope', 'Bo', 'x')).toThrow();
    doc.resolveComment(id);
    expect(doc.getComment(id)!.resolved).toBe(true);
    doc.resolveComment(id, false);
    expect(doc.getComment(id)!.resolved).toBe(false);
    doc.moveComment(id, 50, 60);
    expect(doc.getComment(id)).toMatchObject({ x: 50, y: 60 });
    doc.deleteComment(id);
    expect(doc.getComment(id)).toBeUndefined();
  });

  it('is not part of undo history, but is saved with the file', () => {
    const { doc, page } = setup();
    const rect = doc.createNode('RECTANGLE', { parentId: page });
    doc.stopCapturing();
    const id = doc.addComment({ pageId: page, x: 1, y: 1, author: 'Ana', text: 'Keep me' });
    doc.undo();
    expect(doc.hasNode(rect)).toBe(false);
    expect(doc.getComment(id)).toBeDefined();
    const copy = DesignDoc.fromState(doc.encodeState());
    expect(copy.getComment(id)).toMatchObject({ text: 'Keep me' });
  });

  it('notifies listeners', () => {
    const { doc, page } = setup();
    let n = 0;
    doc.subscribe(() => n++);
    doc.addComment({ pageId: page, x: 0, y: 0, author: 'Ana', text: 'ping' });
    expect(n).toBeGreaterThan(0);
  });
});
