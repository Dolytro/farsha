import { buildCommands, type Command } from "./commands";
import { useEditor } from "./store";

export interface MenuNode {
  /** The command this entry runs. */
  id?: string;
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
    return { id, label: label ?? c.label, shortcut: c.shortcut, run: c.run, disabled: !!c.needsSelection && !hasSelection, divider };
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
        item("duplicate-page", "Duplicate page"),
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
        sub("Copy as", list(item("copy-text", "Copy as text"), item("copy-css", "Copy as CSS"), item("copy-css-all", "Copy as CSS (all layers)"), item("copy-svg", "Copy as SVG"), item("copy-png", "Copy as PNG")), true),
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
        item("set-default-properties", undefined, true),
        item("reset-default-properties"),
        sub("Select all with", list(item("select-same-type", "Same type"), item("select-same-fill", "Same fill"), item("select-same-stroke", "Same stroke"), item("select-same-font", "Same font"), item("select-same-textProps", "Same text properties"), item("select-same-instance", "Same instance"), item("select-same-variant", "Same variant"), item("select-same-effect", "Same effects"), item("select-same-opacity", "Same opacity"), item("select-same-name", "Same name"))),
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
        item("frame-find-prev", undefined, true),
        item("frame-find-next"),
        item("outlines"),
        item("view-slices"),
        item("view-maskOutlines"),
        item("view-frameOutlines"),
        item("view-annotations"),
        item("view-pixelPreview"),
        sub("Panels", list(item("panel-left"), item("panel-left-minimize"), item("toggle-variables"), item("panel-assets"), item("panel-design"), item("panel-prototype"), item("panel-right", undefined, true))),
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
        item("push-to-main"),
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
        sub("More layout options", list(item("layout-lock-aspect"), item("layout-unlock-aspect"), item("layout-resize-to-fit", undefined, true), item("layout-hug-width"), item("layout-hug-height"), item("layout-fill-width"), item("layout-fill-height")), true),
        item("flatten", undefined, true),
        item("outline-stroke"),
        sub(
          "Boolean groups",
          list(item("boolean-group-UNION"), item("boolean-group-SUBTRACT"), item("boolean-group-INTERSECT"), item("boolean-group-EXCLUDE"), item("boolean-UNION", undefined, true), item("boolean-SUBTRACT"), item("boolean-INTERSECT"), item("boolean-EXCLUDE")),
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
        item("delete-contents"),
      ),
    },
    {
      label: "Text",
      children: list(
        item("text-on-path"),
        item("text-off-path"),
        item("text-bold"),
        item("text-italic"),
        item("text-underline"),
        item("text-strike"),
        sub("Case", list(item("text-case-none"), item("text-case-upper"), item("text-case-lower"), item("text-case-title")), true),
        item("text-link", undefined, true),
        item("text-list-bullet"),
        item("text-list-number"),
        sub("Alignment", list(item("text-align-left"), item("text-align-center"), item("text-align-right"), item("text-align-justify"), item("text-valign-top", undefined, true), item("text-valign-middle"), item("text-valign-bottom")), true),
        sub("Adjust", list(item("text-size-up"), item("text-size-down"), item("text-weight-up"), item("text-weight-down"), item("text-leading-up"), item("text-leading-down"), item("text-tracking-up"), item("text-tracking-down")), false),
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
      children: list(item("edit-points"), item("vector-join"), item("vector-smooth-join"), item("vector-delete-heal"), item("vector-split"), item("vector-simplify"), item("vector-offset")),
    },
    {
      label: "Preferences",
      children: list(
        sub("Theme", list(item("theme-light", "Light"), item("theme-dark", "Dark"), item("theme-system", "System"))),
        sub("Interface preset", list(item("preset-farsha", "Farsha"), item("preset-figma", "Figma-like"), item("preset-compact", "Compact"), item("preset-comfortable", "Comfortable"), item("preset-contrast", "High contrast"))),
        item("preferences", "Preferences…", true),
        item("keyboard-shortcuts"),
        item("show-variables", "Variables…"),
      ),
    },
    {
      label: "Help",
      children: list(
        item("keyboard-shortcuts"),
        item("help-github", undefined, true),
        item("help-issues"),
        item("help-privacy", undefined, true),
        item("help-terms"),
      ),
    },
  ];

  return sections.filter((s) => s.children.length).map((s) => ({ label: s.label, children: first(s.children) }));
}
