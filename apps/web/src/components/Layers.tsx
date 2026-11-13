import { hideOtherLayers } from "../object-actions";
import { useEffect, useRef, useState, type DragEvent, type ReactElement } from "react";
import { rowWindow, scrollToRow } from "../virtual-rows";
import { screenToWorld } from "@farsha/canvas-engine";
import type { DesignNode } from "@farsha/types";
import { useEditor } from "../store";
import { addPage, deletePage, duplicatePage, movePage } from "../pages";
import { zoomFit } from "../actions";
import { Select } from "./Select";
import { isContainer, LAYER_KINDS, layerRows, moveLayers, type DropWhere, type LayerKindFilter, type LayerRow, treeKeyTarget, type TreeKey, rangeBetween, revealAncestors, toggleBranch } from "../layers-tree";
import { DriveMenu } from "./DriveMenu";
import { Assets } from "./Assets";
import { MainMenu } from "./MainMenu";
import { PopMenu } from "./PopMenu";
import { CommentsList } from "./CommentsList";
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
  // The Pages list folds like Figma's (the caret beside the title); remembered in this browser
  const [pagesFolded, setPagesFolded] = useState(() => {
    try {
      return localStorage.getItem("farsha.pagesFolded") === "1";
    } catch {
      return false;
    }
  });
  const foldPages = () =>
    setPagesFolded((f) => {
      try {
        localStorage.setItem("farsha.pagesFolded", f ? "0" : "1");
      } catch {
        /* private window: the setting just won't be remembered */
      }
      return !f;
    });
  const [pageMenu, setPageMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [renamingFile, setRenamingFile] = useState(false);
  const drive = useEditor((s) => s.drive);
  // The open page can disappear (undo, delete, a collaborator): fall back to the first one.
  useEffect(() => {
    if (!doc.hasNode(pageId)) setPage(doc.pages()[0]!.id);
  });

  const anchor = useRef<string | undefined>(undefined);
  const pageDrag = useRef<string | null>(null);
  const [pageDrop, setPageDrop] = useState<string | null>(null);
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
  const [kind, setKind] = useState<LayerKindFilter>("all");
  const tab = useEditor((s) => s.leftTab);
  const setTab = useEditor((s) => s.setLeftTab);
  const [drop, setDrop] = useState<{ id: string; where: DropWhere } | null>(null);
  const dragging = useRef<string[]>([]);
  const rows = layerRows(doc, pageId, collapsed, query, kind);
  // Only the rows in view are drawn (a file can have thousands of layers): the list tracks its own scroll position and height
  const listRef = useRef<HTMLUListElement | null>(null);
  const [scroll, setScroll] = useState({ top: 0, height: 600 });
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    let frame = 0;
    const read = () => {
      frame = 0;
      setScroll((s) => (s.top === el.scrollTop && s.height === el.clientHeight ? s : { top: el.scrollTop, height: el.clientHeight }));
    };
    const queue = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    read();
    el.addEventListener("scroll", queue, { passive: true });
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(queue) : null;
    observer?.observe(el);
    return () => {
      el.removeEventListener("scroll", queue);
      observer?.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  });
  const rowHeight = Number.parseFloat(typeof document !== "undefined" ? getComputedStyle(document.documentElement).getPropertyValue("--row-h") : "") || 24;
  const visible = rowWindow(rows.length, rowHeight, scroll.top, scroll.height);

  // Selecting a layer (on the canvas, with Tab, from a link) opens the folded layers above it and scrolls its row into view, like Figma.
  // It only runs when the selection changes, so folding a parent by hand afterwards is respected.
  const reveal = useRef<string | null>(null);
  useEffect(() => {
    if (!selection.length) return;
    setCollapsed((c) => revealAncestors(doc, selection, c));
    reveal.current = selection[0]!;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection]);
  useEffect(() => {
    const id = reveal.current;
    const list = listRef.current;
    if (!id || !list) return;
    const at = rows.findIndex((r) => r.id === id);
    // The row is missing until the parents have opened (next render); give up when a search or type filter hides it
    if (at < 0) {
      if (query || kind !== "all") reveal.current = null;
      return;
    }
    reveal.current = null;
    list.scrollTop = scrollToRow(at, rowHeight, list.scrollTop, list.clientHeight);
  });

  // Press an eye or a lock and drag down the list: every layer you cross gets the same state (Figma)
  const sweep = useRef<{ prop: "visible" | "locked"; value: boolean } | null>(null);
  const startSweep = (prop: "visible" | "locked", id: string, value: boolean) => {
    doc.stopCapturing();
    sweep.current = { prop, value };
    doc.setStyle(id, { [prop]: value });
    const end = () => {
      sweep.current = null;
      doc.stopCapturing();
      window.removeEventListener("pointerup", end);
    };
    window.addEventListener("pointerup", end);
  };
  const sweepOver = (prop: "visible" | "locked", id: string) => {
    const s = sweep.current;
    if (!s || s.prop !== prop) return;
    const n = doc.getNode(id);
    if (n && n[prop] !== s.value) doc.setStyle(id, { [prop]: s.value });
  };

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

  const renderRow = ({ id, depth, hasChildren }: LayerRow, index: number): ReactElement | null => {
    const n = doc.getNode(id);
    if (!n) return null;
    return (
      <li
        key={n.id}
        role="treeitem"
        tabIndex={selection[0] === n.id || (!selection.length && rows[0]?.id === n.id) ? 0 : -1}
        aria-selected={selection.includes(n.id)}
        aria-level={depth + 1}
        aria-setsize={rows.length}
        aria-posinset={index + 1}
        aria-expanded={hasChildren ? !collapsed.has(n.id) : undefined}
        onContextMenu={(e) => {
          // Like Figma: the same menu as on the canvas; the layer is selected first when it is outside the selection.
          e.preventDefault();
          const s = useEditor.getState();
          if (!s.selection.includes(n.id)) select([n.id]);
          // "Paste here" has no click point in the list: use the middle of the canvas
          const box = document.querySelector(".canvas__svg")?.getBoundingClientRect();
          const w = box ? screenToWorld(s.viewport, box.width / 2, box.height / 2) : { x: 0, y: 0 };
          s.setMenu({ x: e.clientX, y: e.clientY, wx: w.x, wy: w.y });
        }}
        aria-label={`${n.name}, ${n.type.toLowerCase()}${n.visible ? "" : ", hidden"}${n.locked ? ", locked" : ""}`}
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
        onDoubleClick={(e) => {
          // double click on the name renames (like Figma); anywhere else on the row takes the canvas to the layer
          if ((e.target as Element).closest(".layers__name, input")) {
            if (canEdit) setRenaming(n.id);
            return;
          }
          select([n.id]);
          const v = zoomFit(doc, pageId, [n.id]);
          if (v) useEditor.getState().setViewport(v);
        }}
        onClick={(e) => {
          // Shift+click selects the range from the layer clicked before; Ctrl / Cmd+click adds or removes one layer (Figma)
          if (e.shiftKey) select(rangeBetween(rows, anchor.current, n.id));
          else if (e.ctrlKey || e.metaKey) {
            select(selection.includes(n.id) ? selection.filter((i) => i !== n.id) : [...selection, n.id]);
            anchor.current = n.id;
          } else {
            select([n.id]);
            anchor.current = n.id;
          }
        }}
      >
        <button
          className={`layers__chevron${hasChildren ? "" : " layers__chevron--none"}`}
          title={collapsed.has(n.id) ? "Expand (Alt+click opens everything inside)" : "Collapse (Alt+click closes everything inside)"}
          onClick={(e) => {
            e.stopPropagation();
            if (e.altKey) setCollapsed((c) => toggleBranch(c, n.id, doc.descendants(n.id).map((d) => d.id)));
            else toggleCollapsed(n.id);
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
            title={n.locked ? "Unlock (drag down to change several)" : "Lock (drag down to change several)"}
            onMouseDown={(e) => e.preventDefault() /* keeps the row from starting a drag while sweeping */}
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              e.stopPropagation();
              startSweep("locked", n.id, !n.locked);
            }}
            onPointerEnter={() => sweepOver("locked", n.id)}
            onClick={(e) => {
              e.stopPropagation();
              // a pointer press already did the work; a keyboard click (detail 0) toggles here
              if (e.detail === 0) doc.setStyle(n.id, { locked: !n.locked });
            }}
          >
            {n.locked ? "🔒" : "🔓"}
          </button>
        )}
        <button
          className="layers__toggle"
          title={n.visible ? "Hide (Alt+click shows only this layer)" : "Show (Alt+click shows only this layer)"}
          onMouseDown={(e) => e.preventDefault() /* keeps the row from starting a drag while sweeping */}
          onPointerDown={(e) => {
            if (e.button !== 0 || e.altKey) return;
            e.stopPropagation();
            startSweep("visible", n.id, !n.visible);
          }}
          onPointerEnter={() => sweepOver("visible", n.id)}
          onClick={(e) => {
            e.stopPropagation();
            // Figma: Alt+click on the eye hides everything else (and brings the others back on a second Alt+click)
            if (e.altKey) {
              if (!n.visible) doc.setStyle(n.id, { visible: true });
              hideOtherLayers(doc, [n.id], pageId);
              return;
            }
            // a pointer press already did the work; a keyboard click (detail 0) toggles here
            if (e.detail === 0) doc.setStyle(n.id, { visible: !n.visible });
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
          <strong className="layers__brand">Farsha</strong>
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
        <button className="pages__fold" aria-expanded={!pagesFolded} title={pagesFolded ? "Show pages" : "Hide pages"} onClick={foldPages}>
          <span aria-hidden>{pagesFolded ? "▸" : "▾"}</span> Pages
        </button>
        {canEdit && (
          <button className="icon-btn" title="Add page" onClick={() => setPage(addPage(doc))}>
            +
          </button>
        )}
      </h2>
      <ul className="pages" hidden={pagesFolded}>
        {pages.map((p) => (
          <li
            key={p.id}
            className={`pages__item${p.id === pageId ? " pages__item--current" : ""}${pageDrop === p.id ? " pages__item--drop" : ""}`}
            draggable={canEdit && renamingPage !== p.id}
            onDragStart={(e) => {
              pageDrag.current = p.id;
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", p.name);
            }}
            onDragOver={(e) => {
              if (!pageDrag.current || pageDrag.current === p.id) return;
              e.preventDefault();
              setPageDrop(p.id);
            }}
            onDragLeave={() => setPageDrop((d) => (d === p.id ? null : d))}
            onDrop={(e) => {
              e.preventDefault();
              const dragged = pageDrag.current;
              pageDrag.current = null;
              setPageDrop(null);
              if (dragged && dragged !== p.id) movePage(doc, dragged, pages.findIndex((x) => x.id === p.id));
            }}
            onDragEnd={() => {
              pageDrag.current = null;
              setPageDrop(null);
            }}
            onClick={() => setPage(p.id)}
            onDoubleClick={() => canEdit && setRenamingPage(p.id)}
            onContextMenu={(e) => {
              if (!canEdit) return;
              e.preventDefault();
              setPageMenu({ id: p.id, x: e.clientX, y: e.clientY });
            }}
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
            {canEdit && (
              <button
                className="layers__toggle"
                title="Duplicate page"
                onClick={(e) => {
                  e.stopPropagation();
                  const copy = duplicatePage(doc, p.id);
                  if (copy) setPage(copy);
                }}
              >
                ⧉
              </button>
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
      {pageMenu && pages.some((p) => p.id === pageMenu.id) && (
        <PopMenu
          x={pageMenu.x}
          y={pageMenu.y}
          onClose={() => setPageMenu(null)}
          items={[
            { label: "Rename", run: () => setRenamingPage(pageMenu.id) },
            {
              label: "Duplicate page",
              run: () => {
                const copy = duplicatePage(doc, pageMenu.id);
                if (copy) setPage(copy);
              },
            },
            ...(pages.length > 1
              ? [
                  {
                    label: "Delete page",
                    divider: true,
                    run: () => {
                      const next = deletePage(doc, pageMenu.id);
                      if (next && pageMenu.id === pageId) setPage(next);
                    },
                  },
                ]
              : []),
          ]}
        />
      )}
      <div className="layers__tabs" role="tablist">
        {(["layers", "assets", "comments"] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={`layers__tab${tab === t ? " layers__tab--active" : ""}`} onClick={() => setTab(t)}>
            {t === "layers" ? "Layers" : t === "assets" ? "Assets" : `Comments${doc.comments().filter((c) => !c.resolved).length ? ` (${doc.comments().filter((c) => !c.resolved).length})` : ""}`}
          </button>
        ))}
      </div>
      {tab === "assets" ? (
        <Assets />
      ) : tab === "comments" ? (
        <CommentsList />
      ) : (
        <>
          <div className="layers__tools">
            <input className="layers__search" type="search" placeholder="Search layers" value={query} onChange={(e) => setQuery(e.target.value)} />
            <Select className="layers__filter" aria-label="Filter layers by type" value={kind} onChange={(e) => setKind(e.target.value as LayerKindFilter)}>
              <option value="all">All types</option>
              {LAYER_KINDS.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label}
                </option>
              ))}
            </Select>
            <button className="icon-btn" title="Collapse all layers (Alt+L)" aria-label="Collapse all layers" onClick={() => useEditor.getState().collapseLayers()}>
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
                <path d="M4 5.5l4 3 4-3M4 10.5l4-3 4 3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <ul
            ref={listRef}
            className="layers__list"
            role="tree"
            aria-label="Layers"
            aria-multiselectable="true"
            onKeyDown={(e) => {
              if (e.target instanceof HTMLInputElement || e.altKey || e.ctrlKey || e.metaKey) return;
              if (e.key === "Enter" && selection[0]) {
                e.preventDefault();
                e.stopPropagation();
                const v = zoomFit(doc, pageId, [selection[0]]);
                if (v) useEditor.getState().setViewport(v);
                return;
              }
              if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
              e.preventDefault();
              e.stopPropagation(); // the arrow keys move the selection here, not the layers on the canvas
              const list = e.currentTarget;
              const target = treeKeyTarget(rows, selection[0], e.key as TreeKey, collapsed);
              if (target.toggle) toggleCollapsed(target.toggle.id);
              if (target.select) {
                select([target.select]);
                const at = rows.findIndex((r) => r.id === target.select);
                if (at >= 0) list.scrollTop = scrollToRow(at, rowHeight, list.scrollTop, list.clientHeight);
                // the row may only be drawn after the list has scrolled to it: try for a few frames
                const focusSelected = (tries: number) => {
                  const row = list.querySelector<HTMLElement>('[aria-selected="true"]');
                  if (row) row.focus();
                  else if (tries > 0) requestAnimationFrame(() => focusSelected(tries - 1));
                };
                requestAnimationFrame(() => focusSelected(10));
              }
            }}
          >
            {visible.before > 0 && <li role="presentation" aria-hidden style={{ height: visible.before, listStyle: "none" }} />}
            {rows.slice(visible.start, visible.end).map((r, i) => renderRow(r, visible.start + i))}
            {visible.after > 0 && <li role="presentation" aria-hidden style={{ height: visible.after, listStyle: "none" }} />}
          </ul>
        </>
      )}
    </aside>
  );
}
