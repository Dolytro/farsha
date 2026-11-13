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
  /** False hides this fill or stroke without deleting it (the eye in the Design panel). Missing means shown. */
  visible?: boolean;
  /** CSS hex colour, e.g. `#388bff` */
  color: string;
  opacity: number;
  /** Id of the colour variable that supplies `color`; the colour follows the variable's value in the active mode. */
  variableId?: string;
  /** How this fill mixes with what is below it (Figma's fill blend mode). Missing means normal. */
  blendMode?: BlendMode;
}

export interface GradientStop {
  /** 0..1 along the gradient line */
  position: number;
  color: string;
  opacity: number;
}

export interface GradientPaint {
  type: 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'GRADIENT_ANGULAR' | 'GRADIENT_DIAMOND';
  /** False hides this fill or stroke without deleting it. Missing means shown. */
  visible?: boolean;
  stops: GradientStop[];
  /** Degrees; 0 = left to right, 90 = top to bottom. For an angular gradient where the sweep starts. Ignored by radial and diamond gradients. */
  angle: number;
  opacity: number;
  blendMode?: BlendMode;
}

export type ImageScaleMode = 'FILL' | 'FIT' | 'STRETCH' | 'TILE' | 'CROP';

export interface ImagePaint {
  type: 'IMAGE';
  /** False hides this fill or stroke without deleting it. Missing means shown. */
  visible?: boolean;
  /** Reference to an asset stored in the document; null until an image is chosen. */
  assetId: string | null;
  scaleMode: ImageScaleMode;
  /** Pixel size of the picture, remembered so Tile mode can repeat it at its natural size. */
  imageWidth?: number;
  imageHeight?: number;
  /** Tile mode only: size of one tile as a multiple of the picture's own size (default 1). */
  tileScale?: number;
  /** Crop mode only: how far the picture is zoomed in (1 = filling the layer, default 1), and how far it is moved, in pixels of the layer. */
  cropZoom?: number;
  cropX?: number;
  cropY?: number;
  opacity: number;
  blendMode?: BlendMode;
  /** Colour adjustments of the picture, each from -100 to 100 (0 or missing leaves it as it is). */
  adjustments?: ImageAdjustments;
}

export interface ImageAdjustments {
  exposure?: number;
  contrast?: number;
  saturation?: number;
  /** Cooler (negative) to warmer (positive). */
  temperature?: number;
  /** Greener (negative) to more magenta (positive). */
  tint?: number;
  /** Darkens (negative) or lifts (positive) the bright parts. */
  highlights?: number;
  /** Darkens (negative) or lifts (positive) the dark parts. */
  shadows?: number;
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
  /** Drop shadow only: false cuts the shadow away where the layer itself is, so it never shows through transparent parts. Missing means true. */
  showBehind?: boolean;
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
  /** The collection the mode belongs to; missing means the first collection. */
  collectionId?: string;
}

/** A set of variables that share the same modes (Figma's variable collection). */
export interface VariableCollection {
  id: string;
  name: string;
}

/** A named colour with one value per mode. Paints bound to it show the value of the active mode. */
/** The properties a number variable can drive, and the boolean one. Opacity is in percent. */
export const NUMBER_BINDABLE = ['width', 'height', 'cornerRadius', 'opacity', 'itemSpacing', 'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom', 'fontSize', 'strokeWidth', 'rotation'] as const;
export const BOOLEAN_BINDABLE = ['visible'] as const;

/** Groups of properties a number variable can be limited to (its scope). */
export const NUMBER_SCOPES = ['SIZE', 'CORNER_RADIUS', 'OPACITY', 'SPACING', 'FONT_SIZE', 'STROKE_WIDTH', 'ROTATION'] as const;
export type NumberScope = (typeof NUMBER_SCOPES)[number];

export const NUMBER_SCOPE_LABEL: Record<NumberScope, string> = {
  SIZE: 'Width and height',
  CORNER_RADIUS: 'Corner radius',
  OPACITY: 'Opacity',
  SPACING: 'Gap and padding',
  FONT_SIZE: 'Font size',
  STROKE_WIDTH: 'Stroke weight',
  ROTATION: 'Rotation',
};

const SCOPE_OF_PROP: Record<string, NumberScope> = {
  width: 'SIZE',
  height: 'SIZE',
  cornerRadius: 'CORNER_RADIUS',
  opacity: 'OPACITY',
  itemSpacing: 'SPACING',
  paddingLeft: 'SPACING',
  paddingRight: 'SPACING',
  paddingTop: 'SPACING',
  paddingBottom: 'SPACING',
  fontSize: 'FONT_SIZE',
  strokeWidth: 'STROKE_WIDTH',
  rotation: 'ROTATION',
};

/** Whether a variable may be bound to a property: always for a variable without a scope, otherwise only for the properties in its scope. */
export function variableAllowsProperty(v: { scopes?: string[] }, prop: string): boolean {
  if (!v.scopes?.length) return true;
  const scope = SCOPE_OF_PROP[prop];
  return !scope || v.scopes.includes(scope);
}

/** Where a colour variable may be used (its scope). */
export const COLOR_SCOPES = ['FILL', 'TEXT_FILL', 'STROKE'] as const;
export type ColorScope = (typeof COLOR_SCOPES)[number];
export type VariableScope = NumberScope | ColorScope;

export const COLOR_SCOPE_LABEL: Record<ColorScope, string> = {
  FILL: 'Shape and frame fills',
  TEXT_FILL: 'Text fills',
  STROKE: 'Strokes',
};

/** Whether a colour variable may be used for a kind of paint: always without a scope, otherwise only for the kinds in its scope. */
export function variableAllowsUse(v: { scopes?: string[] }, use: ColorScope): boolean {
  return !v.scopes?.length || v.scopes.includes(use);
}

export interface ColorVariable {
  id: string;
  name: string;
  /** 'STRING' makes it a text variable (its values are texts, not colours). Missing means a colour. */
  kind?: 'COLOR' | 'STRING' | 'NUMBER' | 'BOOLEAN';
  /** Hex colour per mode id (the text for a text variable, a number as text for a number variable, "true" or "false" for a boolean). */
  values: Record<string, string>;
  /** The property groups (number variables) or kinds of paint (colour variables) it may be used for. Missing or empty means all of them. */
  scopes?: VariableScope[];
  /** The collection the variable belongs to; missing means the first collection. */
  collectionId?: string;
}

/** A reusable colour: layers that use it get its paints as their fills. */
export interface FillStyle {
  id: string;
  name: string;
  paints: Paint[];
}

/** The stroke properties a stroke style carries. */
export const STROKE_STYLE_KEYS = ['strokes', 'strokeWidth', 'strokeAlign', 'strokeDash', 'strokeCap', 'strokeJoin', 'strokeMiterAngle'] as const;

/** A reusable stroke (colour, weight, position, dashes, caps, joins): layers that use it follow it. */
export interface StrokeStyle {
  id: string;
  name: string;
  strokes: Paint[];
  strokeWidth: number;
  strokeAlign?: StrokeAlign;
  strokeDash?: number[];
  strokeCap?: StrokeCap;
  strokeJoin?: StrokeJoin;
  strokeMiterAngle?: number;
}

/** A reusable set of layout grids: frames that use it follow it. */
export interface GridStyle {
  id: string;
  name: string;
  grids: LayoutGrid[];
}

/** A reusable set of effects (shadows, blurs ...): layers that use it follow it. */
export interface EffectStyle {
  id: string;
  name: string;
  effects: Effect[];
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
  | { type: 'SCROLL_TO'; targetId: string }
  /** Switch the variable mode (for example Light to Dark) while presenting; layers bound to variables follow it. */
  | { type: 'SET_MODE'; modeId: string }
  /** Set a variable (in the active mode) while presenting: a colour, a text, a number or "true" / "false". Undone when the presentation ends. */
  | { type: 'SET_VARIABLE'; variableId: string; value: string }
  /** If a variable (in the active mode) compares true to a value, go to one frame, else to another (or do nothing). */
  /** Interactive component: while presenting, the layer (an instance) turns into another main component, usually another variant of its set. Undone when the presentation ends. */
  | { type: 'CHANGE_TO'; componentId: string }
  /** Control a video layer while presenting (Figma's Media controls): play, pause, mute, or skip. */
  | { type: 'MEDIA'; targetId: string; op: MediaOp; /** Skip length in seconds (default 10). */ seconds?: number }
  | { type: 'CONDITIONAL'; variableId: string; op: ConditionOp; value: string; /** More conditions, up to 5; all of them (AND, default) or any of them (OR) must hold together with the first. */ more?: ConditionClause[]; join?: 'AND' | 'OR'; thenId: string; elseId?: string };

export type ConditionOp = 'EQ' | 'NEQ' | 'GT' | 'LT';

/** One comparison of a Conditional action: a variable, how to compare it, and the value to compare to. */
export interface ConditionClause {
  variableId: string;
  op: ConditionOp;
  value: string;
}

export type OverlayPosition = 'CENTER' | 'TOP' | 'BOTTOM';

export type MediaOp = 'PLAY' | 'PAUSE' | 'TOGGLE_PLAY' | 'MUTE' | 'UNMUTE' | 'TOGGLE_MUTE' | 'SKIP_FORWARD' | 'SKIP_BACK';

/** What starts an interaction in a prototype (Figma: On click, While hovering, On drag, After delay, Key / gamepad). */
export type InteractionTrigger = 'ON_CLICK' | 'ON_HOVER' | 'ON_DRAG' | 'ON_MOUSE_ENTER' | 'ON_MOUSE_LEAVE' | 'ON_MOUSE_DOWN' | 'ON_MOUSE_UP' | 'AFTER_DELAY' | 'ON_KEY';

/** How a transition speeds up and slows down. */
export type Easing = 'LINEAR' | 'EASE_IN' | 'EASE_OUT' | 'EASE_IN_OUT' | 'SPRING';

/** How the next frame appears. */
export type TransitionType = 'INSTANT' | 'SMART_ANIMATE' | 'DISSOLVE' | 'SLIDE_IN_LEFT' | 'SLIDE_IN_RIGHT' | 'SLIDE_IN_TOP' | 'SLIDE_IN_BOTTOM' | 'MOVE_OUT_LEFT' | 'MOVE_OUT_RIGHT' | 'MOVE_OUT_TOP' | 'MOVE_OUT_BOTTOM' | 'MOVE_IN_LEFT' | 'MOVE_IN_RIGHT' | 'MOVE_IN_TOP' | 'MOVE_IN_BOTTOM' | 'SLIDE_OUT_LEFT' | 'SLIDE_OUT_RIGHT' | 'SLIDE_OUT_TOP' | 'SLIDE_OUT_BOTTOM' | 'PUSH_LEFT' | 'PUSH_RIGHT' | 'PUSH_TOP' | 'PUSH_BOTTOM';

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

/** A link attached to a layer for developers (web addresses only). */
export interface DevResource {
  name: string;
  url: string;
}

/** One way a layer is exported: format, scale and a file name suffix (Figma's export settings). */
export type ExportSettingFormat = 'PNG' | 'JPG' | 'WEBP' | 'SVG' | 'PDF';
export interface ExportSetting {
  format: ExportSettingFormat;
  scale: number;
  suffix: string;
  /** Frames only: leave out the frame's own fill, stroke and effects and export just what is inside it. */
  contentsOnly?: boolean;
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
  /** Dev Mode: links to tickets, specs or code for this layer. */
  devResources?: DevResource[];
  /** Dev Mode (Code Connect style): on a main component, the code developers use for it; its instances show this snippet. */
  codeSnippet?: string;
  /** Prototype: this top-level frame is where a flow starts (Figma's flow starting point). */
  flowStart?: boolean;
  /** Name of the flow that starts at this frame. Missing means "Flow 1", "Flow 2" and so on. */
  flowName?: string;
  /** Variable mode this frame and everything inside it shows, whatever the file's active mode is (Figma's explicit mode). */
  explicitMode?: string;
  /** Number and boolean variables bound to properties of this layer: property name to variable id. */
  varBindings?: Record<string, string>;
  /** The export settings of this layer; none means PNG at 1x. */
  exportSettings?: ExportSetting[];
  /** Lock proportions: changing the width changes the height by the same factor, and the other way round. */
  lockAspect?: boolean;
  /** Optional so documents saved before effects existed still load. */
  effects?: Effect[];
  /** The effect style this layer follows; its effects are the style's. */
  effectStyleId?: string;
  /** The stroke style this layer follows; its stroke properties are the style's. */
  strokeStyleId?: string;
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
  /** How a mask layer reveals the layers above it: ALPHA (default) by where its shape is, LUMINANCE by how light its own fills are. */
  maskType?: 'ALPHA' | 'LUMINANCE';
  /** Prototype links of this layer (Prototype tab). */
  interactions?: Interaction[];
  /** Dash pattern of the strokes as [dash, gap, ...] in pixels; missing or empty means solid. */
  strokeDash?: number[];
  strokeCap?: StrokeCap;
  strokeJoin?: StrokeJoin;
  /** Miter join: the smallest corner angle (degrees, 1 to 180) that stays pointed; sharper corners are bevelled. Missing means 28.96 (Figma's default). */
  strokeMiterAngle?: number;
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
  counterAxisAlign?: Exclude<LayoutAlign, 'SPACE_BETWEEN'> | 'BASELINE';
  /** Hug = the frame grows / shrinks with its content along the layout direction. Missing means HUG. */
  primarySizing?: LayoutSizing;
  counterSizing?: LayoutSizing;
  /** Wrap children onto new lines when they do not fit along the layout direction (needs a fixed size in that direction). */
  layoutWrap?: boolean;
  /** Canvas stacking (Figma): the first layer in the frame is drawn on top of the others instead of the last. */
  layoutFirstOnTop?: boolean;
  /** Figma's "Include strokes in layout": centred and outside strokes count towards the size of each child, so gap and padding are measured from the outer edge of the stroke. */
  layoutIncludeStrokes?: boolean;
  /** Space between wrapped lines. */
  counterSpacing?: number;
  /** Horizontal layout with Wrap on: this many children per row, lined up in columns (a grid). 0 or missing is an ordinary wrap. */
  gridColumns?: number;
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
  /** The grid style this frame follows; its grids are the style's. */
  gridStyleId?: string;
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
  /** Arc (Figma's ellipse handles): where the arc starts in degrees clockwise from 3 o'clock (default 0). */
  arcStart?: number;
  /** How far the arc goes, 0 to 360 degrees (default 360, a full ellipse). */
  arcSweep?: number;
  /** Inner radius as a share of the outer one, 0 to 0.99 (default 0). Above 0 the ellipse is a ring or a ring sector. */
  arcRatio?: number;
}

export type TextAlign = 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
export type TextDecoration = 'NONE' | 'UNDERLINE' | 'STRIKETHROUGH';
/** Line style of an underline or strikethrough. Missing means solid. */
export type TextDecorationStyle = 'SOLID' | 'DOTTED' | 'WAVY';
export type TextCase = 'NONE' | 'UPPER' | 'LOWER' | 'TITLE' | 'SMALL_CAPS';
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
  /** Colour of these characters as #rrggbb; missing means the layer's own fill. */
  color?: string;
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
  /** OpenType features switched on ("tnum", "zero", "frac", "ss01" ...) or off ("-liga"). Missing means the font's defaults. */
  fontFeatures?: string[];
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
  /** Outline of the letters (Figma's text stroke); the first stroke is drawn. Missing means none. */
  strokes?: Paint[];
  strokeWidth?: number;
  strokeAlign?: StrokeAlign;
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
  /** Polygon and Star tool layers: what they are and how many sides or points they have, so the Design panel can change them. */
  shapeKind?: 'POLYGON' | 'STAR';
  shapeSides?: number;
  /** Stars: inner radius as a share of the outer one (0.05 to 0.95). */
  starRatio?: number;
  /** Corner radius of a polygon or star in its 100 x 100 drawing units (0 to 50, default 0). */
  shapeRadius?: number;
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
  arcStart?: number;
  arcSweep?: number;
  arcRatio?: number;
  strokeStyleId?: string | null;
  devStatus?: DevStatus | null;
  devNote?: string | null;
  devResources?: DevResource[] | null;
  codeSnippet?: string | null;
  description?: string | null;
  flowStart?: boolean | null;
  flowName?: string | null;
  explicitMode?: string | null;
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
  strokeMiterAngle?: number | null;
  strokeStartCap?: LineEnd;
  strokeEndCap?: LineEnd;
  interactions?: Interaction[];
  isMask?: boolean;
  maskType?: 'ALPHA' | 'LUMINANCE';
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
  fontFeatures?: string[];
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

/** The paints that are shown (a paint is shown unless its `visible` is false). */
export function shownPaints<T extends { visible?: boolean }>(paints: T[] | undefined | null): T[] {
  return Array.isArray(paints) ? paints.filter((p) => p.visible !== false) : [];
}
