import type { DesignNode } from "@canvylo/types";

/** Properties to write per layer id. */
export type ScaleUpdates = Record<string, Record<string, unknown>>;

const r2 = (v: number) => Math.round(v * 100) / 100;

/**
 * Figma's Scale tool: the layer and everything inside it grow or shrink by one factor, including text size, stroke weight,
 * corner radius, shadows and auto layout spacing. `nodes` is the layer first, then its descendants, as they were when the drag began;
 * `target` is the new box of the layer in its parent. Returns the new property values for every layer.
 */
export function buildScaleUpdates(nodes: DesignNode[], target: { x: number; y: number; width: number; height: number }): ScaleUpdates {
  const root = nodes[0];
  if (!root) return {};
  const f = root.width > 0 ? target.width / root.width : 1;
  const out: ScaleUpdates = {};
  for (const n of nodes) {
    const any = n as unknown as Record<string, unknown>;
    const props: Record<string, unknown> =
      n === root
        ? { x: r2(target.x), y: r2(target.y), width: r2(target.width), height: r2(root.height * f) }
        : { x: r2(n.x * f), y: r2(n.y * f), width: r2(n.width * f), height: r2(n.height * f) };
    const num = (key: string) => {
      if (typeof any[key] === "number") props[key] = r2((any[key] as number) * f);
    };
    num("strokeWidth");
    num("cornerRadius");
    num("itemSpacing");
    num("counterSpacing");
    num("paddingTop");
    num("paddingRight");
    num("paddingBottom");
    num("paddingLeft");
    if (n.type === "TEXT") {
      props.fontSize = Math.max(1, r2(n.fontSize * f));
      props.letterSpacing = r2(n.letterSpacing * f);
      if (typeof n.lineHeight === "number") props.lineHeight = r2(n.lineHeight * f);
    }
    if (Array.isArray(any.cornerRadii)) props.cornerRadii = (any.cornerRadii as number[]).map((v) => r2(v * f));
    if (n.effects?.length) {
      props.effects = n.effects.map((e) => ("radius" in e ? { ...e, radius: r2(e.radius * f) } : e.type !== "DROP_SHADOW" && e.type !== "INNER_SHADOW" ? { ...e, ...("size" in e ? { size: r2(e.size * f) } : {}) } : { ...e, x: r2(e.x * f), y: r2(e.y * f), blur: r2(e.blur * f), ...(e.spread ? { spread: r2(e.spread * f) } : {}) }));
    }
    out[n.id] = props;
  }
  return out;
}
