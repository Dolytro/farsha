export type MenuAction =
  | "copy" | "cut" | "paste-here" | "paste-over"
  | "copy-css" | "copy-svg" | "copy-png" | "copy-props" | "paste-props"
  | "front" | "forward" | "backward" | "back"
  | "group" | "frame-selection" | "use-as-mask" | "bool-union" | "bool-subtract" | "bool-intersect" | "bool-exclude" | "ungroup" | "auto-layout" | "create-component" | "detach-instance" | "go-to-main" | "reset-overrides" | "push-to-main"
  | "visibility" | "lock" | "delete";

export interface MenuItem {
  action: MenuAction;
  label: string;
  shortcut?: string;
  /** Items in the "Copy/Paste as" submenu. */
  submenu?: boolean;
  /** Draw a separator above this item. */
  divider?: boolean;
}

export interface MenuContext {
  devMode: boolean;
  /** Shared link that may not even inspect. */
  readOnlyViewer: boolean;
  selectionCount: number;
  hasGroup: boolean;
  /** The selection is, or sits inside, an instance of a main component. */
  hasInstance: boolean;
  allHidden: boolean;
  allLocked: boolean;
}

const MOD = /Mac|iPhone|iPad/.test(typeof navigator === "undefined" ? "" : navigator.platform) ? "⌘" : "Ctrl+";
const ALT = MOD === "⌘" ? "⌥" : "Alt+";
const SHIFT = MOD === "⌘" ? "⇧" : "Shift+";

/** Figma's right-click menu, trimmed to what Farsha can do. Returns [] when no menu should open. */
export function buildMenu(c: MenuContext): MenuItem[] {
  if (c.readOnlyViewer) return [];
  if (c.devMode) return c.selectionCount ? [{ action: "copy-css", label: "Copy as CSS", shortcut: `${MOD}C` }] : [];
  const has = c.selectionCount > 0;
  const items: MenuItem[] = [];
  if (has) {
    items.push({ action: "copy", label: "Copy", shortcut: `${MOD}C` }, { action: "cut", label: "Cut", shortcut: `${MOD}X` });
  }
  items.push({ action: "paste-here", label: "Paste here", shortcut: `${MOD}V` });
  if (has) {
    items.push({ action: "paste-over", label: "Paste over selection", shortcut: `${MOD}${SHIFT}V` });
    items.push(
      { action: "copy-css", label: "Copy as CSS", submenu: true, divider: true },
      { action: "copy-svg", label: "Copy as SVG", submenu: true },
      { action: "copy-png", label: "Copy as PNG", shortcut: `${MOD}${SHIFT}C`, submenu: true },
      { action: "copy-props", label: "Copy properties", shortcut: `${MOD}${ALT}C`, submenu: true },
      { action: "paste-props", label: "Paste properties", shortcut: `${MOD}${ALT}V`, submenu: true },
      { action: "front", label: "Bring to front", shortcut: `${MOD}]`, divider: true },
      { action: "forward", label: "Bring forward", shortcut: "]" },
      { action: "backward", label: "Send backward", shortcut: "[" },
      { action: "back", label: "Send to back", shortcut: `${MOD}[` },
      { action: "group", label: "Group selection", shortcut: `${MOD}G`, divider: true },
    );
    if (c.selectionCount > 1) {
      items.push(
        { action: "bool-union", label: "Union selection", shortcut: `${MOD}${ALT}U` },
        { action: "bool-subtract", label: "Subtract selection" },
        { action: "bool-intersect", label: "Intersect selection" },
        { action: "bool-exclude", label: "Exclude selection" },
      );
    }
    items.push({ action: "use-as-mask", label: "Use as mask", shortcut: `${MOD}${ALT}M` });
    items.push({ action: "frame-selection", label: "Frame selection", shortcut: `${MOD}${ALT}G` });
    if (c.hasGroup) items.push({ action: "ungroup", label: "Ungroup", shortcut: `${MOD}${SHIFT}G` });
    items.push({ action: "auto-layout", label: "Add auto layout", shortcut: `${SHIFT}A` });
    items.push({ action: "create-component", label: "Create component", shortcut: `${MOD}${ALT}K`, divider: true });
    if (c.hasInstance) {
      items.push(
        { action: "go-to-main", label: "Go to main component" },
        { action: "push-to-main", label: "Push changes to main component" },
        { action: "reset-overrides", label: "Reset all overrides" },
        { action: "detach-instance", label: "Detach instance", shortcut: `${MOD}${ALT}B` },
      );
    }
    items.push(
      { action: "visibility", label: c.allHidden ? "Show" : "Hide", shortcut: `${MOD}${SHIFT}H`, divider: true },
      { action: "lock", label: c.allLocked ? "Unlock" : "Lock", shortcut: `${MOD}${SHIFT}L` },
      { action: "delete", label: "Delete", shortcut: "Del", divider: true },
    );
  }
  return items;
}
