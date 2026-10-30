import { screenToWorld } from "@canvylo/canvas-engine";
import { useEditor } from "../store";

/** Figma's Assets tab: every main component of the file; a click places an instance in the middle of the canvas. */
export function Assets() {
  const doc = useEditor((s) => s.doc);
  const pageId = useEditor((s) => s.pageId);
  const viewer = useEditor((s) => s.viewer);
  useEditor((s) => s.version);
  const mains = doc.pages().flatMap((p) => doc.descendants(p.id).filter((n) => n.type === "FRAME" && n.isComponent));

  const place = (id: string) => {
    const main = doc.getNode(id);
    if (!main) return;
    const { viewport, select, showToast } = useEditor.getState();
    const svg = document.querySelector(".canvas__svg");
    const r = svg?.getBoundingClientRect();
    const c = screenToWorld(viewport, (r?.width ?? 600) / 2, (r?.height ?? 400) / 2);
    try {
      doc.stopCapturing();
      const inst = doc.createInstance(id, pageId, Math.round(c.x - main.width / 2), Math.round(c.y - main.height / 2));
      doc.stopCapturing();
      select([inst]);
    } catch (err) {
      showToast(err instanceof Error ? `Couldn't do that: ${err.message}` : "Couldn't do that");
    }
  };

  if (!mains.length) {
    return <p className="assets__empty">No components yet. Select a frame and press Ctrl+Alt+K to create one.</p>;
  }
  return (
    <ul className="layers__list assets">
      {mains.map((n) => (
        <li key={n.id} className="layers__item assets__item" title={viewer ? undefined : "Click to place an instance"} onClick={() => !viewer && place(n.id)}>
          <span className="layers__type layers__type--component">❖</span>
          <span className="layers__name">{n.name}</span>
        </li>
      ))}
    </ul>
  );
}
