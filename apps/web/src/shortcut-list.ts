import { CATEGORY_ORDER } from "./command-categories";

export interface ShortcutItem {
  id: string;
  label: string;
  shortcut: string;
}

export interface ShortcutGroup {
  label: string;
  items: ShortcutItem[];
}

/**
 * The commands that have a keyboard shortcut, grouped like the Actions palette (File, Edit, View, ...).
 * `query` keeps the commands whose name, shortcut or group contains it (case does not matter).
 */
export function groupShortcuts(commands: { id: string; label: string; shortcut?: string }[], categories: Map<string, string>, query = ""): ShortcutGroup[] {
  const q = query.trim().toLowerCase();
  const groups = new Map<string, ShortcutItem[]>();
  for (const c of commands) {
    if (!c.shortcut) continue;
    const group = categories.get(c.id) ?? "Other";
    if (q && !`${c.label} ${c.shortcut} ${group}`.toLowerCase().includes(q)) continue;
    const list = groups.get(group) ?? [];
    list.push({ id: c.id, label: c.label, shortcut: c.shortcut });
    groups.set(group, list);
  }
  const rank = (label: string) => {
    const i = (CATEGORY_ORDER as readonly string[]).indexOf(label);
    return i < 0 ? CATEGORY_ORDER.length : i;
  };
  return [...groups.entries()].sort((a, b) => rank(a[0]) - rank(b[0])).map(([label, items]) => ({ label, items }));
}
