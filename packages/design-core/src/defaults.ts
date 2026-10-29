import type { DesignNode, NodeType, Paint } from '@canvylo/types';

const solid = (color: string): Paint => ({ type: 'SOLID', color, opacity: 1 });

/** Node types that may be placed inside each parent type. */
export const ALLOWED_CHILDREN: Record<NodeType, readonly NodeType[]> = {
  DOCUMENT: ['PAGE'],
  PAGE: ['FRAME', 'GROUP', 'RECTANGLE', 'ELLIPSE', 'TEXT', 'IMAGE', 'VECTOR'],
  FRAME: ['FRAME', 'GROUP', 'RECTANGLE', 'ELLIPSE', 'TEXT', 'IMAGE', 'VECTOR'],
  GROUP: ['FRAME', 'GROUP', 'RECTANGLE', 'ELLIPSE', 'TEXT', 'IMAGE', 'VECTOR'],
  RECTANGLE: [],
  ELLIPSE: [],
  TEXT: [],
  IMAGE: [],
  VECTOR: [],
};

const NAMES: Record<NodeType, string> = {
  DOCUMENT: 'Document',
  PAGE: 'Page',
  FRAME: 'Frame',
  GROUP: 'Group',
  RECTANGLE: 'Rectangle',
  ELLIPSE: 'Ellipse',
  TEXT: 'Text',
  IMAGE: 'Image',
  VECTOR: 'Vector',
};

/** Type-specific default properties (everything except id/parentId/orderKey). */
export type NodeDraft = DesignNode extends infer N ? (N extends DesignNode ? Omit<N, 'id' | 'parentId' | 'orderKey'> : never) : never;

export function defaultsFor<T extends NodeType>(type: T): Extract<NodeDraft, { type: T }> {
  return buildDefaults(type) as Extract<NodeDraft, { type: T }>;
}

function buildDefaults(type: NodeType): NodeDraft {
  const base = {
    name: NAMES[type],
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
  };
  switch (type) {
    case 'DOCUMENT':
      return { ...base, type };
    case 'PAGE':
      return { ...base, type };
    case 'GROUP':
      return { ...base, type };
    case 'FRAME':
      return {
        ...base,
        type,
        width: 375,
        height: 667,
        fills: [solid('#ffffff')],
        strokes: [],
        strokeWidth: 1,
        cornerRadius: 0,
        clipsContent: true,
      };
    case 'RECTANGLE':
      return { ...base, type, fills: [solid('#d9d9d9')], strokes: [], strokeWidth: 1, cornerRadius: 0 };
    case 'ELLIPSE':
      return { ...base, type, fills: [solid('#d9d9d9')], strokes: [], strokeWidth: 1 };
    case 'TEXT':
      return {
        ...base,
        type,
        width: 120,
        height: 24,
        characters: 'Text',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 16,
        fontWeight: 400,
        lineHeight: 'AUTO',
        letterSpacing: 0,
        textAlign: 'LEFT',
        fills: [solid('#000000')],
      };
    case 'IMAGE':
      return { ...base, type, assetId: null, cornerRadius: 0 };
    case 'VECTOR':
      return { ...base, type, viewBox: '0 0 100 100', markup: '' };
  }
}
