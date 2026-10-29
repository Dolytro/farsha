import type { AutoLayoutProps } from '@canvylo/types';

export interface LayoutChild {
  id: string;
  width: number;
  height: number;
}

export interface LayoutFrame extends AutoLayoutProps {
  width: number;
  height: number;
}

export interface LayoutResult {
  positions: Record<string, { x: number; y: number }>;
  /** New frame size (only differs from the current one for hugging axes). */
  width: number;
  height: number;
}

const n = (v: number | undefined) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, v) : 0);

/**
 * Place children in a row or column inside an auto layout frame (Figma's auto layout, without wrapping):
 * padding, gap, alignment on both axes, space-between, and hug sizing of the frame itself.
 * Returns null when the frame is not auto layout.
 */
export function computeAutoLayout(frame: LayoutFrame, children: LayoutChild[]): LayoutResult | null {
  const mode = frame.layoutMode;
  if (mode !== 'HORIZONTAL' && mode !== 'VERTICAL') return null;
  const horizontal = mode === 'HORIZONTAL';
  const padMainStart = n(horizontal ? frame.paddingLeft : frame.paddingTop);
  const padMainEnd = n(horizontal ? frame.paddingRight : frame.paddingBottom);
  const padCrossStart = n(horizontal ? frame.paddingTop : frame.paddingLeft);
  const padCrossEnd = n(horizontal ? frame.paddingBottom : frame.paddingRight);
  const main = (c: LayoutChild) => (horizontal ? c.width : c.height);
  const cross = (c: LayoutChild) => (horizontal ? c.height : c.width);

  const gap = n(frame.itemSpacing);
  const sizes = children.reduce((sum, c) => sum + main(c), 0);
  const contentMain = sizes + gap * Math.max(0, children.length - 1);
  const contentCross = children.reduce((m, c) => Math.max(m, cross(c)), 0);

  const hugMain = (frame.primarySizing ?? 'HUG') === 'HUG' && children.length > 0;
  const hugCross = (frame.counterSizing ?? 'HUG') === 'HUG' && children.length > 0;
  const frameMain = hugMain ? contentMain + padMainStart + padMainEnd : horizontal ? frame.width : frame.height;
  const frameCross = hugCross ? contentCross + padCrossStart + padCrossEnd : horizontal ? frame.height : frame.width;
  const innerMain = frameMain - padMainStart - padMainEnd;
  const innerCross = frameCross - padCrossStart - padCrossEnd;

  const align = frame.primaryAxisAlign ?? 'MIN';
  let cursor = padMainStart;
  let step = gap;
  if (align === 'CENTER') cursor += (innerMain - contentMain) / 2;
  else if (align === 'MAX') cursor += innerMain - contentMain;
  else if (align === 'SPACE_BETWEEN' && children.length > 1) step = Math.max(0, (innerMain - sizes) / (children.length - 1));

  const counter = frame.counterAxisAlign ?? 'MIN';
  const positions: LayoutResult['positions'] = {};
  for (const c of children) {
    let cPos = padCrossStart;
    if (counter === 'CENTER') cPos += (innerCross - cross(c)) / 2;
    else if (counter === 'MAX') cPos += innerCross - cross(c);
    positions[c.id] = horizontal ? { x: cursor, y: cPos } : { x: cPos, y: cursor };
    cursor += main(c) + step;
  }
  return {
    positions,
    width: horizontal ? frameMain : frameCross,
    height: horizontal ? frameCross : frameMain,
  };
}
