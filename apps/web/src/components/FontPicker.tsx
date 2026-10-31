import { useEffect, useMemo, useRef, useState } from "react";
import { BUILT_IN_FONTS, GOOGLE_FONTS, firstFamily, fontStack, listLocalFonts, loadGoogleFont, matchFonts } from "../fonts";
import { useEditor } from "../store";

/** Fonts that need no download. */
const BUILT_IN = BUILT_IN_FONTS;
const BUILT_IN_STACKS: Record<string, string> = {
  Inter: "Inter, system-ui, sans-serif",
  Roboto: "Roboto, system-ui, sans-serif",
  Arial: "Arial, Helvetica, sans-serif",
  Helvetica: "Helvetica, Arial, sans-serif",
  Georgia: "Georgia, serif",
  "Times New Roman": "'Times New Roman', Times, serif",
  "Courier New": "'Courier New', monospace",
  "System UI": "system-ui, sans-serif",
};

/** A searchable font list: the built-in fonts, Google Fonts (loaded when picked) and the fonts installed on this computer. */
export function FontPicker({ value, onPick }: { value: string; onPick: (stack: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [local, setLocal] = useState<string[] | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const current = firstFamily(value);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  const builtIn = useMemo(() => matchFonts(BUILT_IN, query), [query]);
  const google = useMemo(() => matchFonts(GOOGLE_FONTS.map((f) => f.name).filter((n) => !BUILT_IN.includes(n)), query), [query]);
  const installed = useMemo(() => matchFonts(local ?? [], query).filter((n) => !BUILT_IN.includes(n)).slice(0, 80), [local, query]);

  const pick = async (name: string, kind: "built-in" | "google" | "local") => {
    setOpen(false);
    if (kind === "built-in") return onPick(BUILT_IN_STACKS[name]!);
    onPick(fontStack(name));
    if (kind === "google") {
      const ok = await loadGoogleFont(name);
      // the text was measured with a stand-in font: draw it again with the real one
      useEditor.setState((s) => ({ version: s.version + 1 }));
      if (!ok) useEditor.getState().showToast(`Couldn't load ${name}; check your connection`);
    }
  };

  const row = (name: string, kind: "built-in" | "google" | "local") => (
    <li key={`${kind}-${name}`} role="none">
      <button role="option" aria-selected={name === current} className={`fontpick__item${name === current ? " fontpick__item--active" : ""}`} style={{ fontFamily: kind === "built-in" ? BUILT_IN_STACKS[name] : undefined }} onClick={() => void pick(name, kind)}>
        {name}
      </button>
    </li>
  );

  return (
    <div className="fontpick" ref={root}>
      <button className="dd__button fontpick__button" aria-label="Font family" aria-expanded={open} aria-haspopup="listbox" onClick={() => setOpen(!open)}>
        <span className="fontpick__current">{current}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
          <path d="M2 3.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="fontpick__pop">
          <input className="fontpick__search" autoFocus placeholder="Search fonts" aria-label="Search fonts" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.stopPropagation()} />
          <ul className="fontpick__list" role="listbox" aria-label="Fonts">
            {builtIn.length > 0 && <li className="fontpick__group">Built in</li>}
            {builtIn.map((n) => row(n, "built-in"))}
            {google.length > 0 && <li className="fontpick__group">Google Fonts</li>}
            {google.map((n) => row(n, "google"))}
            {installed.length > 0 && <li className="fontpick__group">On this computer</li>}
            {installed.map((n) => row(n, "local"))}
            {builtIn.length + google.length + installed.length === 0 && <li className="fontpick__group">No font matches. Press Enter to use “{query}” as typed.</li>}
          </ul>
          {local === null && (
            <button className="fontpick__more" onClick={() => void listLocalFonts().then((l) => setLocal(l.length ? l : []))}>
              Show fonts installed on this computer…
            </button>
          )}
          {local !== null && local.length === 0 && <p className="fontpick__note">Your browser does not list installed fonts, or permission was refused.</p>}
        </div>
      )}
    </div>
  );
}
