/** Variables are grouped by the slashes in their names: "brand/primary/500" is called 500 in the group brand/primary. */
export function splitName(name: string): { path: string; leaf: string } {
  const parts = name.split("/").map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return { path: "", leaf: name.trim() };
  const leaf = parts.pop()!;
  return { path: parts.join("/"), leaf };
}

/** A group path and a leaf name joined into a variable name (empty parts and extra slashes are dropped). */
export function joinName(path: string, leaf: string): string {
  return [...path.split("/"), ...leaf.split("/")].map((p) => p.trim()).filter(Boolean).join("/");
}

export interface VariableGroup<T> {
  /** "" for variables that are in no group. */
  path: string;
  items: { variable: T; leaf: string }[];
}

/** Variables split into groups by name: the ungrouped ones first, then each group in the order its first variable appears. */
export function groupVariables<T extends { name: string }>(variables: T[]): VariableGroup<T>[] {
  const groups = new Map<string, VariableGroup<T>>([["", { path: "", items: [] }]]);
  for (const variable of variables) {
    const { path, leaf } = splitName(variable.name);
    if (!groups.has(path)) groups.set(path, { path, items: [] });
    groups.get(path)!.items.push({ variable, leaf });
  }
  return [...groups.values()].filter((g) => g.items.length > 0);
}
