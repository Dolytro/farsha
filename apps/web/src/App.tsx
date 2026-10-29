import { useEffect, useState } from "react";
import { LoginScreen } from "./components/LoginScreen";
import { Canvas } from "./components/Canvas";
import { Layers } from "./components/Layers";
import { Properties } from "./components/Properties";
import { Toolbar } from "./components/Toolbar";
import { groupSelection, reorderSelection, ungroupSelection, viewportCenter, zoomBy, zoomFit } from "./actions";
import { copyAsPng, cssFor } from "./exporting";
import { looksLikeSvg } from "./svg-import";
import { armPasteMode, copyNodes, copyProperties, parseClip, pasteNodes, pasteProperties, pasteOver, pasteReplace, pasteSvg, pasteTarget, pasteText, selectAllIn, takePasteMode, topLevelOf } from "./clipboard";
import { ShareDialog } from "./components/ShareDialog";
import { loadShared, restoreSession, startAutosave } from "./drive/session";
import { route, useEditor, type Tool } from "./store";

/** Run a "Copy as ..." action and report the result in a toast. */
async function copyWithToast(label: string, task: () => Promise<boolean>): Promise<void> {
  const { showToast } = useEditor.getState();
  try {
    showToast((await task()) ? `Copied as ${label}` : "Select a layer first");
  } catch (err) {
    showToast(err instanceof Error ? `Couldn't copy: ${err.message}` : "Couldn't copy");
  }
}

const KEYS: Record<string, Tool> = { v: "select", h: "hand", f: "frame", r: "rect", o: "ellipse", t: "text" };

export function App() {
  const loadState = useEditor((s) => s.loadState);
  const loadError = useEditor((s) => s.loadError);
  const toast = useEditor((s) => s.toast);
  const signedIn = useEditor((s) => s.drive.user !== null);
  const authChecked = useEditor((s) => s.drive.checked);
  const [offline, setOffline] = useState(false);
  // Local testing only: `?nologin` skips the sign-in gate on the dev server. Production builds
  // have import.meta.env.DEV === false, so this can never open the editor on the live site.
  const devBypass = import.meta.env.DEV && new URLSearchParams(window.location.search).has("nologin");

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
      if (!text && !svgData) return;
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
      } else if (svg) {
        ids = pasteSvg(s.doc, svg, parentId, cx, cy);
        if (!ids.length) s.showToast("Nothing to paste from that SVG");
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
      void loadShared(route.fileId).then(() => {
        const s = useEditor.getState();
        const v = zoomFit(s.doc, s.pageId, []);
        if (v) s.setViewport(v);
      });
      return;
    }
    return startAutosave();
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

      if (mod && ["+", "=", "-", "_", "0"].includes(key)) {
        // Ctrl +/-/0 would zoom the whole browser page; zoom the canvas instead (like Figma).
        e.preventDefault();
        s.setViewport(zoomBy(s.viewport, key === "0" ? 1 : s.viewport.zoom * (key === "+" || key === "=" ? 1.25 : 0.8)));
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
        s.setViewport(zoomBy(s.viewport, s.viewport.zoom * (key === "+" || key === "=" ? 1.25 : 0.8)));
      } else if (s.devMode) {
        // Dev Mode is read-only: only Esc (deselect) and the toggle above are active.
        if (key === "escape") s.select([]);
      } else if (mod && key === "z") {
        e.preventDefault();
        e.shiftKey ? doc.redo() : doc.undo();
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
      } else if (mod && key === "g") {
        e.preventDefault();
        s.select(e.shiftKey ? ungroupSelection(doc, selection) : groupSelection(doc, selection));
      } else if (key === "]" || key === "[") {
        e.preventDefault();
        const up = key === "]";
        reorderSelection(doc, selection, mod ? (up ? Infinity : -Infinity) : up ? 1 : -1);
      } else if (mod && key === "d") {
        e.preventDefault();
        doc.stopCapturing();
        const copies = selection.flatMap((id) => {
          const n = doc.getNode(id);
          if (!n?.parentId) return [];
          const { id: _id, parentId, orderKey: _o, type, ...props } = n;
          return [doc.createNode(type, { parentId, props: { ...props, x: n.x + 10, y: n.y + 10 } })];
        });
        s.select(copies);
        doc.stopCapturing();
      } else if (key === "delete" || key === "backspace") {
        doc.stopCapturing();
        selection.forEach((id) => doc.hasNode(id) && doc.deleteNode(id));
        s.select([]);
      } else if (key === "escape") {
        s.select([]);
        s.setTool("select");
      } else if (key.startsWith("arrow") && selection.length) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = key === "arrowleft" ? -step : key === "arrowright" ? step : 0;
        const dy = key === "arrowup" ? -step : key === "arrowdown" ? step : 0;
        selection.forEach((id) => doc.moveNode(id, dx, dy));
      } else if (!mod && KEYS[key]) {
        s.setTool(KEYS[key]!);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Shared links are public and never ask for sign-in. The editor requires Google sign-in.
  if (route.kind === "editor" && !offline && !devBypass) {
    if (!authChecked) return <div className="loading" role="status">Loading…</div>;
    if (!signedIn) return <LoginScreen onSkip={() => setOffline(true)} />;
  }

  return (
    <div className="editor">
      <Layers />
      <div className="workspace">
        <Canvas />
        <Toolbar />
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
    </div>
  );
}
