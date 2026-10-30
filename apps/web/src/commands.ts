import { alignSelection, distributeSelection, type AlignMode } from "./align";
import { distributeEdges, packLayers, roundToPixel, tidyUp, type EdgeMode } from "./arrange-actions";
import { addAutoLayout, removeAutoLayout } from "./auto-layout-actions";
import { booleanSelection, toggleLayoutGrids, adjacentFrame, useAsMask, flipSelection, frameSelection, groupSelection, reorderSelection, toggleHidden, toggleLocked, ungroupSelection, zoomBy, zoomFit } from "./actions";
import { copyAsCss, copyAsPng, copyAsSvg, exportLayers } from "./exporting";
import { duplicateNodes, selectAllIn, topLevelOf } from "./clipboard";
import { createComponentFromSelection, detachSelection, resetSelection } from "./component-actions";
import { duplicateFile, openLocalFilePicker, saveLocalCopy } from "./local-file";
import { placeImagePicker } from "./place-image";
import { hideOtherLayers, removeInteractions, removePaint, rotateSelectionBy, swapFillAndStroke } from "./object-actions";
import { newFile } from "./drive/session";
import { fitText } from "./text-layout";
import { setSection, wrapInSection } from "./section-actions";
import { setTextAlign, setTextCase, toggleTextStyle } from "./text-actions";
import { UI_PRESETS } from "./prefs";
import { pickColorFromScreen } from "./eyedropper";
import { startFrame } from "./prototype";
import { saveVersion } from "./versions";
import { selectMatching, selectChildren, selectInverse, selectParent } from "./selection-nav";
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
    { id: "place-image", label: "Place image…", shortcut: `${MOD}${SHIFT}K`, keywords: "insert picture photo import", run: () => placeImagePicker() },
    { id: "export-dialog", label: "Export…", shortcut: `${MOD}${SHIFT}E`, keywords: "download png jpg svg", run: () => state().setExportOpen(true) },
    { id: "duplicate-file", label: "Duplicate file", keywords: "copy document", run: () => duplicateFile() },
    { id: "new-file", label: "New file", keywords: "blank document", run: () => newFile() },
    { id: "open-local", label: "Open local file…", keywords: "open canvylo", run: () => openLocalFilePicker() },
    { id: "select-none", label: "Select none", shortcut: "Esc", run: () => state().select([]) },
    { id: "select-all", label: "Select all", shortcut: `${MOD}A`, run: () => state().select(selectAllIn(doc(), sel(), state().pageId)) },
    { id: "select-inverse", label: "Select inverse", shortcut: `${MOD}${SHIFT}A`, needsSelection: true, run: () => state().select(selectInverse(doc(), sel(), state().pageId)) },
    { id: "select-matching", label: "Select all matching properties", shortcut: `${MOD}${ALT}A`, needsSelection: true, keywords: "same fill color font", run: () => state().select(selectMatching(doc(), sel(), state().pageId)) },
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
    { id: "use-as-mask", label: "Use as mask", shortcut: `${MOD}${ALT}M`, needsSelection: true, keywords: "clip", run: () => state().select(useAsMask(doc(), sel())) },
    ...(
      [
        ["UNION", "Union selection", `${MOD}${ALT}U`],
        ["SUBTRACT", "Subtract selection", ""],
        ["INTERSECT", "Intersect selection", ""],
        ["EXCLUDE", "Exclude selection", ""],
      ] as const
    ).map(
      ([op, label, shortcut]): Command => ({
        id: `boolean-${op}`,
        label,
        shortcut: shortcut || undefined,
        needsSelection: true,
        keywords: "boolean combine merge shapes",
        run: () => {
          const out = booleanSelection(doc(), sel(), op);
          if (out.error) state().showToast(out.error);
          else state().select(out.ids);
        },
      }),
    ),
    { id: "text-bold", label: "Bold", shortcut: `${MOD}B`, needsSelection: true, keywords: "text weight", run: () => void toggleTextStyle(doc(), sel(), "bold", fitText) },
    { id: "text-italic", label: "Italic", shortcut: `${MOD}I`, needsSelection: true, keywords: "text style", run: () => void toggleTextStyle(doc(), sel(), "italic", fitText) },
    { id: "text-underline", label: "Underline", shortcut: `${MOD}U`, needsSelection: true, keywords: "text decoration", run: () => void toggleTextStyle(doc(), sel(), "underline", fitText) },
    { id: "text-strike", label: "Strikethrough", shortcut: `${MOD}${SHIFT}X`, needsSelection: true, keywords: "text decoration line through", run: () => void toggleTextStyle(doc(), sel(), "strikethrough", fitText) },
    { id: "text-case-none", label: "Original case", needsSelection: true, keywords: "text case", run: () => void setTextCase(doc(), sel(), "NONE", fitText) },
    { id: "text-case-upper", label: "Upper case", needsSelection: true, keywords: "text case capitals", run: () => void setTextCase(doc(), sel(), "UPPER", fitText) },
    { id: "text-case-lower", label: "Lower case", needsSelection: true, keywords: "text case", run: () => void setTextCase(doc(), sel(), "LOWER", fitText) },
    { id: "text-case-title", label: "Title case", needsSelection: true, keywords: "text case capitalize", run: () => void setTextCase(doc(), sel(), "TITLE", fitText) },
    { id: "text-align-left", label: "Align text left", shortcut: `${MOD}${ALT}L`, needsSelection: true, keywords: "text alignment", run: () => void setTextAlign(doc(), sel(), "LEFT", fitText) },
    { id: "text-align-center", label: "Align text center", shortcut: `${MOD}${ALT}T`, needsSelection: true, keywords: "text alignment", run: () => void setTextAlign(doc(), sel(), "CENTER", fitText) },
    { id: "text-align-right", label: "Align text right", shortcut: `${MOD}${ALT}R`, needsSelection: true, keywords: "text alignment", run: () => void setTextAlign(doc(), sel(), "RIGHT", fitText) },
    { id: "wrap-section", label: "Wrap in new section", shortcut: `${MOD}S`, needsSelection: true, keywords: "section group canvas area", run: () => state().select(wrapInSection(doc(), sel())) },
    { id: "convert-section", label: "Convert to section", needsSelection: true, keywords: "frame section", run: () => void setSection(doc(), sel(), true) },
    { id: "convert-frame", label: "Convert to frame", needsSelection: true, keywords: "frame section", run: () => void setSection(doc(), sel(), false) },
    tool("section", "Section", `${SHIFT}S`),
    tool("scale", "Scale", "K"),
    { id: "rotate-180", label: "Rotate 180°", needsSelection: true, keywords: "turn", run: () => void rotateSelectionBy(doc(), sel(), 180) },
    { id: "rotate-left", label: "Rotate 90° left", needsSelection: true, keywords: "turn counterclockwise", run: () => void rotateSelectionBy(doc(), sel(), -90) },
    { id: "rotate-right", label: "Rotate 90° right", needsSelection: true, keywords: "turn clockwise", run: () => void rotateSelectionBy(doc(), sel(), 90) },
    { id: "remove-fill", label: "Remove fill", shortcut: `${ALT}/`, needsSelection: true, keywords: "clear paint", run: () => void removePaint(doc(), sel(), "fills") },
    { id: "remove-stroke", label: "Remove stroke", shortcut: `${SHIFT}/`, needsSelection: true, keywords: "clear border", run: () => void removePaint(doc(), sel(), "strokes") },
    { id: "swap-fill-stroke", label: "Swap fill and stroke", shortcut: `${SHIFT}X`, needsSelection: true, run: () => void swapFillAndStroke(doc(), sel()) },
    { id: "hide-others", label: "Hide other layers", needsSelection: true, keywords: "isolate focus", run: () => void hideOtherLayers(doc(), sel(), state().pageId) },
    { id: "collapse-layers", label: "Collapse layers", shortcut: `${ALT}L`, keywords: "fold layers panel", run: () => state().collapseLayers() },
    { id: "remove-interactions", label: "Remove interactions", needsSelection: true, keywords: "prototype links", run: () => void removeInteractions(doc(), sel()) },
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
    { id: "round-to-pixel", label: "Round to pixel", needsSelection: true, keywords: "snap whole pixels", run: () => void roundToPixel(doc(), sel()) },
    { id: "tidy-up", label: "Tidy up", shortcut: `${MOD}${ALT}${SHIFT}T`, needsSelection: true, keywords: "arrange grid rows", run: () => void tidyUp(doc(), sel()) },
    { id: "pack-h", label: "Pack horizontal", needsSelection: true, keywords: "arrange row", run: () => void packLayers(doc(), sel(), "horizontal") },
    { id: "pack-v", label: "Pack vertical", needsSelection: true, keywords: "arrange column", run: () => void packLayers(doc(), sel(), "vertical") },
    { id: "distribute-h", label: "Distribute horizontal spacing", shortcut: `${ALT}${SHIFT}H`, needsSelection: true, run: () => void distributeSelection(doc(), sel(), "horizontal") },
    { id: "distribute-v", label: "Distribute vertical spacing", shortcut: `${ALT}${SHIFT}V`, needsSelection: true, run: () => void distributeSelection(doc(), sel(), "vertical") },
    ...(
      [
        ["left", "Distribute left"],
        ["hcenter", "Distribute horizontal centers"],
        ["right", "Distribute right"],
        ["top", "Distribute top"],
        ["vcenter", "Distribute vertical centers"],
        ["bottom", "Distribute bottom"],
      ] as [EdgeMode, string][]
    ).map(([mode, label]): Command => ({ id: `distribute-${mode}`, label, needsSelection: true, keywords: "arrange space evenly", run: () => void distributeEdges(doc(), sel(), mode) })),
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
    { id: "zoom-in", label: "Zoom in", shortcut: `${MOD}+`, keywords: "view", run: () => state().setViewport(zoomBy(state().viewport, state().viewport.zoom * 1.25)) },
    { id: "zoom-out", label: "Zoom out", shortcut: `${MOD}-`, keywords: "view", run: () => state().setViewport(zoomBy(state().viewport, state().viewport.zoom * 0.8)) },
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
    { id: "layout-grids", label: "Show / hide layout grids", shortcut: `${SHIFT}G`, needsSelection: true, keywords: "columns rows guides", run: () => void (toggleLayoutGrids(doc(), sel()) || state().showToast("Select a frame with a layout grid")) },
    {
      id: "edit-points",
      label: "Edit points of the pen path",
      shortcut: "Enter",
      needsSelection: true,
      keywords: "vector anchors curve",
      run: () => {
        const id = sel()[0];
        if ((doc().getNode(id ?? "") as { penPoints?: unknown } | undefined)?.penPoints) state().setEditingPath(id!);
        else state().showToast("Select a path drawn with the Pen tool");
      },
    },
    { id: "eyedropper", label: "Pick color from the screen", shortcut: "I", keywords: "eyedropper sample color", run: () => pickColorFromScreen(doc(), sel(), state().showToast) },
    { id: "preferences", label: "Preferences", keywords: "settings keep tool snapping zoom nudge", run: () => state().setPrefsOpen(true) },
    { id: "pixel-grid", label: "Show / hide pixel grid", shortcut: `${SHIFT}'`, keywords: "view pixels zoom", run: () => state().setPixelGrid(!state().pixelGrid) },
    ...UI_PRESETS.map((p): Command => ({ id: `preset-${p.id}`, label: `UI preset: ${p.label}`, keywords: "interface look density compact comfortable contrast figma", run: () => state().setPrefs({ preset: p.id }) })),
    { id: "hide-ui", label: "Show / hide UI", shortcut: `${MOD}\\`, keywords: "minimize panels fullscreen focus", run: () => state().setUiHidden(!state().uiHidden) },
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
    { id: "show-variables", label: "Show variables", keywords: "colors modes tokens", run: () => state().setVariablesOpen(true) },
    {
      id: "next-mode",
      label: "Switch to next variable mode",
      keywords: "light dark theme",
      run: () => {
        const d = doc();
        const modes = d.modes();
        const next = modes[(modes.findIndex((m) => m.id === d.activeModeId()) + 1) % modes.length]!;
        d.setActiveMode(next.id);
        state().showToast(`Mode: ${next.name}`);
      },
    },
    ...(["light", "dark", "system"] as const).map(
      (t): Command => ({ id: `theme-${t}`, label: `Theme: ${t[0]!.toUpperCase()}${t.slice(1)}`, keywords: "appearance dark mode light preferences", run: () => state().setTheme(t) }),
    ),
    { id: "save-version", label: "Save to version history", shortcut: `${MOD}${ALT}S`, keywords: "snapshot checkpoint", run: async () => void (await saveVersion("")) },
    { id: "show-versions", label: "Show version history", keywords: "restore snapshot", run: () => state().setVersionsOpen(true) },
    { id: "save-local", label: "Save local copy", keywords: "download file .canvylo", run: saveLocalCopy },
    { id: "share", label: "Share", keywords: "link", run: () => state().setShareOpen(true) },
  ];
}
