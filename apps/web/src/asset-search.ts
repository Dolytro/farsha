/** Drag-and-drop type used when a component is dragged from the Assets panel onto the canvas. */
export const COMPONENT_DRAG = "application/x-farsha-component";

export interface AssetLike {
  name: string;
  description?: string | null;
  variantProps?: Record<string, string>;
}

/** Keep the components whose name, description or variant values contain every word of the query (case does not matter). */
export function filterAssets<T extends AssetLike>(items: T[], query: string): T[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return items;
  return items.filter((n) => {
    const hay = `${n.name} ${n.description ?? ""} ${Object.entries(n.variantProps ?? {}).map(([k, v]) => `${k} ${v}`).join(" ")}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}
