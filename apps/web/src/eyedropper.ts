import type { DesignDoc } from "@canvylo/design-core";
import type { Paint } from "@canvylo/types";

/** Give every selected layer that has fills the picked colour as its top fill. Returns how many layers changed. */
export function applyPickedColor(doc: DesignDoc, ids: string[], hex: string): number {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return 0;
  let changed = 0;
  doc.stopCapturing();
  for (const id of ids) {
    const n = doc.getNode(id);
    if (!n || !("fills" in n) || !n.fills) continue;
    const top = n.fills[n.fills.length - 1];
    const solid: Paint = { type: "SOLID", color: hex.toLowerCase(), opacity: top?.opacity ?? 1 };
    // a text layer keeps a single fill; shapes replace their top fill (or get one when they had none)
    doc.setStyle(id, { fills: top ? [...n.fills.slice(0, -1), solid] : [solid] });
    changed++;
  }
  doc.stopCapturing();
  return changed;
}

type EyeDropperCtor = new () => { open: () => Promise<{ sRGBHex: string }> };

/** Pick a colour from anywhere on the screen (Chromium's EyeDropper) and apply it to the selection, or copy it when nothing is selected. */
export async function pickColorFromScreen(doc: DesignDoc, ids: string[], notify: (message: string) => void): Promise<void> {
  const Ctor = (window as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper;
  if (!Ctor) return notify("The eyedropper needs a Chromium browser (Chrome, Edge)");
  try {
    const { sRGBHex } = await new Ctor().open();
    const changed = applyPickedColor(doc, ids, sRGBHex);
    if (changed) return notify(`Applied ${sRGBHex.toUpperCase()}`);
    await navigator.clipboard.writeText(sRGBHex.toUpperCase());
    notify(`Copied ${sRGBHex.toUpperCase()}`);
  } catch {
    // the person pressed Esc: nothing to do
  }
}
