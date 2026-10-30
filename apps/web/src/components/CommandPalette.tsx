import { useEffect, useMemo, useRef, useState } from "react";
import { buildCommands } from "../commands";
import { filterCommands } from "../command-filter";
import { useEditor } from "../store";

/** Figma's "Actions" (Ctrl+/): search every command and run it, with its shortcut shown. */
export function CommandPalette() {
  const open = useEditor((s) => s.paletteOpen);
  const setOpen = useEditor((s) => s.setPaletteOpen);
  const hasSelection = useEditor((s) => s.selection.length > 0);
  const viewer = useEditor((s) => s.viewer);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);

  const commands = useMemo(() => (open ? buildCommands() : []), [open]);
  const shown = useMemo(() => filterCommands(commands.filter((c) => hasSelection || !c.needsSelection), query), [commands, query, hasSelection]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setIndex(0);
    }
  }, [open]);
  useEffect(() => setIndex(0), [query]);
  useEffect(() => {
    list.current?.children[index]?.scrollIntoView({ block: "nearest" });
  }, [index]);

  if (!open || viewer) return null;

  const run = (i: number) => {
    const cmd = shown[i];
    if (!cmd) return;
    setOpen(false);
    Promise.resolve(cmd.run()).catch((err) => useEditor.getState().showToast(err instanceof Error ? `Couldn't do that: ${err.message}` : "Couldn't do that"));
  };

  return (
    <div className="palette" onPointerDown={() => setOpen(false)}>
      <div className="palette__box" role="dialog" aria-label="Actions" onPointerDown={(e) => e.stopPropagation()}>
        <input
          ref={input}
          autoFocus
          className="palette__input"
          placeholder="Search actions…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Escape") setOpen(false);
            else if (e.key === "ArrowDown") {
              e.preventDefault();
              setIndex((i) => Math.min(shown.length - 1, i + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setIndex((i) => Math.max(0, i - 1));
            } else if (e.key === "Enter") {
              e.preventDefault();
              run(index);
            }
          }}
        />
        <ul className="palette__list" ref={list} role="listbox">
          {shown.length === 0 && <li className="palette__empty">No matching actions</li>}
          {shown.map((c, i) => (
            <li
              key={c.id}
              role="option"
              aria-selected={i === index}
              className={`palette__item${i === index ? " palette__item--active" : ""}`}
              onMouseMove={() => setIndex(i)}
              onClick={() => run(i)}
            >
              <span>{c.label}</span>
              {c.shortcut && <kbd className="palette__key">{c.shortcut}</kbd>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
