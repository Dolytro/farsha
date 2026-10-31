import type { DesignNode } from "@farsha/types";

const r = (v: number) => String(Math.round(v * 100) / 100);

/** SVG transform of a layer inside its parent: position, rotation about the centre, then a flip about the centre. */
export function nodeTransform(n: DesignNode): string {
  const cx = n.width / 2;
  const cy = n.height / 2;
  let t = `translate(${r(n.x)} ${r(n.y)})`;
  if (n.rotation) t += ` rotate(${r(n.rotation)} ${r(cx)} ${r(cy)})`;
  if (n.flipX || n.flipY) t += ` translate(${r(cx)} ${r(cy)}) scale(${n.flipX ? -1 : 1} ${n.flipY ? -1 : 1}) translate(${r(-cx)} ${r(-cy)})`;
  return t;
}
