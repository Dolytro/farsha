export const MIN_PANEL = 200;
export const MAX_PANEL = 480;

/** A side panel is never narrower than 200 px or wider than 480 px (and never wider than 40% of the window). */
export function clampPanelWidth(width: number, windowWidth = Infinity): number {
  const max = Math.min(MAX_PANEL, Math.max(MIN_PANEL, windowWidth * 0.4));
  return Math.round(Math.min(max, Math.max(MIN_PANEL, Number.isFinite(width) ? width : MIN_PANEL)));
}

/** Read a saved width back; anything that is not a sensible number gives null (use the preset width). */
export function parsePanelWidth(raw: string | null): number | null {
  if (raw === null || raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? clampPanelWidth(n) : null;
}
