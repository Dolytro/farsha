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

export interface GradientStop {
  /** 0..1 along the gradient line */
  position: number;
  color: string;
  opacity: number;
}

export interface GradientPaint {
  type: 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL';
  stops: GradientStop[];
  /** Degrees; 0 = left to right, 90 = top to bottom. Ignored by radial gradients. */
  angle: number;
  opacity: number;
}

export type Paint = SolidPaint | GradientPaint;

/** Where a stroke sits relative to the shape edge (Figma: Inside, Center, Outside). */
export type StrokeAlign = 'INSIDE' | 'CENTER' | 'OUTSIDE';

export interface ShadowEffect {
  type: 'DROP_SHADOW' | 'INNER_SHADOW';
  x: number;
  y: number;
  blur: number;
  /** CSS hex colour */
  color: string;
  opacity: number;
  visible: boolean;
}

export interface BlurEffect {
  type: 'LAYER_BLUR';
  radius: number;
  visible: boolean;
}

export type Effect = ShadowEffect | BlurEffect;

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
  /** Optional so documents saved before effects existed still load. */
  effects?: Effect[];
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
  /** Missing in older documents, which drew strokes centred. */
  strokeAlign?: StrokeAlign;
  cornerRadius: number;
  /** Per-corner radii [top-left, top-right, bottom-right, bottom-left]; overrides cornerRadius when set. */
  cornerRadii?: [number, number, number, number];
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
  strokeAlign?: StrokeAlign;
  cornerRadius: number;
  cornerRadii?: [number, number, number, number];
}

export interface EllipseNode extends BaseNode {
  type: 'ELLIPSE';
  fills: Paint[];
  strokes: Paint[];
  strokeWidth: number;
  strokeAlign?: StrokeAlign;
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
  strokeAlign?: StrokeAlign;
  effects?: Effect[];
  cornerRadius?: number;
  cornerRadii?: [number, number, number, number] | null;
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

/** Single representative colour of a paint: the colour itself, or a gradient's first stop. */
export function paintColor(p: Paint): string {
  return p.type === 'SOLID' ? p.color : (p.stops[0]?.color ?? '#000000');
}

/** Opacity of the paint as a whole (a gradient's per-stop opacities are separate). */
export function paintOpacity(p: Paint): number {
  return p.opacity;
}
