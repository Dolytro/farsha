import { useEffect } from "react";
import { Canvas } from "./components/Canvas";
import { Layers } from "./components/Layers";
import { Properties } from "./components/Properties";
import { Toolbar } from "./components/Toolbar";
import { useEditor, type Tool } from "./store";

const KEYS: Record<string, Tool> = { v: "select", h: "hand", f: "frame", r: "rect", o: "ellipse", t: "text" };

export function App() {
  const devMode = useEditor((s) => s.devMode);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA") return;
      const s = useEditor.getState();
      const { doc, selection } = s;
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (e.shiftKey && !mod && key === "d") {
        s.setDevMode(!s.devMode);
      } else if (s.devMode) {
        // Dev Mode is read-only: only Esc (deselect) and the toggle above are active.
        if (key === "escape") s.select([]);
      } else if (mod && key === "z") {
        e.preventDefault();
        e.shiftKey ? doc.redo() : doc.undo();
      } else if (mod && key === "y") {
        e.preventDefault();
        doc.redo();
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

  return (
    <div className="editor">
      <Layers />
      <div className="workspace">
        <Canvas />
        {!devMode && <Toolbar />}
      </div>
      <Properties />
    </div>
  );
}
