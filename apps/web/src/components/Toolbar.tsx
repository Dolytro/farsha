import type { ReactElement } from "react";
import { useEditor, type Tool } from "../store";

const icon = (d: ReactElement) => (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);

const TOOLS: { id: Tool; label: string; key: string; icon: ReactElement; design?: boolean }[] = [
  { id: "select", label: "Move", key: "V", icon: icon(<path d="M3.5 2.5l9 4-3.8 1.4-1.4 3.8z" />) },
  { id: "scale", label: "Scale", key: "K", design: true, icon: icon(<path d="M3 13l4-4M3 9.5V13h3.5M13 3L9.5 6.5M13 6.5V3H9.5M5 5h6v6H5z" />) },
  { id: "hand", label: "Hand tool", key: "H", icon: icon(<path d="M5.5 8V3.8a.9.9 0 011.8 0V7m0-3.7a.9.9 0 011.8 0V7m0-2.5a.9.9 0 011.8 0V9c0 2.5-1.5 4-3.7 4-1.7 0-2.6-.8-3.6-2.2L3 8.7a.9.9 0 011.4-1.1l1.1 1" />) },
  { id: "frame", label: "Frame", key: "F", design: true, icon: icon(<path d="M5 1.5v13M11 1.5v13M1.5 5h13M1.5 11h13" />) },
  { id: "section", label: "Section", key: "Shift+S", design: true, icon: icon(<path d="M2.5 4.5h4M2.5 4.5v8h11v-8H9.5M6.5 3v3" />) },
  { id: "rect", label: "Rectangle", key: "R", design: true, icon: icon(<rect x="2.5" y="3.5" width="11" height="9" rx="1" />) },
  { id: "ellipse", label: "Ellipse", key: "O", design: true, icon: icon(<circle cx="8" cy="8" r="5.5" />) },
  { id: "line", label: "Line", key: "L", design: true, icon: icon(<path d="M3 13L13 3" />) },
  { id: "arrow", label: "Arrow", key: "Shift+L", design: true, icon: icon(<path d="M3 13L13 3M7 3h6v6" />) },
  { id: "polygon", label: "Polygon", key: "", design: true, icon: icon(<path d="M8 2.5l5.5 10h-11z" />) },
  { id: "star", label: "Star", key: "", design: true, icon: icon(<path d="M8 2l1.8 4 4.2.4-3.2 2.8 1 4.2L8 11.2 4.2 13.4l1-4.2L2 6.4 6.2 6z" />) },
  { id: "pen", label: "Pen", key: "P", design: true, icon: icon(<path d="M3 13l1.2-3.6L10.8 2.8a1.3 1.3 0 011.8 0l.6.6a1.3 1.3 0 010 1.8L6.6 11.8zM9.6 4l2.4 2.4" />) },
  { id: "text", label: "Text", key: "T", design: true, icon: icon(<path d="M3 4V3h10v1M8 3v10M6 13h4" />) },
];

const DESIGN_ICON = icon(
  <>
    <rect x="2" y="2.5" width="12" height="11" rx="1.5" />
    <path d="M6 2.5v11M6 7h8" />
  </>,
);
const DEV_ICON = icon(<path d="M5.5 4.5L2 8l3.5 3.5M10.5 4.5L14 8l-3.5 3.5M9 3.5l-2 9" />);

export function Toolbar() {
  const { tool, setTool, devMode, setDevMode, prototypeMode, viewer } = useEditor();
  return (
    <div className="toolbar" role="toolbar" aria-label="Tools">
      <div className="toolbar__group">
        {TOOLS.filter((t) => !devMode || !t.design).map((t) => (
          <button
            key={t.id}
            className={`toolbar__btn${tool === t.id ? " toolbar__btn--active" : ""}`}
            onClick={() => setTool(t.id)}
            title={t.key ? `${t.label} — ${t.key}` : t.label}
            aria-label={t.label}
            aria-pressed={tool === t.id}
          >
            {t.icon}
          </button>
        ))}
      </div>
      {!viewer && <div className="toolbar__group toolbar__group--modes">
        <button
          className={`toolbar__btn toolbar__btn--mode${devMode ? "" : " toolbar__btn--on"}`}
          onClick={() => setDevMode(false)}
          title="Design mode"
          aria-label="Design mode"
          aria-pressed={!devMode}
        >
          {DESIGN_ICON}
        </button>
        <button
          className={`toolbar__btn toolbar__btn--mode${devMode ? " toolbar__btn--on" : ""}`}
          onClick={() => setDevMode(true)}
          title="Dev Mode — Shift+D"
          aria-label="Dev Mode"
          aria-pressed={devMode}
        >
          {DEV_ICON}
        </button>
      </div>}
    </div>
  );
}
