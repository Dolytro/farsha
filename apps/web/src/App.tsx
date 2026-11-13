import { useEffect } from "react";
import { Canvas } from "./components/Canvas";
import { Rulers } from "./components/Rulers";
import { Layers } from "./components/Layers";
import { Properties } from "./components/Properties";
import { Toolbar } from "./components/Toolbar";
import { addAutoLayout, removeAutoLayout } from "./auto-layout-actions";
import { selectMatching, selectChildren, selectInverse, selectParent, selectSibling } from "./selection-nav";
import { createComponentFromSelection, detachSelection } from "./component-actions";
import { alignSelection, type AlignMode } from "./align";
import { adjacentPage } from "./pages";
import { joinSelection } from "./vector-actions";
import { booleanGroupSelection, flattenSelection, outlineStrokeSelection, toggleLayoutGrids, adjacentFrame, useAsMask, flipSelection, frameSelection, toggleHidden, toggleLocked, groupSelection, reorderSelection, ungroupSelection, viewportCenter, zoomBy, zoomFit, zoomKeyboard } from "./actions";
import { copyAsPng, cssFor } from "./exporting";
import { figmaToClips, looksLikeFigma } from "./figma/paste";
import { isImageFile } from "./images";
import { placeImageFile } from "./place-image";
import { looksLikeSvg } from "./svg-import";
import { afterDuplicate, duplicateOffset } from "./duplicate-offset";
import { armPasteMode, copyNodes, duplicateNodes, copyProperties, parseClip, pasteNodes, pasteProperties, pasteOver, pasteClips, pasteReplace, pasteSvg, pasteTarget, pasteText, selectAllIn, takePasteMode, topLevelOf } from "./clipboard";
import { CommandPalette } from "./components/CommandPalette";
import { Presenter } from "./components/Presenter";
import { VersionHistory } from "./components/VersionHistory";
import { VariablesDialog } from "./components/VariablesDialog";
import { ExportDialog } from "./components/ExportDialog";
import { FindBar } from "./components/FindBar";
import { CommentPopover } from "./components/CommentPopover";
import { PreferencesDialog } from "./components/PreferencesDialog";
import { ShortcutsDialog } from "./components/ShortcutsDialog";
import { BatchRenameDialog } from "./components/BatchRenameDialog";
import { saveVersion } from "./versions";
import { startFrame } from "./prototype";
import { buildCommands } from "./commands";
import { firstFamily, isGoogleFont, loadGoogleFont } from "./fonts";
import { textShortcutCommand } from "./text-shortcuts";
import { ContextMenu } from "./components/ContextMenu";
import { ShareDialog } from "./components/ShareDialog";
import { restoreLocal, startLocalAutosave } from "./local-persist";
import { startAutoVersions } from "./auto-versions";
import { loadStarter, newWelcomeDoc } from "./seed/welcome";
import { loadShared, restoreSession, startAutosave } from "./drive/session";
import { route, useEditor, type Tool } from "./store";
import { resolveTheme } from "./theme";
import { distributeSelection } from "./align";
import { tidyUp } from "./arrange-actions";
import { fitText as refitText } from "./text-layout";
import { setTextAlign, toggleTextStyle } from "./text-actions";
import { wrapInSection } from "./section-actions";
import { placeImagePicker } from "./place-image";
import { arrowRotation, removePaint, rotateSelectionBy, setOpacityFromKey, swapFillAndStroke } from "./object-actions";
import { pickColorFromScreen } from "./eyedropper";

/** Run a "Copy as ..." action and report the result in a toast. */
async function copyWithToast(label: string, task: () => Promise<boolean>): Promise<void> {
  const { showToast } = useEditor.getState();
  try {
    showToast((await task()) ? `Copied as ${label}` : "Select a layer first");
  } catch (err) {
    showToast(err instanceof Error ? `Couldn't copy: ${err.message}` : "Couldn't copy");
  }
}

/** Figma layers arrive as compressed binary, so decoding is async; the paste event already finished. */
async function pasteFromFigma(html: string, parentId: string, cx: number, cy: number): Promise<void> {
  const { showToast } = useEditor.getState();
  try {
    const clips = await figmaToClips(html);
    const s = useEditor.getState();
    const target = s.doc.hasNode(parentId) ? parentId : s.pageId;
    const ids = pasteClips(s.doc, clips, target, cx, cy);
    if (ids.length) s.select(ids);
    else showToast("Nothing to paste from Figma");
  } catch (err) {
    showToast(err instanceof Error ? `Couldn't paste from Figma: ${err.message}` : "Couldn't paste from Figma");
  }
}

const ALIGN_KEYS: Record<string, AlignMode> = { KeyA: "left", KeyH: "hcenter", KeyD: "right", KeyW: "top", KeyV: "vcenter", KeyS: "bottom" };
const KEYS: Record<string, Tool> = { s: "slice", v: "select", h: "hand", f: "frame", r: "rect", o: "ellipse", t: "text", l: "line", p: "pen", k: "scale", c: "comment" };

export function App() {
  const theme = useEditor((s) => s.theme);
  const uiHidden = useEditor((s) => s.uiHidden);
  const version = useEditor((s) => s.version);
  const docRef = useEditor((s) => s.doc);
  // Google fonts used by the file are loaded when it opens or changes
  useEffect(() => {
    const families = new Set<string>();
    for (const n of docRef.descendants(docRef.rootId)) if (n.type === "TEXT" && isGoogleFont(n.fontFamily)) families.add(firstFamily(n.fontFamily));
    for (const family of families) {
      void loadGoogleFont(family).then((ok) => ok && useEditor.setState((s) => ({ version: s.version + 1 })));
    }
    // load each family once; later edits that add a new family run this again
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docRef, Math.floor(version / 50)]);
  const hideLeft = useEditor((s) => s.hideLeftPanel);
  const hideRight = useEditor((s) => s.hideRightPanel);
  const preset = useEditor((s) => s.prefs.preset);
  const reduceMotion = useEditor((s) => s.prefs.reduceMotion);
  // Accessibility: the stylesheet turns animations and transitions off under data-motion="reduce".
  useEffect(() => {
    if (reduceMotion) document.documentElement.dataset.motion = "reduce";
    else delete document.documentElement.dataset.motion;
  }, [reduceMotion]);
  // The interface preset is a data attribute that the stylesheet reads (density, roundness, accent, panel width).
  useEffect(() => {
    document.documentElement.dataset.ui = preset;
  }, [preset]);
  // Light, dark or follow the system; the page reads the result from data-theme on <html>.
  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme = resolveTheme(theme, query.matches);
    };
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, [theme]);
  const loadState = useEditor((s) => s.loadState);
  const loadError = useEditor((s) => s.loadError);
  const toast = useEditor((s) => s.toast);
  const rulers = useEditor((s) => s.rulers);
  const viewer = useEditor((s) => s.viewer);
  useEffect(() => {
    void restoreSession();
  }, []);

  // Browser zoom (Ctrl + wheel / pinch) must never scale the whole page. The canvas
  // handles its own zoom, so swallow the browser's version everywhere else.
  useEffect(() => {
    const block = (e: WheelEvent) => {
      if (e.ctrlKey) e.preventDefault();
    };
    window.addEventListener("wheel", block, { passive: false });
    return () => window.removeEventListener("wheel", block);
  }, []);

  // Copy, cut and paste use the browser's clipboard events, so they work with the system
  // clipboard (and across tabs) without any permission prompt.
  useEffect(() => {
    const blocked = (e: Event) => {
      const t = e.target as HTMLElement | null;
      const editing = t?.tagName === "INPUT" || t?.tagName === "TEXTAREA" || t?.isContentEditable;
      const s = useEditor.getState();
      return Boolean(editing || s.devMode || s.viewer || document.querySelector(".login"));
    };
    const onCopy = (e: ClipboardEvent, cut: boolean) => {
      const st = useEditor.getState();
      const t = e.target as HTMLElement | null;
      const typing = t?.tagName === "INPUT" || t?.tagName === "TEXTAREA" || t?.isContentEditable;
      const canInspect = st.devMode && (!st.viewer || (st.viewer === "inspect" && st.drive.user !== null));
      if (canInspect && !cut && !typing) {
        // In Dev Mode, Ctrl+C copies the selected layer's CSS.
        const css = cssFor(st.doc, st.selection);
        if (css) {
          e.clipboardData?.setData("text/plain", css);
          e.preventDefault();
          st.showToast("Copied CSS");
        }
        return;
      }
      if (blocked(e)) return;
      const { doc, selection, select } = useEditor.getState();
      const text = copyNodes(doc, selection);
      if (!text) return;
      e.clipboardData?.setData("text/plain", text);
      e.preventDefault();
      if (cut) {
        doc.stopCapturing();
        topLevelOf(doc, selection).forEach((id) => doc.hasNode(id) && doc.deleteNode(id));
        doc.stopCapturing();
        select([]);
      }
    };
    const onPaste = (e: ClipboardEvent) => {
      const mode = takePasteMode();
      if (blocked(e)) return;
      const text = e.clipboardData?.getData("text/plain") ?? "";
      const svgData = e.clipboardData?.getData("image/svg+xml") ?? "";
      const html = e.clipboardData?.getData("text/html") ?? "";
      const imageFile = [...(e.clipboardData?.files ?? [])].find(isImageFile);
      if (!text && !svgData && !html && !imageFile) return;
      const s = useEditor.getState();
      const parentId = pasteTarget(s.doc, s.selection, s.pageId);
      const clip = parseClip(text);
      const svg = svgData || (looksLikeSvg(text) ? text : "");
      const at = viewportCenter(s.viewport);
      const parentBox = s.doc.absoluteBox(parentId);
      const cx = at.x - (parentBox && parentId !== s.pageId ? parentBox.x : 0);
      const cy = at.y - (parentBox && parentId !== s.pageId ? parentBox.y : 0);
      let ids: string[];
      if (clip) {
        ids = (mode === "over" ? pasteOver(s.doc, clip, s.selection) : mode === "replace" ? pasteReplace(s.doc, clip, s.selection) : null) ?? pasteNodes(s.doc, clip, parentId);
      } else if (looksLikeFigma(html)) {
        e.preventDefault();
        void pasteFromFigma(html, parentId, cx, cy);
        return;
      } else if (svg) {
        ids = pasteSvg(s.doc, svg, parentId, cx, cy);
        if (!ids.length) s.showToast("Nothing to paste from that SVG");
      } else if (imageFile) {
        e.preventDefault();
        void placeImageFile(imageFile, parentId, cx, cy);
        return;
      } else if (!text) {
        return; // other html: not supported, leave the default behaviour alone
      } else {
        ids = pasteText(s.doc, text, parentId, cx, cy);
      }
      if (ids.length) s.select(ids);
      e.preventDefault();
    };
    const copy = (e: ClipboardEvent) => onCopy(e, false);
    const cut = (e: ClipboardEvent) => onCopy(e, true);
    document.addEventListener("copy", copy);
    document.addEventListener("cut", cut);
    document.addEventListener("paste", onPaste);
    return () => {
      document.removeEventListener("copy", copy);
      document.removeEventListener("cut", cut);
      document.removeEventListener("paste", onPaste);
    };
  }, []);

  // Shared link: load the file once. Editor: autosave to Drive while signed in.
  useEffect(() => {
    if (route.kind === "viewer") {
      const wanted = route.nodeId;
      void loadShared(route.fileId).then(() => {
        const s = useEditor.getState();
        // a link to a layer opens on it: its page, selected and zoomed to
        const target = wanted && s.doc.hasNode(wanted) ? wanted : undefined;
        const page = target ? s.doc.pages().find((p) => p.id === target || s.doc.isAncestor(p.id, target)) : undefined;
        if (target && page) {
          if (page.id !== s.pageId) s.setPage(page.id);
          s.select([target]);
        }
        const v = zoomFit(s.doc, page?.id ?? s.pageId, target && page ? [target] : []);
        if (v) s.setViewport(v);
      });
      return;
    }
    // Bring back the working copy saved in this browser first, then keep saving it (and Drive) as the design changes.
    let stopLocal: (() => void) | undefined;
    let stopAuto: (() => void) | undefined;
    let cancelled = false;
    void restoreLocal().then(async (restored) => {
      if (!restored) {
        // A fresh browser: start from the Farsha UI design file (or the small built-in board when it can't be fetched).
        const starter = (await loadStarter()) ?? newWelcomeDoc();
        if (cancelled) return;
        useEditor.getState().loadDoc(starter);
        useEditor.getState().collapseLayers(); // boards start folded, like a Figma file
      }
      if (cancelled) return;
      const s = useEditor.getState();
      // A fresh canvas opens on its first board (the editor screen); a restored one fits everything, as before.
      const first = restored ? undefined : s.doc.children(s.pageId).find((n) => n.type === "FRAME");
      const v = zoomFit(s.doc, s.pageId, first ? [first.id] : []);
      if (v) s.setViewport(v);
      stopLocal = startLocalAutosave();
      stopAuto = startAutoVersions();
    });
    const stopDrive = startAutosave();
    return () => {
      cancelled = true;
      stopLocal?.();
      stopAuto?.();
      stopDrive();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA") return;
      if (document.querySelector(".login")) return;
      const s = useEditor.getState();
      const { doc, selection } = s;
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      // The browser's paste event doesn't say which modifiers were held, so note them here.
      if (mod && key === "v") armPasteMode(e.shiftKey ? (e.altKey ? "replace" : "over") : "offset");

      if ((key === "pageup" || key === "pagedown") && !mod && !s.viewer) {
        // Figma: Page Up / Page Down switch to the previous / next page.
        e.preventDefault();
        s.setPage(adjacentPage(doc, s.pageId, key === "pagedown" ? 1 : -1));
      } else if (mod && ["+", "=", "-", "_", "0"].includes(key)) {
        // Ctrl +/-/0 would zoom the whole browser page; zoom the canvas instead (like Figma).
        e.preventDefault();
        s.setViewport(key === "0" ? zoomBy(s.viewport, 1) : zoomKeyboard(doc, selection, s.viewport, s.viewport.zoom * (key === "+" || key === "=" ? 1.25 : 0.8), s.prefs.keyboardZoomToSelection));
      } else if (mod && e.shiftKey && !e.altKey && (key === "?" || key === "/")) {
        // Figma: Ctrl+Shift+? opens the keyboard shortcuts cheat sheet
        e.preventDefault();
        s.setShortcutsOpen(!s.shortcutsOpen);
      } else if (mod && !e.shiftKey && !e.altKey && (key === "/" || key === "k") && !s.viewer) {
        // Figma's "Actions" search
        e.preventDefault();
        s.setPaletteOpen(!s.paletteOpen);
      } else if (mod && e.altKey && !e.shiftKey && key === "a" && selection.length && !s.viewer) {
        // Figma's "Select all matching properties"
        e.preventDefault();
        s.select(selectMatching(doc, selection, s.pageId));
      } else if (mod && e.shiftKey && !e.altKey && key === "a" && !s.viewer) {
        // Figma's "Select inverse"
        e.preventDefault();
        s.select(selectInverse(doc, selection, s.pageId));
      } else if (key === "enter" && !mod && !e.altKey && !e.shiftKey && selection.length === 1 && !s.viewer && (doc.getNode(selection[0]!) as { penPoints?: unknown } | undefined)?.penPoints) {
        // Enter on a pen path edits its points
        e.preventDefault();
        s.setEditingPath(selection[0]!);
      } else if (key === "enter" && !mod && !e.altKey && !e.shiftKey && selection.length === 1 && !s.viewer && !s.devMode && doc.getNode(selection[0]!)?.type === "TEXT") {
        // Enter on a text layer edits its text (Figma)
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("farsha:edit-text", { detail: selection[0] }));
      } else if (key === "enter" && !mod && !e.altKey && selection.length && !s.viewer) {
        // Enter selects the children, Shift+Enter the parent
        e.preventDefault();
        s.select(e.shiftKey ? selectParent(doc, selection, s.pageId) : selectChildren(doc, selection));
      } else if (key === "tab" && !mod && !e.altKey && !s.viewer) {
        e.preventDefault();
        s.select(selectSibling(doc, selection, s.pageId, e.shiftKey ? -1 : 1));
      } else if (mod && key === "a" && !s.viewer) {
        e.preventDefault();
        s.select(selectAllIn(doc, selection, s.pageId));
      } else if (mod && e.shiftKey && !e.altKey && key === "c" && !s.viewer) {
        // Figma's "Copy as PNG"
        e.preventDefault();
        void copyWithToast("PNG", () => copyAsPng(doc, selection));
      } else if (e.shiftKey && !mod && key === "d") {
        s.setDevMode(!s.devMode);
      } else if (e.shiftKey && !mod && ["Digit0", "Digit1", "Digit2"].includes(e.code)) {
        // Figma view shortcuts: Shift+0 = 100%, Shift+1 = fit all, Shift+2 = fit selection.
        e.preventDefault();
        if (e.code === "Digit0") s.setViewport(zoomBy(s.viewport, 1));
        else {
          const v = zoomFit(doc, s.pageId, e.code === "Digit2" ? selection : []);
          if (v) s.setViewport(v);
        }
      } else if (!mod && (key === "+" || key === "=" || key === "-" || key === "_")) {
        e.preventDefault();
        s.setViewport(zoomKeyboard(doc, selection, s.viewport, s.viewport.zoom * (key === "+" || key === "=" ? 1.25 : 0.8), s.prefs.keyboardZoomToSelection));
      } else if (mod && e.altKey && !e.shiftKey && key === "s" && !s.viewer) {
        // Figma's "Save to version history"
        e.preventDefault();
        void saveVersion("");
      } else if (mod && e.altKey && !e.shiftKey && key === "enter" && !s.viewer) {
        // Figma's "Present"
        e.preventDefault();
        const frame = startFrame(doc, selection);
        if (frame) s.setPresenting(frame);
        else s.showToast("Add a frame to present");
      } else if (e.altKey && !mod && !e.shiftKey && ({ Digit1: "panel-left", Digit2: "panel-assets", Digit8: "panel-design", Digit9: "panel-prototype" } as const)[e.code as "Digit1"]) {
        // View > Panels: Alt+1 layers, Alt+2 libraries, Alt+8 design, Alt+9 prototype
        e.preventDefault();
        const id = ({ Digit1: "panel-left", Digit2: "panel-assets", Digit8: "panel-design", Digit9: "panel-prototype" } as const)[e.code as "Digit1"];
        buildCommands().find((c) => c.id === id)?.run();
      } else if (s.devMode) {
        // Dev Mode is read-only: only Esc (deselect) and the toggle above are active.
        if (key === "escape") s.select([]);
      } else if (e.shiftKey && !e.altKey && !mod && e.code === "Quote") {
        // Figma's "Pixel grid"
        e.preventDefault();
        s.setPixelGrid(!s.pixelGrid);
      } else if (e.shiftKey && !e.altKey && !mod && key === "g" && !s.viewer) {
        // Figma's "Layout grids"
        e.preventDefault();
        if (!toggleLayoutGrids(doc, selection)) s.showToast("Select a frame with a layout grid");
      } else if (mod && !e.shiftKey && !e.altKey && key === ";" && !s.viewer) {
        // Figma's "Show / Hide guides"
        e.preventDefault();
        s.setGuidesHidden(!s.guidesHidden);
      } else if (e.shiftKey && !e.altKey && !mod && key === "r" && !s.viewer) {
        // Figma's "Show / Hide rulers"
        e.preventDefault();
        s.setRulers(!s.rulers);
      } else if (e.shiftKey && !e.altKey && !mod && key === "a" && selection.length) {
        // Figma's "Add auto layout"
        e.preventDefault();
        s.select(addAutoLayout(doc, selection));
      } else if (e.shiftKey && e.altKey && mod && key === "a") {
        e.preventDefault();
        removeAutoLayout(doc, selection);
      } else if (mod && !e.shiftKey && !e.altKey && key === "\\") {
        // Figma's "Show / hide UI"
        e.preventDefault();
        s.setUiHidden(!s.uiHidden);
      } else if (mod && !e.shiftKey && !e.altKey && key === "j" && selection.length && !s.viewer) {
        // Figma's "Join" for pen paths
        e.preventDefault();
        const out = joinSelection(doc, selection);
        if (out.error) s.showToast(out.error);
        else s.select(out.ids);
      } else if (mod && e.altKey && !e.shiftKey && e.code === "KeyO" && selection.length && !s.viewer) {
        // Figma's "Outline stroke" (Ctrl+Alt+O)
        e.preventDefault();
        const out = outlineStrokeSelection(doc, selection);
        if (out.error) s.showToast(out.error);
        else s.select(out.ids);
      } else if (e.altKey && e.shiftKey && !mod && e.code === "KeyF" && selection.length && !s.viewer) {
        // Figma's "Flatten selection" (Alt+Shift+F)
        e.preventDefault();
        const out = flattenSelection(doc, selection);
        if (out.error) s.showToast(out.error);
        else s.select(out.ids);
      } else if (e.altKey && e.shiftKey && !mod && ({ KeyU: "UNION", KeyS: "SUBTRACT", KeyI: "INTERSECT", KeyE: "EXCLUDE" } as const)[e.code as "KeyU"] && selection.length > 1 && !s.viewer) {
        // Figma's Union / Subtract / Intersect / Exclude selection (Alt+Shift+U / S / I / E)
        e.preventDefault();
        const out = booleanGroupSelection(doc, selection, ({ KeyU: "UNION", KeyS: "SUBTRACT", KeyI: "INTERSECT", KeyE: "EXCLUDE" } as const)[e.code as "KeyU"]);
        if (out.error) s.showToast(out.error);
        else s.select(out.ids);
      } else if (mod && e.altKey && !e.shiftKey && key === "m" && selection.length && !s.viewer) {
        // Figma's "Use as mask"
        e.preventDefault();
        s.select(useAsMask(doc, selection));
      } else if (mod && e.altKey && !e.shiftKey && key === "g" && selection.length && !s.viewer) {
        // Figma's "Frame selection"
        e.preventDefault();
        s.select(frameSelection(doc, selection));
      } else if (mod && e.altKey && !e.shiftKey && key === "k" && selection.length && !s.viewer) {
        // Figma's "Create component"
        e.preventDefault();
        s.select(createComponentFromSelection(doc, selection));
      } else if (mod && e.altKey && !e.shiftKey && key === "b" && selection.length && !s.viewer) {
        // Figma's "Detach instance"
        e.preventDefault();
        s.select(detachSelection(doc, selection));
      } else if (e.altKey && !mod && !e.shiftKey && ALIGN_KEYS[e.code]) {
        // Figma's align shortcuts: Alt+A / H / D (left, centers, right), Alt+W / V / S (top, centers, bottom).
        e.preventDefault();
        alignSelection(doc, selection, ALIGN_KEYS[e.code]!);
      } else if (mod && key === "z") {
        e.preventDefault();
        e.shiftKey ? doc.redo() : doc.undo();
      } else if (mod && !e.shiftKey && !e.altKey && key === "r" && selection.length > 1 && !s.viewer) {
        // Figma's "Rename layers" for a multi-selection
        e.preventDefault();
        s.setBatchRenameOpen(true);
      } else if (mod && !e.shiftKey && !e.altKey && key === "r" && selection.length === 1 && !s.viewer) {
        // Figma's "Rename" (Ctrl+R)
        e.preventDefault();
        buildCommands().find((c) => c.id === "rename-layer")?.run();
      } else if (!mod && !e.altKey && !e.shiftKey && (key === "home" || key === "end") && !s.viewer) {
        // Figma's "Find previous / next frame"
        e.preventDefault();
        buildCommands().find((c) => c.id === (key === "home" ? "frame-find-prev" : "frame-find-next"))?.run();
      } else if (e.shiftKey && !mod && !e.altKey && key === "y" && !s.viewer) {
        // Figma's "Annotations"
        e.preventDefault();
        s.toggleView("annotations");
      } else if (mod && e.shiftKey && !e.altKey && key === "p" && !s.viewer) {
        // Figma's "Pixel preview"
        e.preventDefault();
        s.toggleView("pixelPreview");
      } else if (mod && e.shiftKey && !e.altKey && key === "y") {
        // Figma's "Outlines" (Ctrl+Y stays Redo here)
        e.preventDefault();
        s.setOutlines(!s.outlines);
      } else if (mod && key === "y") {
        e.preventDefault();
        doc.redo();
      } else if (mod && e.altKey && !e.shiftKey && key === "c") {
        // Figma's "Copy properties"
        e.preventDefault();
        if (copyProperties(doc, selection[0])) s.showToast("Properties copied");
      } else if (mod && e.altKey && !e.shiftKey && key === "v") {
        // Figma's "Paste properties"
        e.preventDefault();
        if (pasteProperties(doc, selection)) s.showToast("Properties pasted");
      } else if (mod && e.shiftKey && !e.altKey && key === "h") {
        // Figma's "Show/Hide selection"
        e.preventDefault();
        toggleHidden(doc, selection);
      } else if (mod && e.shiftKey && !e.altKey && key === "l") {
        // Figma's "Lock/Unlock selection"
        e.preventDefault();
        toggleLocked(doc, selection);
      } else if ((key === "f2" || (mod && !e.shiftKey && !e.altKey && key === "r")) && selection.length) {
        // Figma's "Rename" (F2, or Ctrl+R)
        e.preventDefault();
        s.setRenaming(selection[0]!);
      } else if (mod && key === "g") {
        e.preventDefault();
        s.select(e.shiftKey ? ungroupSelection(doc, selection) : groupSelection(doc, selection));
      } else if (key === "]" || key === "[") {
        e.preventDefault();
        const up = key === "]";
        reorderSelection(doc, selection, mod ? (up ? Infinity : -Infinity) : up ? 1 : -1);
      } else if (mod && key === "d") {
        e.preventDefault();
        // Ctrl+D right after an Alt+drag copy repeats that move
        const offset = duplicateOffset(selection);
        const copies = duplicateNodes(doc, selection, offset, true, s.prefs.renameDuplicates);
        afterDuplicate(selection, copies, offset);
        s.select(copies);
      } else if (key === "delete" || key === "backspace") {
        doc.stopCapturing();
        selection.forEach((id) => doc.hasNode(id) && doc.deleteNode(id));
        s.select([]);
      } else if (key === "escape") {
        s.select([]);
        s.setTool("select");
      } else if (mod && e.altKey && (key === "arrowleft" || key === "arrowright") && selection.length && !s.viewer && s.prefs.arrowRotate) {
        e.preventDefault();
        rotateSelectionBy(doc, selection, arrowRotation(key === "arrowright", e.shiftKey));
      } else if (key.startsWith("arrow") && selection.length) {
        e.preventDefault();
        const step = e.shiftKey ? s.prefs.bigNudge : s.prefs.nudge;
        const dx = key === "arrowleft" ? -step : key === "arrowright" ? step : 0;
        const dy = key === "arrowup" ? -step : key === "arrowdown" ? step : 0;
        selection.filter((id) => !doc.getNode(id)?.locked).forEach((id) => doc.moveNode(id, dx, dy));
      } else if (e.shiftKey && !mod && !e.altKey && (key === "h" || key === "v") && selection.length && !s.viewer) {
        // Figma's Flip horizontal / vertical
        e.preventDefault();
        flipSelection(doc, selection, key === "h" ? "x" : "y");
      } else if (!mod && !e.altKey && key === "n") {
        // Figma's "Zoom to next / previous frame"
        e.preventDefault();
        const frame = adjacentFrame(doc, s.pageId, selection[0], e.shiftKey ? -1 : 1);
        if (frame) {
          s.select([frame]);
          const v = zoomFit(doc, s.pageId, [frame]);
          if (v) s.setViewport(v);
        }
      } else if (mod && e.altKey && e.shiftKey && e.code === "KeyR" && selection.length && !s.viewer) {
        // Figma's "Resize to fit"
        e.preventDefault();
        buildCommands().find((c) => c.id === "layout-resize-to-fit")?.run();
      } else if (textShortcutCommand(e) && selection.length && !s.viewer) {
        // Text menu shortcuts: justify, link, lists and the Adjust steps
        e.preventDefault();
        buildCommands().find((c) => c.id === textShortcutCommand(e))?.run();
      } else if (mod && !e.altKey && ["b", "i", "u"].includes(key) && !(key !== "b" && e.shiftKey) && selection.length && !s.viewer && !e.shiftKey) {
        // Figma's text formatting shortcuts apply to the selected text layers
        e.preventDefault();
        toggleTextStyle(doc, selection, key === "b" ? "bold" : key === "i" ? "italic" : "underline", refitText);
      } else if (mod && e.shiftKey && !e.altKey && key === "x" && selection.length && !s.viewer) {
        e.preventDefault();
        toggleTextStyle(doc, selection, "strikethrough", refitText);
      } else if (mod && e.altKey && !e.shiftKey && ["l", "t", "r"].includes(key) && selection.length && !s.viewer && !e.metaKey) {
        e.preventDefault();
        setTextAlign(doc, selection, key === "l" ? "LEFT" : key === "t" ? "CENTER" : "RIGHT", refitText);
      } else if (e.shiftKey && !mod && !e.altKey && key === "c" && !s.viewer) {
        // Figma's "Show / hide comments"
        e.preventDefault();
        s.setCommentsVisible(!s.commentsVisible);
      } else if (mod && !e.shiftKey && !e.altKey && key === "f" && !s.viewer) {
        // Figma's "Find"
        e.preventDefault();
        s.setFindOpen(true);
      } else if (mod && e.shiftKey && !e.altKey && key === "k" && !s.viewer) {
        // Figma's "Place image"
        e.preventDefault();
        placeImagePicker();
      } else if (mod && e.shiftKey && !e.altKey && key === "e" && !s.viewer) {
        // Figma's "Export…"
        e.preventDefault();
        s.setExportOpen(true);
      } else if (e.shiftKey && !mod && !e.altKey && key === "s" && !s.viewer) {
        // Figma's Section tool
        e.preventDefault();
        s.setTool("section");
      } else if (mod && !e.shiftKey && !e.altKey && key === "s" && selection.length && !s.viewer) {
        // Figma's "Wrap in new section" (also stops the browser's Save dialog)
        e.preventDefault();
        s.select(wrapInSection(doc, selection));
      } else if (mod && e.altKey && e.shiftKey && key === "t" && selection.length && !s.viewer) {
        // Figma's "Tidy up"
        e.preventDefault();
        tidyUp(doc, selection);
      } else if (e.altKey && e.shiftKey && !mod && (e.code === "KeyH" || e.code === "KeyV") && selection.length && !s.viewer) {
        // Figma's "Distribute horizontal / vertical spacing"
        e.preventDefault();
        distributeSelection(doc, selection, e.code === "KeyH" ? "horizontal" : "vertical");
      } else if (mod && !e.shiftKey && !e.altKey && key === "backspace" && selection.length && !s.viewer) {
        // Figma's "Ungroup selection"
        e.preventDefault();
        s.select(ungroupSelection(doc, selection));
      } else if (e.altKey && !mod && !e.shiftKey && e.code === "Slash" && selection.length && !s.viewer) {
        e.preventDefault();
        removePaint(doc, selection, "fills");
      } else if (e.shiftKey && !mod && !e.altKey && e.code === "Slash" && selection.length && !s.viewer) {
        e.preventDefault();
        removePaint(doc, selection, "strokes");
      } else if (e.shiftKey && !mod && !e.altKey && key === "x" && selection.length && !s.viewer) {
        e.preventDefault();
        swapFillAndStroke(doc, selection);
      } else if (e.altKey && !mod && !e.shiftKey && key === "l" && !s.viewer) {
        e.preventDefault();
        s.collapseLayers();
      } else if (!mod && !e.altKey && !e.shiftKey && /^[0-9]$/.test(key) && selection.length && !s.viewer) {
        // Figma's number keys set the opacity
        e.preventDefault();
        setOpacityFromKey(doc, selection, key);
      } else if (!e.shiftKey && !mod && !e.altKey && key === "i" && !s.viewer) {
        // Figma's eyedropper
        e.preventDefault();
        void pickColorFromScreen(doc, selection, s.showToast);
      } else if (e.shiftKey && !mod && !e.altKey && key === "l") {
        // Figma's Arrow tool
        s.setTool("arrow");
      } else if (e.shiftKey && !mod && !e.altKey && key === "p") {
        // Figma's Pencil tool
        s.setTool("pencil");
      } else if (!mod && KEYS[key]) {
        s.setTool(KEYS[key]!);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className={`editor${uiHidden ? " editor--minimal" : ""}${hideLeft ? " editor--no-left" : ""}${hideRight ? " editor--no-right" : ""}`}>
      <Layers />
      <div className="workspace">
        <Canvas />
        {rulers && !viewer && <Rulers />}
        <Toolbar />
        <CommentPopover />
        {toast && (
          <div className="toast" role="status">
            {toast}
          </div>
        )}
        {loadState !== "ready" && (
          <div className="loading" role="status">
            {loadState === "loading" ? "Loading design…" : (loadError ?? "Couldn't open this design.")}
          </div>
        )}
      </div>
      <Properties />
      <ShareDialog />
      <ContextMenu />
      <CommandPalette />
      <Presenter />
      <VersionHistory />
      <VariablesDialog />
      <ExportDialog />
      <FindBar />
      <PreferencesDialog />
      <ShortcutsDialog />
      <BatchRenameDialog />
    </div>
  );
}
