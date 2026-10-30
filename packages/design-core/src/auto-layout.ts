import type { AutoLayoutProps } from '@canvylo/types';

export interface LayoutChild {
  id: string;
  width: number;
  height: number;
  /** Fill the free space of the frame along its width / height. */
  fillWidth?: boolean;
  fillHeight?: boolean;
}

export interface LayoutFrame extends AutoLayoutProps {
  width: number;
  height: number;
}

export interface LayoutResult {
  positions: Record<string, { x: number; y: number }>;
  /** New sizes of the children that fill the frame. */
  sizes: Record<string, { width: number; height: number }>;
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
  const hugMain = (frame.primarySizing ?? 'HUG') === 'HUG' && children.length > 0;
  const hugCross = (frame.counterSizing ?? 'HUG') === 'HUG' && children.length > 0;
  // A hugging frame can't hand out free space, so "fill" only applies along fixed axes.
  const fillsMain = (c: LayoutChild) => !hugMain && !!(horizontal ? c.fillWidth : c.fillHeight);
  const fillsCross = (c: LayoutChild) => !hugCross && !!(horizontal ? c.fillHeight : c.fillWidth);
  const gapSize = n(frame.itemSpacing);
  const fixedMain = children.reduce((sum, c) => sum + (fillsMain(c) ? 0 : horizontal ? c.width : c.height), 0);
  const fillCount = children.filter(fillsMain).length;
  const freeMain = (horizontal ? frame.width : frame.height) - padMainStart - padMainEnd - fixedMain - gapSize * Math.max(0, children.length - 1);
  const share = fillCount ? Math.max(0, freeMain) / fillCount : 0;
  const crossBox = (horizontal ? frame.height : frame.width) - padCrossStart - padCrossEnd;
  const sizes: LayoutResult['sizes'] = {};
  const sized = children.map((c) => {
    const next = { ...c };
    if (fillsMain(c)) horizontal ? (next.width = share) : (next.height = share);
    if (fillsCross(c)) horizontal ? (next.height = Math.max(0, crossBox)) : (next.width = Math.max(0, crossBox));
    if (next.width !== c.width || next.height !== c.height) sizes[c.id] = { width: next.width, height: next.height };
    return next;
  });
  const main = (c: LayoutChild) => (horizontal ? c.width : c.height);
  const cross = (c: LayoutChild) => (horizontal ? c.height : c.width);

  const gap = gapSize;
  // Wrapping needs a fixed size along the layout direction to break lines against.
  if (frame.layoutWrap && !hugMain && sized.length) {
    const innerMain = (horizontal ? frame.width : frame.height) - padMainStart - padMainEnd;
    const lines: LayoutChild[][] = [[]];
    let used = 0;
    for (const c of sized) {
      const line = lines[lines.length - 1]!;
      const need = main(c) + (line.length ? gap : 0);
      if (line.length && used + need > innerMain + 1e-6) {
        lines.push([c]);
        used = main(c);
      } else {
        line.push(c);
        used += need;
      }
    }
    const lineGap = n(frame.counterSpacing ?? frame.itemSpacing);
    const lineCross = lines.map((l) => l.reduce((m, c) => Math.max(m, cross(c)), 0));
    const contentCrossTotal = lineCross.reduce((a, b) => a + b, 0) + lineGap * (lines.length - 1);
    const frameCrossWrapped = hugCross ? contentCrossTotal + padCrossStart + padCrossEnd : horizontal ? frame.height : frame.width;
    const alignMain = frame.primaryAxisAlign ?? 'MIN';
    const counterAlign = frame.counterAxisAlign ?? 'MIN';
    const wrapped: LayoutResult['positions'] = {};
    let crossCursor = padCrossStart;
    lines.forEach((line, li) => {
      const lineMainSum = line.reduce((s, c) => s + main(c), 0);
      const lineContent = lineMainSum + gap * (line.length - 1);
      let cursor = padMainStart;
      let step = gap;
      if (alignMain === 'CENTER') cursor += (innerMain - lineContent) / 2;
      else if (alignMain === 'MAX') cursor += innerMain - lineContent;
      else if (alignMain === 'SPACE_BETWEEN' && line.length > 1) step = Math.max(0, (innerMain - lineMainSum) / (line.length - 1));
      for (const c of line) {
        let cPos = crossCursor;
        if (counterAlign === 'CENTER') cPos += (lineCross[li]! - cross(c)) / 2;
        else if (counterAlign === 'MAX') cPos += lineCross[li]! - cross(c);
        wrapped[c.id] = horizontal ? { x: cursor, y: cPos } : { x: cPos, y: cursor };
        cursor += main(c) + step;
      }
      crossCursor += lineCross[li]! + lineGap;
    });
    return {
      positions: wrapped,
      sizes,
      width: horizontal ? frame.width : frameCrossWrapped,
      height: horizontal ? frameCrossWrapped : frame.height,
    };
  }

  const childMain = sized.reduce((sum, c) => sum + main(c), 0);
  const contentMain = childMain + gap * Math.max(0, children.length - 1);
  const contentCross = sized.reduce((m, c) => Math.max(m, cross(c)), 0);

  const frameMain = hugMain ? contentMain + padMainStart + padMainEnd : horizontal ? frame.width : frame.height;
  const frameCross = hugCross ? contentCross + padCrossStart + padCrossEnd : horizontal ? frame.height : frame.width;
  const innerMain = frameMain - padMainStart - padMainEnd;
  const innerCross = frameCross - padCrossStart - padCrossEnd;

  const align = frame.primaryAxisAlign ?? 'MIN';
  let cursor = padMainStart;
  let step = gap;
  if (align === 'CENTER') cursor += (innerMain - contentMain) / 2;
  else if (align === 'MAX') cursor += innerMain - contentMain;
  else if (align === 'SPACE_BETWEEN' && children.length > 1) step = Math.max(0, (innerMain - childMain) / (children.length - 1));

  const counter = frame.counterAxisAlign ?? 'MIN';
  const positions: LayoutResult['positions'] = {};
  for (const c of sized) {
    let cPos = padCrossStart;
    if (counter === 'CENTER') cPos += (innerCross - cross(c)) / 2;
    else if (counter === 'MAX') cPos += innerCross - cross(c);
    positions[c.id] = horizontal ? { x: cursor, y: cPos } : { x: cPos, y: cursor };
    cursor += main(c) + step;
  }
  return {
    positions,
    sizes,
    width: horizontal ? frameMain : frameCross,
    height: horizontal ? frameCross : frameMain,
  };
}
