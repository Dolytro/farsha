import { screenToWorld } from "@farsha/canvas-engine";
import { useState } from "react";
import { useEditor } from "../store";
import { COMPONENT_DRAG, filterAssets } from "../asset-search";
import { zoomFit } from "../actions";
import { groupVariables } from "../variable-groups";

/** Figma's Assets tab: every main component of the file; a click places an instance in the middle of the canvas. */
export function Assets() {
  const doc = useEditor((s) => s.doc);
  const pageId = useEditor((s) => s.pageId);
  const viewer = useEditor((s) => s.viewer);
  useEditor((s) => s.version);
  const [query, setQuery] = useState("");
  const [folded, setFolded] = useState<ReadonlySet<string>>(new Set());
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

  /** Figma's right-click > Go to main component: switch to its page, select it and zoom to it. */
  const goToMain = (id: string) => {
    const s = useEditor.getState();
    const page = doc.pages().find((p) => p.id === id || doc.isAncestor(p.id, id));
    if (page && page.id !== s.pageId) s.setPage(page.id);
    s.select([id]);
    const v = zoomFit(doc, page?.id ?? s.pageId, [id]);
    if (v) s.setViewport(v);
  };

  if (!all.length) {
    return <p className="assets__empty">No components yet. Select a frame and press Ctrl+Alt+K to create one.</p>;
  }
  return (
    <>
    <input className="layers__search" type="search" placeholder="Search components" aria-label="Search components" value={query} onChange={(e) => setQuery(e.target.value)} style={{ margin: "8px 12px" }} />
    {!mains.length && <p className="assets__empty">No component matches.</p>}
    <ul className="layers__list assets">
      {groupVariables(mains).flatMap((g) => [
        ...(g.path
          ? [
              <li key={`folder-${g.path}`} className="assets__folder" role="presentation" style={{ listStyle: "none" }}>
                <button
                  className="assets__folder-btn"
                  aria-expanded={!folded.has(g.path)}
                  style={{ display: "flex", gap: 6, width: "100%", background: "none", border: 0, color: "inherit", cursor: "pointer", padding: "6px 12px", fontSize: 12, fontWeight: 600, opacity: 0.8 }}
                  onClick={() => setFolded((f) => { const next = new Set(f); if (!next.delete(g.path)) next.add(g.path); return next; })}
                >
                  <span aria-hidden>{folded.has(g.path) ? "▸" : "▾"}</span>
                  {g.path}
                  <span style={{ opacity: 0.6, fontWeight: 400 }}>({g.items.length})</span>
                </button>
              </li>,
            ]
          : []),
        ...(folded.has(g.path) ? [] : g.items.map(({ variable: n, leaf }) => (
        <li key={n.id} className="layers__item assets__item" title={viewer ? "Right-click to go to the main component" : "Click to place an instance, drag it onto the canvas, right-click to go to the main component"} onClick={() => !viewer && place(n.id)} onContextMenu={(e) => { e.preventDefault(); goToMain(n.id); }} draggable={!viewer} onDragStart={(e) => { e.dataTransfer.setData(COMPONENT_DRAG, n.id); e.dataTransfer.effectAllowed = "copy"; }}>
          <span className="layers__type layers__type--component">❖</span>
          <span className="layers__name">{leaf}{n.type === "FRAME" && n.variantProps ? ` (${Object.entries(n.variantProps).map(([k, v]) => `${k}=${v}`).join(", ")})` : ""}</span>
          {n.type === "FRAME" && n.description && <span className="layers__hint" title={n.description} style={{ opacity: 0.6, fontSize: 11, marginLeft: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 90 }}>{n.description}</span>}
        </li>
      ))),
      ])}
    </ul>
    </>
  );
}
