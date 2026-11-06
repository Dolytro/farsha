import { screenToWorld } from "@farsha/canvas-engine";
import { useState } from "react";
import { useEditor } from "../store";
import { filterAssets } from "../asset-search";

/** Figma's Assets tab: every main component of the file; a click places an instance in the middle of the canvas. */
export function Assets() {
  const doc = useEditor((s) => s.doc);
  const pageId = useEditor((s) => s.pageId);
  const viewer = useEditor((s) => s.viewer);
  useEditor((s) => s.version);
  const [query, setQuery] = useState("");
  const all = doc.pages().flatMap((p) => doc.descendants(p.id).filter((n) => n.type === "FRAME" && n.isComponent));
  const mains = filterAssets(all, query);

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

  if (!all.length) {
    return <p className="assets__empty">No components yet. Select a frame and press Ctrl+Alt+K to create one.</p>;
  }
  return (
    <>
    <input className="layers__search" type="search" placeholder="Search components" aria-label="Search components" value={query} onChange={(e) => setQuery(e.target.value)} style={{ margin: "8px 12px" }} />
    {!mains.length && <p className="assets__empty">No component matches.</p>}
    <ul className="layers__list assets">
      {mains.map((n) => (
        <li key={n.id} className="layers__item assets__item" title={viewer ? undefined : "Click to place an instance"} onClick={() => !viewer && place(n.id)}>
          <span className="layers__type layers__type--component">❖</span>
          <span className="layers__name">{n.name}{n.type === "FRAME" && n.variantProps ? ` (${Object.entries(n.variantProps).map(([k, v]) => `${k}=${v}`).join(", ")})` : ""}</span>
          {n.type === "FRAME" && n.description && <span className="layers__hint" title={n.description} style={{ opacity: 0.6, fontSize: 11, marginLeft: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 90 }}>{n.description}</span>}
        </li>
      ))}
    </ul>
    </>
  );
}
