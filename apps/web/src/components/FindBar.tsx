import { useEffect, useMemo, useRef, useState } from "react";
import { zoomFit } from "../actions";
import { findLayers, replaceInText, stepIndex } from "../find";
import { useEditor } from "../store";

/** Edit > Find (Ctrl+F): search layer names and text on the page, step through the matches, and replace text. */
export function FindBar() {
  const open = useEditor((s) => s.findOpen);
  const replaceMode = useEditor((s) => s.findReplace);
  const setOpen = useEditor((s) => s.setFindOpen);
  const doc = useEditor((s) => s.doc);
  const pageId = useEditor((s) => s.pageId);
  useEditor((s) => s.version);
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [index, setIndex] = useState(-1);
  const input = useRef<HTMLInputElement>(null);

  const results = useMemo(() => (open ? findLayers(doc, pageId, query, { matchCase }) : []), [open, doc, pageId, query, matchCase, doc.getVersion()]);

  useEffect(() => {
    if (open) setTimeout(() => input.current?.select(), 0);
  }, [open]);

  const show = (i: number, list = results) => {
    const id = list[i];
    setIndex(i);
    if (!id) return;
    const s = useEditor.getState();
    s.select([id]);
    const v = zoomFit(doc, pageId, [id]);
    if (v) s.setViewport({ ...v, zoom: Math.min(v.zoom, 2) });
  };

  // a new search starts at the first match
  useEffect(() => {
    if (!open) return;
    if (!query.trim()) return setIndex(-1);
    show(results.length ? 0 : -1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, matchCase, open]);

  useEffect(() => {
    if (!open) return;
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
  const step = (d: 1 | -1) => show(stepIndex(index, results.length, d));
  const count = results.length ? `${index >= 0 ? index + 1 : 0} of ${results.length}` : query.trim() ? "No results" : "";
  const toast = (m: string) => useEditor.getState().showToast(m);

  return (
    <div className="findbar" role="search">
      <div className="findbar__row">
        <input
          ref={input}
          className="findbar__input"
          placeholder="Find layers and text"
          aria-label="Find"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") {
              e.preventDefault();
              step(e.shiftKey ? -1 : 1);
            }
          }}
        />
        <span className="findbar__count">{count}</span>
        <button className="icon-btn" title="Previous match (Shift+Enter)" aria-label="Previous match" disabled={!results.length} onClick={() => step(-1)}>
          ↑
        </button>
        <button className="icon-btn" title="Next match (Enter)" aria-label="Next match" disabled={!results.length} onClick={() => step(1)}>
          ↓
        </button>
        <button className={`icon-btn${matchCase ? " icon-btn--on" : ""}`} title="Match case" aria-pressed={matchCase} onClick={() => setMatchCase(!matchCase)}>
          Aa
        </button>
        <button className={`icon-btn${replaceMode ? " icon-btn--on" : ""}`} title="Find and replace" aria-pressed={replaceMode} onClick={() => useEditor.getState().setFindReplace(!replaceMode)}>
          ⇄
        </button>
        <button className="icon-btn" title="Close (Esc)" aria-label="Close find" onClick={() => setOpen(false)}>
          ✕
        </button>
      </div>
      {replaceMode && (
        <div className="findbar__row">
          <input
            className="findbar__input"
            placeholder="Replace with"
            aria-label="Replace with"
            value={replacement}
            onChange={(e) => setReplacement(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
          />
          <button
            className="seg__btn findbar__btn"
            disabled={index < 0}
            onClick={() => {
              const id = results[index];
              if (id) toast(replaceInText(doc, [id], query, replacement, { matchCase }) ? "Replaced" : "That match is a layer name; only text is replaced");
            }}
          >
            Replace
          </button>
          <button
            className="seg__btn findbar__btn"
            disabled={!results.length}
            onClick={() => {
              const n = replaceInText(doc, results, query, replacement, { matchCase });
              toast(n ? `Replaced in ${n} ${n === 1 ? "layer" : "layers"}` : "Nothing to replace");
            }}
          >
            Replace all
          </button>
        </div>
      )}
    </div>
  );
}
