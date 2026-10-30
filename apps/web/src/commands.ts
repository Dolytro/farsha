import { alignSelection, type AlignMode } from "./align";
import { addAutoLayout, removeAutoLayout } from "./auto-layout-actions";
import { adjacentFrame, flipSelection, frameSelection, groupSelection, reorderSelection, toggleHidden, toggleLocked, ungroupSelection, zoomBy, zoomFit } from "./actions";
import { copyAsCss, copyAsPng, copyAsSvg, exportLayers } from "./exporting";
import { duplicateNodes, selectAllIn, topLevelOf } from "./clipboard";
import { createComponentFromSelection, detachSelection, resetSelection } from "./component-actions";
import { saveLocalCopy } from "./local-file";
import { startFrame } from "./prototype";
import { saveVersion } from "./versions";
import { selectChildren, selectInverse, selectParent } from "./selection-nav";
import { useEditor, type Tool } from "./store";

export interface Command {
  id: string;
  label: string;
  shortcut?: string;
  keywords?: string;
  /** Needs a selection; hidden from the list otherwise. */
  needsSelection?: boolean;
  run: () => void | Promise<void>;
}

const MAC = /Mac|iPhone|iPad/.test(typeof navigator === "undefined" ? "" : navigator.platform);
const MOD = MAC ? "⌘" : "Ctrl+";
const ALT = MAC ? "⌥" : "Alt+";
const SHIFT = MAC ? "⇧" : "Shift+";

const state = () => useEditor.getState();
const sel = () => state().selection;
const doc = () => state().doc;

const tool = (id: Tool, label: string, key: string): Command => ({ id: `tool-${id}`, label: `${label} tool`, shortcut: key, keywords: "draw create", run: () => state().setTool(id) });
const align = (mode: AlignMode, label: string, key: string): Command => ({ id: `align-${mode}`, label: `Align ${label}`, shortcut: `${ALT}${key}`, needsSelection: true, run: () => void alignSelection(doc(), sel(), mode) });

/** Everything the command palette (Ctrl+/) can run. Each command reads the editor state when it runs. */
export function buildCommands(): Command[] {
  return [
    { id: "undo", label: "Undo", shortcut: `${MOD}Z`, run: () => doc().undo() },
    { id: "redo", label: "Redo", shortcut: `${MOD}${SHIFT}Z`, run: () => doc().redo() },
    { id: "select-all", label: "Select all", shortcut: `${MOD}A`, run: () => state().select(selectAllIn(doc(), sel(), state().pageId)) },
    { id: "select-inverse", label: "Select inverse", shortcut: `${MOD}${SHIFT}A`, needsSelection: true, run: () => state().select(selectInverse(doc(), sel(), state().pageId)) },
    { id: "select-children", label: "Select children", shortcut: "Enter", needsSelection: true, run: () => state().select(selectChildren(doc(), sel())) },
    { id: "select-parent", label: "Select parent", shortcut: `${SHIFT}Enter`, needsSelection: true, run: () => state().select(selectParent(doc(), sel(), state().pageId)) },
    { id: "duplicate", label: "Duplicate", shortcut: `${MOD}D`, needsSelection: true, run: () => state().select(duplicateNodes(doc(), sel())) },
    {
      id: "delete",
      label: "Delete",
      shortcut: "Del",
      needsSelection: true,
      run: () => {
        const d = doc();
        d.stopCapturing();
        topLevelOf(d, sel()).forEach((id) => d.hasNode(id) && d.deleteNode(id));
        d.stopCapturing();
        state().select([]);
      },
    },
    { id: "group", label: "Group selection", shortcut: `${MOD}G`, needsSelection: true, run: () => state().select(groupSelection(doc(), sel())) },
    { id: "frame-selection", label: "Frame selection", shortcut: `${MOD}${ALT}G`, needsSelection: true, keywords: "wrap", run: () => state().select(frameSelection(doc(), sel())) },
    { id: "ungroup", label: "Ungroup", shortcut: `${MOD}${SHIFT}G`, needsSelection: true, run: () => state().select(ungroupSelection(doc(), sel())) },
    { id: "front", label: "Bring to front", shortcut: `${MOD}]`, needsSelection: true, keywords: "order z", run: () => reorderSelection(doc(), sel(), Infinity) },
    { id: "back", label: "Send to back", shortcut: `${MOD}[`, needsSelection: true, keywords: "order z", run: () => reorderSelection(doc(), sel(), -Infinity) },
    { id: "hide", label: "Hide / show", shortcut: `${MOD}${SHIFT}H`, needsSelection: true, keywords: "visibility", run: () => toggleHidden(doc(), sel()) },
    { id: "lock", label: "Lock / unlock", shortcut: `${MOD}${SHIFT}L`, needsSelection: true, run: () => toggleLocked(doc(), sel()) },
    { id: "flip-x", label: "Flip horizontal", shortcut: `${SHIFT}H`, needsSelection: true, keywords: "mirror", run: () => flipSelection(doc(), sel(), "x") },
    { id: "flip-y", label: "Flip vertical", shortcut: `${SHIFT}V`, needsSelection: true, keywords: "mirror", run: () => flipSelection(doc(), sel(), "y") },
    { id: "auto-layout", label: "Add auto layout", shortcut: `${SHIFT}A`, needsSelection: true, keywords: "flex stack", run: () => state().select(addAutoLayout(doc(), sel())) },
    { id: "remove-auto-layout", label: "Remove auto layout", shortcut: `${MOD}${ALT}${SHIFT}A`, needsSelection: true, run: () => removeAutoLayout(doc(), sel()) },
    { id: "create-component", label: "Create component", shortcut: `${MOD}${ALT}K`, needsSelection: true, keywords: "main symbol", run: () => state().select(createComponentFromSelection(doc(), sel())) },
    { id: "detach-instance", label: "Detach instance", shortcut: `${MOD}${ALT}B`, needsSelection: true, run: () => state().select(detachSelection(doc(), sel())) },
    { id: "reset-overrides", label: "Reset all overrides", needsSelection: true, keywords: "instance", run: () => resetSelection(doc(), sel()) },
    align("left", "left", "A"),
    align("hcenter", "horizontal centers", "H"),
    align("right", "right", "D"),
    align("top", "top", "W"),
    align("vcenter", "vertical centers", "V"),
    align("bottom", "bottom", "S"),
    tool("select", "Move", "V"),
    tool("hand", "Hand", "H"),
    tool("frame", "Frame", "F"),
    tool("rect", "Rectangle", "R"),
    tool("ellipse", "Ellipse", "O"),
    tool("line", "Line", "L"),
    tool("arrow", "Arrow", `${SHIFT}L`),
    tool("polygon", "Polygon", ""),
    tool("star", "Star", ""),
    tool("pen", "Pen", "P"),
    tool("text", "Text", "T"),
    {
      id: "zoom-fit",
      label: "Zoom to fit",
      shortcut: `${SHIFT}1`,
      keywords: "view",
      run: () => {
        const v = zoomFit(doc(), state().pageId, []);
        if (v) state().setViewport(v);
      },
    },
    {
      id: "zoom-selection",
      label: "Zoom to selection",
      shortcut: `${SHIFT}2`,
      needsSelection: true,
      keywords: "view",
      run: () => {
        const v = zoomFit(doc(), state().pageId, sel());
        if (v) state().setViewport(v);
      },
    },
    ...([1, -1] as const).map(
      (dir): Command => ({
        id: `frame-${dir}`,
        label: dir === 1 ? "Zoom to next frame" : "Zoom to previous frame",
        shortcut: dir === 1 ? "N" : `${SHIFT}N`,
        keywords: "view",
        run: () => {
          const s = state();
          const frame = adjacentFrame(s.doc, s.pageId, s.selection[0], dir);
          if (!frame) return;
          s.select([frame]);
          const v = zoomFit(s.doc, s.pageId, [frame]);
          if (v) s.setViewport(v);
        },
      }),
    ),
    { id: "zoom-100", label: "Zoom to 100%", shortcut: `${SHIFT}0`, keywords: "view", run: () => state().setViewport(zoomBy(state().viewport, 1)) },
    {
      id: "present",
      label: "Present prototype",
      shortcut: `${MOD}${ALT}Enter`,
      keywords: "prototype play preview",
      run: () => {
        const frame = startFrame(doc(), sel());
        if (frame) state().setPresenting(frame);
        else state().showToast("Add a frame to present");
      },
    },
    { id: "prototype-tab", label: "Open Prototype tab", keywords: "interactions links", run: () => state().setPrototypeMode(true) },
    { id: "rulers", label: "Show / hide rulers", shortcut: `${SHIFT}R`, keywords: "view guides", run: () => state().setRulers(!state().rulers) },
    { id: "dev-mode", label: "Toggle Dev Mode", shortcut: `${SHIFT}D`, keywords: "inspect code", run: () => state().setDevMode(!state().devMode) },
    {
      id: "copy-css",
      label: "Copy as CSS",
      needsSelection: true,
      keywords: "code",
      run: async () => state().showToast((await copyAsCss(doc(), sel())) ? "Copied as CSS" : "Select a layer first"),
    },
    {
      id: "copy-svg",
      label: "Copy as SVG",
      needsSelection: true,
      run: async () => state().showToast((await copyAsSvg(doc(), sel())) ? "Copied as SVG" : "Select a layer first"),
    },
    {
      id: "copy-png",
      label: "Copy as PNG",
      shortcut: `${MOD}${SHIFT}C`,
      needsSelection: true,
      run: async () => state().showToast((await copyAsPng(doc(), sel())) ? "Copied as PNG" : "Select a layer first"),
    },
    ...(["PNG", "JPG", "SVG"] as const).map(
      (format): Command => ({
        id: `export-${format}`,
        label: `Export selection as ${format}`,
        needsSelection: true,
        keywords: "download save",
        run: async () => {
          const n = await exportLayers(doc(), sel(), format, 1);
          state().showToast(n ? `Exported ${n} ${n === 1 ? "file" : "files"}` : "Nothing to export");
        },
      }),
    ),
    { id: "save-version", label: "Save to version history", shortcut: `${MOD}${ALT}S`, keywords: "snapshot checkpoint", run: async () => void (await saveVersion("")) },
    { id: "show-versions", label: "Show version history", keywords: "restore snapshot", run: () => state().setVersionsOpen(true) },
    { id: "save-local", label: "Save local copy", keywords: "download file .canvylo", run: saveLocalCopy },
    { id: "share", label: "Share", keywords: "link", run: () => state().setShareOpen(true) },
  ];
}
