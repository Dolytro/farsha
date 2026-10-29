export type NodeType =
  | 'DOCUMENT'
  | 'PAGE'
  | 'FRAME'
  | 'GROUP'
  | 'RECTANGLE'
  | 'ELLIPSE'
  | 'TEXT'
  | 'IMAGE'
  | 'VECTOR';

export interface SolidPaint {
  type: 'SOLID';
  /** CSS hex colour, e.g. `#388bff` */
  color: string;
  opacity: number;
}

export type Paint = SolidPaint;

export interface BaseNode {
  id: string;
  type: NodeType;
  name: string;
  parentId: string | null;
  /** Fractional index among siblings; children are derived from parentId + orderKey. */
  orderKey: string;
  /** Position relative to the parent. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Degrees, clockwise, around the node centre. */
  rotation: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
}

export interface DocumentNode extends BaseNode {
  type: 'DOCUMENT';
}

export interface PageNode extends BaseNode {
  type: 'PAGE';
}

export interface FrameNode extends BaseNode {
  type: 'FRAME';
  fills: Paint[];
  strokes: Paint[];
  strokeWidth: number;
  cornerRadius: number;
  clipsContent: boolean;
}

export interface GroupNode extends BaseNode {
  type: 'GROUP';
}

export interface RectangleNode extends BaseNode {
  type: 'RECTANGLE';
  fills: Paint[];
  strokes: Paint[];
  strokeWidth: number;
  cornerRadius: number;
}

export interface EllipseNode extends BaseNode {
  type: 'ELLIPSE';
  fills: Paint[];
  strokes: Paint[];
  strokeWidth: number;
}

export type TextAlign = 'LEFT' | 'CENTER' | 'RIGHT';

export interface TextNode extends BaseNode {
  type: 'TEXT';
  characters: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number | 'AUTO';
  letterSpacing: number;
  textAlign: TextAlign;
  fills: Paint[];
}

export interface ImageNode extends BaseNode {
  type: 'IMAGE';
  /** Reference to an uploaded asset; images are never embedded in the document. */
  assetId: string | null;
  cornerRadius: number;
}

export interface VectorNode extends BaseNode {
  type: 'VECTOR';
  /** SVG viewBox ("minX minY width height") that the markup is drawn in, scaled to the layer box. */
  viewBox: string;
  /** One sanitised SVG shape element (path, polygon, ...). Built by the SVG importer, never raw clipboard text. */
  markup: string;
}

export type DesignNode =
  | DocumentNode
  | PageNode
  | FrameNode
  | GroupNode
  | RectangleNode
  | EllipseNode
  | TextNode
  | ImageNode
  | VectorNode;

export type NodeOfType<T extends NodeType> = Extract<DesignNode, { type: T }>;

/** Properties that can be set generically via the style operation. */
export interface StylePatch {
  fills?: Paint[];
  strokes?: Paint[];
  strokeWidth?: number;
  cornerRadius?: number;
  opacity?: number;
  visible?: boolean;
  locked?: boolean;
  clipsContent?: boolean;
}

export interface TextPatch {
  characters?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  lineHeight?: number | 'AUTO';
  letterSpacing?: number;
  textAlign?: TextAlign;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}
