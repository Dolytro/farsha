/** Look of the interface: density, roundness, type size, accent colour and panel width (see styles/ui-v2.scss). */
export type UiPreset = "canvylo" | "figma" | "compact" | "comfortable" | "contrast";

export const UI_PRESETS: { id: UiPreset; label: string; description: string }[] = [
  { id: "canvylo", label: "Canvylo", description: "Roomy and rounded, the default look" },
  { id: "figma", label: "Figma-like", description: "Tight rows and Figma's blue, for muscle memory" },
  { id: "compact", label: "Compact", description: "More on screen: small rows, narrow panels" },
  { id: "comfortable", label: "Comfortable", description: "Large rows and type, wide panels" },
  { id: "contrast", label: "High contrast", description: "Strong borders and text colours" },
];

export function parsePreset(value: unknown): UiPreset {
  return UI_PRESETS.some((p) => p.id === value) ? (value as UiPreset) : "canvylo";
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
  /** Arrow key nudge, and Shift + arrow nudge, in pixels. */
  nudge: number;
  bigNudge: number;
}

export const PREFS_KEY = "canvylo.prefs";

export const DEFAULT_PREFS: Prefs = { preset: "canvylo", keepTool: false, invertZoom: false, wheelZoom: false, snapping: true, nudge: 1, bigNudge: 10 };

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
