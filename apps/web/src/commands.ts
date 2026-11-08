import { HELP_LINKS, openHelpLink } from "./help-links";
import { alignSelection, distributeSelection, type AlignMode } from "./align";
import { distributeEdges, packLayers, roundToPixel, tidyUp, type EdgeMode } from "./arrange-actions";
import { addAutoLayout, removeAutoLayout } from "./auto-layout-actions";
import { extractDefaults, saveDefaults } from "./defaults";
import { exportFramesToPdf } from "./pdf-export";
import { deletePointAndHeal, joinSelection, simplifySelection, smoothSelection, splitVectorAt } from "./vector-actions";
import { panToLayer, booleanGroupSelection, booleanSelection, flattenSelection, offsetSelection, outlineStrokeSelection, toggleLayoutGrids, adjacentFrame, useAsMask, flipSelection, frameSelection, groupSelection, reorderSelection, toggleHidden, toggleLocked, ungroupSelection, zoomBy, zoomFit, zoomKeyboard } from "./actions";
import { copyAsCss, copyAsPng, copyAsSvg, exportLayers } from "./exporting";
import { duplicateNodes, selectAllIn, topLevelOf } from "./clipboard";
import { afterDuplicate, duplicateOffset } from "./duplicate-offset";
import { createComponentFromSelection, detachSelection, pushSelectionToMain, resetSelection } from "./component-actions";
import { duplicatePage } from "./pages";
import { duplicateFile, openLocalFilePicker, saveLocalCopy } from "./local-file";
import { placeImagePicker } from "./place-image";
import { deleteContents, hideOtherLayers, removeInteractions, removePaint, rotateSelectionBy, swapFillAndStroke } from "./object-actions";
import { newFile } from "./drive/session";
import { fitText } from "./text-layout";
import { setSection, wrapInSection } from "./section-actions";
import { adjustText, patchText, setTextAlign, setTextCase, setTextVerticalAlign, textLayersIn, toggleTextStyle } from "./text-actions";
import { safeUrl } from "./prototype";
import { copyAsCssAll, copyAsText } from "./copy-as";
import { resizeToFit, setLockAspect, setSizing } from "./layout-actions";
import { UI_PRESETS } from "./prefs";
import { pickColorFromScreen } from "./eyedropper";
import { startFrame } from "./prototype";
import { saveVersion } from "./versions";
import { selectMatching, selectChildren, selectInverse, selectParent, selectSameAs } from "./selection-nav";
import { useEditor, type Tool } from "./store";

export interface Command {
  id: string;
  label: string;
  shortcut?: string;
  keywords?: string;
  /** Needs a selection; hidden from the list otherwise. */
  needsSelection?: boolean;
  /** Set for the page and layer matches the palette adds to a search. */
  jump?: { kind: "page" | "layer"; detail: string };
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
    {
      id: "export-pdf",
      label: "Export frames to PDF…",
      keywords: "pdf print pages download",
      run: () => {
        const s = state();
        const count = exportFramesToPdf(s.doc, s.pageId, s.selection, s.drive.fileName || "Farsha");
        if (!count) s.showToast("There are no frames to export");
        else s.showToast(`Choose "Save as PDF" in the print window (${count} page${count === 1 ? "" : "s"})`);
      },
    },
    {
      id: "duplicate-page",
      label: "Duplicate page",
      keywords: "copy page",
      run: () => {
        const copy = duplicatePage(doc(), state().pageId);
        if (copy) state().setPage(copy);
      },
    },
    { id: "duplicate-file", label: "Duplicate file", keywords: "copy document", run: () => duplicateFile() },
    { id: "find", label: "Find…", shortcut: `${MOD}F`, keywords: "search layers text", run: () => state().setFindOpen(true) },
    { id: "find-replace", label: "Find and replace…", keywords: "search replace text", run: () => state().setFindOpen(true, true) },
    { id: "new-file", label: "New file", keywords: "blank document", run: () => newFile() },
    { id: "open-local", label: "Open local file…", keywords: "open farsha", run: () => openLocalFilePicker() },
    { id: "select-none", label: "Select none", shortcut: "Esc", run: () => state().select([]) },
    { id: "select-all", label: "Select all", shortcut: `${MOD}A`, run: () => state().select(selectAllIn(doc(), sel(), state().pageId)) },
    { id: "select-inverse", label: "Select inverse", shortcut: `${MOD}${SHIFT}A`, needsSelection: true, run: () => state().select(selectInverse(doc(), sel(), state().pageId)) },
    ...(
      [
        ["type", "Select all with the same type"],
        ["fill", "Select all with the same fill"],
        ["stroke", "Select all with the same stroke"],
        ["font", "Select all with the same font"],
        ["textProps", "Select all with the same text properties"],
        ["instance", "Select all with the same instance"],
        ["variant", "Select all with the same variant"],
        ["effect", "Select all with the same effects"],
        ["opacity", "Select all with the same opacity"],
        ["name", "Select all with the same name"],
      ] as const
    ).map(([facet, label]): Command => ({ id: `select-same-${facet}`, label, needsSelection: true, keywords: "edit find match", run: () => state().select(selectSameAs(doc(), sel(), state().pageId, facet)) })),
    {
      id: "set-default-properties",
      label: "Set default properties",
      needsSelection: true,
      keywords: "new shapes style fill stroke default",
      run: () => {
        const d = extractDefaults(doc().getNode(sel()[0] ?? ""));
        if (!d) state().showToast("Select a rectangle, ellipse, frame or vector to copy its look");
        else {
          saveDefaults(d);
          state().showToast("New shapes will start with this fill, stroke and corner radius");
        }
      },
    },
    { id: "reset-default-properties", label: "Reset default properties", keywords: "new shapes style default", run: () => (saveDefaults(null), state().showToast("New shapes start from the standard look")) },
    { id: "select-matching", label: "Select all matching properties", shortcut: `${MOD}${ALT}A`, needsSelection: true, keywords: "same fill color font", run: () => state().select(selectMatching(doc(), sel(), state().pageId)) },
    { id: "select-children", label: "Select children", shortcut: "Enter", needsSelection: true, run: () => state().select(selectChildren(doc(), sel())) },
    { id: "select-parent", label: "Select parent", shortcut: `${SHIFT}Enter`, needsSelection: true, run: () => state().select(selectParent(doc(), sel(), state().pageId)) },
    { id: "duplicate", label: "Duplicate", shortcut: `${MOD}D`, needsSelection: true, run: () => {
        // Ctrl+D after an Alt+drag copy repeats that move
        const ids = sel();
        const offset = duplicateOffset(ids);
        const copies = duplicateNodes(doc(), ids, offset, true, state().prefs.renameDuplicates);
        afterDuplicate(ids, copies, offset);
        state().select(copies);
      },
    },
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
        ["UNION", "Union selection", `${ALT}${SHIFT}U`],
        ["SUBTRACT", "Subtract selection", `${ALT}${SHIFT}S`],
        ["INTERSECT", "Intersect selection", `${ALT}${SHIFT}I`],
        ["EXCLUDE", "Exclude selection", `${ALT}${SHIFT}E`],
      ] as const
    ).map(
      ([op, label, shortcut]): Command => ({
        id: `boolean-${op}`,
        label: `${label} and flatten`,
        needsSelection: true,
        keywords: "boolean combine merge shapes flatten",
        run: () => {
          const out = booleanSelection(doc(), sel(), op);
          if (out.error) state().showToast(out.error);
          else state().select(out.ids);
        },
      }),
    ),
    {
      id: "flatten",
      label: "Flatten selection",
      shortcut: `${ALT}${SHIFT}F`,
      needsSelection: true,
      keywords: "vector merge outline convert",
      run: () => {
        const out = flattenSelection(doc(), sel());
        if (out.error) state().showToast(out.error);
        else state().select(out.ids);
      },
    },
    {
      id: "outline-stroke",
      label: "Outline stroke",
      shortcut: `${MOD}${ALT}O`,
      needsSelection: true,
      keywords: "stroke convert vector fill",
      run: () => {
        const out = outlineStrokeSelection(doc(), sel());
        if (out.error) state().showToast(out.error);
        else state().select(out.ids);
      },
    },
    ...(
      [
        ["UNION", "Union selection", `${MOD}${ALT}U`],
        ["SUBTRACT", "Subtract selection", ""],
        ["INTERSECT", "Intersect selection", ""],
        ["EXCLUDE", "Exclude selection", ""],
      ] as const
    ).map(
      ([op, label, shortcut]): Command => ({
        id: `boolean-group-${op}`,
        label,
        shortcut: shortcut || undefined,
        needsSelection: true,
        keywords: "boolean combine merge shapes live group",
        run: () => {
          const out = booleanGroupSelection(doc(), sel(), op);
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
    { id: "text-align-justify", label: "Justify text", shortcut: `${MOD}${ALT}J`, needsSelection: true, keywords: "text alignment justified", run: () => void setTextAlign(doc(), sel(), "JUSTIFIED", fitText) },
    { id: "text-valign-top", label: "Align text top", needsSelection: true, keywords: "text vertical alignment", run: () => void setTextVerticalAlign(doc(), sel(), "TOP") },
    { id: "text-valign-middle", label: "Align text middle", needsSelection: true, keywords: "text vertical alignment", run: () => void setTextVerticalAlign(doc(), sel(), "CENTER") },
    { id: "text-valign-bottom", label: "Align text bottom", needsSelection: true, keywords: "text vertical alignment", run: () => void setTextVerticalAlign(doc(), sel(), "BOTTOM") },
    ...(
      [
        ["size", "fontSize", "font size", ">", "<", `${MOD}${SHIFT}`],
        ["weight", "fontWeight", "font weight", ">", "<", `${MOD}${ALT}`],
        ["leading", "lineHeight", "line height", ">", "<", `${ALT}${SHIFT}`],
        ["tracking", "letterSpacing", "letter spacing", ">", "<", ALT],
      ] as const
    ).flatMap(([id, kind, label, up, down, prefix]): Command[] => [
      { id: `text-${id}-up`, label: `Increase ${label}`, shortcut: `${prefix}${up}`, needsSelection: true, keywords: "text adjust bigger", run: () => void adjustText(doc(), sel(), kind, 1, fitText) },
      { id: `text-${id}-down`, label: `Decrease ${label}`, shortcut: `${prefix}${down}`, needsSelection: true, keywords: "text adjust smaller", run: () => void adjustText(doc(), sel(), kind, -1, fitText) },
    ]),
    {
      id: "text-list-bullet",
      label: "Bulleted list",
      shortcut: `${MOD}${SHIFT}8`,
      needsSelection: true,
      keywords: "text list bullets",
      run: () => void patchText(doc(), sel(), (n) => ({ textList: n.textList === "BULLET" ? "NONE" : "BULLET" }), fitText),
    },
    {
      id: "text-list-number",
      label: "Numbered list",
      shortcut: `${MOD}${SHIFT}7`,
      needsSelection: true,
      keywords: "text list numbers",
      run: () => void patchText(doc(), sel(), (n) => ({ textList: n.textList === "NUMBER" ? "NONE" : "NUMBER" }), fitText),
    },
    {
      id: "text-link",
      label: "Create link",
      shortcut: `${MOD}${SHIFT}U`,
      needsSelection: true,
      keywords: "text url hyperlink",
      run: () => {
        const layers = textLayersIn(doc(), sel());
        if (!layers.length) return state().showToast("Select a text layer to link");
        const raw = window.prompt("Web address for this text (leave empty to remove the link)", layers[0]!.textLink ?? "https://");
        if (raw === null) return;
        const url = raw.trim();
        if (url && !safeUrl(url)) return state().showToast("The link must start with http:// or https://");
        void patchText(doc(), sel(), () => ({ textLink: url || null }), fitText);
      },
    },
    { id: "layout-lock-aspect", label: "Lock aspect ratio", needsSelection: true, keywords: "proportions ratio", run: () => void setLockAspect(doc(), sel(), true) },
    { id: "layout-unlock-aspect", label: "Unlock aspect ratio", needsSelection: true, keywords: "proportions ratio", run: () => void setLockAspect(doc(), sel(), false) },
    { id: "layout-resize-to-fit", label: "Resize to fit", shortcut: `${MOD}${ALT}${SHIFT}R`, needsSelection: true, keywords: "frame fit contents", run: () => void (resizeToFit(doc(), sel()) || state().showToast("Select a frame (without auto layout) that has layers")) },
    ...(
      [
        ["hug-width", "Set width to hug contents", "width", "HUG"],
        ["hug-height", "Set height to hug contents", "height", "HUG"],
        ["fill-width", "Set width to fill container", "width", "FILL"],
        ["fill-height", "Set height to fill container", "height", "FILL"],
      ] as const
    ).map(([id, label, axis, mode]): Command => ({
      id: `layout-${id}`,
      label,
      needsSelection: true,
      keywords: "auto layout sizing",
      run: () => void (setSizing(doc(), sel(), axis, mode) || state().showToast(mode === "HUG" ? "Select an auto layout frame" : "Select a layer inside an auto layout frame")),
    })),
    { id: "text-align-right", label: "Align text right", shortcut: `${MOD}${ALT}R`, needsSelection: true, keywords: "text alignment", run: () => void setTextAlign(doc(), sel(), "RIGHT", fitText) },
    { id: "wrap-section", label: "Wrap in new section", shortcut: `${MOD}S`, needsSelection: true, keywords: "section group canvas area", run: () => state().select(wrapInSection(doc(), sel())) },
    { id: "convert-section", label: "Convert to section", needsSelection: true, keywords: "frame section", run: () => void setSection(doc(), sel(), true) },
    { id: "convert-frame", label: "Convert to frame", needsSelection: true, keywords: "frame section", run: () => void setSection(doc(), sel(), false) },
    tool("section", "Section", `${SHIFT}S`),
    tool("slice", "Slice", "S"),
    tool("scale", "Scale", "K"),
    tool("comment", "Comment", "C"),
    { id: "comments-toggle", label: "Show / hide comments", shortcut: `${SHIFT}C`, keywords: "pins discussion", run: () => state().setCommentsVisible(!state().commentsVisible) },
    { id: "rotate-180", label: "Rotate 180°", needsSelection: true, keywords: "turn", run: () => void rotateSelectionBy(doc(), sel(), 180) },
    { id: "rotate-left", label: "Rotate 90° left", needsSelection: true, keywords: "turn counterclockwise", run: () => void rotateSelectionBy(doc(), sel(), -90) },
    { id: "rotate-right", label: "Rotate 90° right", needsSelection: true, keywords: "turn clockwise", run: () => void rotateSelectionBy(doc(), sel(), 90) },
    { id: "remove-fill", label: "Remove fill", shortcut: `${ALT}/`, needsSelection: true, keywords: "clear paint", run: () => void removePaint(doc(), sel(), "fills") },
    { id: "remove-stroke", label: "Remove stroke", shortcut: `${SHIFT}/`, needsSelection: true, keywords: "clear border", run: () => void removePaint(doc(), sel(), "strokes") },
    { id: "swap-fill-stroke", label: "Swap fill and stroke", shortcut: `${SHIFT}X`, needsSelection: true, run: () => void swapFillAndStroke(doc(), sel()) },
    { id: "hide-others", label: "Hide other layers", needsSelection: true, keywords: "isolate focus", run: () => void hideOtherLayers(doc(), sel(), state().pageId) },
    { id: "collapse-layers", label: "Collapse layers", shortcut: `${ALT}L`, keywords: "fold layers panel", run: () => state().collapseLayers() },
    {
      id: "delete-contents",
      label: "Delete contents",
      needsSelection: true,
      keywords: "empty clear frame children",
      run: () => {
        if (!deleteContents(doc(), sel())) state().showToast("Select a frame or group that has layers inside");
        else state().select(sel().filter((id) => doc().hasNode(id)));
      },
    },
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
    {
      id: "push-to-main",
      label: "Push changes to main component",
      needsSelection: true,
      keywords: "instance overrides apply update main",
      run: () => {
        try {
          const n = pushSelectionToMain(doc(), sel());
          state().showToast(n ? `Pushed ${n} ${n === 1 ? "change" : "changes"} to the main component` : "This instance has no changes to push");
        } catch (err) {
          state().showToast(err instanceof Error ? err.message : "Couldn't push the changes");
        }
      },
    },
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
    tool("pencil", "Pencil", `${SHIFT}P`),
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
    { id: "zoom-in", label: "Zoom in", shortcut: `${MOD}+`, keywords: "view", run: () => state().setViewport(zoomKeyboard(doc(), sel(), state().viewport, state().viewport.zoom * 1.25, state().prefs.keyboardZoomToSelection)) },
    { id: "zoom-out", label: "Zoom out", shortcut: `${MOD}-`, keywords: "view", run: () => state().setViewport(zoomKeyboard(doc(), sel(), state().viewport, state().viewport.zoom * 0.8, state().prefs.keyboardZoomToSelection)) },
    { id: "zoom-50", label: "Zoom to 50%", keywords: "view half", run: () => state().setViewport(zoomBy(state().viewport, 0.5)) },
    { id: "zoom-200", label: "Zoom to 200%", keywords: "view double", run: () => state().setViewport(zoomBy(state().viewport, 2)) },
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
      id: "vector-simplify",
      label: "Simplify",
      needsSelection: true,
      keywords: "vector points reduce path",
      run: () => {
        const out = simplifySelection(doc(), sel());
        if (out.error) state().showToast(out.error);
      },
    },
    {
      id: "vector-smooth-join",
      label: "Smooth join",
      needsSelection: true,
      keywords: "vector points curve round",
      run: () => {
        const out = smoothSelection(doc(), sel());
        if (out.error) state().showToast(out.error);
      },
    },
    {
      id: "vector-delete-heal",
      label: "Delete and heal",
      shortcut: `${SHIFT}Backspace`,
      keywords: "vector point remove anchor",
      run: () => {
        const { editingPath, editingPoint } = state();
        if (!editingPath || editingPoint === null) state().showToast("Edit a path (Enter) and click a point first");
        else if (deletePointAndHeal(doc(), editingPath, editingPoint)) state().setEditingPoint(null);
        else state().showToast("A path keeps at least two points");
      },
    },
    {
      id: "vector-split",
      label: "Split vector",
      keywords: "vector point cut path",
      run: () => {
        const { editingPath, editingPoint } = state();
        if (!editingPath || editingPoint === null) return state().showToast("Edit a path (Enter) and click a point first");
        const ids = splitVectorAt(doc(), editingPath, editingPoint);
        if (!ids) return state().showToast("Pick a point inside an open path, or any point of a closed one");
        state().setEditingPath(null);
        state().select(ids);
      },
    },
    {
      id: "vector-offset",
      label: "Offset vector…",
      needsSelection: true,
      keywords: "vector grow shrink expand contract path",
      run: () => {
        const raw = window.prompt("Offset distance in pixels (negative shrinks the shape)", "8");
        if (raw === null) return;
        const out = offsetSelection(doc(), sel(), Number(raw));
        if (out.error) state().showToast(out.error);
        else state().select(out.ids);
      },
    },
    {
      id: "text-on-path",
      label: "Attach text to path",
      needsSelection: true,
      keywords: "text curve along path follow",
      run: () => {
        const nodes = sel().map((id) => doc().getNode(id));
        const text = nodes.find((n) => n?.type === "TEXT");
        const path = nodes.find((n) => n?.type === "VECTOR" && n.penPoints);
        if (!text || !path) return state().showToast("Select a text layer and a pen path in the same frame");
        if (text.parentId !== path.parentId) return state().showToast("The text and the path must be in the same frame");
        doc().stopCapturing();
        doc().setText(text.id, { textPathId: path.id, textAutoResize: "WIDTH_AND_HEIGHT" });
        doc().stopCapturing();
      },
    },
    {
      id: "text-off-path",
      label: "Detach text from path",
      needsSelection: true,
      keywords: "text curve path remove",
      run: () => {
        const ids = sel().filter((id) => doc().getNode(id)?.type === "TEXT");
        if (!ids.length) return state().showToast("Select a text layer on a path");
        doc().stopCapturing();
        for (const id of ids) doc().setText(id, { textPathId: null });
        doc().stopCapturing();
      },
    },
    {
      id: "vector-join",
      label: "Join",
      shortcut: `${MOD}J`,
      needsSelection: true,
      keywords: "vector close merge path ends",
      run: () => {
        const out = joinSelection(doc(), sel());
        if (out.error) state().showToast(out.error);
        else state().select(out.ids);
      },
    },
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
    ...HELP_LINKS.map((l): Command => ({ id: l.id, label: l.label, keywords: `help ${l.keywords}`, run: () => void openHelpLink(l.url) })),
    { id: "keyboard-shortcuts", label: "Keyboard shortcuts…", shortcut: `${MOD}${SHIFT}?`, keywords: "cheat sheet keys help hotkeys", run: () => state().setShortcutsOpen(true) },
    { id: "preferences", label: "Preferences", keywords: "settings keep tool snapping zoom nudge", run: () => state().setPrefsOpen(true) },
    { id: "outlines", label: "Show / hide outlines", shortcut: `${MOD}${SHIFT}Y`, keywords: "view wireframe outline mode", run: () => state().setOutlines(!state().outlines) },
    ...(
      [
        ["slices", "Show slices", "", "export region"],
        ["maskOutlines", "Show mask outlines", "", "mask clip outline"],
        ["frameOutlines", "Show frame outlines", "", "frames boundaries"],
        ["annotations", "Show annotations", `${SHIFT}Y`, "dev notes"],
        ["pixelPreview", "Pixel preview", `${MOD}${SHIFT}P`, "crisp 1x rendering"],
      ] as const
    ).map(([key, label, shortcut, keywords]): Command => ({ id: `view-${key}`, label, shortcut: shortcut || undefined, keywords: `view ${keywords}`, run: () => state().toggleView(key) })),
    { id: "pixel-grid", label: "Show / hide pixel grid", shortcut: `${SHIFT}'`, keywords: "view pixels zoom", run: () => state().setPixelGrid(!state().pixelGrid) },
    ...UI_PRESETS.map((p): Command => ({ id: `preset-${p.id}`, label: `UI preset: ${p.label}`, keywords: "interface look density compact comfortable contrast figma", run: () => state().setPrefs({ preset: p.id }) })),
    {
      id: "panel-left",
      label: "Open layers panel",
      shortcut: `${ALT}1`,
      keywords: "view panels sidebar left",
      run: () => {
        const s = state();
        // Alt+1 shows the Layers tab; pressed again on it, it hides the panel
        if (s.hideLeftPanel || s.leftTab !== "layers") {
          s.setHideLeftPanel(false);
          s.setLeftTab("layers");
        } else s.setHideLeftPanel(true);
      },
    },
    { id: "panel-left-minimize", label: "Minimize left bar", keywords: "view panels sidebar left hide show layers", run: () => state().setHideLeftPanel(!state().hideLeftPanel) },
    { id: "panel-assets", label: "Open libraries panel", shortcut: `${ALT}2`, keywords: "view panels assets components", run: () => (state().setHideLeftPanel(false), state().setLeftTab("assets")) },
    { id: "panel-design", label: "Open design panel", shortcut: `${ALT}8`, keywords: "view panels properties right", run: () => (state().setHideRightPanel(false), state().setPrototypeMode(false), state().setDevMode(false)) },
    { id: "panel-prototype", label: "Open prototype panel", shortcut: `${ALT}9`, keywords: "view panels interactions right", run: () => (state().setHideRightPanel(false), state().setPrototypeMode(true)) },
    { id: "panel-right", label: "Show / hide properties panel", keywords: "view panels sidebar right design", run: () => state().setHideRightPanel(!state().hideRightPanel) },
    { id: "rename-layer", label: "Rename layer", shortcut: `${MOD}R`, needsSelection: true, keywords: "name layers", run: () => (sel().length === 1 ? (state().setHideLeftPanel(false), state().setLeftTab("layers"), state().setRenaming(sel()[0]!)) : state().setBatchRenameOpen(true)) },
    {
      id: "frame-find-next",
      label: "Find next frame",
      shortcut: "End",
      keywords: "view frames jump",
      run: () => {
        const s = state();
        const next = adjacentFrame(s.doc, s.pageId, s.selection[0], 1);
        if (!next) return;
        s.select([next]);
        const v = panToLayer(s.doc, next, s.viewport);
        if (v) s.setViewport(v);
      },
    },
    {
      id: "frame-find-prev",
      label: "Find previous frame",
      shortcut: "Home",
      keywords: "view frames jump",
      run: () => {
        const s = state();
        const prev = adjacentFrame(s.doc, s.pageId, s.selection[0], -1);
        if (!prev) return;
        s.select([prev]);
        const v = panToLayer(s.doc, prev, s.viewport);
        if (v) s.setViewport(v);
      },
    },
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
      id: "copy-text",
      label: "Copy as text",
      needsSelection: true,
      keywords: "words content",
      run: async () => state().showToast((await copyAsText(doc(), sel())) ? "Copied the text" : "There is no text in the selection"),
    },
    {
      id: "copy-css-all",
      label: "Copy as CSS (all layers)",
      needsSelection: true,
      keywords: "code every layer",
      run: async () => state().showToast((await copyAsCssAll(doc(), sel())) ? "Copied CSS of all layers" : "Select a layer first"),
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
    { id: "toggle-variables", label: "Toggle variables panel", keywords: "colors modes tokens show hide variables", run: () => state().setVariablesOpen(!state().variablesOpen) },
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
    { id: "save-local", label: "Save local copy", keywords: "download file .farsha", run: saveLocalCopy },
    { id: "share", label: "Share", keywords: "link", run: () => state().setShareOpen(true) },
  ];
}
