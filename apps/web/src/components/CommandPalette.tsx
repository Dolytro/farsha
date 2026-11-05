import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { buildCommands } from "../commands";
import { filterCommands } from "../command-filter";
import { useEditor } from "../store";
import { buildMainMenu } from "../main-menu";
import { categoryMap, sortByCategory } from "../command-categories";
import { loadRecent, pushRecent, saveRecent, splitRecent } from "../recent-actions";

/** Figma's "Actions" (Ctrl+/): search every command and run it, with its shortcut shown. */
export function CommandPalette() {
  const open = useEditor((s) => s.paletteOpen);
  const setOpen = useEditor((s) => s.setPaletteOpen);
  const hasSelection = useEditor((s) => s.selection.length > 0);
  const viewer = useEditor((s) => s.viewer);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);

  const commands = useMemo(() => (open ? buildCommands() : []), [open]);
  const categories = useMemo(() => (open ? categoryMap(buildMainMenu(), commands.map((c) => c.id)) : new Map<string, string>()), [open, commands]);
  // With nothing typed the list is grouped by category; once you search, the best matches come first and each shows its category.
  const available = useMemo(() => commands.filter((c) => hasSelection || !c.needsSelection), [commands, hasSelection]);
  const { shown, recentCount } = useMemo(() => {
    const list = filterCommands(available, query);
    if (query.trim()) return { shown: list, recentCount: 0 };
    // Nothing typed: the actions you ran lately come first, then everything else by category.
    const { recent, rest } = splitRecent(sortByCategory(list, categories), recentIds);
    return { shown: [...recent, ...rest], recentCount: recent.length };
  }, [available, query, categories, recentIds]);
  const groupOf = (i: number) => (i < recentCount ? "Recent" : (categories.get(shown[i]!.id) ?? "Other"));

  useEffect(() => {
    if (open) {
      setQuery("");
      setIndex(0);
      setRecentIds(loadRecent());
    }
  }, [open]);
  useEffect(() => setIndex(0), [query]);
  useEffect(() => {
    list.current?.querySelector(`[data-index="${index}"]`)?.scrollIntoView({ block: "nearest" });
  }, [index]);

  if (!open || viewer) return null;

  const run = (i: number) => {
    const cmd = shown[i];
    if (!cmd) return;
    saveRecent(pushRecent(loadRecent(), cmd.id));
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
            <Fragment key={c.id}>
              {!query.trim() && (i === 0 || groupOf(i - 1) !== groupOf(i)) && (
                <li className="palette__group" role="presentation">
                  {groupOf(i)}
                </li>
              )}
            <li
              data-index={i}
              role="option"
              aria-selected={i === index}
              className={`palette__item${i === index ? " palette__item--active" : ""}`}
              onMouseMove={() => setIndex(i)}
              onClick={() => run(i)}
            >
              <span>{c.label}</span>
              {query.trim() && <span className="palette__category">{categories.get(c.id) ?? "Other"}</span>}
              {c.shortcut && <kbd className="palette__key">{c.shortcut}</kbd>}
            </li>
            </Fragment>
          ))}
        </ul>
      </div>
    </div>
  );
}
