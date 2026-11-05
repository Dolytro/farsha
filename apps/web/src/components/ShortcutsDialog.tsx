import { useEffect, useMemo, useState } from "react";
import { buildCommands } from "../commands";
import { categoryMap } from "../command-categories";
import { buildMainMenu } from "../main-menu";
import { groupShortcuts } from "../shortcut-list";
import { useEditor } from "../store";

/** Figma's keyboard shortcuts cheat sheet (Ctrl+Shift+?): every command that has a shortcut, grouped, with a search box. */
export function ShortcutsDialog() {
  const open = useEditor((s) => s.shortcutsOpen);
  const setOpen = useEditor((s) => s.setShortcutsOpen);
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    if (!open) return [];
    const commands = buildCommands();
    return groupShortcuts(commands, categoryMap(buildMainMenu(), commands.map((c) => c.id)), query);
  }, [open, query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, setOpen]);

  if (!open) return null;
  return (
    <div className="dialog" onPointerDown={() => setOpen(false)}>
      <div className="dialog__box dialog__box--wide shortcuts" role="dialog" aria-label="Keyboard shortcuts" onPointerDown={(e) => e.stopPropagation()}>
        <div className="dialog__head">
          <strong>Keyboard shortcuts</strong>
          <button className="icon-btn" aria-label="Close" onClick={() => setOpen(false)}>
            ✕
          </button>
        </div>
        <input className="shortcuts__search" autoFocus placeholder="Search shortcuts…" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.stopPropagation()} />
        <div className="shortcuts__body">
          {groups.length === 0 ? <p className="shortcuts__empty">No shortcut matches “{query}”.</p> : null}
          {groups.map((g) => (
            <section className="shortcuts__group" key={g.label}>
              <h3 className="shortcuts__title">{g.label}</h3>
              {g.items.map((i) => (
                <div className="shortcuts__row" key={i.id}>
                  <span>{i.label}</span>
                  <kbd className="shortcuts__key">{i.shortcut}</kbd>
                </div>
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
