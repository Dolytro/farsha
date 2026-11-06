/** Look of the interface: density, roundness, type size, accent colour and panel width (see styles/ui-v2.scss). */
export type UiPreset = "farsha" | "figma" | "compact" | "comfortable" | "contrast";

export const UI_PRESETS: { id: UiPreset; label: string; description: string }[] = [
  { id: "farsha", label: "Farsha", description: "Roomy and rounded, the default look" },
  { id: "figma", label: "Figma-like", description: "Tight rows and Figma's blue, for muscle memory" },
  { id: "compact", label: "Compact", description: "More on screen: small rows, narrow panels" },
  { id: "comfortable", label: "Comfortable", description: "Large rows and type, wide panels" },
  { id: "contrast", label: "High contrast", description: "Strong borders and text colours" },
];

export function parsePreset(value: unknown): UiPreset {
  return UI_PRESETS.some((p) => p.id === value) ? (value as UiPreset) : "farsha";
}

/** Preferences (Figma's Preferences menu): small switches that change how the editor behaves. */
export interface Prefs {
  /** The interface preset. */
  preset: UiPreset;
  /** Stay on the drawing tool after drawing a layer instead of going back to Move. */
  keepTool: boolean;
  /** Reverse the direction of wheel zoom. */
  invertZoom: boolean;
  /** The scroll wheel zooms instead of panning (Ctrl + wheel still zooms). */
  wheelZoom: boolean;
  /** Layers snap to other layers and guides while moving. */
  snapping: boolean;
  /** Underline misspelled words while typing in a text layer (the browser's spell checker). */
  spellCheck: boolean;
  /** Outline the layer under the pointer. */
  hoverHighlight: boolean;
  /** Show the width x height pill under the selection. */
  showDimensions: boolean;
  /** Dragging with the right mouse button pans the canvas (the context menu then opens on a plain right click only). */
  rightDragPan: boolean;
  /** Duplicating a layer named "Card 1" names the copy "Card 2" (Figma: Rename duplicated layers). */
  renameDuplicates: boolean;
  /** Keyboard zoom (+ / -) centres on the selection instead of the middle of the canvas. */
  keyboardZoomToSelection: boolean;
  /** Ctrl + click on the canvas opens the right-click menu. */
  ctrlClickMenu: boolean;
  /** Typing " or ' in a text layer gives curly quotes (Figma: Use smart quotes). */
  smartQuotes: boolean;
  /** Ctrl+Alt+Left / Right rotate the selection 1 degree (Shift: 15) (Figma: Use Ctrl+Alt+arrows to rotate). */
  arrowRotate: boolean;
  /** Arrow key nudge, and Shift + arrow nudge, in pixels. */
  nudge: number;
  bigNudge: number;
}

export const PREFS_KEY = "farsha.prefs";

export const DEFAULT_PREFS: Prefs = { preset: "farsha", keepTool: false, invertZoom: false, wheelZoom: false, snapping: true, spellCheck: false, hoverHighlight: true, showDimensions: true, rightDragPan: false, renameDuplicates: false, keyboardZoomToSelection: false, ctrlClickMenu: false, smartQuotes: false, arrowRotate: false, nudge: 1, bigNudge: 10 };

const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);
const amount = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) && v > 0 && v <= 1000 ? v : fallback);

/** Read saved preferences; anything missing or invalid falls back to the default. */
export function parsePrefs(text: string | null | undefined): Prefs {
  let raw: Record<string, unknown> = {};
  try {
    const parsed: unknown = text ? JSON.parse(text) : {};
    if (parsed && typeof parsed === "object") raw = parsed as Record<string, unknown>;
  } catch {
    /* damaged value: use the defaults */
  }
  return {
    preset: parsePreset(raw.preset),
    keepTool: bool(raw.keepTool, DEFAULT_PREFS.keepTool),
    invertZoom: bool(raw.invertZoom, DEFAULT_PREFS.invertZoom),
    wheelZoom: bool(raw.wheelZoom, DEFAULT_PREFS.wheelZoom),
    snapping: bool(raw.snapping, DEFAULT_PREFS.snapping),
    spellCheck: bool(raw.spellCheck, DEFAULT_PREFS.spellCheck),
    hoverHighlight: bool(raw.hoverHighlight, DEFAULT_PREFS.hoverHighlight),
    showDimensions: bool(raw.showDimensions, DEFAULT_PREFS.showDimensions),
    rightDragPan: bool(raw.rightDragPan, DEFAULT_PREFS.rightDragPan),
    renameDuplicates: bool(raw.renameDuplicates, DEFAULT_PREFS.renameDuplicates),
    keyboardZoomToSelection: bool(raw.keyboardZoomToSelection, DEFAULT_PREFS.keyboardZoomToSelection),
    ctrlClickMenu: bool(raw.ctrlClickMenu, DEFAULT_PREFS.ctrlClickMenu),
    smartQuotes: bool(raw.smartQuotes, DEFAULT_PREFS.smartQuotes),
    arrowRotate: bool(raw.arrowRotate, DEFAULT_PREFS.arrowRotate),
    nudge: amount(raw.nudge, DEFAULT_PREFS.nudge),
    bigNudge: amount(raw.bigNudge, DEFAULT_PREFS.bigNudge),
  };
}

/** Strength of a pinch / Ctrl + wheel step, and of a plain wheel step (notches are much bigger than pinch deltas). */
export const PINCH_STRENGTH = 0.01;
export const WHEEL_STRENGTH = 0.0015;

/** Multiplier for one wheel step: negative deltas zoom in, unless zoom is inverted. */
export function wheelZoomFactor(deltaY: number, invert: boolean, strength = PINCH_STRENGTH): number {
  return Math.exp((invert ? 1 : -1) * deltaY * strength);
}
