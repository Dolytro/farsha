import type { MenuNode } from "./main-menu";

/** The order the groups are listed in. */
export const CATEGORY_ORDER = ["File", "Edit", "View", "Object", "Text", "Arrange", "Vector", "Tools", "Preferences", "Other"] as const;

/**
 * Which group each command belongs to: the main menu section it sits in (File, Edit, View, Object, Text, Arrange, Vector, Preferences),
 * Tools for the tool switchers, Other for the rest.
 */
export function categoryMap(menu: MenuNode[], commandIds: string[]): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (nodes: MenuNode[], section: string) => {
    for (const n of nodes) {
      if (n.id && !out.has(n.id)) out.set(n.id, section);
      if (n.children) walk(n.children, section);
    }
  };
  for (const section of menu) walk(section.children ?? [], section.label);
  for (const id of commandIds) {
    if (out.has(id)) continue;
    out.set(id, id.startsWith("tool-") ? "Tools" : id.startsWith("align-") ? "Arrange" : id.startsWith("preset-") || id.startsWith("theme-") ? "Preferences" : "Other");
  }
  return out;
}

/** Commands ordered by group (in CATEGORY_ORDER), keeping their own order inside a group. */
export function sortByCategory<T extends { id: string }>(commands: T[], categories: Map<string, string>): T[] {
  const rank = (id: string) => {
    const i = (CATEGORY_ORDER as readonly string[]).indexOf(categories.get(id) ?? "Other");
    return i < 0 ? CATEGORY_ORDER.length : i;
  };
  return commands.map((c, i) => ({ c, i })).sort((a, b) => rank(a.c.id) - rank(b.c.id) || a.i - b.i).map((x) => x.c);
}
