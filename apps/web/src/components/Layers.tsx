import type { ReactElement } from "react";
import type { DesignNode } from "@canvylo/types";
import { useEditor } from "../store";

const ICONS: Record<string, string> = { FRAME: "#", GROUP: "▤", RECTANGLE: "▭", ELLIPSE: "◯", TEXT: "T", IMAGE: "▨" };

export function Layers() {
  const { doc, pageId, selection, select } = useEditor();
  useEditor((s) => s.version);
  const pageName = doc.getNode(pageId)?.name ?? "Page 1";

  const render = (parentId: string, depth: number): ReactElement[] =>
    [...doc.children(parentId)].reverse().flatMap((n: DesignNode) => [
      <li
        key={n.id}
        className={`layers__item${selection.includes(n.id) ? " layers__item--selected" : ""}${n.visible ? "" : " layers__item--hidden"}`}
        style={{ paddingLeft: 12 + depth * 16 }}
        onClick={(e) => select(e.shiftKey ? (selection.includes(n.id) ? selection.filter((i) => i !== n.id) : [...selection, n.id]) : [n.id])}
      >
        <span className="layers__type">{ICONS[n.type] ?? "·"}</span>
        <span className="layers__name">{n.type === "TEXT" ? n.characters : n.name}</span>
        <button
          className="layers__toggle"
          title={n.visible ? "Hide" : "Show"}
          onClick={(e) => {
            e.stopPropagation();
            doc.setStyle(n.id, { visible: !n.visible });
          }}
        >
          {n.visible ? "◉" : "○"}
        </button>
      </li>,
      ...render(n.id, depth + 1),
    ]);

  return (
    <aside className="layers">
      <header className="layers__header">
        <strong className="layers__brand">Canvylo</strong>
        <span className="layers__actions">
          <button className="icon-btn" title="Undo (Ctrl+Z)" onClick={() => doc.undo()}>↶</button>
          <button className="icon-btn" title="Redo (Ctrl+Shift+Z)" onClick={() => doc.redo()}>↷</button>
        </span>
      </header>
      <h2 className="panel-title">Pages</h2>
      <div className="layers__page">{pageName}</div>
      <h2 className="panel-title">Layers</h2>
      <ul className="layers__list">{render(pageId, 0)}</ul>
    </aside>
  );
}
