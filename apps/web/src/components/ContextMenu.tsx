import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { buildMenu, type MenuAction } from "../context-menu";
import { toggleHidden, toggleLocked, groupSelection, ungroupSelection, reorderSelection } from "../actions";
import { addAutoLayout } from "../auto-layout-actions";
import { createComponentFromSelection, detachSelection, mainsOf, resetSelection } from "../component-actions";
import { copyAsCss, copyAsPng, copyAsSvg } from "../exporting";
import { copyNodes, copyProperties, parseClip, pasteNodes, pasteOver, pasteProperties, pasteTarget, pasteText, topLevelOf } from "../clipboard";
import { useEditor } from "../store";

const MARGIN = 8;

async function run(action: MenuAction, wx: number, wy: number): Promise<void> {
  const s = useEditor.getState();
  const { doc, selection, select, showToast } = s;
  try {
    switch (action) {
      case "copy":
      case "cut": {
        const text = copyNodes(doc, selection);
        if (!text) return;
        await navigator.clipboard.writeText(text);
        if (action === "cut") {
          doc.stopCapturing();
          topLevelOf(doc, selection).forEach((id) => doc.hasNode(id) && doc.deleteNode(id));
          doc.stopCapturing();
          select([]);
        }
        return;
      }
      case "paste-here":
      case "paste-over": {
        let text: string;
        try {
          text = await navigator.clipboard.readText();
        } catch {
          showToast("Allow clipboard access in the browser, or press Ctrl+V to paste");
          return;
        }
        const clip = parseClip(text);
        const parentId = pasteTarget(doc, selection, s.pageId);
        let ids: string[];
        if (clip && action === "paste-over") ids = pasteOver(doc, clip, selection) ?? pasteNodes(doc, clip, parentId);
        else if (clip) {
          ids = pasteNodes(doc, clip, parentId);
          // "Paste here": move the pasted layers so their top-left corner sits at the click.
          const boxes = ids.map((id) => doc.absoluteBox(id)).filter((b): b is NonNullable<typeof b> => !!b);
          if (boxes.length) {
            const dx = wx - Math.min(...boxes.map((b) => b.x));
            const dy = wy - Math.min(...boxes.map((b) => b.y));
            doc.stopCapturing();
            ids.forEach((id) => doc.moveNode(id, dx, dy));
            doc.stopCapturing();
          }
        } else if (text) {
          const box = doc.absoluteBox(parentId);
          const inside = box && parentId !== s.pageId;
          ids = pasteText(doc, text, parentId, wx - (inside ? box.x : 0), wy - (inside ? box.y : 0));
        } else {
          showToast("Nothing to paste");
          return;
        }
        if (ids.length) select(ids);
        return;
      }
      case "copy-css":
        showToast((await copyAsCss(doc, selection)) ? "Copied as CSS" : "Select a layer first");
        return;
      case "copy-svg":
        showToast((await copyAsSvg(doc, selection)) ? "Copied as SVG" : "Select a layer first");
        return;
      case "copy-png":
        showToast((await copyAsPng(doc, selection)) ? "Copied as PNG" : "Select a layer first");
        return;
      case "copy-props":
        if (copyProperties(doc, selection[0])) showToast("Properties copied");
        return;
      case "paste-props":
        if (pasteProperties(doc, selection)) showToast("Properties pasted");
        return;
      case "front": return reorderSelection(doc, selection, Infinity);
      case "forward": return reorderSelection(doc, selection, 1);
      case "backward": return reorderSelection(doc, selection, -1);
      case "back": return reorderSelection(doc, selection, -Infinity);
      case "group": return select(groupSelection(doc, selection));
      case "ungroup": return select(ungroupSelection(doc, selection));
      case "auto-layout": return select(addAutoLayout(doc, selection));
      case "create-component": return select(createComponentFromSelection(doc, selection));
      case "detach-instance": return select(detachSelection(doc, selection));
      case "reset-overrides": return resetSelection(doc, selection);
      case "go-to-main": {
        const mains = mainsOf(doc, selection);
        if (!mains.length) return showToast("The main component no longer exists");
        const page = doc.pages().find((p) => p.id === mains[0] || doc.isAncestor(p.id, mains[0]!));
        if (page && page.id !== s.pageId) s.setPage(page.id);
        return select(mains);
      }
      case "visibility": return toggleHidden(doc, selection);
      case "lock": return toggleLocked(doc, selection);
      case "delete":
        doc.stopCapturing();
        selection.forEach((id) => doc.hasNode(id) && doc.deleteNode(id));
        doc.stopCapturing();
        select([]);
    }
  } catch (err) {
    showToast(err instanceof Error ? `Couldn't do that: ${err.message}` : "Couldn't do that");
  }
}

export function ContextMenu() {
  const menu = useEditor((s) => s.menu);
  const setMenu = useEditor((s) => s.setMenu);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: 0, top: 0 });
  useEditor((s) => s.version);
  useEditor((s) => s.selection);
  const st = useEditor.getState();

  // Keep the menu inside the window: shift it once its real size is known.
  useLayoutEffect(() => {
    if (!menu || !ref.current) return;
    const { width, height } = ref.current.getBoundingClientRect();
    setPos({
      left: Math.max(MARGIN, Math.min(menu.x, window.innerWidth - width - MARGIN)),
      top: Math.max(MARGIN, Math.min(menu.y, window.innerHeight - height - MARGIN)),
    });
  }, [menu]);

  useEffect(() => {
    if (!menu) return;
    // A press inside the menu must not close it first, or the item is gone before its click arrives.
    const close = (e?: Event) => {
      if (e?.target instanceof Node && ref.current?.contains(e.target)) return;
      setMenu(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("pointerdown", close, true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("blur", close);
    window.addEventListener("resize", close);
    window.addEventListener("wheel", close, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", close, true);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("blur", close);
      window.removeEventListener("resize", close);
      window.removeEventListener("wheel", close);
    };
  }, [menu, setMenu]);

  if (!menu) return null;
  const nodes = st.selection.map((id) => st.doc.getNode(id)).filter((n): n is NonNullable<typeof n> => !!n);
  const canInspect = st.devMode && (!st.viewer || (st.viewer === "inspect" && st.drive.user !== null));
  const items = buildMenu({
    devMode: st.devMode,
    readOnlyViewer: Boolean(st.viewer) && !canInspect,
    selectionCount: nodes.length,
    hasGroup: nodes.some((n) => n.type === "GROUP"),
    hasInstance: nodes.some((n) => st.doc.instanceOf(n.id)),
    allHidden: nodes.length > 0 && nodes.every((n) => !n.visible),
    allLocked: nodes.length > 0 && nodes.every((n) => n.locked),
  });
  if (!items.length) return null;

  let submenuShown = false;
  return (
    <div ref={ref} className="ctxmenu" role="menu" style={pos} onContextMenu={(e) => e.preventDefault()} onPointerDown={(e) => e.stopPropagation()}>
      {items.map((it) => {
        const head = Boolean(it.submenu) && !submenuShown;
        submenuShown = submenuShown || Boolean(it.submenu);
        return (
          <div key={it.action}>
            {head && <div className="ctxmenu__sep" />}
            {head && <div className="ctxmenu__group">Copy/Paste as</div>}
            {it.divider && !it.submenu && <div className="ctxmenu__sep" />}
            <button
              role="menuitem"
              className="ctxmenu__item"
              onClick={() => {
                setMenu(null);
                void run(it.action, menu.wx, menu.wy);
              }}
            >
              <span>{it.label}</span>
              {it.shortcut && <kbd>{it.shortcut}</kbd>}
            </button>
          </div>
        );
      })}
    </div>
  );
}
