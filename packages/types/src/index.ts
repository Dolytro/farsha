export type BlendMode =
  | 'NORMAL'
  | 'DARKEN'
  | 'MULTIPLY'
  | 'COLOR_BURN'
  | 'LIGHTEN'
  | 'SCREEN'
  | 'COLOR_DODGE'
  | 'OVERLAY'
  | 'SOFT_LIGHT'
  | 'HARD_LIGHT'
  | 'DIFFERENCE'
  | 'EXCLUSION'
  | 'HUE'
  | 'SATURATION'
  | 'COLOR'
  | 'LUMINOSITY';

/** Figma's constraints: how a layer follows its parent frame when the frame is resized. Missing means MIN (left / top). */
export type Constraint = 'MIN' | 'MAX' | 'STRETCH' | 'CENTER' | 'SCALE';

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

export type ImageScaleMode = 'FILL' | 'FIT' | 'STRETCH';

export interface ImagePaint {
  type: 'IMAGE';
  /** Reference to an asset stored in the document; null until an image is chosen. */
  assetId: string | null;
  scaleMode: ImageScaleMode;
  opacity: number;
}

export type Paint = SolidPaint | GradientPaint | ImagePaint;

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

/** A reusable colour: layers that use it get its paints as their fills. */
export interface FillStyle {
  id: string;
  name: string;
  paints: Paint[];
}

/** A reusable set of text properties: text layers that use it follow it. */
export interface TextStyle {
  id: string;
  name: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number | 'AUTO';
  letterSpacing: number;
}

/** The text properties a text style controls. */
export const TEXT_STYLE_KEYS = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing'] as const;

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
  /** Missing means NORMAL. */
  blendMode?: BlendMode;
  constraintH?: Constraint;
  constraintV?: Constraint;
  /** Mirrored across the vertical / horizontal axis through the centre (Shift+H / Shift+V). */
  flipX?: boolean;
  flipY?: boolean;
  /** Id of the colour style that supplies this layer's fills; the fills follow the style. */
  fillStyleId?: string;
  /** Id of the text style that supplies this text layer's font settings. */
  textStyleId?: string;
  /** Inside an instance: id of the layer in the main component this layer mirrors. */
  mainId?: string;
  /** Inside an instance: property names the user changed, which stop following the main component. */
  overrides?: string[];
}

export interface DocumentNode extends BaseNode {
  type: 'DOCUMENT';
}

/** A ruler guide: a vertical line at x or a horizontal line at y, in page coordinates. */
export interface RulerGuide {
  axis: 'x' | 'y';
  position: number;
}

export interface PageNode extends BaseNode {
  type: 'PAGE';
  guides?: RulerGuide[];
}

export type LayoutMode = 'HORIZONTAL' | 'VERTICAL';
export type LayoutAlign = 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
export type LayoutSizing = 'HUG' | 'FIXED';

/** Auto layout settings of a frame. All optional: a frame without `layoutMode` is not auto layout. */
export interface AutoLayoutProps {
  layoutMode?: LayoutMode | null;
  itemSpacing?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  /** Alignment along the layout direction. */
  primaryAxisAlign?: LayoutAlign;
  /** Alignment across the layout direction (SPACE_BETWEEN is not valid here). */
  counterAxisAlign?: Exclude<LayoutAlign, 'SPACE_BETWEEN'>;
  /** Hug = the frame grows / shrinks with its content along the layout direction. Missing means HUG. */
  primarySizing?: LayoutSizing;
  counterSizing?: LayoutSizing;
}

export interface FrameNode extends BaseNode, AutoLayoutProps {
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
  /** True for a main component: its layers are mirrored by every instance. */
  isComponent?: boolean;
  /** Set on an instance: id of the main component it follows. */
  componentId?: string;
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

/** Figma's text resizing: auto width, auto height (wraps at the layer width) or a fixed box. Missing means auto width. */
export type TextAutoResize = 'WIDTH_AND_HEIGHT' | 'HEIGHT' | 'NONE';

export interface TextNode extends BaseNode {
  type: 'TEXT';
  characters: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number | 'AUTO';
  letterSpacing: number;
  textAlign: TextAlign;
  textAutoResize?: TextAutoResize;
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
  /** Only on vectors drawn with the Line / Arrow / Polygon / Star tools: their fill and stroke are editable like a shape's. */
  fills?: Paint[];
  strokes?: Paint[];
  strokeWidth?: number;
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
export interface StylePatch extends AutoLayoutProps {
  /** Only meaningful on pages. */
  guides?: RulerGuide[];
  fills?: Paint[];
  strokes?: Paint[];
  strokeWidth?: number;
  strokeAlign?: StrokeAlign;
  effects?: Effect[];
  blendMode?: BlendMode;
  constraintH?: Constraint;
  constraintV?: Constraint;
  flipX?: boolean;
  flipY?: boolean;
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
  textAutoResize?: TextAutoResize;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Single representative colour of a paint: the colour itself, or a gradient's first stop. */
export function paintColor(p: Paint): string {
  if (p.type === 'IMAGE') return '#cccccc';
  return p.type === 'SOLID' ? p.color : (p.stops[0]?.color ?? '#000000');
}

/** Opacity of the paint as a whole (a gradient's per-stop opacities are separate). */
export function paintOpacity(p: Paint): number {
  return p.opacity;
}

/** CSS `mix-blend-mode` value for a blend mode (HARD_LIGHT -> hard-light). Anything unknown is normal. */
export function cssBlendMode(mode: string | undefined): string | undefined {
  const known = ['DARKEN','MULTIPLY','COLOR_BURN','LIGHTEN','SCREEN','COLOR_DODGE','OVERLAY','SOFT_LIGHT','HARD_LIGHT','DIFFERENCE','EXCLUSION','HUE','SATURATION','COLOR','LUMINOSITY'];
  return mode && known.includes(mode) ? mode.toLowerCase().replace(/_/g, '-') : undefined;
}
