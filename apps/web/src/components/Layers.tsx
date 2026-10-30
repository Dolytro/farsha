import { useEffect, useRef, useState, type DragEvent, type ReactElement } from "react";
import type { DesignNode } from "@canvylo/types";
import { useEditor } from "../store";
import { addPage, deletePage } from "../pages";
import { isContainer, layerRows, moveLayers, type DropWhere, type LayerRow } from "../layers-tree";
import { DriveMenu } from "./DriveMenu";
import { Assets } from "./Assets";
import { MainMenu } from "./MainMenu";
import { renameCurrentFile } from "../drive/session";

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
  const pages = doc.pages();
  const setPage = useEditor((s) => s.setPage);
  const [renamingPage, setRenamingPage] = useState<string | null>(null);
  const [renamingFile, setRenamingFile] = useState(false);
  const drive = useEditor((s) => s.drive);
  // The open page can disappear (undo, delete, a collaborator): fall back to the first one.
  useEffect(() => {
    if (!doc.hasNode(pageId)) setPage(doc.pages()[0]!.id);
  });

  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const collapseTick = useEditor((s) => s.collapseTick);
  // "Collapse layers" (Alt+L) folds every layer that has children.
  useEffect(() => {
    if (!collapseTick) return;
    const all = doc.descendants(pageId).filter((n) => doc.children(n.id).length > 0).map((n) => n.id);
    setCollapsed(new Set(all));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapseTick]);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"layers" | "assets">("layers");
  const [drop, setDrop] = useState<{ id: string; where: DropWhere } | null>(null);
  const dragging = useRef<string[]>([]);
  const rows = layerRows(doc, pageId, collapsed, query);

  const toggleCollapsed = (id: string) =>
    setCollapsed((c) => {
      const next = new Set(c);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const zone = (e: DragEvent<HTMLElement>, id: string): DropWhere => {
    const r = e.currentTarget.getBoundingClientRect();
    const f = (e.clientY - r.top) / r.height;
    if (isContainer(doc, id)) return f < 0.25 ? "before" : f > 0.75 ? "after" : "inside";
    return f < 0.5 ? "before" : "after";
  };

  const renderRow = ({ id, depth, hasChildren }: LayerRow): ReactElement | null => {
    const n = doc.getNode(id);
    if (!n) return null;
    return (
      <li
        key={n.id}
        className={`layers__item${selection.includes(n.id) ? " layers__item--selected" : ""}${n.visible ? "" : " layers__item--hidden"}${drop?.id === n.id ? ` layers__item--drop-${drop.where}` : ""}`}
        style={{ paddingLeft: 4 + depth * 16 }}
        draggable={canEdit && renaming !== n.id}
        onDragStart={(e) => {
          dragging.current = selection.includes(n.id) ? selection : [n.id];
          if (!selection.includes(n.id)) select([n.id]);
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", n.name);
        }}
        onDragOver={(e) => {
          if (!dragging.current.length) return;
          e.preventDefault();
          setDrop({ id: n.id, where: zone(e, n.id) });
        }}
        onDragLeave={() => setDrop((d) => (d?.id === n.id ? null : d))}
        onDrop={(e) => {
          e.preventDefault();
          const moved = moveLayers(doc, dragging.current, n.id, zone(e, n.id));
          dragging.current = [];
          setDrop(null);
          if (moved.length) select(moved);
        }}
        onDragEnd={() => {
          dragging.current = [];
          setDrop(null);
        }}
        onDoubleClick={() => canEdit && setRenaming(n.id)}
        onClick={(e) => select(e.shiftKey ? (selection.includes(n.id) ? selection.filter((i) => i !== n.id) : [...selection, n.id]) : [n.id])}
      >
        <button
          className={`layers__chevron${hasChildren ? "" : " layers__chevron--none"}`}
          title={collapsed.has(n.id) ? "Expand" : "Collapse"}
          onClick={(e) => {
            e.stopPropagation();
            toggleCollapsed(n.id);
          }}
        >
          {collapsed.has(n.id) ? "▸" : "▾"}
        </button>
        <span className={`layers__type${n.type === "FRAME" && (n.isComponent || n.componentId) ? " layers__type--component" : ""}`}>
          {n.isMask ? "◐" : n.type === "FRAME" && n.isSection ? "§" : n.type === "FRAME" && n.isComponent ? "❖" : n.type === "FRAME" && n.componentId ? "◇" : (ICONS[n.type] ?? "·")}
        </span>
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
      </li>
    );
  };

  return (
    <aside className="layers">
      <header className="layers__header">
        {!viewer && <MainMenu />}
        {viewer ? (
          <strong className="layers__brand">Canvylo</strong>
        ) : renamingFile ? (
          <RenameInput
            initial={drive.fileName}
            onDone={(name) => {
              setRenamingFile(false);
              if (name) void renameCurrentFile(name);
            }}
          />
        ) : (
          <button className="layers__file" title="Rename file" onClick={() => setRenamingFile(true)}>
            {drive.fileName}
          </button>
        )}
        {!viewer && (
          <span className="layers__actions">
            <DriveMenu />
            <button className="icon-btn" title="Undo (Ctrl+Z)" onClick={() => doc.undo()}>↶</button>
            <button className="icon-btn" title="Redo (Ctrl+Shift+Z)" onClick={() => doc.redo()}>↷</button>
          </span>
        )}
      </header>
      <h2 className="panel-title pages__title">
        Pages
        {canEdit && (
          <button className="icon-btn" title="Add page" onClick={() => setPage(addPage(doc))}>
            +
          </button>
        )}
      </h2>
      <ul className="pages">
        {pages.map((p) => (
          <li
            key={p.id}
            className={`pages__item${p.id === pageId ? " pages__item--current" : ""}`}
            onClick={() => setPage(p.id)}
            onDoubleClick={() => canEdit && setRenamingPage(p.id)}
          >
            {renamingPage === p.id ? (
              <RenameInput
                initial={p.name}
                onDone={(name) => {
                  setRenamingPage(null);
                  if (name && name !== p.name) doc.rename(p.id, name);
                }}
              />
            ) : (
              <span className="layers__name">{p.name}</span>
            )}
            {canEdit && pages.length > 1 && (
              <button
                className="layers__toggle"
                title="Delete page"
                onClick={(e) => {
                  e.stopPropagation();
                  const next = deletePage(doc, p.id);
                  if (next && p.id === pageId) setPage(next);
                }}
              >
                ✕
              </button>
            )}
          </li>
        ))}
      </ul>
      <div className="layers__tabs" role="tablist">
        {(["layers", "assets"] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={`layers__tab${tab === t ? " layers__tab--active" : ""}`} onClick={() => setTab(t)}>
            {t === "layers" ? "Layers" : "Assets"}
          </button>
        ))}
      </div>
      {tab === "assets" ? (
        <Assets />
      ) : (
        <>
          <input className="layers__search" type="search" placeholder="Search layers" value={query} onChange={(e) => setQuery(e.target.value)} />
          <ul className="layers__list">{rows.map(renderRow)}</ul>
        </>
      )}
    </aside>
  );
}
