import { useEffect, useRef, type ReactElement } from "react";
import type { DesignNode } from "@canvylo/types";
import { useEditor } from "../store";
import { DriveMenu } from "./DriveMenu";

const ICONS: Record<string, string> = { FRAME: "#", GROUP: "▤", RECTANGLE: "▭", ELLIPSE: "◯", TEXT: "T", IMAGE: "▨", VECTOR: "◇" };

/** Text layers show their text until they are given a name of their own. */
function label(n: DesignNode): string {
  return n.type === "TEXT" && n.name === "Text" ? n.characters : n.name;
}

function RenameInput({ initial, onDone }: { initial: string; onDone: (name: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const done = useRef(false);
  const finish = (name: string) => {
    if (done.current) return;
    done.current = true;
    onDone(name);
  };
  useEffect(() => ref.current?.select(), []);
  return (
    <input
      ref={ref}
      className="layers__rename"
      defaultValue={initial}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onBlur={(e) => finish(e.currentTarget.value.trim())}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") finish(e.currentTarget.value.trim());
        else if (e.key === "Escape") finish("");
      }}
    />
  );
}

export function Layers() {
  const { doc, pageId, selection, select, viewer, renaming, setRenaming } = useEditor();
  const canEdit = !viewer && !useEditor.getState().devMode;
  useEditor((s) => s.version);
  const pageName = doc.getNode(pageId)?.name ?? "Page 1";

  const render = (parentId: string, depth: number): ReactElement[] =>
    [...doc.children(parentId)].reverse().flatMap((n: DesignNode) => [
      <li
        key={n.id}
        className={`layers__item${selection.includes(n.id) ? " layers__item--selected" : ""}${n.visible ? "" : " layers__item--hidden"}`}
        style={{ paddingLeft: 12 + depth * 16 }}
        onDoubleClick={() => canEdit && setRenaming(n.id)}
        onClick={(e) => select(e.shiftKey ? (selection.includes(n.id) ? selection.filter((i) => i !== n.id) : [...selection, n.id]) : [n.id])}
      >
        <span className="layers__type">{ICONS[n.type] ?? "·"}</span>
        {renaming === n.id ? (
          <RenameInput
            initial={label(n)}
            onDone={(name) => {
              setRenaming(null);
              if (name && name !== label(n)) doc.rename(n.id, name);
            }}
          />
        ) : (
          <span className="layers__name">{label(n)}</span>
        )}
        {canEdit && (
          <button
            className={`layers__toggle${n.locked ? " layers__toggle--on" : ""}`}
            title={n.locked ? "Unlock" : "Lock"}
            onClick={(e) => {
              e.stopPropagation();
              doc.setStyle(n.id, { locked: !n.locked });
            }}
          >
            {n.locked ? "🔒" : "🔓"}
          </button>
        )}
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
        {!viewer && (
          <span className="layers__actions">
            <DriveMenu />
            <button className="icon-btn" title="Undo (Ctrl+Z)" onClick={() => doc.undo()}>↶</button>
            <button className="icon-btn" title="Redo (Ctrl+Shift+Z)" onClick={() => doc.redo()}>↷</button>
          </span>
        )}
      </header>
      <h2 className="panel-title">Pages</h2>
      <div className="layers__page">{pageName}</div>
      <h2 className="panel-title">Layers</h2>
      <ul className="layers__list">{render(pageId, 0)}</ul>
    </aside>
  );
}
