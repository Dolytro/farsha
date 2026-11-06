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
  /** Id of the colour variable that supplies `color`; the colour follows the variable's value in the active mode. */
  variableId?: string;
}

export interface GradientStop {
  /** 0..1 along the gradient line */
  position: number;
  color: string;
  opacity: number;
}

export interface GradientPaint {
  type: 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'GRADIENT_ANGULAR' | 'GRADIENT_DIAMOND';
  stops: GradientStop[];
  /** Degrees; 0 = left to right, 90 = top to bottom. For an angular gradient where the sweep starts. Ignored by radial and diamond gradients. */
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

/** How the end of an open stroke is drawn. */
export type StrokeCap = 'NONE' | 'ROUND' | 'SQUARE';
/** How two stroke segments meet at a corner. */
export type StrokeJoin = 'MITER' | 'BEVEL' | 'ROUND';
/** Arrowheads and other end shapes of a vector's stroke. */
export type LineEnd = 'NONE' | 'ARROW_LINES' | 'ARROW_FILLED' | 'CIRCLE' | 'SQUARE' | 'DIAMOND';

/** Where a stroke sits relative to the shape edge (Figma: Inside, Center, Outside). */
export type StrokeAlign = 'INSIDE' | 'CENTER' | 'OUTSIDE';

export interface ShadowEffect {
  type: 'DROP_SHADOW' | 'INNER_SHADOW';
  x: number;
  y: number;
  blur: number;
  /** Grows (positive) or shrinks (negative) the shadow shape before it is blurred. Missing means 0. */
  spread?: number;
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

/** Blurs what is behind the layer (Figma's Background blur). */
export interface BackgroundBlurEffect {
  type: 'BACKGROUND_BLUR';
  radius: number;
  visible: boolean;
}

/** Grain over the layer's shape (Figma's Noise effect). Size is the grain size in pixels, density 0..1. */
export interface NoiseEffect {
  type: 'NOISE';
  size: number;
  density: number;
  opacity: number;
  visible: boolean;
}

/** Soft mottling over the layer's shape (Figma's Texture effect). */
export interface TextureEffect {
  type: 'TEXTURE';
  size: number;
  /** 0..1 strength. */
  density: number;
  visible: boolean;
}

/** Frosted glass: blurs what is behind the layer and adds a light tint (Figma's Glass effect). */
export interface GlassEffect {
  type: 'GLASS';
  /** Blur radius of the backdrop. */
  radius: number;
  /** 0..1 amount of white tint. */
  light: number;
  visible: boolean;
}

export type Effect = ShadowEffect | BlurEffect | BackgroundBlurEffect | NoiseEffect | TextureEffect | GlassEffect;

/** One message of a comment thread. */
export interface CommentReply {
  id: string;
  author: string;
  text: string;
  /** Milliseconds since the epoch. */
  at: number;
}

/** A comment pinned to a point of a page. It lives in the document, so it travels with the file. */
export interface Comment {
  id: string;
  pageId: string;
  /** Position on the page. */
  x: number;
  y: number;
  author: string;
  text: string;
  at: number;
  resolved: boolean;
  replies: CommentReply[];
}

/** A column of variable values (for example Light and Dark). */
export interface VariableMode {
  id: string;
  name: string;
}

/** A named colour with one value per mode. Paints bound to it show the value of the active mode. */
/** The properties a number variable can drive, and the boolean one. Opacity is in percent. */
export const NUMBER_BINDABLE = ['width', 'height', 'cornerRadius', 'opacity', 'itemSpacing', 'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom', 'fontSize', 'strokeWidth', 'rotation'] as const;
export const BOOLEAN_BINDABLE = ['visible'] as const;

export interface ColorVariable {
  id: string;
  name: string;
  /** 'STRING' makes it a text variable (its values are texts, not colours). Missing means a colour. */
  kind?: 'COLOR' | 'STRING' | 'NUMBER' | 'BOOLEAN';
  /** Hex colour per mode id (the text for a text variable, a number as text for a number variable, "true" or "false" for a boolean). */
  values: Record<string, string>;
}

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

/** What an interaction does: go to a frame, back to the previous one, or open a web address. */
export type InteractionAction =
  | { type: 'NAVIGATE'; targetId: string }
  | { type: 'BACK' }
  | { type: 'OPEN_URL'; url: string }
  /** Show a frame on top of the current one, centred, with a dimmed backdrop (Figma's Open overlay). */
  | { type: 'OPEN_OVERLAY'; targetId: string; /** Dim the frame behind (default true). */ dim?: boolean; /** A click outside closes it (default true). */ closeOnOutside?: boolean; position?: OverlayPosition }
  /** Replace the open overlay by another frame (opens it when none is open). */
  | { type: 'SWAP_OVERLAY'; targetId: string; dim?: boolean; closeOnOutside?: boolean; position?: OverlayPosition }
  | { type: 'CLOSE_OVERLAY' }
  /** Scroll the frame so that a layer comes into view. */
  | { type: 'SCROLL_TO'; targetId: string };

export type OverlayPosition = 'CENTER' | 'TOP' | 'BOTTOM';

/** What starts an interaction in a prototype (Figma: On click, While hovering, On drag, After delay, Key / gamepad). */
export type InteractionTrigger = 'ON_CLICK' | 'ON_HOVER' | 'ON_DRAG' | 'ON_MOUSE_ENTER' | 'ON_MOUSE_LEAVE' | 'ON_MOUSE_DOWN' | 'ON_MOUSE_UP' | 'AFTER_DELAY' | 'ON_KEY';

/** How a transition speeds up and slows down. */
export type Easing = 'LINEAR' | 'EASE_IN' | 'EASE_OUT' | 'EASE_IN_OUT' | 'SPRING';

/** How the next frame appears. */
export type TransitionType = 'INSTANT' | 'SMART_ANIMATE' | 'DISSOLVE' | 'SLIDE_IN_LEFT' | 'SLIDE_IN_RIGHT' | 'SLIDE_IN_TOP' | 'SLIDE_IN_BOTTOM';

export interface Interaction {
  trigger: InteractionTrigger;
  /** AFTER_DELAY: milliseconds after the frame appears. */
  delayMs?: number;
  /** ON_KEY: the key, as KeyboardEvent.key (for example "ArrowRight", "Enter", "a"). */
  key?: string;
  action: InteractionAction;
  /** Missing means an instant change. */
  transition?: { type: TransitionType; durationMs: number; easing?: Easing };
}

/** Figma's Dev Mode status of a layer. */
export type DevStatus = 'READY' | 'COMPLETED';

/** One way a layer is exported: format, scale and a file name suffix (Figma's export settings). */
export type ExportSettingFormat = 'PNG' | 'JPG' | 'WEBP' | 'SVG' | 'PDF';
export interface ExportSetting {
  format: ExportSettingFormat;
  scale: number;
  suffix: string;
}

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
  /** Dev Mode: marks a layer as ready for development or completed. */
  devStatus?: DevStatus;
  /** Dev Mode: a note for developers. */
  devNote?: string;
  /** Prototype: this top-level frame is where a flow starts (Figma's flow starting point). */
  flowStart?: boolean;
  /** Name of the flow that starts at this frame. Missing means "Flow 1", "Flow 2" and so on. */
  flowName?: string;
  /** Number and boolean variables bound to properties of this layer: property name to variable id. */
  varBindings?: Record<string, string>;
  /** The export settings of this layer; none means PNG at 1x. */
  exportSettings?: ExportSetting[];
  /** Lock proportions: changing the width changes the height by the same factor, and the other way round. */
  lockAspect?: boolean;
  /** Optional so documents saved before effects existed still load. */
  effects?: Effect[];
  /** Missing means NORMAL. */
  blendMode?: BlendMode;
  constraintH?: Constraint;
  constraintV?: Constraint;
  /** Mirrored across the vertical / horizontal axis through the centre (Shift+H / Shift+V). */
  flipX?: boolean;
  flipY?: boolean;
  /** Inside an auto layout frame: FILL = take the free space of the frame along that side (Figma's "Fill container"). Missing means FIXED. */
  layoutSizingH?: 'FIXED' | 'FILL';
  layoutSizingV?: 'FIXED' | 'FILL';
  /** Size limits (Figma's min / max width and height): a layer that fills or hugs in auto layout never gets smaller than the min or larger than the max. Missing means no limit. */
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  /** Inside an auto layout frame: ABSOLUTE takes the layer out of the flow, so it stays where it is placed (Figma's "Ignore auto layout"). */
  layoutPositioning?: 'AUTO' | 'ABSOLUTE';
  /** True for a mask layer: it is not drawn itself, and only shows through its shape the layers above it in the same parent. */
  isMask?: boolean;
  /** Prototype links of this layer (Prototype tab). */
  interactions?: Interaction[];
  /** Dash pattern of the strokes as [dash, gap, ...] in pixels; missing or empty means solid. */
  strokeDash?: number[];
  strokeCap?: StrokeCap;
  strokeJoin?: StrokeJoin;
  /** Line ends of a vector's stroke (arrowheads). */
  strokeStartCap?: LineEnd;
  strokeEndCap?: LineEnd;
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
  /** Wrap children onto new lines when they do not fit along the layout direction (needs a fixed size in that direction). */
  layoutWrap?: boolean;
  /** Space between wrapped lines. */
  counterSpacing?: number;
}

/** A layout grid drawn over a frame as a guide (Figma's layout grid): columns, rows, or a square grid. */
export interface LayoutGrid {
  type: 'GRID' | 'COLUMNS' | 'ROWS';
  /** Columns / rows: how many. */
  count?: number;
  gutter?: number;
  margin?: number;
  /** Square grid: the size of a cell. */
  size?: number;
  color: string;
  opacity: number;
  visible: boolean;
}

/** A property of a main component that its instances can set: show / hide a layer, or change a text layer's text. */
export interface ComponentProperty {
  id: string;
  name: string;
  type: 'BOOLEAN' | 'TEXT';
  /** The value instances start with. */
  defaultValue: boolean | string;
  /** The layer inside the main component this property controls. */
  targetId: string;
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
  /** 0 to 1: how far the corner curve eases into the edge (Figma's corner smoothing; 0.6 is the iOS look). */
  cornerSmoothing?: number;
  /** Individual stroke weights [top, right, bottom, left] (Figma's per-side strokes); inside the shape. */
  strokeSides?: [number, number, number, number];
  clipsContent: boolean;
  layoutGrids?: LayoutGrid[];
  /** A section: a named area of the canvas that holds frames and layers but is not itself a screen (Figma's Section tool). */
  isSection?: boolean;
  /** Prototype: a frame taller than the window scrolls vertically while presenting (Figma's Vertical scrolling). */
  overflowScroll?: 'NONE' | 'VERTICAL' | 'HORIZONTAL' | 'BOTH';
  /** True for a main component: its layers are mirrored by every instance. */
  isComponent?: boolean;
  /** A short note on a main component (what it is for), shown in Assets. */
  description?: string;
  /** Set on an instance: id of the main component it follows. */
  componentId?: string;
  /** On a main component: the properties its instances can set. */
  componentProps?: ComponentProperty[];
  /** On an instance: the values it sets for those properties, by property id. */
  propValues?: Record<string, boolean | string>;
  /** Main components that share a set id are the variants of one component (Figma's component set). */
  componentSetId?: string;
  /** Value of every variant property for this variant, e.g. { Size: 'Large', State: 'Hover' }. */
  variantProps?: Record<string, string>;
}

export interface GroupNode extends BaseNode {
  type: 'GROUP';
  /** A live boolean group: the group draws the union / difference / intersection / exclusion of its children. */
  booleanOp?: 'UNION' | 'SUBTRACT' | 'INTERSECT' | 'EXCLUDE';
  /** Paint of a boolean group's result. */
  fills?: Paint[];
  strokes?: Paint[];
  strokeWidth?: number;
}

export interface RectangleNode extends BaseNode {
  type: 'RECTANGLE';
  fills: Paint[];
  strokes: Paint[];
  strokeWidth: number;
  strokeAlign?: StrokeAlign;
  cornerRadius: number;
  cornerRadii?: [number, number, number, number];
  cornerSmoothing?: number;
  strokeSides?: [number, number, number, number];
  /** A video layer: the stored video asset this rectangle plays (MP4 or WebM). */
  videoAssetId?: string;
  /** A slice (Figma's Slice tool): an invisible export region that captures whatever is under it on the page. */
  isSlice?: boolean;
}

export interface EllipseNode extends BaseNode {
  type: 'ELLIPSE';
  fills: Paint[];
  strokes: Paint[];
  strokeWidth: number;
  strokeAlign?: StrokeAlign;
}

export type TextAlign = 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
export type TextDecoration = 'NONE' | 'UNDERLINE' | 'STRIKETHROUGH';
/** Line style of an underline or strikethrough. Missing means solid. */
export type TextDecorationStyle = 'SOLID' | 'DOTTED' | 'WAVY';
export type TextCase = 'NONE' | 'UPPER' | 'LOWER' | 'TITLE';
/** Every paragraph of a text layer starts with a bullet or a running number. */
export type TextList = 'NONE' | 'BULLET' | 'NUMBER';
/** Writing direction; right to left text (Arabic, Hebrew) starts at the right edge. */
export type TextDirection = 'LTR' | 'RTL';

/** A styled stretch of a text layer's characters (rich text): start inclusive, end exclusive. Only what differs from the layer is set. */
export interface TextRun {
  start: number;
  end: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
}
export type TextVerticalAlign = 'TOP' | 'CENTER' | 'BOTTOM';

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
  /** Italic style (Ctrl+I). */
  italic?: boolean;
  /** Underline or strikethrough (Ctrl+U, Ctrl+Shift+X). Missing means none. */
  textDecoration?: TextDecoration;
  textDecorationStyle?: TextDecorationStyle;
  /** Upper case, lower case or Title Case display of the characters. Missing means as typed. */
  textCase?: TextCase;
  /** Bulleted or numbered list of the paragraphs. Missing means a plain paragraph. */
  textList?: TextList;
  /** Extra space in pixels between paragraphs. */
  paragraphSpacing?: number;
  /** Indent in pixels of the first line of every paragraph. */
  paragraphIndent?: number;
  /** Show at most this many lines and end the last one with an ellipsis (0 or missing: show all). */
  maxLines?: number;
  /** Missing means left to right. */
  textDirection?: TextDirection;
  /** A web address the whole text links to (Figma's Create link). */
  textLink?: string;
  /** Rich text: styles of parts of the characters, on top of the layer's own style. */
  runs?: TextRun[];
  /** The pen path (a sibling vector) the text runs along (Figma's Text on path). */
  textPathId?: string;
  /** A text variable this layer's characters follow (in the active mode). */
  textVariableId?: string;
  /** Where the text sits inside a box taller than the text. Missing means top. */
  textVerticalAlign?: TextVerticalAlign;
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
  /** Pen paths only: the anchor points (in the layer's own coordinates, handles as offsets) so the path can be edited. */
  penPoints?: { x: number; y: number; hx: number; hy: number }[];
  penClosed?: boolean;
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
  cornerSmoothing?: number;
  strokeSides?: [number, number, number, number] | null;
  devStatus?: DevStatus | null;
  devNote?: string | null;
  description?: string | null;
  flowStart?: boolean | null;
  flowName?: string | null;
  lockAspect?: boolean | null;
  exportSettings?: ExportSetting[] | null;
  varBindings?: Record<string, string> | null;
  videoAssetId?: string | null;
  overflowScroll?: 'NONE' | 'VERTICAL' | 'HORIZONTAL' | 'BOTH' | null;
  booleanOp?: 'UNION' | 'SUBTRACT' | 'INTERSECT' | 'EXCLUDE' | null;
  opacity?: number;
  visible?: boolean;
  locked?: boolean;
  clipsContent?: boolean;
  layoutSizingH?: 'FIXED' | 'FILL';
  layoutSizingV?: 'FIXED' | 'FILL';
  minWidth?: number | null;
  maxWidth?: number | null;
  minHeight?: number | null;
  maxHeight?: number | null;
  layoutPositioning?: 'AUTO' | 'ABSOLUTE';
  strokeDash?: number[];
  strokeCap?: StrokeCap;
  strokeJoin?: StrokeJoin;
  strokeStartCap?: LineEnd;
  strokeEndCap?: LineEnd;
  interactions?: Interaction[];
  isMask?: boolean;
  layoutGrids?: LayoutGrid[];
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
  italic?: boolean;
  textDecoration?: TextDecoration;
  textDecorationStyle?: TextDecorationStyle;
  textCase?: TextCase;
  textList?: TextList;
  paragraphSpacing?: number;
  paragraphIndent?: number;
  maxLines?: number;
  textDirection?: TextDirection;
  textLink?: string | null;
  runs?: TextRun[] | null;
  textPathId?: string | null;
  textVariableId?: string | null;
  textVerticalAlign?: TextVerticalAlign;
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
