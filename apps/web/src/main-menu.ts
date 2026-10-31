import { buildCommands, type Command } from "./commands";
import { useEditor } from "./store";

export interface MenuNode {
  label: string;
  shortcut?: string;
  run?: () => void | Promise<void>;
  children?: MenuNode[];
  disabled?: boolean;
  /** Draw a separator above this item. */
  divider?: boolean;
}

/**
 * The main menu (Figma's File / Edit / View / Object / Text / Arrange / Vector / Preferences). Every entry points at a command of
 * the Actions palette, so a command that does not exist yet is simply left out instead of breaking the menu.
 */
export function buildMainMenu(): MenuNode[] {
  const commands = new Map<string, Command>(buildCommands().map((c) => [c.id, c]));
  const hasSelection = useEditor.getState().selection.length > 0;

  const item = (id: string, label?: string, divider = false): MenuNode | undefined => {
    const c = commands.get(id);
    if (!c) return undefined;
    return { label: label ?? c.label, shortcut: c.shortcut, run: c.run, disabled: !!c.needsSelection && !hasSelection, divider };
  };
  const list = (...nodes: (MenuNode | undefined)[]): MenuNode[] => nodes.filter((n): n is MenuNode => !!n);
  const sub = (label: string, children: MenuNode[], divider = false): MenuNode | undefined => (children.length ? { label, children, divider } : undefined);
  const first = (nodes: MenuNode[]): MenuNode[] => {
    if (nodes.length) nodes[0] = { ...nodes[0]!, divider: false };
    return nodes;
  };

  const sections: { label: string; children: MenuNode[] }[] = [
    {
      label: "File",
      children: list(
        item("new-file", "New file"),
        item("place-image", "Place image…"),
        item("duplicate-file", "Duplicate"),
        item("open-local", "Open local file…", true),
        item("save-local", "Save local copy…"),
        item("save-version", "Save to version history…", true),
        item("show-versions", "Show version history"),
        item("export-dialog", "Export…", true),
        item("export-pdf", "Export frames to PDF…"),
        item("share", "Share…", true),
      ),
    },
    {
      label: "Edit",
      children: list(
        item("undo"),
        item("redo"),
        sub("Copy as", list(item("copy-css", "Copy as CSS"), item("copy-svg", "Copy as SVG"), item("copy-png", "Copy as PNG")), true),
        item("paste-over", "Paste over selection"),
        item("paste-replace", "Paste to replace"),
        item("duplicate", undefined, true),
        item("delete"),
        item("find", "Find…", true),
        item("find-replace", "Find and replace…"),
        item("copy-props", "Copy properties", true),
        item("paste-props", "Paste properties"),
        item("eyedropper", "Pick color"),
        item("select-all", undefined, true),
        item("select-matching", "Select matching layers"),
        item("select-none"),
        item("select-inverse"),
        item("select-children"),
        item("select-parent"),
      ),
    },
    {
      label: "View",
      children: list(
        item("zoom-in"),
        item("zoom-out"),
        item("zoom-100"),
        item("zoom-fit"),
        item("zoom-selection"),
        item("frame-1", "Zoom to next frame", true),
        item("frame--1", "Zoom to previous frame"),
        item("comments-toggle", "Show / hide comments", true),
        item("outlines"),
        item("pixel-grid"),
        item("rulers"),
        item("layout-grids"),
        item("outlines"),
        item("hide-ui", undefined, true),
        item("dev-mode", "Switch to Dev Mode"),
        item("prototype-tab", "Open Prototype tab"),
        item("present", undefined, true),
      ),
    },
    {
      label: "Object",
      children: list(
        item("frame-selection"),
        item("group"),
        item("ungroup"),
        item("wrap-section"),
        item("convert-section"),
        item("convert-frame"),
        item("use-as-mask"),
        item("auto-layout", undefined, true),
        item("remove-auto-layout"),
        item("create-component", undefined, true),
        item("reset-overrides", "Reset instance"),
        item("detach-instance"),
        item("front", undefined, true),
        item("forward"),
        item("backward"),
        item("back"),
        item("flip-x", undefined, true),
        item("flip-y"),
        item("rotate-180"),
        item("rotate-left"),
        item("rotate-right"),
        item("flatten", undefined, true),
        item("outline-stroke"),
        sub(
          "Boolean groups",
          list(item("boolean-UNION"), item("boolean-SUBTRACT"), item("boolean-INTERSECT"), item("boolean-EXCLUDE")),
          true,
        ),
        item("hide", "Show / Hide selection", true),
        item("lock", "Lock / Unlock selection"),
        item("hide-others"),
        item("collapse-layers"),
        item("remove-fill", undefined, true),
        item("remove-stroke"),
        item("swap-fill-stroke"),
        item("remove-interactions"),
      ),
    },
    {
      label: "Text",
      children: list(
        item("text-bold"),
        item("text-italic"),
        item("text-underline"),
        item("text-strike"),
        sub("Case", list(item("text-case-none"), item("text-case-upper"), item("text-case-lower"), item("text-case-title")), true),
        sub("Alignment", list(item("text-align-left"), item("text-align-center"), item("text-align-right")), false),
      ),
    },
    {
      label: "Arrange",
      children: list(
        item("round-to-pixel"),
        item("align-left", undefined, true),
        item("align-hcenter"),
        item("align-right"),
        item("align-top"),
        item("align-vcenter"),
        item("align-bottom"),
        item("tidy-up", undefined, true),
        item("pack-h"),
        item("pack-v"),
        item("distribute-h", undefined, true),
        item("distribute-v"),
        item("distribute-left", undefined, true),
        item("distribute-hcenter"),
        item("distribute-right"),
        item("distribute-top"),
        item("distribute-vcenter"),
        item("distribute-bottom"),
      ),
    },
    {
      label: "Vector",
      children: list(item("edit-points"), item("vector-join"), item("vector-smooth-join"), item("vector-delete-heal"), item("vector-split"), item("vector-simplify")),
    },
    {
      label: "Preferences",
      children: list(
        sub("Theme", list(item("theme-light", "Light"), item("theme-dark", "Dark"), item("theme-system", "System"))),
        sub("Interface preset", list(item("preset-canvylo", "Canvylo"), item("preset-figma", "Figma-like"), item("preset-compact", "Compact"), item("preset-comfortable", "Comfortable"), item("preset-contrast", "High contrast"))),
        item("preferences", "Preferences…", true),
        item("show-variables", "Variables…"),
      ),
    },
  ];

  return sections.filter((s) => s.children.length).map((s) => ({ label: s.label, children: first(s.children) }));
}
