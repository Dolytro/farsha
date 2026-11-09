import type { BlendMode } from "@farsha/types";

/** Figma's blend modes in the order its dropdown lists them. */
export const BLEND_MODES: [BlendMode, string][] = [
  ["NORMAL", "Normal"],
  ["DARKEN", "Darken"],
  ["MULTIPLY", "Multiply"],
  ["COLOR_BURN", "Color burn"],
  ["LIGHTEN", "Lighten"],
  ["SCREEN", "Screen"],
  ["COLOR_DODGE", "Color dodge"],
  ["OVERLAY", "Overlay"],
  ["SOFT_LIGHT", "Soft light"],
  ["HARD_LIGHT", "Hard light"],
  ["DIFFERENCE", "Difference"],
  ["EXCLUSION", "Exclusion"],
  ["HUE", "Hue"],
  ["SATURATION", "Saturation"],
  ["COLOR", "Color"],
  ["LUMINOSITY", "Luminosity"],
];
